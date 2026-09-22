---
status: archived
title: "FG Effects Page Migration with Mermaid"
author: "opencode (grill-with-docs)"
date: "2026-09-22"
tags: [fantasy-grounds, mermaid, migration, starlight, diagrams, fg-effects]
affects:
  - package.json
  - astro.config.mjs
  - src/content/docs/fantasy-grounds/fg-effects.mdx
  - src/content/docs/index.mdx
  - docs/specs/014-fg-effects-migration/
adr_constraints:
  - 0007
---

# SPEC: FG Effects Page Migration with Mermaid

## Summary

Publish golden-forest's Fantasy Grounds effects reference as
`/fantasy-grounds/fg-effects/`, with its `sequenceDiagram` rendered as a real
Mermaid diagram, and link it from the home page and the Fantasy Grounds sidebar.

## Problem Statement

The golden-forest Docusaurus site documents the table's Fantasy Grounds BCE Gold
effects, but that content does not exist on the dnd-astro site. The home page
already advertises an "FG Effects" item, and the page's "How it Works" section
ends in a Mermaid `sequenceDiagram` that Docusaurus rendered inline. A plain
markdown port would leave that diagram as an unrendered code block, and the
prose around it reads as a walkthrough of the diagram.

## Goals

- Port the source document to `src/content/docs/fantasy-grounds/fg-effects.mdx`
  with all effect strings and rule text byte-exact.
- Render the `sequenceDiagram` as a real Mermaid diagram in light and dark mode
  using the `astro-mermaid` integration (ADR-0007).
- Replace the source's `@iconify/react` icon with the local `IconifyIcon`
  component so the page ships no React renderer (ADR-0001).
- Keep the `<details>`/`<summary>` block and the `:::note` admonition working
  as-is.
- Make the page reachable from the home page "FG Effects" item and from the
  Fantasy Grounds sidebar.

## Non-Goals

- Changing any effect string, rule text, table row, or section order from the
  source.
- Converting the `<details>` block to a Starlight component or to `<Tabs>`.
- Adding Mermaid support beyond this one diagram.
- Styling Mermaid diagrams with custom CSS.
- Migrating any other golden-forest Fantasy Grounds page.

## Implementation Plan

### Step 1: Add Mermaid rendering (ADR-0007)

- Add `astro-mermaid` and its `mermaid` peer to `package.json` dependencies.
- Register the integration in `astro.config.mjs` before `starlight()`.
- Confirm the fenced `mermaid` code block renders client-side and follows the
  active light/dark theme.

### Step 2: Create the migrated page

Create `src/content/docs/fantasy-grounds/fg-effects.mdx`:

- Frontmatter, with no `sidebar.hidden` so the page belongs to the sidebar:

  ```yaml
  title: Fantasy Grounds Effects
  description: Automation effects, conditional operators, and macros for the Fantasy Grounds BCE Gold extension.
  tags: [fantasy-grounds, fg-effects, bce, automation, dnd]
  ```

- Import `IconifyIcon` from `../../../components/IconifyIcon.astro` and replace
  the source's `<Icon icon="material-symbols:download" width="1.25em" />` with
  `<IconifyIcon icon="mdi:download" width="1.25em" />`; remove the
  `@iconify/react` import (ADR-0001: no React renderer, zero client JS).
- Remove the redundant H1; Starlight renders the frontmatter `title`.
- Keep the Docusaurus `<details>`/`<summary>` block as native HTML. Starlight
  styles native details, so no conversion is needed.
- Keep the `:::note Effect Naming` admonition as-is (ADR-0004).
- Keep every section (BCE Gold, Larger Than Life Feat, Attack & Damage
  Differentiation, Ongoing Saves & Effects, Macros, Conditional Operators,
  Special Utility Tags) with effect strings, rule text, table rows, and
  emphasis markers byte-exact. Only frontmatter, imports, the H1 removal, and
  admonition-safe changes are made.

### Step 3: Add the sidebar entry

In `astro.config.mjs`, add to the Fantasy Grounds sidebar group:

```javascript
{ label: 'FG Effects', slug: 'fantasy-grounds/fg-effects' },
```

### Step 4: Link from the home page

In `src/content/docs/index.mdx`, turn the "FG Effects" list item into an anchor
to `/fantasy-grounds/fg-effects/`, keeping the `mdi:magic-staff` icon and the
existing description:

```mdx
<span><strong><a href="/fantasy-grounds/fg-effects/">FG Effects</a></strong> - Advanced automation tips, conditional operators, and custom effects for Fantasy Grounds.</span>
```

### Step 5: Verify the rendered diagram

- Build the site and confirm the generated page includes the diagram (or the
  Mermaid script payload that renders it).
- In the dev server, toggle the theme and confirm the diagram follows light and
  dark mode.

## Files to Create/Modify

- `package.json` - add `astro-mermaid` and its `mermaid` peer
- `astro.config.mjs` - register the integration before `starlight()`; add the
  Fantasy Grounds sidebar entry
- `src/content/docs/fantasy-grounds/fg-effects.mdx` - new migrated page
- `src/content/docs/index.mdx` - anchor the "FG Effects" item
- `docs/specs/014-fg-effects-migration/` - this spec and ADR-0007

## ADR Constraints

| ADR | Title | Constraint |
|-----|-------|------------|
| 0007 | Render Mermaid Diagrams with the astro-mermaid Integration | Render the `sequenceDiagram` with `astro-mermaid` registered before `starlight()`; do not add a Playwright build dependency or drop the diagram |

## Testing

Run the AGENTS.md verification commands from the repo root:

- `pnpm lint`
- `CI=true pnpm typecheck`
- `pnpm test`
- `pnpm build`

Then verify the migration itself:

- `pnpm build` emits `/fantasy-grounds/fg-effects/index.html`, and the page
  includes the rendered diagram (or the Mermaid script payload).
- In `pnpm dev`, the "How it Works" `sequenceDiagram` renders as a diagram and
  follows the light/dark theme toggle.
- No `@iconify/react` import remains, and the PDF link renders the
  `mdi:download` inline SVG.
- The ported effect strings and rule text match the source document
  byte-for-byte; only frontmatter, imports, and the H1 removal differ.
- The "FG Effects" home page item and the sidebar entry both reach
  `/fantasy-grounds/fg-effects/`.

## Rollback

- Delete `src/content/docs/fantasy-grounds/fg-effects.mdx`.
- Revert the sidebar entry and the home page anchor.
- Remove `astro-mermaid` and `mermaid` from `package.json` and the integration
  from `astro.config.mjs`.

## Status

- [x] Implementation complete
- [x] Tests passing
- [x] ADR updated (ADR-0007 written)
