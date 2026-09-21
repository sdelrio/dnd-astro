---
status: archived
title: "Inventory"
author: "opencode"
date: "2026-09-21"
tags: [character-sheet, xml, fantasy-grounds, inventory, wealth, xml-viewer]
affects:
  - src/utils/parse-character-xml.ts
  - src/utils/parse-character-xml.test.ts
  - src/utils/build-xml-characters.test.ts
  - src/components/xml-viewer/inventory-display.ts
  - src/components/xml-viewer/inventory-display.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/components/xml-viewer/char-filter.test.ts
  - src/content/docs/guides/xml-card-test.mdx
  - docs/specs/010-inventory/SPEC.md
  - docs/specs/README.md
adr_constraints: []
---

# SPEC: Inventory

## Summary

In large display mode the `XmlCard` renders an "Inventory" section: a muted carried-weight line, a rounded, gold-topped table of carried and equipped items, and a "Current Wealth" card showing the parsed coins in fixed PP, GP, EP, SP, CP order. Medium and small display modes are unchanged.

## Problem Statement

The parser ignored `<inventorylist>` and `<coins>`, so no inventory or wealth data reached the generated character JSON and the card could not show what a character carries or owns. A player at the table needs the carried gear list with its total weight against the 5e carrying capacity, plus the coin purse. The sheet stores the ingredients only: unit weights rather than a carried total, a three-state `carried` flag, and a coins node whose key shape and denomination casing vary between sheets. The card should derive the total and the formatting at build time, show only what is carried, and leave the rest of the data available for later UI.

## Background (verified during tickets #208 and #209)

- Fantasy Grounds stores items in `<inventorylist>` under `id-NNNNN` keys, the same collection pattern as `powers`, `weaponlist`, and every other FG list. The extraction reuses the parser's existing `root.<collection>` access pattern and `id-` key filter.
- Across the 111 sheets, 109 carry an inventorylist and 108 expose at least one parsed item, 1581 top-level entries in total. One sheet's list contributes no entries, and nested `id-` keys inside an item's child lists (for example a nested `<powers>`) are not part of the top-level collection. A self-closing top-level `<id-... />` entry parses as an all-defaults item with an empty name rather than being dropped; no real sheet contains one.
- `carried` observed values: 0 (not carried, 107), 1 (carried or stowed, 1245), and 2 (equipped, 229). A future equip/unequip UI needs all three states, so the parser stores `carried` unfiltered.
- Coins live in `<coins>` on all 111 sheets. Two key shapes exist: `slot1..slot6` (94 sheets) and `id-00001..` (16 sheets), and lothiriel carries both shapes at once. Each entry has an `amount` and an optional `name`; the denomination is not slot-bound, and names may be lower-case (`gp`), upper-case (`GP`), or noise (`RATIONS`, `GOLD`, `SUPPLIES`).
- 108 sheets render the items table. nefazoui has no carried items but non-zero coins, so it renders the wealth card alone; darlo and neypay have neither and omit the section entirely.
- Carrying capacity is the 5e rule `STR score x 15`. Alberich (STR 18) reads `68.0 / 270 lb. carried`; his coins parse to `{ pp: 0, gp: 57, ep: 0, sp: 28, cp: 92 }`. draknor has 22 inventory items; the first is `{ name: 'Plate Armor, +1', count: 1, weight: 65, carried: 2 }`, and the fifth is `{ name: "Clothes, Traveler's", count: 1, weight: 4, carried: 0 }`.
- Reference rendering: `.scratch/charizard/charizard.html` (local scratch file, not committed). The implementation uses the current Tailwind theme; no CSS is copied from that reference.

## Goals

- Expose parsed `inventory` and `coins` data on `CharacterData`, with `carried` kept unfiltered so all three states survive.
- Render an "Inventory" section in `XmlCard` large display mode only, placed after Equipped Weapons and before Features.
- Show the carried weight total as `sum(weight x count)` over the carried items against a `STR score x 15` capacity.
- List only carried items (`carried` 1 and 2) in sheet order in an `Item | Count | Weight | State` table, with one-decimal unit weights and plain-text state labels.
- Show a "Current Wealth" card below the table in fixed PP, GP, EP, SP, CP order, keeping zero denominations.
- Omit the section entirely when nothing is carried and every coin is zero.
- Compute the row math and formatting in a pure, unit-testable helper so the card stays presentational.
- Keep medium and small modes visually unchanged, and client-side JavaScript unchanged apart from the existing S/M/L toggling behavior.
- Keep the existing parser outputs and the SPEC-003 data contract unchanged.

## Non-Goals

- Item `source` and `location` fields: FG items carry `<source>` (2 items across the sheets) and `<location>` (218 items across 29 sheets), but neither is parsed or shown. The table shows only Item, Count, Weight, and State.
- An equip/unequip UI, drag-and-drop, or writing inventory state back to the sheets.
- Coin conversion, currency maths, or a single total-gold value; the wealth card shows the five raw denominations.
- An inventory card in medium or small display modes.
- Item descriptions, pictures, attunement, or armor stats in the card.
- Roll buttons or any other interactivity on inventory rows.
- Changing XML source sheets or adding items to them.
- A new ADR (no new architectural decision is being made).

## Data Shape

Add `InventoryItem` and `Coins` interfaces and `inventory` and `coins` fields to `CharacterData` in `src/utils/parse-character-xml.ts`:

```typescript
export interface InventoryItem {
  name: string;
  count: number;
  weight: number;
  carried: number;
}

export interface Coins {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface CharacterData {
  // ...existing fields unchanged...
  inventory: InventoryItem[];
  coins: Coins;
}
```

- `inventory` is populated from `root.inventorylist` with the id-keyed collection pattern: `Object.keys(inventoryNode).filter((key) => key.startsWith('id-'))`.
- `weight` is the unit weight from the sheet, not multiplied by `count`.
- `carried` keeps the sheet values: 0 (not carried), 1 (carried or stowed), 2 (equipped). It is not filtered at parse time.
- Defaults keep odd sheets readable: missing `name` returns `''`; missing `count`, `weight`, and `carried` return 0.
- A missing or empty `<inventorylist>` yields `[]`.
- `coins` is normalised from both `slotN` and `id-NNNNN` key shapes into a single zeroed record, upper-cases each entry's `name`, matches the five denominations, ignores unknown names, and sums repeated denominations. A missing or empty `<coins>` node yields all zeros.
- Both fields are required on `CharacterData`, matching the `passives`, `allSkills`, and `weapons` precedents, so any other `CharacterData` fixture in the repo also gains values to keep `pnpm typecheck` green (for example `src/components/xml-viewer/char-filter.test.ts` and `src/components/xml-viewer/xml-card-passives.test.ts`).

## Design Decisions

1. **Data first, UI later:** the parser exposes the whole `inventorylist` and the whole purse, and the UI filters. `carried` stays unfiltered because an equip/unequip UI needs all three states; only the helper applies the carried-only filter.
2. **Pure helpers in a dedicated module:** `src/components/xml-viewer/inventory-display.ts` exports `toInventoryRows`, `carriedWeight`, `carryCapacity`, `toCoinRows`, and `hasInventoryContents`. The card stays presentational and the math is unit-testable without Astro.
3. **Carried-only filter:** `toInventoryRows` keeps `carried` 1 and 2 in sheet order (a filter preserves order), maps them to the plain-text state `Carried` (1) and `Equipped` (2), and drops `carried` 0. The sheet count travels on the row unchanged.
4. **One-decimal unit weights:** `weight: ${item.weight.toFixed(1)} lb.` renders `6` as `6.0 lb.`, `2.5` as `2.5 lb.`, and `0.01` as `0.0 lb.`
5. **Carried total and capacity:** `carriedWeight` sums `weight * count` over the shown items only (dropped items never count) and renders one decimal; `carryCapacity` applies the 5e rule `STR score x 15`. The card reads `lookupAbility('Strength').score`, so alberich shows `68.0 / 270 lb. carried`.
6. **Wealth order and zeros:** `toCoinRows` walks a fixed `PP, GP, EP, SP, CP` tuple, so the display order never depends on parse order and zero denominations stay visible.
7. **Section omission:** `hasInventoryContents` is true when any item is carried or any coin is non-zero. The build-time guard `canShow('inventory') && showInventory` omits the section from HTML when it is not wanted; the items table and the weight line are additionally gated by `inventoryRows.length > 0`, so a coins-only character shows just the wealth card.
8. **Large-only policy:** the section is gated by the existing rank policy. Both copies of the policy map in `XmlCard.astro` must stay in sync so build-time rendering and live S/M/L toggling agree:
   - frontmatter `sectionPolicy` gains `inventory: 'large' as const`,
   - the Alpine `sectionPolicy` object gains `inventory: 2`.
9. **Placement and styling:** the section sits after Equipped Weapons and before Features. The items table and the wealth card are each a single `vitals-item` boxed card (`p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]`); the muted weight line sits above the items table, and the wealth card sits below it (`mt-2`). No buttons anywhere.
10. **Styling:** current Tailwind theme only; no CSS copied from reference HTML, consistent with specs 007, 008, and 009.

## Implementation Plan

This spec is written after the fact because the implementation was already merged. The table records the tickets as executed.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #208 | Parser `inventory` and `coins` extraction and unit tests, delivered by PR #211 | - |
| #209 | `inventory-display` helper, XmlCard large-mode section, tests, visual test page, delivered by PR #212 | #208 |
| #210 | This spec and the index row, archived in the same pass | #209 |

### Step 1 (ticket #208): Expose inventory and coins in the parser

In `src/utils/parse-character-xml.ts`, add the two interfaces, the denomination map, and populate `inventory` and `coins`:

```typescript
const COIN_DENOMINATIONS: Record<string, keyof Coins> = {
  PP: 'pp',
  GP: 'gp',
  EP: 'ep',
  SP: 'sp',
  CP: 'cp',
};

const inventoryNode = root.inventorylist ?? {};
const inventory = Object.keys(inventoryNode)
  .filter((key) => key.startsWith('id-'))
  .map((key) => inventoryNode[key])
  .map((item) => ({
    name: getText(item, 'name'),
    count: Number(getText(item, 'count') || 0),
    weight: Number(getText(item, 'weight') || 0),
    carried: Number(getText(item, 'carried') || 0),
  }));
const coins: Coins = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
const coinsNode = (root.coins ?? {}) as Record<string, XmlFields | string>;
for (const entry of Object.values(coinsNode)) {
  if (!entry || typeof entry !== 'object') continue;
  const denomination = COIN_DENOMINATIONS[getText(entry, 'name').toUpperCase()];
  if (!denomination) continue;
  coins[denomination] += Number(getText(entry, 'amount') || 0);
}
```

The coins loop walks `Object.values`, so the `slotN` and `id-NNNNN` shapes reach the same code path, and `+=` accumulates duplicates. The parser then adds `inventory` and `coins` to the returned `CharacterData`.

Follow the TDD loop at the `parseCharacterXML` seam (real-sheet assertions for draknor, flint, and karas plus inline XML edge cases: missing fields, empty entries, both coin shapes, noise names, duplicate denominations, absent nodes).

### Step 2 (ticket #209): Compute inventory rows in a pure helper

Create `src/components/xml-viewer/inventory-display.ts`:

1. `isCarried(item)` returns true for `carried` 1 or 2.
2. `toInventoryRows(items)` filters on `isCarried` and maps to `{ name, count, weight: `${item.weight.toFixed(1)} lb.`, state: CARRIED_STATE[item.carried] }`, where `CARRIED_STATE` maps 1 to `Carried` and 2 to `Equipped`.
3. `carriedWeight(items)` sums `weight * count` over the carried items and returns `total.toFixed(1)`.
4. `carryCapacity(strengthScore)` returns `strengthScore * 15`.
5. `toCoinRows(coins)` maps a fixed `[PP, GP, EP, SP, CP]` tuple to `{ label, value }` rows.
6. `hasInventoryContents(items, coins)` returns true when any item is carried or any coin value is non-zero.

### Step 3 (ticket #209): Render the large-mode section

In `src/components/xml-viewer/XmlCard.astro`:

1. Import the helpers and destructure `inventory` and `coins` from `character`.
2. Add `inventory: 'large' as const` to the frontmatter `sectionPolicy` and `inventory: 2` to the Alpine `sectionPolicy` in the root `x-data` expression.
3. Derive the view data in the frontmatter:

```typescript
const inventoryRows = toInventoryRows(inventory);
const inventoryWeight = carriedWeight(inventory);
const inventoryCapacity = carryCapacity(lookupAbility('Strength').score);
const coinRows = toCoinRows(coins);
const showInventory = hasInventoryContents(inventory, coins);
```

4. Insert the section between Equipped Weapons and Features:

```astro
{canShow('inventory') && showInventory && (
  <section
    class="border-t border-gray-100 dark:border-gray-700 pt-4"
    x-show="canShow('inventory')"
  >
    <SectionHeader title="Inventory" />
    {inventoryRows.length > 0 && (
      <>
        <p class="m-0 mb-1 text-xs text-gray-500 dark:text-gray-400">
          {inventoryWeight} / {inventoryCapacity} lb. carried
        </p>
        <div class={vitalsItemClass}>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th class="text-left font-medium pb-1">Item</th>
                <th class="text-right font-medium pb-1">Count</th>
                <th class="text-right font-medium pb-1">Weight</th>
                <th class="text-left font-medium pb-1">State</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((item) => (
                <tr class="border-t border-gray-200 dark:border-gray-700">
                  <td class="py-1 text-gray-700 dark:text-gray-300">{item.name}</td>
                  <td class="py-1 text-right text-gray-700 dark:text-gray-300">{item.count}</td>
                  <td class="py-1 text-right text-gray-700 dark:text-gray-300">{item.weight}</td>
                  <td class="py-1 text-gray-500 dark:text-gray-400">{item.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
    <div class={`mt-2 ${vitalsItemClass}`}>
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Current Wealth</div>
      <div class="grid grid-cols-5 gap-1 text-center">
        {coinRows.map((coin) => (
          <div>
            <div class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{coin.label}</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{coin.value}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)}
```

The build-time `canShow('inventory') && showInventory` guard omits the section from HTML for small/medium cards, for unarmed-and-broke large cards, and for any card with nothing to show; `x-show` hides or restores it during live S/M/L toggling, matching the pattern used by the other rank-gated sections.

### Step 4 (ticket #209): Unit tests, render tests, and the visual test page

1. Add `src/components/xml-viewer/inventory-display.test.ts` covering the carried filter and sheet order, state labels, one-decimal weights, count passthrough, the weight total, dropped-item exclusion, the empty total, the capacity rule, the fixed coin order, and `hasInventoryContents`.
2. Add real-sheet assertions against alberich in the same file: `68.0` carried against `270` capacity, and coins `PP:0, GP:57, EP:0, SP:28, CP:92`.
3. Extend `src/components/xml-viewer/xml-card-passives.test.ts` with an `XmlCard Inventory section` describe block (policy sync, items table columns and row values, weight line, dropped items, wealth order, large-only rendering, omission rules, Feats/Features placement, live `x-show` predicate) plus an `XmlCard visual test page` assertion for the new subsection.
4. Add a `### Inventory` subsection under `## Display: Large` in `src/content/docs/guides/xml-card-test.mdx` using alberich, with a note on the S/M/L behavior and the wealth card.
5. Add the artifact-seam assertions in `src/utils/build-xml-characters.test.ts` so `inventory` and `coins` reach both generated JSON artifacts, and keep the real-assets check green.

### Step 5 (ticket #210): Archive this spec

1. Write this spec with `status: archived`.
2. Add the 010 row to `docs/specs/README.md`.
3. Run the full verification suite and merge by PR.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `src/utils/parse-character-xml.ts` | modify | #208 | Add `InventoryItem`/`Coins`, populate `inventory` and `coins` |
| `src/utils/parse-character-xml.test.ts` | modify | #208 | Real-sheet and inline edge-case tests for inventory and coins |
| `src/utils/build-xml-characters.test.ts` | modify | #208 | Artifact-seam tests that both fields reach generated JSON |
| `src/components/xml-viewer/char-filter.test.ts` | modify | #208 | `CharacterData` fixture gains the two required fields |
| `src/components/xml-viewer/inventory-display.ts` | create | #209 | Pure helpers for rows, weight, capacity, coins, and visibility |
| `src/components/xml-viewer/inventory-display.test.ts` | create | #209 | Unit tests for the helpers and the alberich real-sheet values |
| `src/components/xml-viewer/XmlCard.astro` | modify | #209 | Large-mode Inventory section and rank policy entry |
| `src/components/xml-viewer/xml-card-passives.test.ts` | modify | #209 | Render tests and policy-sync test |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #209 | Visual verification subsection |
| `docs/specs/010-inventory/SPEC.md` | create | #210 | This spec |
| `docs/specs/README.md` | modify | #210 | Add index row for 010 |

## ADR Constraints

No accepted ADR constrains this change. The binding interface constraint is SPEC-003: the feature extends the existing build-time XML parsing pipeline and the card keeps its presentational role. ADR-0001 (icon component strategy) does not apply because the section adds no icons or roll buttons. ADR-0004 (Starlight admonitions) does not apply because no markdown admonitions are added. ADR-0005 (table row striping) targets Starlight markdown content tables, not component tables rendered inside `not-content`.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

### Unit tests (tickets #208 and #209)

- **Parser real sheet:** `draknor.xml` yields 22 inventory items; the first equals `{ name: 'Plate Armor, +1', count: 1, weight: 65, carried: 2 }` and index 4 equals `{ name: "Clothes, Traveler's", count: 1, weight: 4, carried: 0 }`.
- **Parser defaults:** an inline inventorylist with missing fields yields `{ name: 'Torch', count: 0, weight: 0, carried: 0 }` and an empty `<id-00003 />` yields all-defaults `{ name: '', count: 0, weight: 0, carried: 0 }`; a missing and an empty `<inventorylist>` both yield `[]`.
- **Coins, slot shape:** `flint.xml` yields `{ pp: 0, gp: 40, ep: 0, sp: 0, cp: 0 }`.
- **Coins, id shape:** `draknor.xml` yields `{ pp: 0, gp: 378, ep: 0, sp: 583, cp: 0 }`.
- **Coins, noise names:** `karas.xml` slot6 holds 7 RATIONS, so it yields `{ pp: 4, gp: 468, ep: 22, sp: 22, cp: 52 }` without the rations.
- **Coins, duplicates and empty entries:** an inline coins node with `gp`, `GP`, a name-less amount, an empty entry, and `SP` yields `{ pp: 0, gp: 12, ep: 0, sp: 2, cp: 0 }`.
- **Coins, absent node:** missing and empty `<coins>` both yield all zeros.
- **Artifact flow:** `buildXmlCharacters()` writes an inventory of one Longsword and `{ gp: 15 }` to both the flat JSON and the Astro JSON artifact, and the real-assets check finds draknor with 22 items and `{ pp: 0, gp: 378, ep: 0, sp: 583, cp: 0 }`.
- **Carried filter and order:** a Greatsword (2), a dropped gem (0), and a Backpack (1) render as `['Greatsword', 'Backpack']`, labelled `Equipped` and `Carried`.
- **One-decimal weights:** weights 6, 2.5, and 0.01 render as `6.0 lb.`, `2.5 lb.`, and `0.0 lb.`; the sheet count survives on the row.
- **Weight total:** the alberich fixture sums to `68.0`; dropped items are excluded (`2.0`); an empty list reads `0.0`.
- **Capacity:** `carryCapacity(18)` is 270 and `carryCapacity(10)` is 150.
- **Coin ordering:** `{ pp: 5, gp: 57, ep: 1, sp: 28, cp: 92 }` yields the five rows in PP, GP, EP, SP, CP order.
- **Section visibility:** `hasInventoryContents` is false for no carried items plus zero coins, and true for a carried item or any non-zero coin.
- **Real sheet:** alberich reads `68.0` carried and `270` capacity; his coins render `PP:0, GP:57, EP:0, SP:28, CP:92`.
- **Regression:** the existing parser, passives, all-skills, and weapons assertions stay green and unchanged.

### Render tests (ticket #209, AstroContainer at the `XmlCard` seam)

- **Policy sync:** the frontmatter map yields `inventory === 2` and the live Alpine policy equals the static policy.
- **Items table:** a large render shows the `Item | Count | Weight | State` headers, one table, two `rounded-[7px]` cards, and no `<button>`; the Greatsword row reads `6.0 lb.` and `Equipped`, the Handaxe row reads count `2`, and the Rhodochrosite row reads `0.0 lb.` and `Carried`.
- **Weight line:** the section contains `68.0 / 270 lb. carried`.
- **Dropped items:** a `carried` 0 item is absent from the table and does not change the weight total.
- **Wealth order:** the section contains `Current Wealth` and the PP, GP, EP, SP, CP labels in that order with the alberich values.
- **Large-only rendering:** small and medium output contains no `Current Wealth` at build time.
- **Omission:** a large render with only dropped items and zero coins has no `Inventory` heading and no `Current Wealth`; with no carried items but non-zero coins it shows the wealth card alone, with no table and no weight line.
- **Placement:** the section sits after Equipped Weapons and before Features in large mode.
- **Live toggle:** the section carries `x-show="canShow('inventory')"`.
- **Visual test page:** the `### Inventory` subsection sits under `## Display: Large` and before `## Notes`, references alberich and `display="large"`, mentions the S/M/L behavior, and shows `68.0 / 270 lb. carried`, `Current Wealth`, `Item`, and `State`.

### Visual verification (ticket #209)

- Alberich's large card shows the Inventory section between Equipped Weapons and Features: the weight line reads `68.0 / 270 lb. carried`, the items table lists his carried and equipped gear with one-decimal weights and Carried/Equipped states, and the Current Wealth card reads PP 0, GP 57, EP 0, SP 28, CP 92.
- Pressing S or M hides the section; pressing L restores it, without a page reload.
- Existing large card sections (Passives, All-skills, Equipped Weapons, Feats, Features, Powers) still render and toggle as before.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Remove `inventory`, `coins`, `InventoryItem`, and `Coins` from `CharacterData` and the parser, including the `COIN_DENOMINATIONS` map, and restore any `CharacterData` fixtures that gained the fields.
- Remove the parser inventory and coins tests and the build artifact assertions added for both fields.
- Delete `inventory-display.ts` and its tests.
- Remove the Inventory section from `XmlCard.astro` and the `inventory` entries from both rank policy maps.
- Remove the render tests and the test-page subsection added for inventory.
- Remove the 010 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [ ] Implementation complete (delivered by #208 and #209)
- [ ] Tests passing
- [ ] ADR updated (not applicable: no new decision made)
