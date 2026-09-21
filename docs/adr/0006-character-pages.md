---
status: accepted
date: 2026-09-21
supersedes: null
superseded_by: null
tags: [routing, astro, starlight, character-pages, static]
---

# ADR-0006: Pre-render Character Pages as a Static Dynamic Route

## Context and Problem Statement

Clicking a card portrait should open a dedicated, full-width large view of that
character. The site is a static Astro + Starlight build served as Cloudflare
Workers static assets, and `SPEC.md` Section 3 requires the least client-side
JavaScript possible. All character data already exists at build time as a single
`characters.json` artifact keyed by `filename`.

How do we expose one page per character without adding client-side routing or
generated content files?

## Decision Drivers

- Align with SPEC.md Section 3 "Rule of Least Client-Side JavaScript"
- Keep character pages statically prerendered and deep-linkable
- Reuse the existing `characters.json` build artifact and `filename` key
- Keep generated output out of the content collection
- Preserve Starlight chrome (header, theme, navigation) for consistency

## Considered Options

- **Option A: Astro dynamic route** - a single `[slug].astro` route under
  `src/pages/` with `getStaticPaths()` over `characters.json`, wrapped in
  Starlight's `StarlightPage` component. Prerenders one HTML file per character,
  no new client JavaScript.
- **Option B: Generated MDX content files** - the build hook writes one `.mdx`
  file per character into the docs content collection with `sidebar.hidden`.
  Keeps pages in the collection, but writes generated files into `src/content/`
  and couples page generation to content sync timing.
- **Option C: One client-side query-param page** - a single page that reads a
  `?name=` parameter with Alpine and renders the matching card from JSON. One
  URL for all characters, weak sharing and SEO, and more client JavaScript.
- **Option D: Modal overlay** - open the large card in a `<dialog>` on the
  current page. No URL, no deep link, and duplicates the large markup into every
  listing page.

## Decision Outcome

Chosen option: **Option A** - an Astro dynamic route wrapped in `StarlightPage`.

The route lives at `/fantasy-grounds/characters/[slug]`, where `slug` is the
character `filename`. It renders the card at `display="large"` with the card's
portrait link suppressed, hides the sidebar for a full-width printable sheet,
excludes itself from Pagefind, and hides the site header and back link when
printed.

### Consequences

- Good, because every character gets a stable, shareable, prerendered URL with
  zero added client JavaScript.
- Good, because it reuses `characters.json` and `filename` directly, so no slug
  utility or generated content files are needed.
- Good, because `StarlightPage` supplies the site chrome without a content
  collection entry.
- Neutral, because `hasSidebar: false` caps content at Starlight's default width
  (`67.5rem`), so the route needs a small global style override for true full
  width.
- Bad, because printing while the site is in dark mode prints a dark card:
  Tailwind's `dark:` variant keys off `[data-theme='dark']`, which Starlight's
  built-in print stylesheet does not reset. Accepted as a known limitation.

## References

- `docs/specs/013-character-pages/SPEC.md`
- ADR-0001: Icon Component Strategy (zero-JS static hydration precedent)
- `SPEC.md` Section 3: Rule of Least Client-Side JavaScript
