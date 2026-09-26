---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [alpine, architecture, build-time, client-side, module-graph, astro]
---

# ADR-0013: Split Browser-Safe Data Out of Build-Side Modules, and Import It Type-Only

## Context and Problem Statement

Under `astro dev` the entire site was inert. Markup rendered, because the pages
are prerendered, but no Alpine component responded: the Point Buy buttons did
nothing, the dice roller did not roll, feat filters did not narrow the list, the
party view's role chips did not toggle, character search did not filter. Every
page was affected, not only the tool pages, because `src/alpine.ts` is injected
into all of them.

The cause was one import edge. `src/components/xml-viewer/party-view-component.ts`
(the party view's Alpine behaviour, registered by ADR-0010 and therefore in the
browser's module graph) imported `ROLE_CONFIG` and `Role` from
`party-roster.ts`, which reads the roster JSON off disk with `readFileSync`. Under
the dev server that edge is served to the browser, Vite externalises `node:fs`
behind a stub that throws on property access, and because module evaluation is
atomic the throw lands before the entrypoint's last statement. `Alpine.start()`
never runs. Nothing was wrong with the components themselves; they were simply
never wired up.

The same edge also appeared in `pnpm build` as
`Module "node:fs" has been externalized for browser compatibility, imported by
.../party-roster.ts`. The build still succeeded, because nothing in the client
graph used the file read, so the bundler dropped the read and never evaluated
the stub. Two symptoms, one defect - and the build warning is the cheaper of the
two signals to check, because it needs no browser.

The gates that already exist are structurally blind to this, for reasons that
are not oversights. `pnpm lint` has nothing to say: both ends of the edge are
valid TypeScript. The type checker is the same story - the roster module's
`readFileSync` is correctly typed for a Node module, and nothing in the type
system distinguishes an import that will be evaluated in a browser from one that
will not. The DOM harness mounts components in Node, where `readFileSync`
resolves perfectly, so the very suite ADR-0010 added to catch broken Alpine
expressions passes. And the production build tree-shakes the unused read away
along with its import, so the shipped bundle is clean and the built site works
correctly. The failure is dev-only. In short, the runtime tools erase the very
shape of the defect and the compiler permits it, so the browser is the only
place it appears - and it appears by throwing, before `Alpine.start()`. Because
evaluation is atomic, that one edge disables interactivity on every page of the
site rather than on the one component that introduced it: the blast radius is
the site, not the widget. A test of the module graph is therefore part of this
decision, not an optional extra that a later ticket may add.

The awkward part is that the shared data is genuinely shared. The role config is
needed at build time (to render the chips and the pills) and in the browser (as
the type of a reactive field on the party view component). The obvious
refactor - move the values out, then re-export them from the roster module so
existing imports keep working - would have restored a working import path from
client code to a module that reads the filesystem, which is the whole defect.

To be clear about what is and is not wrong here: the roster module's
dependency on the filesystem is legitimate in principle. This is a prerendered
Astro site, and reading a data file off disk at build time is exactly the right
way to turn that file into HTML. Nothing in this decision argues against
build-time file reads. The narrower rule is that they do not belong in a module
the browser can reach, so the read and the data have to live on opposite sides
of the boundary.

## Decision Drivers

- `SPEC.md` Section 3's Rule of Least Client-Side JavaScript depends on the client
  graph being exactly the code that runs in the browser
- A dev server that cannot run the site is a bigger cost than a client graph that
  is one module too wide
- A silent regression here costs the whole site, and no behavioural test can see
  it, because the tests mount components in Node where `readFileSync` works
- The accessibility reasoning attached to the role hues must not be separated
  from the values it explains
- Consumers should not need a `typeof` query against a value to name a type

## Considered Options

- **Re-export the role data from the roster module.** Keeps every existing
  import working and reads as the smallest diff. Rejected: it makes a wrong
  import a *working* one, so the next client component to reach for the roster
  module reintroduces the defect invisibly.
- **Move `readFileSync` behind a build-only boundary, for example a
  `*.server.ts` suffix or a Vite plugin filter.** Tempting, because it fixes the
  general case. Rejected here as speculative: it adds a mechanism nothing else
  needs, and Astro's own build-time-only convention (`import ... with
  { type: 'json' }`, or passing data down through `Astro.props`) already covers
  the pattern if a second case appears.
- **Pass the role config down through the DOM and drop the type import.** The
  component already reads it from `data-role-config` at runtime, so the type-only
  import could be removed entirely. Rejected as the primary fix: it leaves the
  type unavailable where a consumer needs it, and the issue's shape - a named
  type for one role's config - is the better answer. The dataset stays.
- **Rely on the suite that already exists.** The DOM harness from ADR-0010
  already boots a real Alpine over real markup, so it is the obvious place to
  expect the regression to surface, and adding nothing would be the cheapest
  outcome. Rejected, and rejected on evidence rather than principle: the harness
  runs under a Node test environment, so the import that breaks the browser
  resolves perfectly in the test, every test in the repo passed while the entire
  site was inert under `astro dev`, and the production build erased the import
  before it could be observed. No amount of additional coverage in that harness
  changes where it runs, so the suite cannot be the net. The net has to assert a
  property of the module graph statically, which is a new kind of test for this
  repo and is why it is called out as part of the decision.
- **Split the data into its own import-free module; client components take it as
  a type-only import; the build side imports the values; the build side does not
  re-export.** Chosen.

## Decision Outcome

Chosen option: the browser-safe data lives in a module with no imports of its
own. `src/components/xml-viewer/party-roles.ts` holds the per-role config, the
`Role` name type, `ALL_ROLES`, and a named `RoleConfig` type for one role's
entry. The roster module imports the values it needs and does not re-export
them. The party view's client component imports only types, which the compiler
erases, so no runtime edge survives.

Three rules follow, and each of them is a rule about *how* not just *what*:

- **A browser-bound module may not reach a build-side module, not even for a
  value it happens not to call.** The failure is structural: one unused import is
  enough, and "unused" is a property of the code today, not a guarantee about
  tomorrow.
- **A type-only import is the whole mechanism.** `import type` is erased at
  compile time, so it leaves no edge to resolve, nothing to externalise and
  nothing to throw on. This is why `RoleConfig` is a named type: a consumer can
  name the shape without a `typeof` query against a value, and a `typeof` query
  is a value import wearing a type hat.
- **The build side imports; it does not re-export.** A client component reaching
  for the roster module is then a visibly wrong import - no such export - rather
  than one that quietly works and drags `node:fs` in behind it.

Data that a browser-bound module needs at runtime still arrives through the DOM,
which is what ADR-0010's `dataset` pattern already established: the view
serialises it into a data attribute and the component parses it in `init()`.
A type-only import describes the shape of what came back.

### Consequences

- Good, because `astro dev` runs the site again, and `make measure` works against
  the dev server, which it previously refused to.
- Good, because the rule is a property of the module graph, so a test can assert
  it statically. `src/alpine-client-graph.test.ts` is the enforcement mechanism
  for the first rule: it walks first-party imports from `src/alpine.ts`, refuses
  any Node builtin it finds, and reports the import chain that reached it. It
  also sweeps the client scripts embedded in `.astro` files, so a self-
  registering component gets the same net without being wired through the
  entrypoint, and it does not traverse third-party packages, so a dependency's
  own internals cannot fail this repo's build. `party-roles.test.ts` covers this
  module specifically: the data module has no imports of its own, the roster
  module imports it and does not re-export it, and the client component's import
  stays type-only. All of them fail loudly if the defect is reintroduced.
- Good, because the build warning is now a usable regression signal on its own:
  a clean `pnpm build` log is a check that needs no browser.
- Neutral, because there is one more module and one more indirection to follow
  when looking for the role config.
- Bad, because the boundary is a convention plus a test, not a property the
  toolchain enforces. A new build-side module can still be imported from client
  code, and the failure mode when that happens is the whole site going inert
  rather than one component misbehaving. The graph test is what stands between
  that mistake and a merge, and it is a lint-style net rather than a proof: it
  knows which specifiers are first-party and which are type-only, so an edge
  spelled in a way it does not recognise would pass it. Keeping it accurate is
  ongoing work, not a one-off.
- Neutral, because the `Role` and `RoleConfig` types are structurally decoupled
  from the values at the point of use, so a drift between the data attribute the
  view writes and the type the component declares would not be caught by the
  type checker. `init()` parsing that JSON is a cast, and ADR-0010 already
  accepted casts of that kind for the same reason.

## Links

- [#351](https://github.com/sdelrio/dnd-astro/issues/351) - the inert dev server
- [#352](https://github.com/sdelrio/dnd-astro/issues/352) - the client graph
  guard test, the enforcement this decision calls for
- [#354](https://github.com/sdelrio/dnd-astro/issues/354) - measuring against the dev server, unblocked by this
- ADR-0010: Register Alpine Components with `Alpine.data`, Never `window` Globals
  (the cause: it put the party view's behaviour in the client graph, which is
  what made the roster import reachable from the browser)
- ADR-0007: Render Mermaid Diagrams with the astro-mermaid Integration (the
  client graph must stay free of Node builtins; the build stays free of a
  headless browser)
