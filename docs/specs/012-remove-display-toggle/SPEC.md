---
status: archived
title: "Remove XmlCard Display-Mode Toggle"
author: "opencode (grill-with-docs)"
date: "2026-09-21"
tags: [xml-viewer, xml-card, alpine-js, display-mode, refactor, least-js]
affects:
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/content/docs/guides/xml-card-test.mdx
adr_constraints: []
---

# SPEC: Remove XmlCard Display-Mode Toggle

## Summary

Make a card's display mode a fixed, build-time choice by deleting the large-mode
S/M/L toggle and all the reactive `displayMode` machinery behind it, leaving
Alpine.js in `XmlCard` only for feature and power expand/collapse.

## Problem Statement

`XmlCard` renders S/M/L buttons in large mode that switch `displayMode` live via
Alpine. This makes `display` both a build-time prop and client-side state, so the
rank policy is duplicated (a build-time `sectionPolicy` map and an Alpine copy),
and five tests exist only to keep the two copies in sync. The toggle is being
removed: display modes are chosen by the page that mounts the card, not by the
reader.

## Goals

- Remove the S/M/L toggle buttons and the `displayMode` reactive state.
- Keep the `display` prop and the build-time rank policy as the single source of
  truth for which sections render.
- Keep Alpine.js only for the feature and power expand/collapse interactions.
- Update tests and the visual test page to match.

## Non-Goals

- Changing which sections appear in small, medium, or large mode.
- Changing card markup, styling, or section ordering.
- Removing Alpine.js from `XmlCard` entirely (expand/collapse still needs it).
- Adding the character page or portrait links (SPEC-013).

## Implementation Plan

### Step 1: Strip the toggle and reactive policy from `XmlCard`

- Delete the large-mode S/M/L button block from the header.
- Reduce `x-data` to the expand/collapse state only: keep `expandedSections`,
  `toggleSection`, and `isExpanded`; drop `displayMode`, `sectionPolicy`,
  `rank`, and `canShow`.
- Remove every `x-show="canShow(...)"` and `x-show="!canShow(...)"` attribute.
  The build-time `canShow()` guard already controls whether a section is
  rendered, so the predicates are redundant.
- For the subclass line, render it only when `display === 'large'` at build
  time; remove the `x-show="displayMode === 'large'"` and the inline
  `style` fallback.
- Drop the now-unused `data-display` attribute unless a stylesheet still needs
  it.
- Keep the static `RANKS`, `sectionPolicy`, `rank()`, and `canShow()` helpers.

### Step 2: Update the render tests

- Delete `parseLivePolicy` and the five "keeps the build-time and live rank
  policy maps in sync" tests.
- Delete the `x-show` predicate assertions ("live-shows", "live-hides",
  "carries the live toggling predicates") and the `cardSource`/`parseStaticPolicy`
  helpers if nothing else uses them.
- Keep the build-time visibility assertions (a section renders in large and not
  in small/medium).
- Add an assertion that no toggle buttons render: no
  `aria-label="Display mode"` group and no `>S</button>`/`>M</button>`/
  `>L</button>`.

### Step 3: Update the visual test page

- Rewrite the `## Display: Large` copy and the per-section notes that tell the
  reader to press S/M/L, so they describe fixed modes instead.
- Remove or rewrite the `/S\/M/` references the render tests assert on.

## Files to Create/Modify

- `src/components/xml-viewer/XmlCard.astro` - remove toggle and reactive policy
- `src/components/xml-viewer/xml-card-passives.test.ts` - drop live-policy and
  `x-show` tests, add no-toggle assertion
- `src/content/docs/guides/xml-card-test.mdx` - update toggle copy

## ADR Constraints

None.

## Testing

- `pnpm test` - the `XmlCard` render suites pass with the live-policy tests
  removed and the no-toggle assertion added.
- `pnpm lint`, `CI=true pnpm typecheck`, `pnpm build` - clean.
- Manual: the visual test page shows small, medium, and large cards with no
  toggle, and the large card still shows subclass, passives, all-skills,
  weapons, inventory, and saves.

## Rollback

Restore the S/M/L button block, the reactive `x-data` members, the `x-show`
predicates, and the live-policy tests from git history.

## Status

- [x] Implementation complete
- [x] Tests passing
- [ ] ADR updated (not applicable - no new decision)
