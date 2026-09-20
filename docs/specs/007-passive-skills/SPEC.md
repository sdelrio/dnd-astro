---
status: active
title: "Passive Skills"
author: "opencode"
date: "2026-09-20"
tags: [character-sheet, xml, fantasy-grounds, skills, passive, xml-viewer]
affects:
  - src/utils/parse-character-xml.ts
  - src/utils/parse-character-xml.test.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/content/docs/guides/xml-card-test.mdx
adr_constraints: []
---

# SPEC: Passive Skills

## Summary

Add a "Passive Skills" section to `XmlCard` in large display mode showing Passive Perception, Passive Investigation, and Passive Insight, each computed as `10 + skill total` from the Fantasy Grounds skilllist at build time.

## Problem Statement

Fantasy Grounds sheets do not store passive values. The card currently shows only proficient skills (medium and large modes), so Passive Perception, Passive Investigation, and Passive Insight - values players use constantly at the table - are missing. The current parser filters the skilllist to `prof > 0` (the SPEC-003 `skills` contract), which discards exactly the non-proficient entries passives need: a character with Insight prof 0 still has a Passive Insight of `10 + total`.

## Background (verified during ticket #173)

- Passive value formula: `passive = 10 + skill total` for each of Perception, Investigation, Insight.
- Verified across all 111 character sheets in `src/assets/fantasy-grounds-sheets/`: the root `<perception>` element equals `10 + Perception skill total` with 0 mismatches, and `<perceptionmodifier>` is 0 everywhere. Fantasy Grounds computes passives the same way, so no extra modifier term is needed.
- Every sheet's skilllist contains Perception, Investigation, and Insight entries, including non-proficient ones (prof 0). The parser's prof-only filter therefore cannot be reused for passives.
- Reference rendering (Perception +4, Investigation +1, Insight +0 yields 14 / 11 / 10): `.scratch/charizard/charizard.html` (local scratch file, not committed).

## Goals

- Expose parsed `passives` data on `CharacterData` so any consumer can render passive values.
- Render a "Passive Skills" section in `XmlCard` large display mode only, below Abilities and above Saving Throws.
- Keep the existing prof-only `skills` output byte-for-byte unchanged (SPEC-003 contract).
- Keep client-side JavaScript unchanged apart from the existing S/M/L toggling behavior.

## Non-Goals

- Passives for skills other than Perception, Investigation, and Insight (e.g. Passive Athletics).
- Passive values in small or medium display modes.
- Additional passive modifiers beyond `10 + skill total` (nothing in the sheets requires a modifier term; `perceptionmodifier` is always 0).
- A new ADR (no new architectural decision is being made).
- Changing XML source sheets or adding passive values to them.

## Data Shape

Add a `passives` object to `CharacterData` in `src/utils/parse-character-xml.ts`:

```typescript
interface PassiveSkills {
  perception: number;
  investigation: number;
  insight: number;
}

export interface CharacterData {
  // ...existing fields unchanged...
  passives: PassiveSkills;
}
```

## Design Decisions

1. **Section title:** "Passive Skills".
2. **Subcard labels:** Perception / Investigation / Insight.
3. **Formula:** `10 + skill total` per skill, taken from the matching `skilllist` entry.
4. **Extraction:** passives come from an unfiltered pass over the skilllist (all `prof` values). The existing prof-only `skills` output must not change. Skill names are matched case-insensitively; each passive defaults to 10 when its entry is missing or unreadable so odd sheets never break the build.
5. **Styling:** subcards reuse the vitals-item recipe (`p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]`), i.e. the same uniform `rounded-[7px]` on all 4 corners. They must NOT use the arched ability-box style (`[border-top-left-radius:45%]` etc.).
6. **Placement:** directly below the Abilities section, above Saving Throws.
7. **Visibility:** large mode only, driven by the existing rank policy. Both copies of the policy map in `XmlCard.astro` must stay in sync so build-time rendering and live S/M/L toggling agree:
   - frontmatter `sectionPolicy` gains `passives: 'large'`,
   - the Alpine `sectionPolicy` object gains `passives: 2`.

## Implementation Plan

This spec is delivered by two follow-up tickets. Do not implement here.

| Ticket | Scope | Depends on |
|--------|-------|------------|
| #173 | This spec and the index row | - |
| #174 | Parser extraction and unit tests | #173 |
| #175 | XmlCard section, visual test page, archive this spec | #174 |

### Step 1 (ticket #174): Extract passives in the parser

In `src/utils/parse-character-xml.ts`:

1. Build the skilllist entries once, unfiltered:

```typescript
const skillEntries = getCollection(root.skilllist).map((s) => ({
  name: getText(s, 'name'),
  total: Number(getText(s, 'total') || 0),
  prof: Number(getText(s, 'prof') || 0),
}));
```

2. Derive the existing prof-only output from those entries without changing its shape or values:

```typescript
const skills = skillEntries
  .filter((s) => s.prof > 0)
  .map(({ name, total }) => ({ name, total }));
```

3. Derive passives with case-insensitive name matching and a 10 default:

```typescript
const passives = { perception: 10, investigation: 10, insight: 10 };
for (const s of skillEntries) {
  const key = s.name.toLowerCase();
  if (key === 'perception' || key === 'investigation' || key === 'insight') {
    passives[key] = 10 + s.total;
  }
}
```

4. Add `passives` to the returned `CharacterData` object and to the exported interface.

Follow the TDD loop at the `parseCharacterXML` seam: write one failing unit test, make it pass, repeat (slices: existing-sheet values, non-proficient entry, missing-entry fallback). Do not anticipate the UI work.

### Step 2 (ticket #175): Render the section in XmlCard large mode

In `src/components/xml-viewer/XmlCard.astro`:

1. Destructure `passives` alongside the other `character` fields.
2. Add `passives: 'large' as const` to the frontmatter `sectionPolicy` and `passives: 2` to the Alpine `sectionPolicy` in the root `x-data` expression.
3. Insert the section between the Abilities section and the Saving Throws section:

```astro
{canShow('passives') && (
  <section
    class="border-t border-gray-100 dark:border-gray-700 pt-4"
    x-show="canShow('passives')"
  >
    <SectionHeader title="Passive Skills" />
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class={vitalsItemClass}>
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perception</div>
        <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{passives.perception}</div>
      </div>
      <div class={vitalsItemClass}>
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Investigation</div>
        <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{passives.investigation}</div>
      </div>
      <div class={vitalsItemClass}>
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Insight</div>
        <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{passives.insight}</div>
      </div>
    </div>
  </section>
)}
```

The build-time `canShow('passives')` guard omits the section from HTML for small/medium cards; `x-show` hides or restores it during live S/M/L toggling, matching the pattern used by other rank-gated sections.

### Step 3 (ticket #175): Visual test page and spec archival

1. Add a `### Passive Skills` subsection under `## Display: Large` in `src/content/docs/guides/xml-card-test.mdx` with a large-mode card, a note that S/M hides the section, and the expected values.
2. Run the full verification suite.
3. Set this spec's `status` to `archived`.

## Files to Create/Modify

| File | Action | Ticket | Purpose |
|------|--------|--------|---------|
| `docs/specs/007-passive-skills/SPEC.md` | create | #173 | This spec |
| `docs/specs/README.md` | modify | #173 | Add index row for 007 |
| `src/utils/parse-character-xml.ts` | modify | #174 | Add `passives` to `CharacterData` and compute it from the unfiltered skilllist |
| `src/utils/parse-character-xml.test.ts` | modify | #174 | Unit tests for passives |
| `src/components/xml-viewer/XmlCard.astro` | modify | #175 | Large-mode Passive Skills section and rank policy entry |
| `src/content/docs/guides/xml-card-test.mdx` | modify | #175 | Visual verification subsection |

## ADR Constraints

No accepted ADR constrains this change. The binding interface constraint is SPEC-003: the existing `skills` array stays prof-only, and `passives` is an additive field. Any icons or interactivity added later would fall under ADR-0001 (use `IconifyIcon.astro`) and ADR-0004 (Starlight admonitions), but neither applies to this implementation.

| ADR | Title | Constraint |
|-----|-------|------------|
| - | - | None apply |

## Testing

### Unit tests (ticket #174, Vitest at the `parseCharacterXML` seam)

- **Existing sheet values:** `draknor.xml` yields `passives: { perception: 13, investigation: 9, insight: 10 }`. Independent source of truth: the sheet's skilllist totals are Perception +3 (prof 1), Investigation -1 (prof 0), Insight +0 (prof 0).
- **Non-proficient skill still counts:** `draknor.xml` Investigation has prof 0 and total -1, so its passive is 9, not the 10 default. This proves the extraction pass is not proficiency-filtered.
- **Missing skill fallback:** a synthetic XML string whose skilllist omits Insight yields `insight: 10` (mirroring the existing synthetic test that returns null for a missing `<character>` node).
- **Regression:** the existing `skills` assertions (prof > 0 only) stay green and unchanged.

### Visual verification (ticket #175)

- The new `xml-card-test.mdx` subsection shows a large-mode card with the Passive Skills section between Abilities and Saving Throws, three subcards side by side, uniform 4-corner radius, matching vitals-item styling.
- Pressing S or M hides the section; pressing L restores it, without a page reload.
- Existing large card sections (Feats, Features, Powers) still render and toggle as before.

### Commands

```
pnpm lint
CI=true pnpm typecheck
pnpm test
pnpm build
```

## Rollback

- Remove `passives` from `CharacterData` and the parser, and restore the single-pass prof-only `skills` extraction.
- Remove the unit tests added for passives.
- Remove the Passive Skills section from `XmlCard.astro` and the `passives` entries from both rank policy maps.
- Remove the `### Passive Skills` subsection from `xml-card-test.mdx`.
- Remove the 007 row from `docs/specs/README.md` and delete this spec folder (or set `status: draft`).

## Status

- [ ] Implementation complete
- [ ] Tests passing
- [ ] ADR updated (not applicable: no new decision made)
