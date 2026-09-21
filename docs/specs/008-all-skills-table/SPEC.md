---
status: active
title: "All-skills table"
author: "opencode"
date: "2026-09-21"
tags: [character-sheet, xml, fantasy-grounds, skills, xml-viewer, all-skills]
affects:
  - src/utils/parse-character-xml.ts
  - src/utils/parse-character-xml.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/content/docs/guides/xml-card-test.mdx
adr_constraints: []
---

# SPEC: All-skills table

## Summary

In large display mode the `XmlCard` Skills section renders one card containing two rounded, side-by-side tables that list ALL skills from the Fantasy Grounds skilllist, alphabetically ordered, not just proficient ones. Medium and small display modes are unchanged.

## Problem Statement

The parser drops non-proficient skilllist entries: the SPEC-003 `skills` contract filters the skilllist to `prof > 0`, so only proficient skills reach the card. The medium mode prof-only grid reflects that contract, but it means the full skill table - what a player sees on the paper sheet - cannot be rendered. The large-mode Skills view needs every entry, including non-proficient skills, expertise entries, and sheet-specific custom skills.

## Background (verified during ticket #196)

- The Fantasy Grounds skilllist on every sheet enumerates all skills the character knows about, each with `name`, `prof` (0 none, 1 proficient, 2 expertise), `stat` (lowercase full ability name), and `total`. Sheet counts observed: draknor 19 entries, ethir 20, tanadirian 18.
- Non-proficient entries carry real totals (draknor Investigation is prof 0, total -1), so they are worth showing in a full table.
- Custom skills carry a `stat` too: ethir has `Thieves Tools (locks)` (dexterity, prof 2) and `Thieves Tools (Traps)` (intelligence, prof 2). The `stat` field is therefore enough to label any custom row with its governing ability, without a name-based lookup table.
- Expertise (prof 2) appears on ethir (Sleight of Hand, Thieves Tools entries) and other sheets; tanadirian has no prof 2 entries, so it exercises the one-dot/none cases.
- Reference rendering: `.scratch/charizard/charizard.html` (local scratch file, not committed). The implementation uses the current Tailwind theme; no CSS is copied from that reference.

## Goals

- Expose parsed `allSkills` data on `CharacterData` so any consumer can render the full skill table.
- Render one card with two alphabetical all-skills tables in `XmlCard` large display mode, replacing the prof-only grid there.
- Show proficiency as gold dots: one dot for proficient, two for expertise, nothing for non-proficient, with tooltips.
- Keep medium and small modes visually unchanged (medium keeps the prof-only grid).
- Keep the existing prof-only `skills` output byte-for-byte unchanged (SPEC-003 contract).
- Keep client-side JavaScript unchanged apart from the existing S/M/L toggling behavior.

## Non-Goals

- Roll buttons or any other interactivity on skill rows.
- Changing the medium prof-only grid, or showing all-skills tables outside large mode.
- Filtering, search, or grouping of the skill tables; only alphabetical order.
- Changing XML source sheets or adding skills to them.
- A new ADR (no new architectural decision is being made).

## Data Shape

Add an `allSkills` array to `CharacterData` in `src/utils/parse-character-xml.ts`:

```typescript
interface SkillEntry {
  name: string;
  total: number;
  prof: number;
  stat: string;
}

export interface CharacterData {
  // ...existing fields unchanged...
  allSkills: SkillEntry[];
}
```

- `prof` keeps the sheet values: 0 (none), 1 (proficient), 2 (expertise).
- `stat` is the lowercase ability full name from the sheet (e.g. `"wisdom"`), so custom skills like `Thieves Tools (Traps)` carry their governing ability. It may be empty on odd sheets.
- Entries stay in XML order. Alphabetical sorting belongs to the UI.
- The existing prof-only `skills` array is derived the same way as before and stays byte-for-byte unchanged.

## Design Decisions

1. **One card, two tables:** the large-mode Skills body is a single card built with the vitals-item recipe (`p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]`). Inside it, a responsive two-column grid (`grid grid-cols-1 @lg:grid-cols-2 gap-2`) holds two tables that stack on narrow containers.
2. **Alphabetical split:** a sorted copy of `allSkills` (`localeCompare` on `name`) is split in halves; the first table takes `Math.ceil(n / 2)` entries, the second takes the remainder. For example 19 entries render 10 + 9.
3. **Table layout:** each table has a header row (Skill / Abil / Total, tiny uppercase gray), body rows separated by bottom borders, and totals right-aligned in mono type.
4. **Proficiency markers:** gold dots (`#c68000`) next to the skill name - one dot for proficient (prof 1), two for expertise (prof 2), nothing for non-proficient (prof 0). Tooltips distinguish "Proficient" and "Expertise". No roll buttons.
5. **Ability abbreviation:** derived from `stat` (first three letters, uppercase, e.g. `wisdom` -> `WIS`); the cell is blank when `stat` is missing.
6. **Mode swap:** the section wrapper keeps the existing `skills: 'medium'` policy, and a new `allSkills: 'large'` policy entry gates the new block. The medium prof-only grid is hidden in large mode (it stays in the markup with `x-show="!canShow('allSkills')"` so the S/M/L toggle can restore it live), and the all-skills card appears only in large (`{canShow('allSkills') && ...}` at build time plus `x-show="canShow('allSkills')"` for live toggling). Both copies of the section policy in `XmlCard.astro` must stay in sync:
   - frontmatter `sectionPolicy` gains `allSkills: 'large'`,
   - the Alpine `sectionPolicy` object gains `allSkills: 2`.
7. **Styling:** current Tailwind theme only; no CSS copied from the charizard reference.

## Implementation Plan

This spec is delivered by two follow-up tickets. Do not implement here.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #196 | This spec and the index row | - |
| #197 | Parser `allSkills` extraction and unit tests | #196 |
| #198 | XmlCard large-mode tables, render tests, visual test page, archive this spec | #197 |

### Step 1 (ticket #197): Expose all skilllist entries in the parser

In `src/utils/parse-character-xml.ts`:

1. Build the skilllist entries once with the ability stat included:

```typescript
const skillEntries = getCollection(root.skilllist).map((s) => ({
  name: getText(s, 'name'),
  total: Number(getText(s, 'total') || 0),
  prof: Number(getText(s, 'prof') || 0),
  stat: getText(s, 'stat'),
}));
```

2. Derive the existing prof-only output from those entries without changing its shape or values:

```typescript
const skills = skillEntries
  .filter((s) => s.prof > 0)
  .map(({ name, total }) => ({ name, total }));
```

3. Derive the additive all-skills list in XML order (no filter, no sort):

```typescript
const allSkills = skillEntries.map(({ name, total, prof, stat }) => ({
  name,
  total,
  prof,
  stat,
}));
```

4. Add `allSkills` to the returned `CharacterData` object and to the exported interface. Because the field is required (matching the `passives` precedent), any other `CharacterData` fixture in the repo also gains an `allSkills` value to keep `pnpm typecheck` green (for example `src/components/xml-viewer/char-filter.test.ts`).

Follow the TDD loop at the `parseCharacterXML` seam: write one failing unit test, make it pass, repeat (slices: full list on a real sheet, expertise preserved, custom skill included, missing-field fallback). Do not anticipate the UI work.

### Step 2 (ticket #198): Render the large-mode all-skills tables

In `src/components/xml-viewer/XmlCard.astro`:

1. Destructure `allSkills` alongside the other `character` fields.
2. Add `allSkills: 'large' as const` to the frontmatter `sectionPolicy` and `allSkills: 2` to the Alpine `sectionPolicy` in the root `x-data` expression.
3. Derive the sorted halves and the ability abbreviation in the frontmatter:

```typescript
const sortedAllSkills = [...allSkills].sort((a, b) => a.name.localeCompare(b.name));
const skillHalf = Math.ceil(sortedAllSkills.length / 2);
const skillColumns = [
  sortedAllSkills.slice(0, skillHalf),
  sortedAllSkills.slice(skillHalf),
];
function abilityAbbr(stat: string): string {
  return stat ? stat.slice(0, 3).toUpperCase() : '';
}
```

4. Keep the prof-only grid in the section but hide it when the all-skills block is active, and add the all-skills card below it:

```astro
{canShow('skills') && skills.length > 0 && (
  <section
    class="border-t border-gray-100 dark:border-gray-700 pt-4"
    x-show="canShow('skills')"
  >
    <SectionHeader title="Skills" />
    <div
      class="grid grid-cols-2 gap-1 sm:grid-cols-3"
      x-show="!canShow('allSkills')"
    >
      {skills.map((skill) => (
        <div class="flex justify-between py-1 px-2 text-sm">
          <span class="text-gray-700 dark:text-gray-300">{skill.name}</span>
          <span class="font-mono font-semibold text-gray-900 dark:text-gray-100">{signed(skill.total)}</span>
        </div>
      ))}
    </div>
    {canShow('allSkills') && (
      <div class={vitalsItemClass} x-show="canShow('allSkills')">
        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-2">
          {skillColumns.map((column) => (
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th class="text-left font-medium pb-1">Skill</th>
                  <th class="text-left font-medium pb-1">Abil</th>
                  <th class="text-right font-medium pb-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {column.map((skill) => (
                  <tr class="border-t border-gray-200 dark:border-gray-700">
                    <td class="py-1 text-gray-700 dark:text-gray-300">
                      <span class="inline-flex items-center gap-1">
                        <span class="truncate">{skill.name}</span>
                        {skill.prof > 0 && (
                          <span
                            class="inline-flex items-center gap-px"
                            title={skill.prof > 1 ? 'Expertise' : 'Proficient'}
                          >
                            <span class="w-1.5 h-1.5 rounded-full bg-[#c68000]"></span>
                            {skill.prof > 1 && (
                              <span class="w-1.5 h-1.5 rounded-full bg-[#c68000]"></span>
                            )}
                          </span>
                        )}
                      </span>
                    </td>
                    <td class="py-1 text-gray-500 dark:text-gray-400">{abilityAbbr(skill.stat)}</td>
                    <td class="py-1 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">{signed(skill.total)}</td>
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

The build-time `canShow('allSkills')` guard omits the table card from HTML for small/medium cards; `x-show` hides or restores it during live S/M/L toggling on cards initially rendered large. The prof-only grid stays in the markup for those cards with `x-show="!canShow('allSkills')"`, so toggling back to M restores it without a reload. The outer `skills.length > 0` guard and the grid markup stay byte-for-byte as they are today, so medium and small rendering is unchanged (all 111 sheets have at least one proficient skill).

### Step 3 (ticket #198): Render tests, visual test page, and spec archival

1. Extend `src/components/xml-viewer/xml-card-passives.test.ts`: add `allSkills` to the `baseCharacter` fixture and add an `XmlCard All-skills section` describe block covering large-only rendering, section-policy sync, marker markup for prof 0/1/2, and the unchanged medium grid.
2. Add an `### All-Skills Table` subsection under `## Display: Large` in `src/content/docs/guides/xml-card-test.mdx` using ethir (expertise and custom skills) and tanadirian, with a note on the S/M/L behavior.
3. Run the full verification suite.
4. Set this spec's `status` to `archived`.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `docs/specs/008-all-skills-table/SPEC.md` | create | #196 | This spec |
| `docs/specs/README.md` | modify | #196 | Add index row for 008 |
| `src/utils/parse-character-xml.ts` | modify | #197 | Add `allSkills` to `CharacterData` and populate it from the unfiltered skilllist |
| `src/utils/parse-character-xml.test.ts` | modify | #197 | Unit tests for allSkills |
| `src/components/xml-viewer/XmlCard.astro` | modify | #198 | Large-mode all-skills card and rank policy entry |
| `src/components/xml-viewer/xml-card-passives.test.ts` | modify | #198 | Extend render tests (fixture plus all-skills block) |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #198 | Visual verification subsection |

## ADR Constraints

No accepted ADR constrains this change. The binding interface constraint is SPEC-003: the existing `skills` array stays prof-only, and `allSkills` is an additive field. ADR-0001 (icon component strategy) does not apply because the proficiency markers are CSS dots, not icons. ADR-0004 (Starlight admonitions) does not apply because no markdown admonitions are added. ADR-0005 (table row striping) targets Starlight markdown content tables, not component tables rendered inside `not-content`.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

### Unit tests (ticket #197, Vitest at the `parseCharacterXML` seam)

- **Full list on a real sheet:** `draknor.xml` yields 19 `allSkills` entries in XML order; the first is `{ name: 'Perception', total: 3, prof: 1, stat: 'wisdom' }`; non-proficient entries are present (e.g. `Arcana` prof 0, total -1, stat `intelligence`).
- **All entries, no filter:** `draknor.xml` includes the prof 0 `Investigation`/`Insight` entries (which the SPEC-003 `skills` output excludes) and the custom `Tools: Carpenter's Tools` (prof 1, stat `strength`).
- **Expertise preserved:** `ethir.xml` yields 20 entries with `Sleight of Hand` at prof 2, total 7, stat `dexterity`; `Thieves Tools (locks)` and `Thieves Tools (Traps)` are also prof 2.
- **Custom skill included:** `ethir.xml` contains `{ name: 'Thieves Tools (Traps)', total: 6, prof: 2, stat: 'intelligence' }`.
- **Missing-field fallback:** a synthetic XML string whose skilllist entry omits `<stat>` yields `stat: ''`, and missing `<total>`/`<prof>` default to 0.
- **Regression:** the existing prof-only `skills` assertions (SPEC-003) and the passives tests stay green and unchanged.

### Render tests (ticket #198, AstroContainer at the `XmlCard` seam)

- **Large-only rendering:** the all-skills card markup appears in large output and not in small or medium output at build time.
- **Section-policy sync:** the frontmatter map yields `allSkills === 2` and the live Alpine policy equals the static policy (same shape as the passives policy test).
- **Marker markup for prof 0/1/2:** a large render whose `allSkills` fixture mixes prof 0, 1, and 2 contains no dots for prof 0, one `#c68000` dot for prof 1, and two for prof 2, with the matching `Proficient`/`Expertise` tooltips and no roll buttons inside the section.
- **Unchanged medium grid:** a medium render still contains the prof-only grid rows and none of the all-skills table markup.
- **Visual test page:** the `### All-Skills Table` subsection sits under `## Display: Large` and before `## Notes`, references ethir and tanadirian, and mentions the S/M/L behavior.

### Visual verification (ticket #198)

- Large cards show one card with two tables side by side; rows are alphabetical across the two tables; totals are right-aligned in mono; ethir shows two gold dots on its expertise rows and single dots on proficient rows; tanadirian shows single dots and none.
- Narrowing the container stacks the two tables without horizontal overflow.
- Pressing S hides the Skills section, M swaps back to the prof-only grid, and L restores the all-skills tables, without a page reload.
- Existing large card sections (Passives, Feats, Features, Powers) still render and toggle as before.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Remove `allSkills` from `CharacterData` and the parser mapping.
- Remove the unit tests added for allSkills and restore any `CharacterData` fixtures that gained the field.
- Remove the large-mode tables and the `allSkills` entries from both rank policy maps, and restore the Skills section body to the prof-only grid alone.
- Remove the render tests and test-page subsection added for all-skills.
- Remove the 008 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [ ] Implementation complete (delivered by #197 and #198)
- [ ] Tests passing
- [ ] ADR updated (not applicable: no new decision made)
