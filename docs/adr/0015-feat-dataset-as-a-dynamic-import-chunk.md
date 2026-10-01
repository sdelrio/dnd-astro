---
status: accepted
date: 2026-10-01
supersedes: null
superseded_by: null
tags: [alpine, build-time, client-side, module-graph, astro, performance]
---

# ADR-0015: Deliver the Feat Dataset as a Dynamic Import, Not a Static One

## Context and Problem Statement

The Feat Explorer needs 219 feat records at runtime. For most of its life the
dataset reached the browser two ways, and both put those records into something
every page on the site already downloads.

First it was a JSON string inlined into the component's `x-data` attribute,
which made the built page about 84KB and made the dataset untestable. #379
replaced that with a registered Alpine module
(`feat-explorer-component.ts` importing the generated `feat-data.js`), which
solved the testability problem and took the document to about 29KB - and moved
the 26KB of records into the Alpine entrypoint instead. `src/alpine.ts` is
injected into **every** page by `@astrojs/alpinejs`, so the measurement that
mattered was never the Feat Explorer page's document at all. It was this:

| Asset | Before #379 | After #379 (measured on `main`) |
|---|---|---|
| Feat Explorer document | ~84KB | 30,092 bytes |
| Alpine entrypoint, on every one of the site's 129 pages | ~60KB | 101,561 bytes |

26,138 bytes of minified feat data, fetched by a reader looking at a dice
roller, because the component that uses it is registered in a site-wide
entrypoint.

The second cost is subtler than the first. The dataset sits inside the
entrypoint's hash, so it is re-downloaded whenever *anything* in the site-wide
bundle changes - which is often, because the entrypoint holds five components
and any edit to any of them rehashes it. A feat-data edit is the worst case of
that, because it rehashes the bundle for reasons no reader of any of the other
four components could care about.

## Decision Drivers

- `SPEC.md` Section 3's Rule of Least Client-Side JavaScript, measured against
  the entrypoint rather than against one page
- A data change should cost the pages that use the data, not every page
- No new dependency, no build plugin, no change to the dev-time manifest
  boundary ([ADR-0007](0007-mermaid-rendering-strategy.md),
  [ADR-0011](0011-headless-browser-mcp-server.md))
- The behaviour must stay mountable in the DOM harness, because every Alpine
  expression in this component is a string and running it is the only net
  ([ADR-0010](0010-alpine-data-registration.md))
- Eager mount, no scroll trigger, no remote schema dependency - the feature
  spec's intent, which this decision does not reopen

## Considered Options

- **A static `import` in the component module.** What #379 shipped. Rejected:
  it is exactly the cost above.
- **A second Alpine entrypoint per component**, so the Feat Explorer's
  behaviour and data ship only on its own page. Rejected as disproportionate:
  `@astrojs/alpinejs` takes one entrypoint, so this means a second integration,
  a second `Alpine.start()`, and two copies of the Alpine runtime's own
  registration surface on any page that wanted both.
- **Emit the data as a separate JSON asset and `fetch()` it**, with the URL
  passed down from the view the way ADR-0013 passes role config through the DOM.
  Genuinely workable, and it was tried. Rejected because Vite's `?url` import
  emits the module a *second* time, unminified and unhashed-by-use: the build
  produced both `feat-data.C2C1eo5p.js` (26,138 bytes, the real chunk) and
  `feat-data.Dqa5OA0D.js` (40,472 bytes, the `?url` copy), a net loss of 40KB
  on the very page the change was meant to shrink. The only remaining route to
  the hashed URL would be reading it out of the build manifest, which is a
  custom integration for a preload link.
- **A dynamic `import()` with a literal specifier.** Chosen.

## Decision Outcome

Chosen option: `feat-explorer-component.ts` imports `feat-data` **type-only** and
reaches the values through one dynamic import, wrapped in a module-scoped
memoised promise:

```ts
export function featDataset(): Promise<FeatDataset> { /* ... */ }
```

Three properties follow from the spelling, and each is the reason it is
spelled that way:

- **The specifier is a literal.** A bundler can only split a dynamic import whose
  target it can resolve statically. `import(\`./feat-data/${name}\`)` would
  inline the data into the entrypoint again, silently, and every test in this
  repo would still pass.
- **The dataset import is type-only and the value import is dynamic.** These are
  opposite halves of the same edge, and the type-only half is what lets the
  `typeof featData.FEATS` queries stay in the component's field types. The
  compiler erases it, so [ADR-0013](0013-browser-safe-data-module-boundary.md)'s
  rule is satisfied rather than bent: the module graph now has no value edge to
  the data at all, and the graph test's dynamic-import pattern follows it and
  finds no Node builtin behind it.
- **The promise is memoised at module scope**, so the chunk is requested at most
  once per page however many roots mount, and the browser's own module registry
  plus the asset's immutable `Cache-Control` do the rest. A rejected promise is
  dropped rather than cached, so one failed fetch costs a retry rather than a
  page that can never load its data.

### What this costs, measured

Measured on `main` (before) and on this branch (after), both `pnpm build`, same
machine. `page.<hash>.js` is the Alpine entrypoint `@astrojs/alpinejs` injects
into all 129 pages; `gzip` is what a reader actually transfers.

| Asset | Before | After | Delta |
|---|---|---|---|
| Feat Explorer document | 30,092 (8,302 gzip) | 31,274 (8,755 gzip) | +1,182 (+453 gzip) |
| Alpine entrypoint, every page | 101,561 (29,691 gzip) | 75,904 (26,164 gzip) | **-25,657 (-3,527 gzip)** |
| `feat-data.<hash>.js` | not emitted | 26,138 (3,344 gzip) | +26,138 (+3,344 gzip) |

The document grew by 1,182 bytes because the view carries three `x-show` lines
and their commentary; 453 bytes gzipped, against 3,527 saved on every page.

Reading the table by who pays it:

- **A cold visit to any of the other 128 pages is 3,527 gzip bytes cheaper**,
  and stays that way forever. This is the whole of the `SPEC.md` Section 3 win,
  expressed as a byte count rather than as a principle.
- **A cold visit to the Feat Explorer page is a wash**: 37,993 -> 38,263 gzip,
  **+0.7%**, because the dataset compresses 7.8:1 and that page was already
  paying for it. What changes is that it now pays over a second request instead
  of inside the first.
- **A repeat visit is a wash only if nothing else changed.** Before, any edit
  anywhere in the site-wide bundle re-downloaded the dataset along with it;
  after, the dataset is a separate asset that stays cached. So the saving is
  3,527 gzip bytes per repeat visit whenever the entrypoint's hash has moved,
  and nothing at all when it has not.

### What this does not fix

**A data change still rehashes the entrypoint.** The loader in the entrypoint
names the chunk by its content-hashed URL - `import(\`./feat-data.C2C1eo5p.js\`)` -
so editing one feat changes the data chunk's filename *and* the entrypoint's,
and all 129 pages still refetch the bundle. Measured: editing one record's name
moved `feat-data.C2C1eo5p.js` -> `feat-data.BAJBNDUf.js` and
`page.CesuK9yP.js` -> `page.BSxIUUc4.js` together.

This is a property of content hashing, not of this decision, and it is worth
stating plainly because it is the more attractive-sounding half of the story and
it is not true here. The blast radius is *reduced* by the dataset's size, not
eliminated. What would eliminate it is a stable filename for the dataset, which
would trade the cache-busting property this ticket asks for for one the ticket
does not, so it was not worth taking.

Verified in the other direction: two consecutive builds of an unchanged dataset
emit byte-identical filenames for both assets, so an unchanged dataset busts
nothing.

### No preload link

The obvious mitigation for the extra round trip is a
`<link rel="modulepreload">` in the view. There is no way to get the hashed URL
into the view for free, and the route that looked free was worse than the
problem: Vite's `?url` import emitted the module a **second** time, so the
build produced both `feat-data.C2C1eo5p.js` (26,138 bytes, the real chunk) and
`feat-data.Dqa5OA0D.js` (40,472 bytes, the `?url` copy, unminified) - a net loss
of 40KB on the very page the change was meant to shrink. The remaining route
would be reading the URL out of the build manifest, which is a custom Vite
integration to save one round trip. The extra request is accepted instead.

## Consequences

- Good, because the entrypoint every page loads is 25,657 bytes smaller, and
  the win is permanent rather than contingent on anyone visiting this page. The
  128 pages that have no use for 219 feats now stop paying for them.
- Good, because the dataset is cacheable on its own terms. Any edit to any of
  the five components in the entrypoint re-downloads the entrypoint; before this
  change that re-download carried the dataset with it on all 129 pages, and now
  it does not.
- Good, because the delivery is now exercised rather than assumed. The mounted
  DOM tests render `FeatExplorer` with no props - the shipped path, where the
  component fetches its own data - so all 14 runtime tests drive the real
  delivery instead of a stand-in. They await `featDataset()` rather than
  sleeping, so the ordering is deterministic rather than lucky.
- Good, because the graph test needed no change to keep working: its
  `import('x')` pattern already treated a dynamic import as an edge, which is
  the correct reading of one.
- Neutral, because the component grows a three-state `datasetState`
  (`loading` / `ready` / `failed`) and the view grows two lines of copy for it.
  The old single boolean could not distinguish "no feats have arrived" from
  "the filters excluded everything", and the second is a message the reader is
  entitled to.
- Bad, because the arriving dataset makes the component's state briefly
  inconsistent with the reader's input. `init()` re-runs `filterFeats()` on
  arrival for exactly this reason, and there is a test for it - but the class of
  bug is real and any future lazily delivered field has to remember it.
- Bad, because a cold visit to this page now costs one extra round trip and
  0.7% more bytes than it did. The measured win is entirely on other pages and
  on repeat visits; this page is the side that pays. The loading copy in the
  head is the whole mitigation, and it is mitigation rather than a fix.
- Bad, because a data change still rehashes the site-wide entrypoint, so the
  invalidation this ticket's shape most invites is only narrowed, not removed.
  Recorded above with the measurement, because the alternative story is the more
  attractive one and it is false.
- Neutral, because `datasetState` and the two new lines are the component's
  entire no-JavaScript story. They are `x-cloak`ed, so a reader without
  JavaScript sees the heading, the search box and the tier key, and no count -
  which is an improvement on the previous behaviour, where it read "0 of 0
  feats on this sheet".
- Bad, because the memoised promise is module state, which is the one kind of
  state that survives across mounts. It is benign here - a dataset that cannot
  change within a page load - but it is a constraint on any future component
  that borrows the pattern.

## References

- [#387](https://github.com/sdelrio/dnd-astro/issues/387) - this decision
- [#379](https://github.com/sdelrio/dnd-astro/issues/379) - the named Alpine
  registration that made the alternative expressible; PR #390
- [#383](https://github.com/sdelrio/dnd-astro/issues/383) - the intersect plugin
  removal; PR #394, whose report noted the feat data riding in the entrypoint
- [ADR-0010](0010-alpine-data-registration.md): `Alpine.data`, never globals
  (why the dataset cannot be an argument any more)
- [ADR-0013](0013-browser-safe-data-module-boundary.md): the client-graph rule
  and the type-only import, which this uses rather than extends
- `docs/specs/006-feat-matrix/SPEC.md`: the feature spec, amended alongside this
- `SPEC.md` Section 3: Rule of Least Client-Side JavaScript