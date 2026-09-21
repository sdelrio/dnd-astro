---
status: archived
title: "Saving Throws card"
author: "opencode"
date: "2026-09-21"
tags: [character-sheet, xml, fantasy-grounds, saving-throws, saves, xml-viewer, all-saves]
affects:
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/content/docs/guides/xml-card-test.mdx
  - docs/specs/011-all-saves/SPEC.md
  - docs/specs/README.md
adr_constraints: []
---

# SPEC: Saving Throws card

## Summary

In large display mode the `XmlCard` Saving Throws section renders one rounded card containing two side-by-side tables that list all six saving throws in standard order (STR, DEX, CON, INT, WIS, CHA), not just the proficient ones. Proficient saves carry a single gold dot. Medium and small keep today's proficient-only grid, and the live S/M/L toggle swaps between the grid and the card. There are no roll buttons and no parser change.

## Problem Statement

The parsed abilities already expose `save` and `saveprof` for all six abilities, but the card renders only `proficientSaves`: the medium prof-only grid is the only Saving Throws markup. The large sheet therefore cannot show the full saving-throw array a player sees on the paper sheet - non-proficient saves and their bonuses are dropped - while the large card's other views (Passives, All-skills, Equipped Weapons, Inventory) show every entry. The large Saving Throws view needs all six saves without changing the parsed data, the medium/small presentation, or the SPEC-003 contract.

## Background (verified during ticket #214)

- The parser already stores per-ability `save` and `saveprof` from the `<save>` and `<saveprof>` nodes for all six abilities (`src/utils/parse-character-xml.ts`, abilities block). No parser work is needed.
- `saveprof` is observed as `1` (proficient) or `0` (not proficient) on the generated character artifacts. Every one of the 111 sheets has at least one proficient save, so the save-less section guard is exercised by synthetic fixtures only.
- Real values: alberich STR +6 (prof), DEX +2, CON +3, INT +1, WIS +5 (prof), CHA +1; ethir DEX +5 (prof), INT +4 (prof), STR +0, CON +1, WIS +1, CHA +0; tanadirian WIS +8 (prof), CHA +5 (prof), STR +2, DEX +3, CON +2, INT +1.
- The existing `saves` section in `src/components/xml-viewer/XmlCard.astro` renders `proficientSaves` only, in a `grid grid-cols-2 gap-1 sm:grid-cols-3`, and is the only save markup. The section already sits between Passive Skills and Skills, and its rank policy entry `saves: 'medium'` already exists in both policy maps.
- Reference rendering: `.scratch/charizard/charizard.html` (local scratch file, not committed). Its "Saving Throws" heading lists all six saves in standard order with a `ROLL` control per row. This implementation keeps the all-six layout, uses the current Tailwind theme and the repo's gold-dot convention, adds no roll buttons, and copies no CSS from that reference.

## Goals

- Render one `vitals-item` card in large mode containing two side-by-side tables (3+3) with all six saving throws in standard ability order.
- Show each row as the ability abbreviation plus the signed save bonus right-aligned in mono, with a single gold `#c68000` dot and a `Proficient` tooltip when `saveprof > 0`.
- Add a new large-only `allSaves` rank policy entry to both policy maps and keep them in sync.
- Keep the medium/small proficient-only grid unchanged, and swap the two views live through the existing S/M/L toggle without a page reload.
- Keep the parsed data, the SPEC-003 contract, and client-side JavaScript unchanged apart from the existing toggle behavior.
- Add render tests and a visual test page subsection that document the large view.

## Non-Goals

- Parser changes or a new `CharacterData` field: `save` and `saveprof` already reach the card for all six abilities.
- Roll buttons or any interactivity on save rows (the charizard reference has a `ROLL` control; this card does not).
- Showing the all-saves card outside large mode, or changing the medium/small grid.
- Expertise or multi-dot markers: a saving throw is proficient or not, so there is only ever one dot.
- A dedicated `saveRows`/`allSaves` data array or helper module; the card derives the rows from the existing `abilityEntries` and `lookupAbility`.
- Changing XML source sheets or the medium grid's column layout.
- A new ADR (no new architectural decision is being made).

## Data Shape

No data shape change. `CharacterData.abilities` already carries, per ability key:

```typescript
abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }>;
```

- `save` is the ability's total saving throw bonus from `<save>`; `saveprof` is the proficiency flag from `<saveprof>`.
- The card derives each row with the existing `lookupAbility(name)`, which defaults a missing ability to `{ score: 10, bonus: 0, save: 0, saveprof: 0 }`.
- Standard order comes from the existing `abilityNames`, `abilityShort`, and `abilityEntries` constants, so no new mapping table is introduced.
- The card's frontmatter derives the two columns from those constants:

```typescript
interface SaveRow {
  short: string;
  save: number;
  saveprof: number;
}
const saveColumns: SaveRow[][] = [
  abilityEntries.slice(0, 3),
  abilityEntries.slice(3),
].map((column) =>
  column.map(({ name, short }) => {
    const { save, saveprof } = lookupAbility(name);
    return { short, save, saveprof };
  })
);
```

## Design Decisions

1. **One card, two tables:** the large body is a single card built with the vitals-item recipe (`p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]`). Inside it a responsive two-column grid (`grid grid-cols-1 @lg:grid-cols-2 gap-2`) holds two tables that stack on narrow containers, mirroring the all-skills card.
2. **3+3 split in standard order:** `saveColumns` slices `abilityEntries` at 3, so the first table holds STR, DEX, CON and the second INT, WIS, CHA. Unlike all-skills there is no sorting; the standard ability order is the display order.
3. **Headers and row layout:** each table has a header row (`Ability` left, `Save` right, tiny uppercase gray) and body rows separated by top borders. The abbreviation sits left with the proficiency dot; the signed bonus is right-aligned in `font-mono font-semibold`, formatted by the existing `signed` helper so `0` reads `+0` and negatives keep their sign.
4. **Proficiency marker:** a single gold dot (`w-1.5 h-1.5 rounded-full bg-[#c68000]`) with `title="Proficient"` renders next to the abbreviation when `saveprof > 0`; non-proficient rows show no dot and no tooltip. No multi-dot case exists for saves.
5. **No roll buttons:** the rows are static text, consistent with the all-skills and equipped-weapons cards and unlike the charizard reference.
6. **Mode swap:** the section wrapper keeps the existing `saves: 'medium'` policy, and a new `allSaves: 'large'` entry gates the new block. The medium/small proficient-only grid stays in the markup with `x-show="!canShow('allSaves')"` so the S/M/L toggle can restore it live, and the all-saves card renders only in large (`{canShow('allSaves') && ...}` at build time plus `x-show="canShow('allSaves')"` for live toggling). Both copies of the section policy in `XmlCard.astro` must stay in sync:
   - frontmatter `sectionPolicy` gains `allSaves: 'large' as const`,
   - the Alpine `sectionPolicy` object inside the root `x-data` gains `allSaves: 2`.
7. **Outer section guard:** the section guard becomes `canShow('saves') && (proficientSaves.length > 0 || canShow('allSaves'))`. A save-less character (no proficient save on any ability) still renders the section and the all-saves card in large mode, while medium and small omit the section entirely, exactly as today. For the live toggle the section's `x-show` mirrors the same condition at runtime - `canShow('saves')` when the character has at least one proficient save, otherwise `canShow('saves') && canShow('allSaves')` - so a save-less card toggled from L to M or S hides the whole section instead of exposing an empty grid.
8. **Placement and styling:** the card replaces the grid inside the existing section between Passive Skills and Skills. Current Tailwind theme only; no CSS is copied from the charizard reference.

## Implementation Plan

This spec is delivered by ticket #215. Do not implement here.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #214 | This spec and the index row | - |
| #215 | XmlCard large-mode all-saves card, render tests, visual test page, archive this spec | #214 |

### Step 1 (ticket #215): Derive the save columns in the frontmatter

In `src/components/xml-viewer/XmlCard.astro`, after the existing `proficientSaves` derivation, add the `SaveRow` interface and the `saveColumns` derivation shown in Data Shape. No imports, parser, or data-contract change: `abilityEntries`, `lookupAbility`, and `signed` already exist.

### Step 2 (ticket #215): Add the policy entries and render the card

1. Add `allSaves: 'large' as const` to the frontmatter `sectionPolicy` map and `allSaves: 2` to the Alpine `sectionPolicy` object inside the root `x-data`, keeping the two maps in sync.
2. Update the existing Saving Throws section so the guard covers the save-less large case, the grid gains the live hide predicate, and the card is appended:

```astro
{canShow('saves') && (proficientSaves.length > 0 || canShow('allSaves')) && (
  <section
    class="border-t border-gray-100 dark:border-gray-700 pt-4"
    x-show={proficientSaves.length > 0 ? "canShow('saves')" : "canShow('saves') && canShow('allSaves')"}
  >
    <SectionHeader title="Saving Throws" />
    <div
      class="grid grid-cols-2 gap-1 sm:grid-cols-3"
      x-show="!canShow('allSaves')"
    >
      {proficientSaves.map((abilityName) => (
        <div class="flex justify-between py-1 px-2 text-sm">
          <span class="text-gray-700 dark:text-gray-300">{abilityName}</span>
          <span class="font-mono font-semibold text-gray-900 dark:text-gray-100">{signed(lookupAbility(abilityName).save)}</span>
        </div>
      ))}
    </div>
    {canShow('allSaves') && (
      <div class={vitalsItemClass} x-show="canShow('allSaves')">
        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-2">
          {saveColumns.map((column) => (
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th class="text-left font-medium pb-1">Ability</th>
                  <th class="text-right font-medium pb-1">Save</th>
                </tr>
              </thead>
              <tbody>
                {column.map((row) => (
                  <tr class="border-t border-gray-200 dark:border-gray-700">
                    <td class="py-1 text-gray-700 dark:text-gray-300">
                      <span class="inline-flex items-center gap-1">
                        <span>{row.short}</span>
                        {row.saveprof > 0 && (
                          <span class="w-1.5 h-1.5 rounded-full bg-[#c68000]" title="Proficient"></span>
                        )}
                      </span>
                    </td>
                    <td class="py-1 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{signed(row.save)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    )}
  </section>
)}
```

The build-time `canShow('allSaves')` guard omits the card from HTML for small/medium cards; `x-show` hides or restores it during live S/M/L toggling on cards initially rendered large. The prof-only grid stays in the markup with `x-show="!canShow('allSaves')"`, so toggling back to M restores it without a reload, and the grid's own markup and classes are otherwise unchanged.

### Step 3 (ticket #215): Render tests, visual test page, and spec archival

1. Extend `src/components/xml-viewer/xml-card-passives.test.ts` with an `XmlCard Saving Throws section` describe block. The existing `baseCharacter` fixture already exercises both cases: STR +5 and CON +4 are proficient, DEX +1, INT +0, WIS +1, CHA -1 are not. Add a `savesSection(html)` helper anchored on `>Saving Throws</h2>` (same slicing pattern as `skillsSection`) and a row helper that finds the `<tr` containing the ability abbreviation. Cover:
   - **Policy sync:** the static map yields `allSaves === 2` and the live Alpine policy equals the static policy.
   - **Large-only rendering:** the two tables appear in large output and not in small or medium output at build time; a save-less fixture (`saveprof: 0` on all six abilities) still renders the card in large mode, and a medium render of the same fixture has no `Saving Throws` heading.
   - **3+3 split and row order:** a large render has two `<table>` elements, one `rounded-[7px]` card, and the `Ability`/`Save` headers; the first table's rows are STR, DEX, CON in order and the second's are INT, WIS, CHA.
   - **Gold-dot marker:** the STR and CON rows each contain exactly one `bg-[#c68000]` dot with `title="Proficient"`; the DEX, INT, WIS, and CHA rows contain none; the section contains no `<button>`.
   - **Signed bonuses:** rows show `+5`, `+1`, `+4`, `+0`, `+1`, and `-1` in standard order (mono cells).
   - **Unchanged medium grid:** a medium render contains the prof-only grid rows (`Strength` and `Constitution` only, `justify-between`, `font-mono`) and no `<table>`.
   - **Placement and live toggling:** the section stays between Passive Skills and Skills; the section carries `x-show="canShow('saves')"` for the fixture with proficient saves and `x-show="canShow('saves') && canShow('allSaves')"` for a save-less fixture; the grid carries `x-show="!canShow('allSaves')"` and the card carries `x-show="canShow('allSaves')"`.
2. Add a `### Saving Throws` subsection under `## Display: Large` in `src/content/docs/guides/xml-card-test.mdx` before `## Notes`, using alberich (STR +6 and WIS +5 proficient; DEX +2, CON +3, INT +1, CHA +1 not) and noting the S/M/L behavior: M restores the prof-only grid, S hides the section, L restores the all-saves card.
3. Run the full verification suite and, once #215 lands, set this spec's `status` to `archived`.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `docs/specs/011-all-saves/SPEC.md` | create | #214 | This spec |
| `docs/specs/README.md` | modify | #214 | Add index row for 011 |
| `src/components/xml-viewer/XmlCard.astro` | modify | #215 | Large-mode all-saves card and `allSaves` rank policy entry |
| `src/components/xml-viewer/xml-card-passives.test.ts` | modify | #215 | Saving Throws render tests |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #215 | Visual verification subsection |

No other file changes. The parser (`src/utils/parse-character-xml.ts`) and its tests are untouched because `save` and `saveprof` are already parsed and tested, and no `CharacterData` field is added, so no fixture needs updating.

## ADR Constraints

No accepted ADR constrains this change. SPEC-003 is the binding interface constraint: the card consumes the existing `CharacterData.abilities` fields without changing their shape. ADR-0001 (icon component strategy) does not apply because the proficiency marker is a CSS dot, not an icon. ADR-0004 (Starlight admonitions) does not apply because no markdown admonitions are added. ADR-0005 (table row striping) targets Starlight markdown content tables, not component tables rendered inside `not-content`.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

Unit tests are not applicable: this feature adds no parser, helper, or data-shape change, and `src/utils/parse-character-xml.test.ts` already covers the `save`/`saveprof` parse (`draknor` proficient STR/CON, non-proficient DEX). Verification runs at the `XmlCard` render seam and on the visual test page.

### Render tests (ticket #215, AstroContainer at the `XmlCard` seam)

- **Policy sync:** the frontmatter map yields `allSaves === 2` and the live Alpine policy equals the static policy.
- **Large-only rendering:** large output contains the two-table card; small and medium output contain no `<table>` and no `Ability` header inside the section.
- **3+3 split and row order:** the first table holds STR, DEX, CON and the second INT, WIS, CHA, in that order, in a single `rounded-[7px]` card.
- **Dot marker:** exactly one `#c68000` dot with `title="Proficient"` on each proficient row, none on each non-proficient row.
- **Signed bonuses:** the six save cells read `+5`, `+1`, `+4`, `+0`, `+1`, `-1` for the base fixture.
- **Unchanged medium grid:** medium output still renders the prof-only `justify-between`/`font-mono` rows and no table.
- **Save-less guard:** a fixture with `saveprof: 0` on all six abilities still renders the all-saves card in large mode, and the medium render has no `Saving Throws` heading.
- **Placement:** the section stays between Passive Skills and Skills.
- **Live toggling:** the grid carries `x-show="!canShow('allSaves')"`, the card carries `x-show="canShow('allSaves')"`, and the section carries the matching outer predicate.
- **No buttons:** the section contains no `<button>`.
- **Visual test page:** the `### Saving Throws` subsection sits under `## Display: Large` and before `## Notes`, references alberich and `display="large"`, mentions the S/M/L behavior, and names the `Ability`/`Save` headers and the `Proficient` dot.

### Visual verification (ticket #215)

- Alberich's large card shows the Saving Throws card between Passive Skills and Skills: one rounded card with two tables - left STR +6 (dot), DEX +2, CON +3; right INT +1, WIS +5 (dot), CHA +1.
- Pressing M restores the prof-only grid (STR +6, WIS +5), S hides the section, and L restores the all-saves card, without a page reload.
- Narrowing the container stacks the two tables without horizontal overflow.
- Existing large sections (Passives, All-skills, Equipped Weapons, Inventory, Feats, Features, Powers) still render and toggle as before.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Remove the `allSaves` entries from both rank policy maps and delete the `SaveRow` interface and `saveColumns` derivation.
- Restore the Saving Throws section to the proficient-only grid with its original guard `canShow('saves') && proficientSaves.length > 0` and `x-show="canShow('saves')"`.
- Remove the Saving Throws render tests and the `### Saving Throws` test-page subsection.
- Remove the 011 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [x] Implementation complete (delivered by #215)
- [x] Tests passing
- [ ] ADR updated (not applicable: no new decision made)
