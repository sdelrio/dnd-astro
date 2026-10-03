---
status: draft
title: "Medium carries Languages and Feats with Skills and drops Saving Throws"
author: "opencode"
date: "2026-10-03"
tags: [character-sheet, xml, xml-viewer, display-mode, languages, feats, saving-throws]
affects:
  - docs/specs/017-medium-card-languages-and-feats/SPEC.md
  - docs/specs/README.md
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/components/xml-viewer/xml-card-tabs-alpine.test.ts
  - src/components/xml-viewer/xml-card-semantics.test.ts
  - src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap
  - src/content/docs/guides/xml-card-test.mdx
  - DESIGN.md
adr_constraints: [0016, 0009]
---

# SPEC: Medium carries Languages and Feats with Skills and drops Saving Throws

## Summary

The medium character card stops rendering Saving Throws and starts rendering
Feats. Languages and Feats move out of the Overview panel and into the Skills
panel at medium, keeping the Overview panel at large, and both gain an `h3`
heading above their pill plate instead of an in-plate label.

## Problem Statement

ADR-0016 recorded that display mode decides how much a section holds, never
whether a section exists. `XmlCard`'s `sectionPolicy` already contradicted that
with sections ranked from `small`, `medium` and `large` up, and ADR-0017 replaces
the rule so the record and the code agree. ADR-0017 settles the direction; this
spec is the implementation of it.

Three concrete defects follow:

- **The medium card carries the wrong content for its job.** It is a ~358px
  roster card read at a glance, and it spends that glance on a saving-throws
  table, which is a number a reader computes with and the character page already
  prints in a two-column layout. Feats, the most identifying thing on a D&D
  character, do not render at medium at all.
- **Languages and Feats sit inside a table panel.** At large they are in the
  Overview panel beside the saving-throws grid. Their plate layout puts an
  uppercase micro-label side by side with the pills at `@md`, and at 358px the
  label wraps before the first pill does.
- **A character with no proficient skills would lose them.** `showSkills` at
  medium currently derives from `proficientSkills.length > 0`, so moving these
  two sections into the Skills panel without changing that test would give a
  feat-only character a panel that does not render. ADR-0016's "a menu entry
  exists only for a section with content" rule would delete content instead of
  hiding an empty sheet.

## Goals

- Medium renders Skills, Languages and Feats, and does not render Saving Throws.
- Languages and Feats render in the Skills panel at medium and the Overview panel
  at large.
- Both sections render an `h3` in `sectionHeadingClass` above their plate and
  carry no in-plate label, at both modes.
- The Skills tab appears whenever the Skills panel has anything to show,
  including the two pill sections.

## Non-Goals

- No parser change. `languages` and `feats` already arrive as `string[]`.
- No new tab. The bar stays at six entries.
- No change to what large renders: the same six tabs, all six saving throws, and
  Languages and Feats still in the Overview panel.
- No change to `small`. Neither section renders there and Saving Throws does not.
- No change to the pill markup or the plate class.

## Implementation Plan

### Step 1: Flip the two policy entries

In `XmlCard.astro`, change `saves` from `medium` to `large` and `feats` from
`large` to `medium` in `sectionPolicy`. Nothing else in the map moves. `saves`
was already gated on `proficientSaveRows.length > 0 || canShow('allSaves')`, so
moving it to `large` leaves large rendering all six and medium rendering nothing.

Also update the comment block above the map, which states the superseded rule in
prose, and point it at ADR-0017 rather than ADR-0016.

### Step 2: Move the two sections into the Skills panel at medium

The Languages and Feats plates currently live in the Overview panel, in the grid
that also holds Saving Throws. Rendering them once requires choosing the host
panel by mode, so extract them into a local fragment or small component and mount
it in the Skills panel when `tabbed` and in the Overview panel when `jumping`.

Keep the existing `splitSavesGroup` logic: it pairs the saves grid with the two
plates at large only, and it stops mattering at medium once the plates have left
the Overview panel.

### Step 3: Give both sections a heading and drop the in-plate label

Replace each in-plate `<div>` label with an `<h3 class={`${sectionHeadingClass} mb-2`}>`,
matching Vitals, Abilities and Saving Throws. Delete the label element and leave
the plate holding only the pills, with the flex layout simplified to a plain pill
wrapper where the label's `justify-between` no longer has two sides to space.

The heading is `h3` at both modes and is not derived from a panel heading level,
because neither the Overview panel nor the Skills panel has one at either mode.
Write that reason into the comment at the mount site.

### Step 4: Keep the Skills tab for a character with no proficient skills

At medium, `showSkills` becomes `proficientSkills.length > 0 || showLanguages ||
showFeats`. At large the existing condition stands. Update the comment above the
section-menu block so it records that ADR-0016's content rule counts these two
plates as content.

### Step 5: Update the tests and the docs

- `xml-card-passives.test.ts`: the Saving Throws assertions for medium become
  large-only, and Languages and Feats assertions move with the panels.
- `xml-card-tabs-alpine.test.ts`: assert the Skills tab is present for a
  character with feats and no proficient skills.
- `xml-card-semantics.test.ts`: assert the `h3` headings exist at both modes and
  that no in-plate label duplicates them.
- Regenerate the large snapshot; large keeps its content but the two plates gain
  headings, so the snapshot moves.
- `DESIGN.md` Card sections: replace the superseded "how much, never whether"
  sentence with the ADR-0017 rule, and record the fixed `h3` for these two
  sections.
- `src/content/docs/guides/xml-card-test.mdx`: note what the medium card no
  longer shows.

## Files to Create/Modify

- `src/components/xml-viewer/XmlCard.astro` - policy entries, panel host, headings,
  `showSkills`
- `src/components/xml-viewer/xml-card-passives.test.ts` - medium and large assertions
- `src/components/xml-viewer/xml-card-tabs-alpine.test.ts` - Skills tab presence
- `src/components/xml-viewer/xml-card-semantics.test.ts` - heading level and no duplicate label
- `src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap` - regenerated
- `DESIGN.md` - the section policy sentence and the two headings
- `src/content/docs/guides/xml-card-test.mdx` - what medium shows

## ADR Constraints

| ADR | Title | Constraint |
|-----|-------|------------|
| 0009 | Phone-First Grids and Touch Targets in the Tool Layer | The card is its own container, so every width test inside it stays a container query. The card is 358px in the roster and 1230px on a character sheet at the same viewport, so nothing here can be a viewport breakpoint. |
| 0016 | The Character Card's Sections Sit Behind a Menu, Not One Scrolling Column | Six sections behind one bar; medium is a `role="tablist"` and large is a `<nav>` of fragment links; no new tab is added; Overview stays the unconditional landing entry; a menu entry exists only for a section with content, which is why step 4 extends that rule rather than working around it. Its section-existence rule is replaced by ADR-0017 and is not to be re-implemented. |

ADR-0017 governs this implementation directly. It is not listed here as a
constraint because it is the decision being implemented.

## Testing

- `pnpm test`: the updated unit tests, plus a regenerated large snapshot.
- `make measure ARGS='overflow --url http://localhost:4321/dnd-tools/xml-viewer/'`:
  the medium cards must not scroll sideways at 320, 360, 390 and 640 after the
  headings move above the plates.
- `make capture`, then read both PNGs: the medium roster card shows Feats and
  Languages under Skills, and no Saving Throws table.
- A large character page, by eye and against the regenerated snapshot: same six
  tabs, same six saves, Languages and Feats still in the Overview panel, now
  under headings.

## Rollback

The change is two entries in `sectionPolicy` plus a mount-site move, so reverting
the commit restores both modes exactly. There is no data migration and no
persisted state.

## Status

- [x] ADR recorded (ADR-0017, `accepted`)
- [ ] Implementation complete
- [ ] Tests passing
- [ ] DESIGN.md updated