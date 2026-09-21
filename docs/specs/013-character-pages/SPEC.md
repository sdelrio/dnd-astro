---
status: active
title: "Character Pages"
author: "opencode (grill-with-docs)"
date: "2026-09-21"
tags: [character-page, routing, starlight, xml-card, fantasy-grounds, print, seo]
affects:
  - src/pages/fantasy-grounds/characters/[slug].astro
  - src/pages/fantasy-grounds/characters/_character-page.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/CharSearch.astro
  - src/components/xml-viewer/PartyView.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/content/docs/guides/xml-card-test.mdx
adr_constraints:
  - 0006
---

# SPEC: Character Pages

## Summary

Clicking any card portrait opens a dedicated, prerendered, full-width character
page showing that character's sheet as a single large card. Every card links by
default, deriving its URL from the character `filename`.

## Problem Statement

Cards only render at the size their host page chooses, so there is no way to see
a full sheet, share a link to one character, or print one. There is also no URL
per character for search or bookmarks. The card must not own navigation, so the
link target has to be generated somewhere and the card must expose it.

## Goals

- One prerendered page per character at `/fantasy-grounds/characters/<filename>`.
- Every card portrait links to its character page by default, with an opt-out.
- The character page renders a single full-width large card with no sidebar, and
  hides the site header and back link when printed.
- Character pages stay out of the site menu and out of Pagefind.

## Non-Goals

- A modal or in-place expand interaction.
- A new character index page (Character Search already lists every card).
- A sitemap integration, a print button, or page-break tuning.
- Fixing dark-mode printing (accepted limitation, see ADR-0006).
- Changing which sections a large card shows.

## Implementation Plan

### Step 1: Auto-link the card portrait

In `XmlCard`:

- Add an optional `link` prop, default `true`.
- When `character.filename` is present and `link` is true, derive the target
  `/fantasy-grounds/characters/<filename>` and wrap the portrait `<img>` in an
  `<a>`.
- Give the link `aria-label="View <name> character sheet"`, keep the existing
  `title={name}` on the image, and add a subtle hover affordance
  (ring/cursor) so the portrait reads as clickable.
- When `filename` is missing or `link` is false, render the plain `<img>` as
  today.
- Consumers need no changes: `CharSearch`, `PartyView`, and the visual test
  page all pass real characters with a `filename`.

### Step 2: Add the character page route

Create the route at `src/pages/fantasy-grounds/characters/[slug].astro`:

- `getStaticPaths()` imports `characters.json` and returns one path per entry,
  with `params.slug = filename` and the entry as `props`.
- Wrap the content in Starlight's `StarlightPage` with `hasSidebar={false}` and
  frontmatter: `title` = character name, a description derived from race and
  class, `tableOfContents: false`, `pagefind: false`.
- Render a "Back to Character Search" link (hidden when printing) and the
  character's card at `display="large"` with `link={false}` so the portrait does
  not self-link.
- Hide Starlight's page title so the card header is the visual heading; the
  frontmatter title still drives the document `<title>`.
- Add a route-scoped global style that widens the content container for a
  full-width sheet, and a print rule that hides the site header.

### Step 3: Update tests

- Add a `getStaticPaths` test that imports the route module and asserts one path
  per `characters.json` entry with `slug` equal to `filename`.
- Extend the `XmlCard` render tests to assert the portrait links to the derived
  URL with the expected `aria-label`, and that `link={false}` renders no anchor.
- Add a render assertion for the character page that it contains the large card
  and the back link.

### Step 4: Update the visual test page

- Note that portraits link to character pages, and that the test page's cards
  link to real pages.

## Files to Create/Modify

- `src/pages/fantasy-grounds/characters/[slug].astro` - new route
- `src/pages/fantasy-grounds/characters/_character-page.test.ts` - route tests
  (underscore-prefixed so Astro does not treat the file as an endpoint route)
- `src/components/xml-viewer/XmlCard.astro` - `link` prop and portrait anchor
- `src/components/xml-viewer/xml-card-passives.test.ts` - link render assertions
- `src/content/docs/guides/xml-card-test.mdx` - portrait link copy

## ADR Constraints

| ADR | Title | Constraint |
|-----|-------|------------|
| 0006 | Pre-render Character Pages as a Static Dynamic Route | Use an Astro dynamic route with `getStaticPaths` and `StarlightPage`; slug is the character `filename`; no client-side routing, modal, or generated content files |

## Testing

### Render tests (AstroContainer at the `XmlCard` seam)

Extend `src/components/xml-viewer/xml-card-passives.test.ts`:

- The portrait is wrapped in an anchor whose `href` is
  `/fantasy-grounds/characters/<filename>`.
- The anchor carries `aria-label="View <name> character sheet"`.
- `link={false}` renders no anchor around the portrait.

### Route tests (direct `getStaticPaths` import)

- `getStaticPaths()` returns one path per `characters.json` entry.
- Each path's `params.slug` equals the entry's `filename`.
- Each path's `props.character` is the entry.

### Manual verification

- `pnpm build` prerenders one HTML file per character.
- Clicking a portrait on Character Search, Current Party, and the visual test
  page opens the matching character page.
- The character page is full width, has no sidebar, is absent from the menu and
  from Pagefind results, and prints without the site header or back link.

## Rollback

- Delete `src/pages/fantasy-grounds/characters/` and the route tests.
- Revert the `link` prop and portrait anchor in `XmlCard`.
- Revert the test and visual-page changes.

## Status

- [ ] Implementation complete
- [ ] Tests passing
- [ ] ADR updated (ADR-0006 written)
