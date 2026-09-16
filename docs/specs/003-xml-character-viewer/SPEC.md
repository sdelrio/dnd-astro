---
status: archived
title: "XML Character Sheet Viewer"
author: "opencode (grill-with-docs)"
date: "2026-09-13"
tags: [xml, fantasy-grounds, character-sheet, alpine-js, build-time, party]
affects:
  - src/components/xml-viewer/
  - src/utils/
  - src/assets/fantasy-grounds-sheets/
  - src/content/docs/
  - public/fg/
  - astro.config.mjs
  - package.json
adr_constraints:
  - 0001
---

# SPEC: XML Character Sheet Viewer

## Summary

Migrate the Fantasy Grounds XML Character Sheet Viewer from Docusaurus (golden-forest) to Astro, replacing client-side DOMParser with build-time XML parsing via `fast-xml-parser`, rendering character cards with Alpine.js and Tailwind CSS, and providing a `<PartyView>` component for aggregate party statistics.

## Problem Statement

The golden-forest project has 112 Fantasy Grounds XML character sheets rendered by a Docusaurus React component (`XmlChar`). This component parses XML client-side via `DOMParser`, fetches images at runtime, and depends on Docusaurus-specific APIs (`useBaseUrl`, `BrowserOnly`). The dnd-astro project needs to migrate this functionality to Astro's static-first architecture, eliminating client-side XML parsing and aligning with the "Rule of Least Client-Side JavaScript" from SPEC.md Section 3.

## Goals

- Parse all 112 XML character sheets at build time using Node.js (`fast-xml-parser`)
- Render character cards in three display modes (small/medium/large) using Alpine.js + Tailwind CSS
- Pre-resolve avatar image paths at build time (`.jpg` → `.png` → `faceless.svg` fallback)
- Provide a `<PartyView>` component that reads `party.json` and renders aggregate party stats + member cards
- Store XML source files in `src/assets/fantasy-grounds-sheets/` and avatar images in `public/fg/avatar/`
- Keep client-side JavaScript minimal — only Alpine.js for display-mode toggles and expand/collapse interactions
- Support inline usage in Starlight MDX pages and standalone character pages

## Non-Goals

- Dark mode styling overrides (deferred to a separate ADR/spec)
- SkeletonLoader for loading states (deferred to a separate ADR/spec)
- Dice Roller island (separate spec)
- Feat Matrix island (separate spec)
- React integration for the XML Viewer (Alpine.js chosen instead)
- Real-time XML file ingestion after build (closed set of 112 files, rebuilt on deploy)

## Implementation Plan

### Step 1: Install Dependencies

Add `fast-xml-parser` to `package.json` for build-time XML parsing.

```
pnpm add fast-xml-parser
```

Alpine.js is already configured via `@astrojs/alpinejs`.

### Step 2: Create Build-Time XML Parser

Create `src/utils/parse-character-xml.ts` — a pure Node.js module that:
- Reads an XML string input
- Parses it using `fast-xml-parser`'s `XMLParser` with appropriate options (`ignoreAttributes: false`, `attributeNamePrefix: "@_"`, `textNodeName: "#text"`)
- Extracts and returns a typed character data object

The parser must handle Fantasy Grounds XML quirks:
- `type="number"` and `type="string"` attributes on value nodes
- Nested `<classes>`, `<abilities>`, `<skilllist>`, `<languagelist>`, `<featlist>`, `<featurelist>`, `<powers>` child collections using `id-NNNNN` keys
- `<defenses><ac><total>` nesting for AC
- `<hp><total>`, `<speed><total>`, `<initiative><total>` nesting
- `<profbonus>` as a direct child text node
- `<powers>` only matching direct children of `<character>` (not nested `<powers/>` inside inventory items)

Output shape (TypeScript interface):

```typescript
interface CharacterData {
  name: string;
  race: string;
  alignment: string;
  background: string;
  deity: string;
  classes: { name: string; level: number }[];
  abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }>;
  ac: number;
  hp: number;
  speed: number;
  initiative: number;
  profBonus: number;
  skills: { name: string; total: number }[];
  languages: string[];
  feats: string[];
  features: { level: number; name: number; source: string }[];
  powers: { level: number; name: string; group: string }[];
  filename?: string;
}
```

### Step 3: Create Astro Integration for Build-Time Parsing

Add a build hook in `astro.config.mjs` using `astro:build:start` (or `astro:config:setup` if earlier access is needed). The hook:

1. Reads all `.xml` files from `src/assets/fantasy-grounds-sheets/`
2. Parses each using `parseCharacterXml`
3. Resolves avatar image paths: probe `public/fg/avatar/{filename}.jpg` → `public/fg/avatar/{filename}.png` → `public/fg/avatar/faceless.svg`
4. Writes the resulting JSON array to a build artifact at `src/generated/characters.json`

The JSON is then importable by components during the Astro build.

### Step 4: Create `signed()` Utility

Create `src/utils/format.ts` with the `signed()` function:

```typescript
export function signed(number: number): string {
  return number >= 0 ? `+${number}` : `${number}`;
}
```

Only `signed()` is needed. `formatNumber` and `timeAgo` from golden-forest are not used by the character viewer.

### Step 5: Create XmlCard Component

Create `src/components/xml-viewer/XmlCard.astro` — a static Astro component that:
- Accepts a `character` prop (the parsed `CharacterData` JSON)
- Accepts a `display` prop: `'small' | 'medium' | 'large'` (default `'medium'`)
- Accepts an optional `image` prop for avatar override (large mode only)
- Renders the character card as semantic HTML + Tailwind CSS classes
- Embeds the character data as a JSON data attribute for Alpine.js to consume
- Uses Alpine.js `x-data` for display-mode toggle and expand/collapse state

Display modes:
- **small** (max-width 360px): Compact card — name, race/class/level, vitals grid, compact abilities (MOD + SAVE columns). Inline-block for side-by-side flow.
- **medium** (max-width 480px): Name, race/class/alignment/background/deity, vitals, full abilities grid, saving throws, proficient skills, languages, proficiency bonus.
- **large** (max-width 710px): All of medium + portrait image, feats, features (grouped by level), powers (grouped by level + group).

Avatar resolution (build-time):
- If `image` prop provided, use `public/fg/avatar/{image}`
- Else probe `public/fg/avatar/{filename}.jpg`, then `.png`
- Fallback to `public/fg/avatar/faceless.svg`

Usage in MDX:

```mdx
import XmlCard from '../../../components/xml-viewer/XmlCard.astro';

<XmlCard character={draknorData} display="small" />
```

### Step 6: Create PartyView Component

Create `src/components/xml-viewer/PartyView.astro` — a static Astro component that:
- Reads `party.json` from `public/fg/party.json` at build time (via `fs.readFileSync`)
- For each member, loads the corresponding parsed character JSON
- Pre-renders aggregate statistics:
  - Total HP (sum of all characters)
  - Average AC (mean across party)
  - Average initiative (mean across party)
  - Total level (sum of all class levels)
  - Role breakdown (count per role from party.json)
- Renders member cards using `<XmlCard>` in small display mode
- Uses Alpine.js for interactive role filtering (filter cards by role)

Role config (ported from golden-forest):

```typescript
const ROLE_CONFIG = {
  tank: { icon: 'game-icons:shield', label: 'Tank', color: '#4a90d9' },
  healer: { icon: 'game-icons:heart-plus', label: 'Healer', color: '#5cb85c' },
  damage: { icon: 'game-icons:crossed-swords', label: 'Damage Dealer', color: '#d9534f' },
  support: { icon: 'game-icons:scroll-unfurled', label: 'Support', color: '#f0ad4e' },
  utility: { icon: 'game-icons:monkey-wrench', label: 'Utility', color: '#9b59b6' },
};
```

Icons rendered via `IconifyIcon.astro` (ADR-0001) — zero client JS.

Usage in MDX:

```mdx
import PartyView from '../../../components/xml-viewer/PartyView.astro';

<PartyView />
```

### Step 7: Create Current Party MDX Page

Create `src/content/docs/dnd/fantasy-grounds/current-party.mdx`:

```mdx
---
title: Current Party
description: Active party character sheets from Fantasy Grounds
tableOfContents: false
sidebar:
  hidden: true
---

import PartyView from '@/components/xml-viewer/PartyView.astro';

# Current Party

<PartyView />
```

### Step 8: Move Static Assets

1. Copy all `.xml` files from `golden-forest/static/fg/chars/` to `src/assets/fantasy-grounds-sheets/`
2. Copy all avatar images from `golden-forest/static/fg/avatar/` to `public/fg/avatar/`
3. Copy `party.json` from `golden-forest/static/fg/party.json` to `public/fg/party.json`
4. Copy `index.json` from `golden-forest/static/fg/chars/index.json` to `public/fg/chars/index.json`

### Step 9: Add Sidebar Entry

Update `astro.config.mjs` sidebar to include a Fantasy Grounds section:

```javascript
{
  label: 'Fantasy Grounds',
  items: [
    { label: 'Current Party', slug: 'fantasy-grounds/current-party' },
  ],
}
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | modify | Add `fast-xml-parser` dependency |
| `src/utils/parse-character-xml.ts` | create | Build-time XML parser (Node.js) |
| `src/utils/format.ts` | create | `signed()` number formatter |
| `src/components/xml-viewer/XmlCard.astro` | create | Single character card component |
| `src/components/xml-viewer/PartyView.astro` | create | Party aggregate + member cards |
| `src/content/docs/fantasy-grounds/current-party.mdx` | create | Party page in Starlight |
| `src/assets/fantasy-grounds-sheets/` | create | XML source files (112 files) |
| `public/fg/avatar/` | create | Avatar images |
| `public/fg/party.json` | create | Party roster config |
| `public/fg/chars/index.json` | create | Pre-built character index |
| `astro.config.mjs` | modify | Add build hook + sidebar entry |
| `docs/specs/003-xml-character-viewer/SPEC.md` | create | This spec |

## ADR Constraints

| ADR | Title | Constraint |
|-----|-------|------------|
| 0001 | Icon Component Strategy | Use `IconifyIcon.astro` for role icons in PartyView, not `@iconify/react` |

## Testing

- **Build verification**: Run `astro build` and confirm no errors from XML parsing or component rendering
- **Visual parity**: Compare rendered character cards against golden-forest at 3 display modes
- **Avatar resolution**: Verify `.jpg` → `.png` → `faceless.svg` fallback for characters with/without avatars
- **PartyView aggregate stats**: Verify total HP, avg AC, avg init match manual calculation from XML data
- **MDX integration**: Confirm `<XmlCard>` and `<PartyView>` render correctly inside Starlight MDX pages
- **Bundle check**: Verify no React runtime is included in pages that only use XML Viewer components
- **Alpine.js scope**: Confirm Alpine.js only activates on XML Viewer components, not globally

## Rollback

- Remove `src/components/xml-viewer/` directory
- Remove `src/utils/parse-character-xml.ts` and `src/utils/format.ts`
- Remove `src/assets/fantasy-grounds-sheets/` directory
- Remove `public/fg/` directory
- Remove `fast-xml-parser` from `package.json`
- Revert `astro.config.mjs` changes (build hook + sidebar)
- Remove `src/content/docs/fantasy-grounds/` directory

## Accepted Deviations

The following deviations from this spec were accepted during implementation (PR #29, code-review rounds 1–3) and are recorded here to prevent re-flagging in future reviews.

### 1. Build artifact path: `src/generated/` not `.astro/generated/`

The original spec called for `.astro/generated/characters.json`. The actual location is `src/generated/characters.json`. Reason: `.astro/` is not module-resolvable by Astro's import system; placing the artifact under `src/` makes it importable during the build without additional configuration.

### 2. Role icons: `game-icons:` not `mdi:`

The original spec's `ROLE_CONFIG` used `mdi:*` icons. The implementation uses `game-icons:*` instead. Reason: `IconifyIcon.astro` ([ADR-0001](../adr/0001-icon-component.md)) ships the `game-icons` set by default; the `mdi` set was added later. The `game-icons` set has broader coverage for the D&D domain (shields, swords, scrolls, etc.) and the icons were already in use across the documentation pages.

### 3. Party page frontmatter: `sidebar.hidden` + `tableOfContents: false`

The original spec's current-party.mdx template omitted sidebar and ToC frontmatter. The implementation adds `sidebar.hidden: true` and `tableOfContents: false`. This commit updates both the spec and the implementation to match. Reason: the page is a showcase component, not a navigation destination; hiding the sidebar avoids a duplicate entry and the page has no headings worth a ToC.

### 4. Parser extensions: `saveprof` and `filename`

The original spec's `CharacterData` interface did not include `saveprof` or `filename`. The implementation adds both, and this commit updates the spec to match:
- `saveprof: number` on each ability — required by Step 5's proficient-only save filtering.
- `filename?: string` — set by the build hook as the array lookup key and avatar base name.

### 5. Test page for visual verification

The spec assumes working Tailwind classes but does not mention a test page. The implementation creates `src/content/docs/guides/xml-card-test.mdx` for visual verification of the XmlCard component.

### 6. Tailwind `@/*` path alias

The spec's MDX import examples use relative paths (`../../../components/...`). The implementation uses the `@/components/...` alias provided by Astro's path configuration, which is shorter and resilient to directory restructuring.

## Status

- [x] Implementation complete (all steps delivered across PRs #27-#46)
- [x] Tests passing (build verified, no XML parsing errors)
- [x] ADR updated (if new decision made)
