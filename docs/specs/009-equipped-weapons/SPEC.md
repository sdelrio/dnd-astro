---
status: archived
title: "Equipped Weapons"
author: "opencode"
date: "2026-09-21"
tags: [character-sheet, xml, fantasy-grounds, weapons, xml-viewer, equipped-weapons]
affects:
  - src/utils/parse-character-xml.ts
  - src/utils/parse-character-xml.test.ts
  - src/utils/build-xml-characters.test.ts
  - src/components/xml-viewer/weapon-display.ts
  - src/components/xml-viewer/weapon-display.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/content/docs/guides/xml-card-test.mdx
  - docs/specs/009-equipped-weapons/SPEC.md
  - docs/specs/README.md
adr_constraints: []
---

# SPEC: Equipped Weapons

## Summary

In large display mode the `XmlCard` renders an "Equipped Weapons" section: one rounded, gold-topped table listing only weapons the Fantasy Grounds sheet marks as equipped (`carried` 2), with a computed ATK total and a computed Damage string per weapon. Medium and small display modes are unchanged.

## Problem Statement

The parser ignored `<weaponlist>`, so no weapon data reached the generated character JSON and the card could not show attacks. A player at the table needs the equipped weapons with their final attack bonus and damage expression, but the sheet stores the ingredients only: a flat `attackbonus`, the ability that drives the attack, a proficiency bonus on the character, numbered damage parts, and a `statmult` multiplier. The card should derive the totals at build time, show only what is equipped, and leave the rest of the weapon data available for later UI.

## Background (verified during tickets #202 and #203)

- Fantasy Grounds stores weapons in `<weaponlist>` under `id-NNNNN` keys, the same collection pattern as `powers`, `skilllist`, and every other FG list. The parser's existing `root.weaponlist` access and `id-` key filter are reused.
- Across the 111 sheets, 107 carry a `weaponlist` with 383 weapons in total. `carried` observed values: 0 (not carried, 88), 1 (carried or stowed, 109), and 2 (equipped, 186); 67 sheets have at least one equipped weapon. A future inventory card needs all three states, so the parser stores `carried` unfiltered.
- Weapon `type` observed values: 0 melee (241), 1 ranged (67), 2 thrown (75). Thrown weapons use Strength for the `base` stat mapping.
- `attackstat` is either a lowercase ability name (dexterity 111, charisma 8, wisdom 5, strength 2) or empty (257); no sheet writes the literal `base` for attack, but empty plays that role. Damage `stat` values are `base`, a lowercase ability name, or empty.
- `statmult` is 1 on every real damage part. The default-1 behavior is exercised by inline tests with 2 and 0.
- Dice are stored as comma-separated repeats (`d6,d6`) or already combined (`2d6`, `d8+d6`); damage `type` can be a comma list such as `piercing,magic`.
- Reference example: alberich's Greatsword (STR 18, bonus +4; prof bonus +2; `attackbonus` 0; empty `attackstat`; `type` 0; damage `d6,d6` base slashing) renders ATK `+6` and damage `2d6+4 Slashing`. His two equipped Handaxes (one `type` 0, one `type` 2) each render ATK `+6` and `d6+4 Slashing`.
- The styling follows the existing all-skills card treatment (the vitals-item recipe) and the current Tailwind theme; no CSS is copied from the D&D Beyond reference HTML.

## Goals

- Expose parsed `weapons` data on `CharacterData`, with `carried` kept unfiltered so all states survive.
- Render an "Equipped Weapons" table in `XmlCard` large display mode only, placed after Feats and before Features.
- Compute the ATK total and the damage expression in a pure, unit-testable helper so the card stays presentational.
- Show only `carried === 2` weapons and hide the section entirely when none are equipped.
- Keep medium and small modes visually unchanged, and client-side JavaScript unchanged apart from the existing S/M/L toggling behavior.
- Keep the existing parser outputs and the SPEC-003 data contract unchanged.

## Non-Goals

- Roll buttons, to-hit rolls, or any other interactivity on weapon rows.
- An inventory card or listing stowed or sold weapons; the unfiltered `carried` field only prepares for one.
- An equip/unequip UI, or writing weapon state back to the sheets.
- Changing XML source sheets or adding weapons to them.
- Weapon data outside the Equipped Weapons section (medium and small stay unchanged).
- A new ADR (no new architectural decision is being made).

## Data Shape

Add `WeaponDamageData`, `WeaponData`, and a `weapons` array to `CharacterData` in `src/utils/parse-character-xml.ts`:

```typescript
export interface WeaponDamageData {
  bonus: number;
  dice: string;
  stat: string;
  statmult: number;
  type: string;
}

export interface WeaponData {
  name: string;
  attackbonus: number;
  attackstat: string;
  properties: string;
  carried: number;
  /** Fantasy Grounds weapon type: 0 = melee, 1 = ranged, 2 = thrown. */
  type: number;
  damage: WeaponDamageData[];
}

export interface CharacterData {
  // ...existing fields unchanged...
  weapons: WeaponData[];
}
```

- `weapons` is populated from `root.weaponlist` with the id-keyed collection pattern: `Object.keys(weaponsNode).filter((key) => key.startsWith('id-'))`.
- `carried` keeps the sheet values: 0 (not carried), 1 (carried or stowed), 2 (equipped). It is not filtered at parse time.
- Defaults keep odd sheets readable: missing `attackbonus`, `bonus`, and `carried` return 0; missing `statmult` returns 1; missing `attackstat`, `properties`, `dice`, `stat`, and `type` strings return `''`; missing weapon `type` returns 0.
- `type` was added in ticket #203 as a prerequisite for the base-stat mapping. It had to be exposed before the helper could map `base` or empty attack and damage stats to Strength or Dexterity.
- A missing or empty `<weaponlist>` yields `[]`. The field is required on `CharacterData`, matching the `passives` and `allSkills` precedents, so any other `CharacterData` fixture in the repo also gains a `weapons` value to keep `pnpm typecheck` green.

## Design Decisions

1. **Data first, UI later:** the parser exposes the whole `weaponlist` and the UI filters. `carried` stays unfiltered because a future inventory card needs all three states; only `toWeaponRows` applies the equipped filter.
2. **Computed totals in a pure helper:** `src/components/xml-viewer/weapon-display.ts` exports `toWeaponRows(weapons, abilities, profBonus): WeaponRow[]`, returning `{ name, attack, properties, damage }` for `carried === 2` only. The card stays presentational and the math is unit-testable without Astro.
3. **Attack total:** `ATK = attackbonus + profBonus + ability bonus of the attack stat`. An empty `attackstat` or the literal `base` maps by weapon type: ranged (`type` 1) uses Dexterity, anything else (melee 0, thrown 2) uses Strength. Any other value is treated as an ability name; an unknown or missing ability contributes 0. `signed()` renders the result with a leading `+` for non-negative values.
4. **Damage total per part:** `modifier = bonus + stat bonus * statmult`. For the damage stat, `base` maps by weapon type the same way; an empty stat adds nothing. A zero modifier is omitted, so a plain `d6` stays `d6`. Multiple damage parts join with `; `.
5. **Dice normalization:** comma-separated dice tokens are grouped by faces and combined (`d6,d6` becomes `2d6`, `d8,d6` becomes `d8+d6`); a single token or a non-dice token passes through unchanged. This matches how a player writes a greatsword's `2d6`.
6. **Damage type formatting:** each comma token is trimmed and title-cased, then joined with `, ` (`piercing,magic` becomes `Piercing, Magic`). An empty type is dropped, and a dice-less part can render from its modifier and type alone. Properties fall back to `-` when the sheet stores none.
7. **Large-only policy:** the section is gated by the existing rank policy. Both copies of the policy map in `XmlCard.astro` must stay in sync so build-time rendering and live S/M/L toggling agree:
   - frontmatter `sectionPolicy` gains `weapons: 'large' as const`,
   - the Alpine `sectionPolicy` object gains `weapons: 2`.
8. **Placement and styling:** the section sits after Feats and before Features. It is a single `vitals-item` boxed card (`p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]`) containing one table with columns `ATK | Weapon | Properties | Damage`. No roll buttons. The build-time `canShow('weapons') && weaponRows.length > 0` guard omits the section from HTML when it is not wanted; `x-show="canShow('weapons')"` hides or restores it during live S/M/L toggling.
9. **Styling:** current Tailwind theme only; no CSS copied from reference HTML, consistent with specs 007 and 008.

## Implementation Plan

This spec is written after the fact because the implementation was already merged. The table records the tickets as executed.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #202 | Parser `weapons` extraction and unit tests, delivered by PR #205 | - |
| #203 | `weapon-display` helper, XmlCard large-mode section, tests, visual test page, delivered by PR #206 | #202 |
| #204 | This spec and the index row, archived in the same pass | #203 |

### Step 1 (ticket #202): Expose weaponlist entries in the parser

In `src/utils/parse-character-xml.ts`, add the two interfaces and populate `weapons` using the same id-keyed pattern as `powers`:

```typescript
const weaponsNode = root.weaponlist ?? {};
const weapons = Object.keys(weaponsNode)
  .filter((key) => key.startsWith('id-'))
  .map((key) => weaponsNode[key])
  .map((w) => ({
    name: getText(w, 'name'),
    attackbonus: Number(getText(w, 'attackbonus') || 0),
    attackstat: getText(w, 'attackstat'),
    properties: getText(w, 'properties'),
    carried: Number(getText(w, 'carried') || 0),
    type: Number(getText(w, 'type') || 0),
    damage: getCollection(w.damagelist).map((d) => ({
      bonus: Number(getText(d, 'bonus') || 0),
      dice: getText(d, 'dice'),
      stat: getText(d, 'stat'),
      statmult: Number(getText(d, 'statmult') || 1),
      type: getText(d, 'type'),
    })),
  }));
```

Add `weapons` to the returned `CharacterData`. Follow the TDD loop at the `parseCharacterXML` seam (real-sheet assertion for draknor plus inline XML edge cases: multi-part damagelist, absent properties, absent dice and bonus, absent `statmult`, missing or empty `weaponlist`). Ticket #203 later added the `type` field and its assertions.

### Step 2 (ticket #203): Compute weapon rows in a pure helper

Create `src/components/xml-viewer/weapon-display.ts`:

1. `abilityBonus` reads `abilities[stat]?.bonus ?? 0`.
2. `baseAbility(weaponType)` returns `dexterity` for type 1 and `strength` otherwise.
3. `attackTotal` picks `attackstat` unless it is empty or `base`, then adds `attackbonus + profBonus + abilityBonus`.
4. `normalizeDice` groups comma-separated dice tokens by faces, combines duplicates, and joins distinct groups with `+`.
5. `damageTotal` computes `bonus + statBonus * statmult`, drops a zero modifier, and appends the title-cased type.
6. `toWeaponRows` filters `carried === 2`, maps each weapon to `{ name, attack: signed(...), properties: properties || '-', damage: damageString(...) }`, and joins multiple damage parts with `; `.

### Step 3 (ticket #203): Render the large-mode section

In `src/components/xml-viewer/XmlCard.astro`:

1. Import `toWeaponRows` and destructure `weapons` from `character`.
2. Add `weapons: 'large' as const` to the frontmatter `sectionPolicy` and `weapons: 2` to the Alpine `sectionPolicy` in the root `x-data` expression.
3. Derive `const weaponRows = toWeaponRows(weapons, abilities, profBonus);`.
4. Insert the section between Feats and Features:

```astro
{canShow('weapons') && weaponRows.length > 0 && (
  <section
    class="border-t border-gray-100 dark:border-gray-700 pt-4"
    x-show="canShow('weapons')"
  >
    <SectionHeader title="Equipped Weapons" />
    <div class={vitalsItemClass}>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <th class="text-left font-medium pb-1">ATK</th>
            <th class="text-left font-medium pb-1">Weapon</th>
            <th class="text-left font-medium pb-1">Properties</th>
            <th class="text-right font-medium pb-1">Damage</th>
          </tr>
        </thead>
        <tbody>
          {weaponRows.map((weapon) => (
            <tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="py-1 font-mono font-semibold text-gray-900 dark:text-gray-100">{weapon.attack}</td>
              <td class="py-1 text-gray-700 dark:text-gray-300">{weapon.name}</td>
              <td class="py-1 text-gray-500 dark:text-gray-400">{weapon.properties}</td>
              <td class="py-1 text-right text-gray-700 dark:text-gray-300">{weapon.damage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}
```

The build-time `canShow('weapons') && weaponRows.length > 0` guard omits the section from HTML for small/medium cards and for unarmed large cards; `x-show` hides or restores it during live S/M/L toggling, matching the pattern used by the other rank-gated sections.

### Step 4 (ticket #203): Unit tests, render tests, and the visual test page

1. Add `src/components/xml-viewer/weapon-display.test.ts` covering the golden greatsword example, the equipped-only filter, dash properties, named and unknown attack stats, base-stat mapping for ranged and thrown, dice normalization, `statmult`, multi-part joins, title-casing, empty stats, and a dice-less part.
2. Extend `src/components/xml-viewer/xml-card-passives.test.ts` with an `XmlCard Equipped Weapons section` describe block (policy sync, large-only rendering, hidden when unarmed, Feats/Features placement, live `x-show` predicate).
3. Add a `### Equipped Weapons` subsection under `## Display: Large` in `src/content/docs/guides/xml-card-test.mdx` using alberich, plus its doc assertion in the visual test page describe block.
4. Add the artifact-seam assertions in `src/utils/build-xml-characters.test.ts` so `weapons` reaches `src/generated/characters.json`.

### Step 5 (ticket #204): Archive this spec

1. Write this spec with `status: archived`.
2. Add the 009 row to `docs/specs/README.md`.
3. Run the full verification suite and merge by PR.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `src/utils/parse-character-xml.ts` | modify | #202, #203 | Add `WeaponData`/`WeaponDamageData`, populate `weapons`, add weapon `type` |
| `src/utils/parse-character-xml.test.ts` | modify | #202, #203 | Real-sheet and inline edge-case tests for weapons and `type` |
| `src/utils/build-xml-characters.test.ts` | modify | #202 | Artifact-seam test that `weapons` reaches generated JSON |
| `src/components/xml-viewer/weapon-display.ts` | create | #203 | Pure `toWeaponRows` helper for ATK and damage totals |
| `src/components/xml-viewer/weapon-display.test.ts` | create | #203 | Unit tests for the helper |
| `src/components/xml-viewer/XmlCard.astro` | modify | #203 | Large-mode Equipped Weapons section and rank policy entry |
| `src/components/xml-viewer/xml-card-passives.test.ts` | modify | #203 | Render tests and policy-sync test |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #203 | Visual verification subsection |
| `docs/specs/009-equipped-weapons/SPEC.md` | create | #204 | This spec |
| `docs/specs/README.md` | modify | #204 | Add index row for 009 |

## ADR Constraints

No accepted ADR constrains this change. The binding interface constraint is SPEC-003: the feature extends the existing build-time XML parsing pipeline and the card keeps its presentational role. ADR-0001 (icon component strategy) does not apply because the section adds no icons or roll buttons. ADR-0004 (Starlight admonitions) does not apply because no markdown admonitions are added. ADR-0005 (table row striping) targets Starlight markdown content tables, not component tables rendered inside `not-content`.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

### Unit tests (tickets #202 and #203)

- **Parser real sheet:** `draknor.xml` yields weapons, and `Battleaxe, +1` equals `{ name: 'Battleaxe, +1', attackbonus: 1, attackstat: '', properties: 'Versatile (1d10), magic, crit range 18', carried: 2, type: 0, damage: [{ bonus: 1, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing,magic,brutal' }] }`.
- **Parser edge cases:** an inline weaponlist with two damage parts preserves order and explicit values; absent fields fall back to the documented defaults; `missing` and empty `weaponlist` both yield `[]`.
- **Artifact flow:** `buildXmlCharacters()` returns draknor with a non-empty `weapons` array whose first weapon has damage, and the generated `characters.json` entry also contains weapons.
- **Golden helper example:** Greatsword with STR 18, prof +2 yields `{ name: 'Greatsword', attack: '+6', properties: 'reroll 2', damage: '2d6+4 Slashing' }`.
- **Equipped filter:** `carried` 0 and 1 are dropped; an empty `properties` renders `-`.
- **Attack math:** a flat attack bonus and a named ability stack (`charisma` adds the Charisma bonus); an unknown stat adds 0; `base`/empty maps to DEX for type 1 and STR for types 0 and 2.
- **Damage math:** repeated comma dice normalize (`d6,d6` to `2d6`, `d8,d6` to `d8+d6`); `statmult` multiplies the stat bonus (2 doubles it, 0 drops it); parts join with `; ` and each type title-cases (`'d8+5 Piercing, Magic; d6+4 Fire'`); an empty damage stat adds nothing; a dice-less part renders from modifier and type.
- **Regression:** the existing parser, passives, and all-skills assertions stay green and unchanged.

### Render tests (ticket #203, AstroContainer at the `XmlCard` seam)

- **Policy sync:** the frontmatter map yields `weapons === 2` and the live Alpine policy equals the static policy.
- **Large-only rendering:** the section appears in large output with one `rounded-[7px]` table and the `ATK | Weapon | Properties | Damage` headers, and not in small or medium output at build time.
- **Hidden when unarmed:** a large render with only `carried` 1 or with an empty weapons array omits the section.
- **Placement:** the section sits after Feats and before Features in large mode.
- **Live toggle:** the section carries `x-show="canShow('weapons')"` and contains no `<button>`.
- **Visual test page:** an `### Equipped Weapons` subsection sits under `## Display: Large` and before `## Notes`, references alberich and `display="large"`, mentions the S/M/L behavior, and shows the `2d6+4 Slashing` example.

### Visual verification (ticket #203)

- Alberich's large card shows the Equipped Weapons table between Feats and Features: Greatsword ATK `+6`, damage `2d6+4 Slashing`; two Handaxes each ATK `+6`, damage `d6+4 Slashing`; the stowed Claw is omitted.
- Pressing S or M hides the section; pressing L restores it, without a page reload.
- Existing large card sections (Passives, All-skills, Feats, Features, Powers) still render and toggle as before.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Remove `weapons`, `WeaponData`, and `WeaponDamageData` from `CharacterData` and the parser mapping, and restore any `CharacterData` fixtures that gained the field.
- Remove the parser weapon tests, the `type` assertions, and the build artifact assertions added for weapons.
- Delete `weapon-display.ts` and its tests.
- Remove the Equipped Weapons section from `XmlCard.astro` and the `weapons` entries from both rank policy maps.
- Remove the render tests and the test-page subsection added for weapons.
- Remove the 009 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [ ] Implementation complete (delivered by #202 and #203)
- [ ] Tests passing
- [ ] ADR updated (not applicable: no new decision made)
