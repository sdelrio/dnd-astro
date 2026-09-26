---
status: archived
title: "Medium display renders the large card, filtered to proficient rows"
author: "opencode"
date: "2026-09-26"
tags: [character-sheet, xml, fantasy-grounds, xml-viewer, display-mode, skills, saving-throws, all-skills, all-saves]
affects:
  - docs/specs/016-medium-matches-large-card/SPEC.md
  - docs/specs/README.md
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/SkillsTable.astro
  - src/components/xml-viewer/SavesTable.astro
  - src/components/xml-viewer/card-plate.ts
  - src/components/xml-viewer/section-heading.ts
  - src/components/xml-viewer/SectionHeader.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/components/xml-viewer/xml-card-semantics.test.ts
  - src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap
  - src/utils/chunk.ts
  - src/utils/chunk.test.ts
  - src/content/docs/guides/xml-card-test.mdx
  - DESIGN.md
adr_constraints: []
---

# SPEC: Medium display renders the large card, filtered to proficient rows

## Summary

The medium display of the character card used to swap in a different, plainer
design for the Skills and Saving Throws sections. Medium now renders the same
table card as large, holding only the proficient skills and the proficient
saves. A display mode may shorten a section; it may no longer re-style one.

## Problem Statement

`XmlCard` selects which sections appear by display mode, and it also selected
*how* two of them looked. The all-skills table (SPEC-008) and the all-saves card
(SPEC-011) were reachable only at large. At medium, both sections fell back to
a bare grid of `name` / `value` pairs:

- no plate, so the section had none of the card's stat-tile framing
- no ability column, so a reader could not see what a skill keyed off
- no proficiency dots, so a medium reader had no way to tell an expertise dot
  from a proficient one, because medium had none
- no marker legend

The consequence was that the same section read as one design at large and a
different design at medium, and the difference was a display-mode detail rather
than a decision anyone had made about content. It also meant the medium card was
strictly less informative than the large one in exactly the two places where a
player mid-session looks most often.

Medium also mixed two heading systems inside a single column, because
`SectionHeader`'s `h3` declared no `font-size` and inherited Starlight's content
`h3` (16.38px sentence case) against the 11.2px uppercase micro-label that
Saving Throws used. That is a separate defect, recorded here because the same
change closed it and because SPEC-008 and SPEC-011 both name `XmlCard.astro` and
the card test page as files they govern.

### Relationship to the specs this reverses

Three archived specs named this change as an explicit Non-Goal. Each scoped the
Non-Goal to its own change, and each remains accurate as an audit record of what
was decided at the time:

| Spec | Non-Goal as written | Now |
|------|--------------------|-----|
| 008 | "Changing the medium prof-only grid, or showing all-skills tables outside large mode" | Reversed. Medium renders the all-skills table, filtered to proficient rows |
| 011 | "Showing the all-saves card outside large mode, or changing the medium/small grid" | Reversed. Medium renders the saves table, filtered to proficient rows |
| 015 | "the medium prof-only grid shows names and totals only" | Reversed. Medium shows the ability column, all three dot ranks and the legend |

`docs/specs/README.md` defines `archived` as "Implementation complete, kept for
audit trail", so those specs are history rather than binding constraints. This
spec records the reversal so the current behaviour has a numbered home.

## Goals

- Medium renders the Skills and Saving Throws sections as the same table card as
  large - same plate, same rows, same marks, same legend.
- Medium lists only the proficient skills and the proficient saves.
- Every card section heading is one class at every display mode.
- Large mode renders byte-identically apart from the heading classes, and the
  golden snapshot records that.

## Non-Goals

- Changing which sections appear at which display mode. `sectionPolicy` is
  untouched.
- Changing large mode's content: it still lists every skill and all six saves.
- Changing the small display, which shows neither section.
- Reworking the other card sections, which already use one design per section.
- Adding a client-side display-mode toggle. SPEC-012 removed it deliberately and
  display mode stays a fixed build-time choice per mount site.
- Deciding which production page mounts medium. See *Open question* below.

## Implementation Plan

### Step 1: One heading class

Extract the dense upper region's heading treatment into `section-heading.ts` as
`sectionHeadingClass` and use it from `SectionHeader.astro` as well, so all ten
section headings render at one scale. `SectionHeader`'s `h3` was the outlier: it
declared no `font-size` and so inherited the docs layer's `h3`.

The shared class carries type only, not margin. Carrying `mb-2` on it forced
`SectionHeader`'s flex-row variant to append `mb-0` to cancel it, which put two
conflicting margin utilities in one class attribute and made the winner depend on
stylesheet order rather than markup order. The margin is a call-site concern.

The steps below a heading - the `Level N` groups, the power group name, the
Inventory trailing value, the dot legends - drop from 12px to 10px, since at 12px
they out-sized the 11.2px label above them.

### Step 2: One table per section

Move the Saving Throws and Skills tables out of `XmlCard.astro` into
`SavesTable.astro` and `SkillsTable.astro`. Each owns its own card shell, so
`XmlCard` passes a row set and a column count and nothing else. Move the shared
plate class into `card-plate.ts`; it was `vitalsItemClass`, a misnomer once the
Skills table used it.

The two components stay separate rather than becoming one generic table. Their
rows differ (dot rendering, the ability column, three headers versus two), and
the shared scaffolding is a `chunk` call and a grid class.

### Step 3: Medium passes proficient rows only

`XmlCard` filters `allSkills` by `skillRank(skill.prof) !== 'none'` and the save
rows by `saveprof > 0`, and passes `columns: 1`. Large passes the full sets and
`columns: 2`.

Medium's rows derive from `allSkills` rather than the parser's prof-only `skills`
list, because the card it now renders needs `prof` to draw the dots and `stat`
for the ability column. The parser still emits `skills` and its shape is
unchanged per SPEC-003, but the card no longer reads it, so that field is now
unused by its only consumer. Removing it from the parser is out of scope here.

`showSkills` keys off the filtered list, so a character with no proficient skill
gets no Skills section at medium, while large still lists the untrained rows for
them.

### Step 4: Shared `chunk`

`chunk` was defined identically in both new components. Two copies of a layout
rule is one too many: change one and the two tables silently disagree about where
a column ends. Extract to `src/utils/chunk.ts`, tested for the even split, the
remainder, the empty trailing column and the single-column case.

## Files to Create/Modify

- `src/components/xml-viewer/SkillsTable.astro` - the Skills table, one card, both modes
- `src/components/xml-viewer/SavesTable.astro` - the Saves table, one card, both modes
- `src/components/xml-viewer/card-plate.ts` - the shared stat-tile plate class
- `src/components/xml-viewer/section-heading.ts` - the one heading treatment and the steps below it
- `src/components/xml-viewer/XmlCard.astro` - picks row set and column count; no table markup
- `src/components/xml-viewer/SectionHeader.astro` - uses the shared heading class
- `src/utils/chunk.ts`, `src/utils/chunk.test.ts` - the one column split
- `src/components/xml-viewer/xml-card-passives.test.ts` - medium assertions rewritten
- `src/components/xml-viewer/xml-card-semantics.test.ts` - reads the card and its two tables; guards against duplicate margin utilities
- `src/content/docs/guides/xml-card-test.mdx` - medium's description corrected
- `DESIGN.md` - one design per section, and the heading named as a ramp step

## ADR Constraints

None. No accepted ADR covers card section display modes or type scale, and this
change makes no new architectural decision. ADR-0009 (responsive widths) and
ADR-0005 (table striping) are unaffected: the medium tables sit in the same
`.sl-markdown-content` surface as before, and the widths are unchanged.

## Testing

- 766 tests pass, including six for `chunk` and the rewritten medium assertions.
- `xml-card-semantics.test.ts` reads `XmlCard.astro` plus both table components as
  one source, since the marks it guards moved out of the card. It also asserts no
  heading carries two bottom-margin utilities.
- The large-mode golden snapshot is updated for the heading classes only; large's
  table markup is unchanged.
- Rendered at 1440 in both display modes. Computed styles confirm all ten section
  headings at 11.2px uppercase with 8px below, Inventory's 0px supplied by its
  flex wrapper.
- `make measure ARGS='overflow'` clean at 320/360/390/640; `measure contrast`
  AA-or-better in both themes for the headings and the shared table.
- `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` empty.

## Rollback

Revert the two commits on PR #368. The change is self-contained: the tables move
back into `XmlCard.astro`, `sectionHeadingClass` loses its call-site margins, and
medium's prof-only grids return. No data, parser or route changes, so there is
nothing to migrate and no persisted state to unwind.

## Open question

**Medium has no production mount site.** SPEC-012 removed the S/M/L toggle, and
the three mount sites pass their mode explicitly:

| Mount site | Mode |
|------------|------|
| `src/pages/fantasy-grounds/characters/[slug].astro:39` | `large` |
| `src/components/xml-viewer/PartyView.astro:126` | `small` |
| `src/components/xml-viewer/CharSearch.astro:112` | `small` |

The `display = 'medium'` default in `XmlCard.astro` therefore never applies, and
medium is exercised only by `xml-card-test.mdx` and the unit tests. This change
is correct at the component level and covered by tests, but it will not be
visible to any user until a page mounts medium. Which page that should be is a
product decision, deliberately left open above.

## Status

- [x] Implementation complete
- [x] Tests passing
- [x] ADR updated (no new architectural decision, so none required)
- [ ] Medium mounted in production (blocked on the product decision above)
