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

An Alpine.js component for browsing and filtering D&D feats with fuzzy search, multi-select filters for ability, book, and level. Replaces the React-based FeatBrowser from golden-forest with a lighter, faster Alpine.js implementation that loads on scroll.

## Problem Statement

Players need to quickly find feats during character creation and leveling. The golden-forest implementation uses React with Context API for filter state, which adds unnecessary runtime overhead. An Alpine.js implementation can provide instant client-side filtering with zero framework dependencies and deferred loading via intersection observer.

## Goals

- Display all feats in a scrollable, filterable grid
- Fuzzy search by feat name (substring + levenshtein distance)
- Filter by ability score (STR, DEX, CON, INT, WIS, CHA)
- Filter by source book (PHB, HOF, FEF, ECHH)
- Filter by level requirement (0, 4+)
- Show result count for current filters
- Clear all filters at once
- Deferred loading via `x-intersect` plugin
- Zero React runtime dependency

## Non-Goals

- Individual feat detail pages (clicking a card) - future feature
- Sorting functionality (alphabetical by default from build)
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

## Feat Data Source

Feat data is extracted from the golden-forest project's MDX file at:
`/Users/sdelrio/github/sdelrio/golden-forest/docs/Games/DnD/feats.md`

This file contains **216 feats** defined as `<Feat>` components with props:
- `name` (string) - feat name
- `level` (number) - 0 for origin, 4+ for general
- `book` (string) - phb, hof, fef, echh
- `abilityIncrease` (string[], optional) - ability scores increased
- `prerequisite` (string, optional) - level/ability prerequisites
- `youGain` (boolean/string, optional) - whether feat grants a "you gain" section

### Extraction Approach

A build-time script (`extract-feats.js`) parses the MDX file using regex to extract feat props. The script:
1. Reads the golden-forest feats.md file
2. Matches `<Feat ...>` opening tags with regex
3. Extracts all props from the tag
4. Outputs `feat-data.js` with the extracted array

This is a one-time extraction - the data is then hardcoded in the component.

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
    feats: [],           // Loaded from hardcoded data
    filteredFeats: [],   // Computed via filterFeats()
    isInitialized: false,

    // Methods
    init() { ... },           // Load feat data, set isInitialized=true
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
1. Reads `/Users/sdelrio/github/sdelrio/golden-forest/docs/Games/DnD/feats.md`
2. Parses `<Feat ...>` tags using regex: `/<Feat\s+([^>]+)>/g`
3. Extracts props: name, level, book, abilityIncrease, prerequisite, youGain
4. Outputs `src/components/feats-explorer/feat-data.js` with:
   - `FEATS` array containing all 216 feat objects
   - `BOOKS` constant mapping codes to full names
   - `ABILITIES` constant array
   - `FEAT_CATEGORIES` constant array

Run once to generate data, then commit the output file.

### Step 2: Create FeatExplorer Alpine.js Component

Create `src/components/feats-explorer/FeatExplorer.astro`:

1. **Root element**: `<div x-data="featExplorer()" x-intersect.once="init()">`

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

5. **Loading state**: `<div x-show="!isInitialized">Loading feats...</div>`

### Step 3: Create Fuzzy Search Utility

Create `src/components/feats-explorer/search-utils.js`:
- `fuzzyMatch(query, text)` - returns boolean
- `levenshtein(a, b)` - returns edit distance number
- Pure functions, no side effects

### Step 4: Create Styling

Create `src/components/feats-explorer/feat-explorer.css`:
- Filter controls layout (flex row with gaps)
- Responsive grid (1/2/3 columns)
- Card styling with hover effect
- Level badge colors (green for origin, blue for general)
- Ability tag styling
- Empty state styling
- Loading state styling

### Step 5: Add Alpine.js Intersect Plugin

Update `astro.config.mjs` to register the intersect plugin:
```javascript
import intersect from '@alpinejs/intersect';
// In Alpine.js setup:
alpinejs([intersect]);
```

Update `package.json` to add dependency:
```json
"@alpinejs/intersect": "^3.17.3"
```

### Step 6: Add to Starlight Sidebar

Update `astro.config.mjs` sidebar:
```javascript
{
  label: 'Tools',
  items: [
    { label: 'Dice Roller', slug: 'tools/dice-roller' },
    { label: 'Feat Explorer', slug: 'tools/feat-explorer' },
  ],
}
```

### Step 7: Create MDX Page

Create `src/content/docs/tools/feat-explorer.mdx`:
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
| `src/components/feats-explorer/feat-data.js` | create | Generated feat metadata (216 feats) |
| `src/components/feats-explorer/FeatExplorer.astro` | create | Alpine.js feat browser component |
| `src/components/feats-explorer/search-utils.js` | create | Fuzzy search utility functions |
| `src/components/feats-explorer/feat-explorer.css` | create | Component styling |
| `src/content/docs/tools/feat-explorer.mdx` | create | Starlight page for feat explorer |
| `astro.config.mjs` | modify | Add sidebar entry + intersect plugin |
| `package.json` | modify | Add @alpinejs/intersect dependency |

## Edge Cases

1. **Empty results**: When filters return 0 feats, show "No feats match your filters" message
2. **No search matches**: When search query has no matches, show empty state
3. **Filter conflict**: Ability + Book + Level filters stack (AND logic)
4. **Mobile UX**: Filter dropdowns stack vertically on mobile
5. **Long feat names**: Truncate with ellipsis if > 50 characters
6. **Rapid typing**: Debounce search input (300ms) to prevent excessive re-renders
7. **Deferred load**: Show loading state until x-intersect triggers init()

## Accessibility

- All form inputs have `<label>` elements
- Dropdowns use `aria-label` for screen readers
- Cards have proper heading hierarchy (h3 for feat names)
- Clear button has `aria-label="Clear all filters"`
- Keyboard navigation works for all interactive elements

## Testing

### Acceptance Criteria
1. **Page load**: Visit `/tools/feat-explorer/` - page renders without errors
2. **Initial state**: All feats displayed, all filters set to "All"
3. **Search**: Type "alert" - only "Alert" feat displayed
4. **Ability filter**: Select "Strength" - only feats with STR ability increase shown
5. **Book filter**: Select "PHB" - only Player's Handbook feats shown
6. **Level filter**: Select "0" - only origin feats shown
7. **Combined filters**: Apply multiple filters - results narrow correctly
8. **Clear filters**: Click clear - all filters reset, all feats shown
9. **Result count**: Count updates dynamically with filter changes
10. **Empty state**: Apply impossible filter combo - "No feats match" message shown
11. **Responsive**: Grid shows 1 column mobile, 2 tablet, 3 desktop
12. **No React**: Page bundle contains no React runtime

### Manual Verification
- Open browser DevTools, verify no React components in Components tab
- Check Network tab - no unnecessary JS downloads
- Test on mobile viewport - filters stack, grid responsive

## Rollback

- Remove `src/components/feats-explorer/` directory
- Remove `src/content/docs/tools/feat-explorer.mdx`
- Remove sidebar entry from `astro.config.mjs`
- Remove `@alpinejs/intersect` from `package.json`
- Remove intersect plugin registration from `astro.config.mjs`

## Status

- [ ] Implementation complete
- [ ] Tests passing
- [ ] ADR updated (if new decision made)
