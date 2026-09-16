---
status: archived
title: "Character Browser Page with Alpine.js Filtering"
author: "opencode"
date: "2026-09-16"
tags: [character-search, alpine-js, filtering, fantasy-grounds]
affects:
  - src/components/xml-viewer/CharSearch.astro
  - src/content/docs/dnd/fantasy-grounds/character-search.mdx
  - astro.config.mjs
adr_constraints: []
---

# SPEC: Character Browser Page with Alpine.js Filtering

## Summary

A Character Browser page at `/dnd/fantasy-grounds/character-search/` that displays all Fantasy Grounds characters in a filterable grid, supporting text search by name and dropdown filters for class and race.

## Problem Statement

Users need a way to search and browse all 111 Fantasy Grounds characters by name, class, and race. Currently the only character view is the PartyView which shows only the 6 active party members. A searchable index of all characters is needed for reference during sessions.

## Goals

- Search characters by name (instant text filtering)
- Filter characters by class (dropdown)
- Filter characters by race (dropdown)
- Display character vitals (AC, HP, Speed, Initiative) at a glance
- Show character avatars in search results
- Clear all filters at once
- Show result count for current filters
- Responsive grid layout (3/2/1 columns)

## Non-Goals

- Character detail page (clicking a card) - future feature
- Sorting functionality (currently alphabetical from build hook)
- Pagination or virtual scrolling
- E2E testing infrastructure

## Implementation Plan

### Step 1: Create CharSearch.astro Component

Create `src/components/xml-viewer/CharSearch.astro` - an Astro component that:
- Imports characters from `@/generated/characters.json`
- Extracts unique classes and races for dropdown options
- Uses Alpine.js `x-data` for reactive state (search, selectedClass, selectedRace)
- Filters characters client-side based on all active filters
- Renders a responsive grid of character cards with avatar, name, race, class breakdown, and vitals

### Step 2: Create Character Browser MDX Page

Create `src/content/docs/dnd/fantasy-grounds/character-search.mdx` with:
- Title: "Character Browser"
- Table of contents disabled
- Sidebar hidden from autogenerate (linked from Fantasy Grounds section)
- Imports and renders `<CharSearch />`

### Step 3: Add Sidebar Entry

Update `astro.config.mjs` to include Character Browser in the Fantasy Grounds sidebar section.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/xml-viewer/CharSearch.astro` | create | Character search component with Alpine.js filtering |
| `src/content/docs/dnd/fantasy-grounds/character-search.mdx` | create | Starlight MDX page for character browser |
| `astro.config.mjs` | modify | Add sidebar entry for Character Browser |

## Testing

- Manual verification: Page builds and loads at `/dnd/fantasy-grounds/character-search/`
- Page not duplicated in "D&D rule fixes" sidebar (hidden from autogenerate)
- Alpine.js directives present in generated HTML
- All 111 characters render in the grid
- Filtering by name, class, and race works in browser
- Clear filters resets all fields
- Result count updates dynamically
- Responsive grid displays correctly at various viewport widths

## Rollback

- Remove `src/components/xml-viewer/CharSearch.astro`
- Remove `src/content/docs/dnd/fantasy-grounds/character-search.mdx`
- Remove sidebar entry from `astro.config.mjs`
- Remove `sidebar.hidden` frontmatter from MDX file

## Status

- [x] Implementation complete
- [x] Tests passing (build verified)
- [x] ADR updated (no new decisions)
