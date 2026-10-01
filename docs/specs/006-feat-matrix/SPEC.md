---
status: archived
title: "Book-Filtered Feat Matrix"
author: "opencode"
date: "2026-09-16"
tags: [feats, filtering, search, alpine-js, dnd, character-options]
affects:
  - src/components/feats-explorer/
  - src/content/docs/
  - astro.config.mjs
  - package.json
adr_constraints: []
---

# SPEC: Book-Filtered Feat Matrix

## Summary

An Alpine.js component for browsing and filtering D&D feats with fuzzy search, multi-select filters for ability, book, and level. Replaces the React-based FeatBrowser from golden-forest with a lighter, faster Alpine.js implementation that mounts eagerly with the feat dataset fetched from a generated, content-hashed module of the site's own. The behaviour is a registered Alpine module (`src/components/feats-explorer/feat-explorer-component.ts`, `x-data="featExplorer"`) rather than an inline script; see Accepted Deviation 6. The dataset is delivered by a dynamic import rather than bundled into the Alpine entrypoint; see Accepted Deviation 8.

## Problem Statement

Players need to quickly find feats during character creation and leveling. The golden-forest implementation uses React with Context API for filter state, which adds unnecessary runtime overhead. An Alpine.js implementation can provide instant client-side filtering with zero framework dependencies.

## Goals

- Display all feats in a scrollable, filterable grid
- Fuzzy search by feat name (substring + levenshtein distance)
- Filter by ability score (STR, DEX, CON, INT, WIS, CHA)
- Filter by source book (PHB, HOF, FEF, ECHH)
- Filter by level requirement (0, 4+)
- Show result count for current filters
- Clear all filters at once
- Eager mount (no `x-intersect` deferral), with the feat dataset arriving from its own content-hashed chunk rather than inlined into the document or into the site-wide Alpine entrypoint
- Zero React runtime dependency

## Non-Goals

- Individual feat detail pages (clicking a card) - future feature
- Sorting functionality (feats follow source MDX order from `scripts/extract-feats.js`; the extraction script does not sort)
- Pagination or virtual scrolling
- Server-side search API
- Integration with character sheet builder

## Data Schema

Each feat object has the following shape:

```typescript
interface Feat {
  name: string;           // "Alert", "Crafter", etc.
  level: number;          // 0 = origin feat, 4+ = general feat
  category: string;       // "Origin", "General", "Epic"
  book: string;           // "phb", "hof", "fef", "echh"
  abilityIncrease?: string[];  // ["Strength", "Dexterity"] or undefined
  prerequisite?: string;  // "Dexterity 13+", "Spellcasting feature", etc.
  description: string;    // Brief summary for card display
}
```

**The tier is derived from `level`, not from `category`.** The shipped
`FeatExplorer.astro` computes it as `level === 0 ? 'origin' : level >= 19 ? 'epic' : 'general'`. The `category` field above is not read anywhere in the component and cannot express the third tier: across all 219 records it carries only `Origin` and `General`, never `Epic`. Recorded here so a future reader does not assume the field is wired up. No data changed.

## Feat Data Source

Feat data was extracted once from the golden-forest project's MDX file at
`docs/Games/DnD/feats.md`, a path relative to a local golden-forest checkout. This
is a historical one-time source: the extraction output is committed as
`src/components/feats-explorer/feat-data.js`, so no golden-forest checkout is
needed for builds.

This file contains **219 feats** defined as `<Feat>` components with props:
- `name` (string) - feat name
- `level` (number) - 0 for origin, 4+ for general
- `book` (string) - phb, hof, fef, echh
- `abilityIncrease` (string[], optional) - ability scores increased
- `prerequisite` (string, optional) - level/ability prerequisites
- `youGain` (boolean/string, optional) - whether feat grants a "you gain" section

### Extraction Approach

A one-time script (`scripts/extract-feats.js`) parses the MDX file using regex to extract feat props. The script:
1. Reads `../golden-forest/docs/Games/DnD/feats.md` (a sibling golden-forest checkout)
2. Matches `<Feat ...>` opening tags with regex
3. Extracts all props from the tag
4. Outputs `src/components/feats-explorer/feat-data.js` with the extracted array

This is a one-time extraction, not part of the build - the data is committed and imported by the component, so the golden-forest checkout is only needed to re-run the extraction.

### Book Code Mapping

```javascript
const BOOKS = {
  phb: "Player's Handbook",
  hof: "Heroes of Faerûn",
  fef: "Fifth Edition Feats",
  echh: "Epic Characters & Heroes Handbook"
};
```

### Ability List

```javascript
const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
```

## Alpine.js State Shape

```javascript
function featExplorer() {
  return {
    // State
    searchQuery: '',
    selectedAbility: 'All',
    selectedBook: 'All',
    selectedLevel: 'All',
    feats: [],           // Inlined at build time from feat-data.js
    filteredFeats: [],   // Computed via filterFeats()

    // Methods
    filterFeats() { ... },    // Apply all filters, update filteredFeats
    fuzzyMatch(query, text) { ... },  // Returns boolean
    clearFilters() { ... },   // Reset all filters to defaults
    getBookLabel(code) { ... } // Map code to full name
  }
}
```

## Method Signatures

### `filterFeats()`
- **Parameters**: None (uses `this` state)
- **Returns**: void (mutates `this.filteredFeats`)
- **Logic**: Apply search query (fuzzy), ability filter, book filter, level filter in sequence

### `fuzzyMatch(query: string, text: string): boolean`
- **Parameters**: search query, target text
- **Returns**: true if match, false otherwise
- **Logic**: 
  1. Empty query returns true
  2. Case-insensitive substring match
  3. Levenshtein distance <= floor(query.length / 3) for fuzzy tolerance

### `clearFilters()`
- **Parameters**: None
- **Returns**: void
- **Logic**: Reset `searchQuery` to '', all filters to 'All', call `filterFeats()`

## Implementation Plan

### Step 1: Extract Feat Data from Golden-Forest

Create `scripts/extract-feats.js` - a Node.js script that:
1. Reads `../golden-forest/docs/Games/DnD/feats.md` (a sibling golden-forest checkout)
2. Parses `<Feat ...>` tags using regex: `/<Feat\s+([^>]+)>/g`
3. Extracts props: name, level, book, abilityIncrease, prerequisite, youGain
4. Outputs `src/components/feats-explorer/feat-data.js` with:
   - `FEATS` array containing all 219 feat objects
   - `BOOKS` constant mapping codes to full names
   - `ABILITIES` constant array
   - `FEAT_CATEGORIES` constant array

Run once to generate data, then commit the output file.

### Step 2: Create FeatExplorer Alpine.js Component

Create `src/components/feats-explorer/FeatExplorer.astro`:

1. **Root element**: `<div x-data="featExplorer">` (eager mount, no `x-intersect` trigger)

2. **Filter controls section**:
   - Search input: `<input type="text" x-model="searchQuery" @input.debounce.300ms="filterFeats()" placeholder="Search feats...">`
   - Ability dropdown: `<select x-model="selectedAbility" @change="filterFeats()">`
   - Book dropdown: `<select x-model="selectedBook" @change="filterFeats()">`
   - Level dropdown: `<select x-model="selectedLevel" @change="filterFeats()">`
   - Clear button: `<button @click="clearFilters()">Clear Filters</button>`
   - Result count: `<span x-text="filteredFeats.length + ' feats found'"></span>`

3. **Feat grid section**:
   - Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
   - `template x-for="feat in filteredFeats"` for dynamic rendering
   - Each card shows: name, level badge, ability tags, book source

4. **Empty state**: `<div x-show="filteredFeats.length === 0">No feats match your filters</div>`

### Step 3: Create Fuzzy Search Utility

Create `src/components/feats-explorer/search-utils.js`:
- `fuzzyMatch(query, text)` - returns boolean
- `levenshtein(a, b)` - returns edit distance number
- Pure functions, no side effects

### Step 4: Create Styling

Create `src/components/feats-explorer/feat-explorer.css`:
- Filter controls layout (flex row with gaps)
- Accepted width refinement (#91): at the `sm` breakpoint and above, Ability uses 8rem, Book retains 12rem, and Level uses 7.5rem. Search retains flex growth and receives the recovered space. Below `sm`, controls remain full-width and vertically stacked. (Level was specified at 6rem; see Accepted Deviations 3.)
- Responsive grid (auto-fill 2-up; see Accepted Deviations 4)
- Card styling with hover effect
- Tier seal colors (moss for Origin, gold for General, oxblood for Epic Boon). Blue was specified for General and was never built: it is a cool value and the Warm-Only Rule in DESIGN.md forbids one. Gold stands in. See Accepted Deviations 5.
- Ability tag styling
- Empty state styling
- Loading state styling

### Step 5: (removed) Register Alpine.js Intersect Plugin

This step originally registered the intersect plugin and added `@alpinejs/intersect` to `package.json`, on the theory that a viewport-deferred component might need it later. Feat Explorer never used `x-intersect`, and no other component did either, so #383 removed the registration, the dependency and its `@types` package. Nothing in this spec depends on the plugin; if a component ever needs deferred hydration, it adds the plugin back at that point.

### Step 6: Add to Starlight Sidebar

Update `astro.config.mjs` sidebar:
```javascript
{
  label: 'D&D Tools',
  items: [{ autogenerate: { directory: 'dnd-tools' } }],
}
```

### Step 7: Create MDX Page

Create `src/content/docs/dnd-tools/feat-explorer.mdx`:
```mdx
---
title: Feat Explorer
description: Browse and filter D&D feats by ability, book, and level
tableOfContents: false
---

import FeatExplorer from '@/components/feats-explorer/FeatExplorer.astro';

# Feat Explorer

Search and filter through all available feats.

<FeatExplorer />
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `scripts/extract-feats.js` | create | Node.js script to extract feats from golden-forest MDX |
| `src/components/feats-explorer/feat-data.js` | create | Generated feat metadata (219 feats). Fetched as its own chunk since #387; not bundled into the Alpine entrypoint |
| `src/components/feats-explorer/FeatExplorer.astro` | create | Alpine.js feat browser component |
| `src/components/feats-explorer/search-utils.js` | create | Fuzzy search utility functions |
| `src/components/feats-explorer/feat-explorer.css` | create | Component styling |
| `src/content/docs/dnd-tools/feat-explorer.mdx` | create | Starlight page for feat explorer |
| `astro.config.mjs` | modify | Add sidebar entry |
| `package.json` | modify | Add @alpinejs/intersect dependency (removed in #383) |

## Edge Cases

1. **Empty results**: When filters return 0 feats, show "No feats match your filters" message
2. **No search matches**: When search query has no matches, show empty state
3. **Filter conflict**: Ability + Book + Level filters stack (AND logic)
4. **Mobile UX**: Filter dropdowns stack vertically on mobile
5. **Long feat names**: Truncate with ellipsis if > 50 characters
6. **Rapid typing**: Debounce search input (300ms) to prevent excessive re-renders
7. **Eager mount**: `init()` fetches the dataset chunk the moment Alpine initialises the root; there is no viewport trigger and no deferred hydration. There is a brief in-flight state while the chunk arrives, which the page states in the head and which is not the deferred mount this spec once rejected - see Accepted Deviation 8.

## Accessibility

- All form inputs have `<label>` elements
- Dropdowns use `aria-label` for screen readers
- Cards have proper heading hierarchy (h3 for feat names)
- Clear button has `aria-label="Clear all filters"`
- Keyboard navigation works for all interactive elements

## Testing

### Automated Tests

Three vitest suites cover the feat explorer: `feat-filter.test.ts` on the filter and fuzzy-search logic, which lives in `feat-filter.ts` and not inline in `FeatExplorer.astro`; `feat-explorer-responsive.test.ts` on the component's surface, its palette discipline and its responsive behaviour; and `feat-explorer-alpine.test.ts` on the component's behaviour as a mounted DOM. Since #387 that last suite mounts the component the shipped way - no data argument, so the component fetches its own chunk - and additionally pins the delivery itself: the whole dataset arrives, both selects fill from it, a search typed before it lands is answered, the loader resolves to one promise however often it is called, and the component module reaches the dataset through a dynamic import rather than a static one. Repo-wide verification runs the AGENTS.md commands from the repo root before opening a PR: `pnpm lint`, `pnpm typecheck` (`CI=true pnpm typecheck` for noninteractive runs), `pnpm test`, `pnpm build`.

### Acceptance Criteria
1. **Page load**: Visit `/dnd-tools/feat-explorer/` - page renders without errors
2. **Initial state**: All feats displayed, all filters set to "All"
3. **Search**: Type "alert" - only "Alert" feat displayed
4. **Ability filter**: Select "Strength" - only feats with STR ability increase shown
5. **Book filter**: Select "PHB" - only Player's Handbook feats shown
6. **Level filter**: Select "0" - only origin feats shown
7. **Combined filters**: Apply multiple filters - results narrow correctly
8. **Clear filters**: Click clear - all filters reset, all feats shown
9. **Result count**: Count updates dynamically with filter changes
10. **Empty state**: Apply impossible filter combo - "No feats match" message shown
11. **Responsive**: Grid is 1 column on a phone and 2 from `sm` up; it does not reach 3 columns (see Accepted Deviations 4)
12. **No React**: Page bundle contains no React runtime
13. **Dataset as one cacheable asset**: `dist/_astro/` holds a single content-hashed `feat-data.<hash>.js` carrying the 219 records, requested once, and the site-wide Alpine entrypoint no longer contains them (see Accepted Deviation 8)
14. **Cache behaviour**: two builds of an unchanged dataset emit byte-identical filenames, so an unchanged dataset busts nothing. A data change renames the data chunk and, because the entrypoint's loader names that chunk by its hashed URL, the entrypoint too. The invalidation is narrowed to 75,904 bytes rather than removed; [ADR-0015](../../adr/0015-feat-dataset-as-a-dynamic-import-chunk.md) records the measurement
15. **Safe degradation**: with JavaScript off, the page shows the heading, the search box and the tier key, and states no feat count
16. **Cost on this page is stated**: a cold visit here is +0.7% gzip bytes and one extra round trip, against -3,527 gzip bytes on every other page of the site

### Manual Verification
- Open browser DevTools, verify no React components in Components tab
- Check Network tab - the only JS beyond the site entrypoint is one content-hashed `feat-data.<hash>.js`, requested once. It sits under `/_astro/` like every other hashed bundle on the site, so it inherits whatever caching policy those already have; the content hash is what makes that policy safe rather than what creates it
- Reload the page - the feat-data request is served from cache and the grid returns identically
- Visit a page without the component and confirm the Network tab shows no feat asset at all
- Test on mobile viewport - filters stack, grid responsive
- At desktop widths, verify Ability is approximately one third narrower and Book remains unchanged, Search receives the freed space, and Level is 7.5rem rather than the 6rem first specified, because the custom caret reserves 2.25rem on the right (#91, amended by Accepted Deviations 3).
- The user visually accepted the width refinement. Production build validation passed via `pnpm build`; Astro checks and lint now run via `pnpm typecheck` and `pnpm lint` (see AGENTS.md Verification).

## Rollback

- Remove `src/components/feats-explorer/` directory
- Remove `src/content/docs/dnd-tools/feat-explorer.mdx`
- Remove sidebar entry from `astro.config.mjs`
- Remove `@alpinejs/intersect` from `package.json` (already removed in #383)
- Remove intersect plugin registration from `astro.config.mjs` (already removed in #383)

## Accepted Deviations

The following deviation from this spec was accepted during implementation (PR #67) and is recorded here to prevent re-flagging in future reviews.

### 1. Fuzzy search utilities: inline in `FeatExplorer.astro`, no `search-utils.js`

The spec's Step 3 and Files table called for `src/components/feats-explorer/search-utils.js` containing `fuzzyMatch` and `levenshtein`. The implementation defines both functions inline in the `<script>` block of `FeatExplorer.astro` instead. Reason: the `featExplorer()` Alpine component is their only consumer, so keeping them colocated avoids an extra module and import without changing behaviour.

### 2. Eager mount instead of deferred `x-intersect` hydration (#271)

This archived spec originally mandated deferred loading via `x-intersect.once="init()"` with a loading state until the component scrolled into the viewport. The shipped component mounts eagerly: the root element carries `x-data="featExplorer"` and there is no `x-intersect` binding and no scroll trigger. Reason: with the dataset already in the browser's hands, deferred hydration added complexity without a meaningful payload win. Binding text in `SPEC.md` (Component 2) and this spec was amended to match the delivered behavior. No runtime code changed with this edit.

Two later tickets touched the surrounding sentences without reopening the decision. #379 took the dataset out of the `x-data` argument (Accepted Deviation 6) and #387 took it out of the bundle (Accepted Deviation 8). The component still mounts as soon as Alpine initialises its root; what changed is that the dataset now arrives as its own chunk rather than already being inlined, so there is a brief in-flight state the page names. Deferred hydration is still rejected, for the reason this deviation gives.

The plugin registration that Step 5 added survived this deviation on the argument that a future component might want deferred hydration. #383 removed it once the Feat Explorer was the only thing that had ever referenced it and no planned component did; see Accepted Deviation 7.

### 3. Level select is 7.5rem, not 6rem (#376)

Step 4 specified 6rem and the Manual Verification step said Level would be "one half narrower" than its previous 12rem width. The shipped value is `flex: 0 0 7.5rem`. Reason: the custom caret is drawn in CSS and reserves 2.25rem on the right of the control, so at 6rem that left a 46px text box against a 60px "All Levels" - the control clipped its own default label, which is the first thing a user sees on an untouched control. The 1.5rem is the caret's gutter, not extra label room, so Ability (8rem) and Book (12rem) are unchanged. Both spec sentences were amended to 7.5rem and now point here. No runtime code changed with this edit.

### 4. The grid is auto-fill 2-up, not a fixed 3 columns at desktop (#376)

Step 4 called for a responsive grid of 1/2/3 columns and Acceptance Criterion 11 said "3 desktop". The shipped rule is `grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr))`, which is 1-up on a phone and 2-up at every width above it, because in the Starlight content column a third track never fits without dropping under 17rem. Reason: at this measure, three columns of feat names wrapped the longest ones onto two lines and left a visibly uneven grid, and the 17rem floor is also what stops a track from being narrower than the longest unbreakable run - the thing that made a phone page scroll sideways. The `min(100%, 17rem)` part of the `minmax()` is also what keeps the track satisfiable at 320px. Both spec sentences were amended and now point here. No runtime code changed with this edit.

### 5. The tier marks are seals on moss, gold and oxblood, and General is gold rather than blue (#376)

Step 4 called for "Level badge colors (green for origin, blue for general)". Blue was never built and should not have been: it is a cool value, and the Warm-Only Rule in DESIGN.md reserves this system's colour to the warm ramps, which the repo's own `tailwind.test.ts` enforces. The shipped marks are the wax-seal medallions described in DESIGN.md's Feat Codex Panel entry: Origin on `--color-moss-800`/`--color-moss-100`, General on `--color-gold`, Epic Boon on `--color-oxblood`, each inverted per theme. Moss is a shared token rather than a private value, and it is a deliberate widening of the palette: from bark, gold and oxblood alone the three tiers cannot all be told apart in light, where Origin and Epic would both be forced dark. The spec sentence was amended and now points here. No runtime code changed with this edit.

The tier is derived from the feat's `level` and not from the `category` field the Data Schema declares. `category` carries only `Origin` and `General` across all 219 records and never `Epic`, so it cannot express the third tier. The `level >= 19` threshold also merges the Level 19 and Level 21 filter buckets into one `EB` seal, which the on-page legend states explicitly.

### 6. The behaviour is a registered Alpine module, and the dataset is no longer an inlined `x-data` argument (#379)

The root element is `x-data="featExplorer"` naming a registration in `src/alpine.ts`, and the behaviour lives in `src/components/feats-explorer/feat-explorer-component.ts`. This spec's Summary, Goals, Edge Case 7 and Accepted Deviation 2 all described the previous shape: an inline `<script>` in the view that assigned a `featExplorer` factory to `window`, invoked from the markup as `x-data="featExplorer({...inlined dataset...})"`. ADR-0010 forbids all three halves of that shape.

The one thing this deviation changes beyond the registration is *where the dataset is read from*. A registered Alpine provider is called with no arguments - the factory receives nothing from the `x-data` string - so the payload can no longer be inlined into the attribute and handed to the factory. The component module reached for `FEATS`, `BOOKS` and `ABILITIES` in the same committed `feat-data.js`, and the factory kept an optional data argument for the states the generated dataset cannot produce. The dataset itself is untouched: same file, same 219 records, same generated extraction, no field read or added. What changed is only the delivery, and the spec's intent is preserved - the component still mounts eagerly, still needs no `x-intersect` trigger, and still carries its data with no network dependency on a remote schema. #387 then made that delivery cheaper; see Accepted Deviation 8.

Behaviour is unchanged and now covered by running it: `feat-explorer-alpine.test.ts` mounts the component through `src/test-utils/alpine-dom.ts` and drives search, the three selects, the disclosure badge, the tier marks and the book labels. It replaces the two source-scanning suites that covered the component before, which read `FeatExplorer.astro` as text - the technique ADR-0010 names as the defect class that let #328 ship. `feat-explorer-responsive.test.ts` keeps its markup and CSS assertions and now reads the tier rule from the behaviour module rather than from the view.

### 7. The intersect plugin is not registered (#383)

Step 5 added `@alpinejs/intersect` and registered it in the Alpine entrypoint. No component ever bound `x-intersect`, and no spec reserves it for a planned one: every spec is archived, and this one had already switched to eager mount under Accepted Deviation 2. #383 removed the registration, the dependency and `@types/alpinejs__intersect`, so the entrypoint every page loads imports nothing from `node_modules`. Reason: a registration kept "for future use" has no mechanism to ever be removed, and it was a per-page cost against the least-client-JavaScript rule. The component behaviour this spec describes is untouched.

### 8. The dataset ships as its own content-hashed chunk, fetched by a dynamic import (#387)

Accepted Deviations 1 through 7 all left one question open: the dataset was in the bundle. #271 put it in an `x-data` attribute, #379 moved it into a module the Alpine entrypoint imports, and the entrypoint is injected into every page on the site - so 26,138 bytes of minified feat data was downloaded by readers looking at a dice roller, and re-downloaded by all 129 pages on every rebuild that touched any of the five components in that bundle. The measured before/after is in the comments on #387 and in [ADR-0015](../../adr/0015-feat-dataset-as-a-dynamic-import-chunk.md).

The delivery is now: `feat-explorer-component.ts` imports `feat-data` **type-only** and reaches the values through one dynamic `import()` with a literal specifier, wrapped in a module-scoped memoised promise. The bundler emits the dataset as its own chunk, requests it from `init()`, and serves it under a content hash. The site-wide entrypoint drops from 101,561 to 75,904 bytes, so every page that does not host this component is 3,527 gzip bytes lighter on a cold load.

This spec's intent is preserved, and each point is checked rather than asserted:

- **Eager mount, no deferred scroll trigger.** `init()` fires the moment Alpine initialises the root, which is the moment the static import used to populate the state. No `x-intersect`, no viewport gating.
- **No dependency on a remote schema.** The dataset is still generated into this repository at build time from a committed file. Nothing is fetched from a third party, and the chunk fails to load only if this site's own deployment is broken.
- **Same data, same component, same behaviour.** Same file, same 219 records, no field added or read. Filtering, the tier marks, the book labels and the tier threshold are untouched.

Three things did change, and this spec records them rather than leaving them to be rediscovered:

- **There is a brief in-flight state.** The component carries `datasetState` as `loading` / `ready` / `failed`, and the view names each: a "Fetching the feat list..." line in the head while the chunk is in the air, the count line once it lands, and a reload prompt if it never does. The old single check could not tell "no feats have arrived" apart from "your filters excluded everything", which are different things to say to a reader.
- **`init()` re-runs `filterFeats()` on arrival.** A reader who typed into the search box while the chunk was in flight asked a question of data that had not yet arrived; the arriving records have to answer it. This is the one regression a lazily delivered dataset introduces, and it has a test.
- **No JavaScript now shows less, and that is an improvement.** The count line and both new lines are `x-cloak`ed, so a reader without JavaScript sees the heading, the search box and the tier key, and no count - where previously it read "0 of 0 feats on this sheet".

The `x-data` argument remains on the factory for the states the generated dataset cannot produce (a book key with no name, no book map at all). Passing it marks the component ready from the first frame, which is also why the mounted tests can reach those branches without a fetch.

Two costs are recorded here because this deviation reads as a pure win and it is not. **A cold visit to this page now costs one extra round trip and 0.7% more gzip bytes** than before, because the dataset moves from inside the first response into a second request. And **a data change still rehashes the site-wide entrypoint**, because the loader inside it names the chunk by its hashed URL - so the cache invalidation this change most invites is narrowed, not removed. Both are measured in ADR-0015.

## Status

- [x] Implementation complete
- [x] Tests passing (112 unit tests, build verified)
- [x] ADR updated (no new decisions)
