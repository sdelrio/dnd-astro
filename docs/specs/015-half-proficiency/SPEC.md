---
status: archived
title: "Half-proficiency skill marker"
author: "opencode"
date: "2026-09-24"
tags: [character-sheet, xml, fantasy-grounds, skills, proficiency, xml-viewer, all-skills]
affects:
  - docs/specs/015-half-proficiency/SPEC.md
  - docs/specs/README.md
  - src/components/xml-viewer/skill-display.ts
  - src/components/xml-viewer/skill-display.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/utils/parse-character-xml.test.ts
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap
  - src/content/docs/guides/xml-card-test.mdx
adr_constraints: []
---

# SPEC: Half-proficiency skill marker

## Summary

The large-mode all-skills table gains a distinct half-proficiency marker: a half-filled gold dot (left half `#c68000`, right half hollow with a gold border) that reads "Half proficiency" and sits between the one-dot proficient and two-dot expertise marks. Fantasy Grounds encodes half proficiency as `prof` 3, which the card today renders as two dots - identical to expertise - because it thresholds on `prof > 0` and `prof > 1` and never models `prof 3`. A legend is added beneath the all-skills tables, and the rank mapping is extracted into a small `skill-display` display helper. Scope is the all-skills table only: saving throws and the medium prof-only grid are unchanged.

## Problem Statement

The all-skills marker logic is inline in `src/components/xml-viewer/XmlCard.astro` (lines 423-433): a marker renders when `skill.prof > 0`, a second dot when `skill.prof > 1`, and the tooltip is `skill.prof > 1 ? 'Expertise' : 'Proficient'`. `prof 3` therefore renders exactly like expertise (two filled dots) and there is no representation for half proficiency. This is not an edge case: 107 skilllist entries across 25 of the 111 sheets carry `prof 3`. There is also no legend, so a reader cannot tell what zero, one, or two dots mean, even though the powers card already sets a legend precedent.

## Background (verified during ticket #286)

- Fantasy Grounds `prof` codes on the skilllist are `0` none, `1` proficient, `2` expertise, `3` half proficiency. Counts across `src/assets/fantasy-grounds-sheets/` (111 sheets): 1333 `prof 0`, 1106 `prof 1`, 52 `prof 2`, 107 `prof 3`. `prof 3` entries appear on 25 sheets.
- akinori has `profbonus` 3 and Intelligence bonus 0; Arcana is `prof 3`, `stat intelligence`, `total` 1 (`src/assets/fantasy-grounds-sheets/akinori.xml` lines 1419-1425). Half proficiency adds `floor(profBonus / 2)` = `floor(3 / 2)` = 1, so `0 + 1 = 1` matches the sheet total. akinori also has Medicine `prof 3`, `stat wisdom`, `total` 4 (lines 1440-1445); `profbonus` is at line 1380.
- miku has Sleight of Hand `prof 3`, `stat dexterity`, `total` 4 (`src/assets/fantasy-grounds-sheets/miku.xml` lines 787-793); dexterity bonus 3 plus half proficiency `floor(profBonus / 2)` with `profbonus` 2 (line 693) = 1, so `3 + 1 = 4`. The sheet arithmetic confirms `prof 3` means half proficiency, not expertise.
- Saving throws are separate and stay unchanged: `saveprof` is observed only as `0` or `1` in every sheet (no sheet carries another value), and SPEC-011 already fixes the single-dot / no-dot save markers.
- The parser (`src/utils/parse-character-xml.ts`) already passes `prof` through raw on every `allSkills` entry (SPEC-008), so no parser change is needed and the mapping lives entirely in the display layer.
- The powers card already renders a bottom legend (`hasPowerMarks && ...`, `src/components/xml-viewer/XmlCard.astro` lines 625-636) using filled and hollow `#c68000` dots, so a legend is an established pattern in this card.
- Reference rendering: `.scratch/charizard/charizard.html` (local scratch file, not committed). No CSS is copied from that reference; the implementation uses the current Tailwind theme.

## Goals

- Model the `prof` rank mapping in one place and render half proficiency as a visually distinct half-filled gold dot.
- Render one filled dot for proficient (`prof 1`), two for expertise (`prof 2`), nothing for untrained (`prof 0`), and the half dot for half (`prof 3`, or `0.5`), each with a matching tooltip; half reads "Half proficiency".
- Add a legend beneath the all-skills tables listing Proficient, Expertise, and Half proficiency, shown only when at least one skill carries a mark.
- Extract the rank mapping into a small pure display helper with unit tests so `XmlCard` stays presentational.
- Carry a `data-prof-rank` hook on each marker so render tests and future consumers can assert ranks without parsing classes.
- Keep the medium prof-only grid, the saving-throws card, the parser contract, and client-side JavaScript unchanged.

## Non-Goals

- Changing saving throws, `saveprof`, or the SPEC-011 save marker (always `0`/`1`).
- Showing the half marker, tooltip, or legend outside the large all-skills card; the medium prof-only grid shows names and totals only.
- Roll buttons or any other interactivity on skill rows.
- Changing the parser's `allSkills` shape (`prof` already reaches the card as a raw number) or adding new `CharacterData` fields.
- Changing XML source sheets.
- A new ADR (no new architectural decision is being made).

## Data Shape

No parser or `CharacterData` change. `allSkills` already carries the raw code:

```typescript
allSkills: Array<{ name: string; total: number; prof: number; stat: string }>;
```

The display helper maps the raw code to a rank:

| `prof` | Rank | Marker | Tooltip |
|--------|------|--------|---------|
| `0` | none | none | none |
| `1` | proficient | one filled `#c68000` dot | Proficient |
| `2` | expertise | two filled `#c68000` dots | Expertise |
| `3` or `0.5` | half | one half-filled `#c68000` dot | Half proficiency |

Any other value falls back to none (fail safe; no sheet currently carries one). `0.5` is accepted alongside `3` because Fantasy Grounds uses both spellings for half proficiency, though no current sheet uses `0.5`.

The helper interface (implemented by #287):

```typescript
export type SkillRank = 'none' | 'proficient' | 'expertise' | 'half';
export function skillRank(prof: number): SkillRank;
```

## Design Decisions

1. **Half-filled dot:** the left half is filled `#c68000` and the right half is hollow with a `#c68000` border. The marker keeps a single-dot footprint (`w-1.5 h-1.5`) rather than the two-dot width of expertise, so it cannot be confused with the expertise pair. A concrete shape is a `w-1.5 h-1.5 overflow-hidden rounded-full border border-[#c68000]` wrapper around a `w-1/2 h-full bg-[#c68000]` left-half fill; the exact markup is #287's call as long as the left half is filled, the right half is hollow with a gold border, and the glyph stays single-dot wide.
2. **Four-state marker:** represented as a rank switch rather than nested thresholds. Proficient is the existing `w-1.5 h-1.5 rounded-full bg-[#c68000]` dot, expertise is the existing pair of filled dots, and untrained renders nothing.
3. **Rank mapping in a helper:** a new `src/components/xml-viewer/skill-display.ts` follows the pure-helper pattern of `weapon-display.ts` and `inventory-display.ts`, unit-tested in `skill-display.test.ts`. The card imports `skillRank` instead of inlining `prof > 0` / `prof > 1` checks.
4. **`data-prof-rank` hook:** each rendered marker carries `data-prof-rank="proficient" | "expertise" | "half"`; the none case renders no marker. The human-readable tooltip stays as before plus "Half proficiency".
5. **Legend:** beneath the two all-skills tables, inside the same vitals-item card, a bottom-bordered row mirroring the powers legend recipe (`mt-3 pt-2 border-t border-gray-100 dark:border-gray-700`) lists Proficient, Expertise, and Half proficiency with their markers. It renders only when at least one skill has a mark, so an all-untrained table stays clean. Keeping it inside the all-skills card confines it to large mode.
6. **Skills-only scope:** only the `allSkills` marker markup and its legend change. The saving-throws card and `saveprof` handling are untouched because no sheet uses `saveprof` other than `0`/`1`, and the medium prof-only grid renders no markers. SPEC-011's save marker decision is unaffected.
7. **No parser change:** `prof` is already raw on `allSkills`, so the mapping lives entirely in the display helper and the card.

## Implementation Plan

This spec is delivered by ticket #287. Do not implement here.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #286 | This spec and the index row | - |
| #287 | `skill-display` helper and unit tests, parser `prof 3` test, card marker and legend, render tests, test guide, golden snapshot, archive this spec | #286 |

### Step 1 (ticket #287): Extract the rank mapping into a helper

Create `src/components/xml-viewer/skill-display.ts` with the `SkillRank` type and `skillRank(prof)` implementing the mapping in Data Shape. Follow the TDD loop at the helper seam: write one failing unit test, make it pass, repeat (slices: `0 -> none`, `1 -> proficient`, `2 -> expertise`, `3 -> half`, `0.5 -> half`, unknown value `-> none`). No parser, data-shape, or `CharacterData` change.

### Step 2 (ticket #287): Lock the parser pass-through with a test

Add an assertion in `src/utils/parse-character-xml.test.ts` that akinori's `allSkills` preserve the `prof 3` entries: Arcana (`stat intelligence`, `total 1`) and Medicine (`stat wisdom`, `total 4`). This guards against any future coercion or filtering of the rank. No parser code change is expected.

### Step 3 (ticket #287): Render the half marker and the legend

In `src/components/xml-viewer/XmlCard.astro`:

1. Import `skillRank` from the new helper.
2. Replace the inline marker at lines 423-433 with a four-state switch driven by `skillRank(skill.prof)`: nothing for none, the existing single dot for proficient, the existing pair for expertise, and the half-filled dot for half. Every rendered marker carries a `data-prof-rank` attribute and its tooltip.
3. Add the legend below the two tables, inside the same card, gated on `column`/`skillColumns` containing at least one marked skill.

The medium prof-only grid, the saving-throws card, the section policy maps, and client-side JavaScript stay as they are.

### Step 4 (ticket #287): Render tests, test guide, snapshot, and spec archival

1. Extend `src/components/xml-viewer/xml-card-passives.test.ts` with a half-proficiency describe block: a `prof 3` fixture renders exactly one `data-prof-rank="half"` marker with the "Half proficiency" tooltip; `prof 1`/`prof 2`/`prof 0` markers stay as specified; the legend lists all three ranks when any skill is marked and is absent when every skill is unmarked; the all-skills section contains no `<button>`.
2. Update the golden snapshot `src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap`. The snapshot fixture has `prof 1` and `prof 2` skills, so the new legend changes the large-mode markup; refresh the snapshot intentionally.
3. Add the half-dot documentation to the `### All-Skills Table` subsection of `src/content/docs/guides/xml-card-test.mdx`, using akinori (Arcana and Medicine are `prof 3`) and naming the "Half proficiency" tooltip and the legend.
4. Run the full verification suite and set this spec's `status` to `archived`.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `docs/specs/015-half-proficiency/SPEC.md` | create | #286 | This spec |
| `docs/specs/README.md` | modify | #286 | Add index row for 015 |
| `src/components/xml-viewer/skill-display.ts` | create | #287 | Pure `skillRank` / `SkillRank` mapping |
| `src/components/xml-viewer/skill-display.test.ts` | create | #287 | Unit tests for the rank mapping |
| `src/utils/parse-character-xml.test.ts` | modify | #287 | Assert `prof 3` passes through on akinori's `allSkills` |
| `src/components/xml-viewer/XmlCard.astro` | modify | #287 | Four-state marker, `data-prof-rank` hook, legend |
| `src/components/xml-viewer/xml-card-passives.test.ts` | modify | #287 | Half-marker and legend render tests |
| `src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap` | modify | #287 | Refresh large-mode golden markup (legend added) |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #287 | Document the half dot with akinori |

No other file changes. The parser (`src/utils/parse-character-xml.ts`) itself is untouched: `prof` is already raw and the parser test only locks the existing behavior. No `CharacterData` field is added, so no fixture gains a field.

## ADR Constraints

No accepted ADR constrains this change. SPEC-003 and SPEC-008 are the binding interface constraints: the card consumes `allSkills[].prof` unchanged, and the markers stay CSS, not icons. ADR-0001 (icon component strategy) does not apply because the marker is a CSS dot. ADR-0004 (Starlight admonitions) does not apply because no markdown admonitions are added. ADR-0005 (table row striping) targets Starlight markdown content tables, not component tables rendered inside `not-content`.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

### Unit tests (ticket #287, Vitest)

- **Rank mapping:** `skillRank` returns `none` for `0`, `proficient` for `1`, `expertise` for `2`, `half` for `3`, `half` for `0.5`, and `none` for an unknown value such as `4`.
- **Parser pass-through:** akinori's `allSkills` include Arcana (`prof 3`, `stat intelligence`, `total 1`) and Medicine (`prof 3`, `stat wisdom`, `total 4`); the existing prof-only `skills` output and passives stay green and unchanged.

### Render tests (ticket #287, AstroContainer at the `XmlCard` seam)

- **Half marker:** a large render whose `allSkills` fixture includes a `prof 3` row contains exactly one `data-prof-rank="half"` marker on that row with the "Half proficiency" tooltip.
- **Unchanged ranks:** `prof 1` renders one `data-prof-rank="proficient"` dot, `prof 2` renders one `data-prof-rank="expertise"` marker holding two filled dots, and `prof 0` renders no marker.
- **Legend:** the legend lists Proficient, Expertise, and Half proficiency when at least one skill is marked, and is absent when every skill is `prof 0`.
- **No buttons:** the all-skills section contains no `<button>`.
- **Unchanged medium grid:** a medium render still contains the prof-only grid rows and none of the all-skills table markup, marker, or legend.
- **Golden snapshot:** the large-mode snapshot reflects the half marker plus the added legend.

### Visual verification (ticket #287)

- akinori's large card marks Arcana and Medicine with the half-filled dot and the "Half proficiency" tooltip; his proficient rows keep one dot and any expertise rows keep two.
- The legend under the tables shows all three markers; a card with no marked skills shows no legend.
- Saving Throws, medium cards, and small cards are unchanged.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Delete `skill-display.ts` and `skill-display.test.ts`.
- Restore the inline marker at `XmlCard.astro` lines 423-433 and remove the legend.
- Remove the parser `prof 3` assertion, the half-marker render tests, and the test-guide subsection.
- Restore the golden large-mode snapshot.
- Remove the 015 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [x] Implementation complete (delivered by #287)
- [x] Tests passing
- [x] ADR updated (not applicable: no new decision made)
