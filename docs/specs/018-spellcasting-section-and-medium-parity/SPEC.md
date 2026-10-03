---
status: active
title: "Spellcasting section on the card, and medium parity for passives, save proficiency and carried weapons"
author: "opencode"
date: "2026-10-03"
tags: [character-sheet, xml, xml-viewer, display-mode, spellcasting, saving-throws, weapons, proficiency]
affects:
  - docs/specs/018-spellcasting-section-and-medium-parity/SPEC.md
  - docs/specs/README.md
  - docs/adr/0016-character-card-sections-are-tabs.md
  - src/utils/parse-character-xml.ts
  - src/utils/parse-character-xml.test.ts
  - src/components/xml-viewer/weapon-display.ts
  - src/components/xml-viewer/weapon-display.test.ts
  - src/components/xml-viewer/spellcasting-display.ts
  - src/components/xml-viewer/spellcasting-display.test.ts
  - src/components/xml-viewer/card-tabs.ts
  - src/components/xml-viewer/XmlCard.astro
  - src/components/xml-viewer/xml-card-passives.test.ts
  - src/components/xml-viewer/xml-card-semantics.test.ts
  - src/components/xml-viewer/xml-card-tabs-alpine.test.ts
  - src/components/xml-viewer/__snapshots__/xml-card-large-snapshot.test.ts.snap
  - src/content/docs/guides/xml-card-test.mdx
  - DESIGN.md
adr_constraints: [0016, 0017, 0009, 0014]
---

# SPEC: Spellcasting section on the card, and medium parity for passives, save proficiency and carried weapons

## Summary

The character card gains a Spellcasting section carrying the casting ability, Save
DC, spell attack bonus and spell slots, reached through a seventh entry in the
section bar. Alongside it, medium picks up the passive skills it already has room
for, the Abilities tiles mark proficient saving throws with the coin the Saving
Throws table already uses, and the Weapons section lists carried-but-not-equipped
weapons under the equipped ones.

## Problem Statement

A medium roster card is a glanceable summary. Four things a player checks before a
session are missing from it, or missing from the card entirely:

- **Passive Skills is large-only.** A medium reader cannot see Passive Perception,
  Investigation or Insight at all, even though the section already sits inside the
  Overview panel and costs three plates.
- **A proficient saving throw looks identical to an unproficient one.** The
  Abilities tiles print `SAVE +7` and nothing else. A Fighter's `+7` is ability
  plus proficiency; a Wizard's Intelligence `+7` may be raw. The large card's
  Saving Throws table draws a gold coin for proficiency, so the same character
  disagrees with itself between the Overview tile and the Saving Throws table, and
  the small card's compact grid has no mark either.
- **Equipped Weapons hides everything stowed.** The weapon parser reads a `carried`
  flag with three values and the display layer throws away everything that is not
  "equipped", so a character carrying a longsword, a crossbow and a wand in the
  pack shows only the two in hand.
- **There is no spellcasting summary at any display mode.** Save DC and spell
  attack bonus are the two numbers a caster looks up mid-turn, and neither is on
  the card. They are not merely unrendered either: the sheets carry no field naming
  the casting ability, so the numbers cannot be derived until a resolution order
  is decided.

## Goals

- Medium renders Passive Skills, and renders the same passive figures large does.
- The Abilities tiles mark a proficient save with the coin and the screen-reader
  text the Saving Throws table already uses, at medium and large.
- The Weapons section lists carried-but-not-equipped weapons in a second table,
  and either table alone is enough for the panel to exist.
- The card carries a Spellcasting section with Ability, Save DC, Attack Bonus and
  spell slots, reachable from the section bar at both medium and large.
- The Spellcasting entry appears only for a character the sheet shows can cast.

## Non-Goals

- Spell descriptions, spell text, ritual flags, casting time and components.
  Powers already lists spell names, levels and prepared marks.
- Concentration rules, slot recovery, and any reading of the `stats` node.
- Not-carried weapons (the third `carried` value), which are stowed rather than
  part of this character's kit.
- The small display mode, beyond leaving it exactly as it is.
- Any change to the Saving Throws table or the Skills table.

## User Stories

1. As a player scanning a party roster on a phone, I want Passive Perception,
   Investigation and Insight on the medium card, so that I can tell whether the
   party notices things without opening a character page.
2. As a player reading a medium card, I want the same passive figures a large card
   shows, so that the two display modes never disagree about a character.
3. As a player reading the Abilities tiles, I want a proficiency marker beside a
   proficient save, so that I can tell a trained save from an untrained one
   without arithmetic.
4. As a player reading the Abilities tiles, I want that marker to be the same coin
   and the same wording the Saving Throws table uses, so that one legend read once
   applies to both.
5. As a player who cannot see the coin, I want the save marked in text for
   assistive tech, so that proficiency is not carried by colour or shape alone.
6. As a player on a medium card, I want the proficiency marker on saves, so that I
   am not the one display mode that loses it.
7. As a player with a character carrying more weapons than they hold, I want the
   carried weapons listed, so that I know what is in the pack.
8. As a player, I want equipped and carried weapons in separate tables, so that
   what is in my hand and what is in my bag are never confused at the table.
9. As a player, I want the carried table omitted when nothing is carried, so that
   the section does not open onto an empty sheet.
10. As a player whose character holds no weapon but carries one, I want the
    Weapons panel to exist, so that a weapon is not invisible because it is not
    equipped.
11. As a player, I want the carried table to carry the same attack and damage
    columns as the equipped one, so that a stowed weapon is as usable as a held
    one.
12. As a caster, I want my Save DC on the card, so that I know what my enemies roll
    against without doing the arithmetic at the table.
13. As a caster, I want my spell attack bonus on the card, so that I know whether
    a spell attack hits.
14. As a caster, I want the card to name the ability I cast with, so that I know
    which modifier feeds both numbers.
15. As a caster, I want the three figures in one row of plates like Vitals, so that
    they read as the same kind of fact as AC and Initiative.
16. As a player looking for the caster in a party, I want a Spellcasting entry in
    the section bar, so that the casting numbers are one click away rather than
    buried among powers.
17. As a martial character with no magic, I want no Spellcasting entry at all, so
    that the bar does not promise a section I cannot use.
18. As a half-caster, I want a Spellcasting section even though no class of mine is
    a pure caster, so that my Eldritch Knight spells are not the one thing the card
    cannot account for.
19. As a player whose sheet names no casting class, I want the card to fall back to
    my best of Wisdom, Intelligence and Charisma, so that the section still shows a
    usable number instead of a blank.
20. As a player, I want the fallback to be visibly a fallback, so that I do not
    read a guessed ability as a recorded one.
21. As a multiclass character, I want the ability resolved from the class that
    actually casts, so that Fighter 3 / Wizard 2 shows Intelligence and not my
    Strength.
22. As a player, I want to see how many spell slots I have left per level, so that I
    know what I can still cast.
23. As a player, I want slots shown as used out of total, so that a full bar and an
    empty one do not look alike.
24. As a player, I want spell levels my character has no slots for left out, so
    that the row is not nine plates of zeroes.
25. As a player without any spellcasting, I want no slot row at all, so that an
    empty plate grid is not the first thing the panel shows.
26. As a player, I want the Spellcasting section reachable by keyboard from the
    bar, so that the roving tabindex and the arrow keys cover the new entry the way
    they cover the existing six.
27. As a screen reader user, I want the Spellcasting panel wired to its tab with
    `aria-controls` and `aria-labelledby`, so that the new entry behaves like the
    others.
28. As a player on a full character sheet, I want a jump link for Spellcasting in
    the table of contents, so that the long scroll has one more anchor.
29. As a player without JavaScript, I want the Spellcasting panel to render in the
    card rather than disappear, so that the no-JS reading order still works.
30. As a player on the narrowest card, I want the section bar to stay usable with a
    seventh entry, so that adding a tab does not push the last entry off the bar.
31. As a player, I want the Weapons section to name itself once and its two tables
    to name themselves under it, so that the outline is not two sibling headings
    claiming to be one section.
32. As a player, I want the carried-weapon table to carry the same responsive
    column rules as the equipped one, so that properties still drop to a second
    line on a narrow card.

## Implementation Plan

### Step 1: Promote Passive Skills to medium

In the card's section policy map, move `passives` from `large` to `medium`. It
already renders inside the Overview panel, so this is a one-entry change with no
panel reshuffle, and ADR-0017's rule that a display mode decides which sections
exist is what authorises it. Update the prose comment above the map, which
describes what each rank renders.

### Step 2: Mark proficient saves in the Abilities tiles

In the non-compact abilities grid, render the same gold coin plus visually hidden
"Proficient" that the Saving Throws table renders, gated on a non-zero
save-proficiency flag, beside the save figure. The compact grid used at small is
untouched: it has no room for a mark and small is out of scope.

### Step 3: Split equipped from carried weapons

Widen the weapon row builder so the card can ask for equipped rows and carried
rows separately rather than the builder deciding. Equipped stays the fully
equipped value, carried is the carried-but-not-equipped value, and the third
value stays excluded. The card derives two row sets and the panel exists when
either is non-empty.

At large the section takes one heading naming the section, with a subheading per
table. At medium the tab names the panel, so neither table carries a heading, which
is the rule ADR-0016 fixed for every other medium section. Both tables reuse the
same columns and the same responsive column rules as today's equipped table.

### Step 4: Parse spell slots

Extend the character data with a per-level slot record (level, maximum, used) read
from the nine per-level slot blocks a sheet carries, defaulting to zero where a
sheet omits a block. No other node is read.

### Step 5: Resolve the casting ability in one pure function

A single pure resolver takes the character's classes, subclass and abilities and
returns the chosen ability plus a flag saying whether it was recorded or inferred.
Resolution order:

1. A casting class name maps to its ability: Intelligence for Wizard and
   Artificer, Wisdom for Cleric, Druid and Ranger, Charisma for Bard, Sorcerer,
   Warlock and Paladin.
2. A casting subclass maps to its ability, so a Fighter with no Wizard level still
   resolves. Intelligence for Eldritch Knight and Arcane Trickster.
3. Where more than one entry matches, the highest-level class wins.
4. Failing all of that, the best bonus among Wisdom, Intelligence and Charisma,
   flagged as inferred.

Save DC is 8 plus proficiency bonus plus the casting modifier. Attack bonus is
proficiency bonus plus the same modifier. Both are the printed formulae, computed
from parsed values rather than read, because the sheets store neither.

### Step 6: Add the Spellcasting section

Add a Spellcasting entry to the section index directly after Skills, since it is an
ability-derived summary and the index is ordered as a printed sheet reads: what the
character is made of, then what it can do. Give it a section policy entry of
`medium`, matching every other content section except Saving Throws.

The panel holds a plate row of three items, laid out exactly like the Vitals row:
Ability (abbreviation and modifier), Save DC, Attack Bonus. Below it, one plate per
spell level with a non-zero maximum, labelled by level and reading used out of
total. Nothing renders when there are no populated levels.

The entry appears when the character has at least one power in a spell group, or a
class or subclass the casting table recognises. That gate is what keeps a pure
martial character from getting an entry it cannot use while a half-caster with one
spell still gets one.

### Step 7: Amend ADR-0016

ADR-0016 fixes the bar at six entries and names Overview as the unconditional
landing entry. A seventh entry is an amendment, not a silent extension, so draft
the amending ADR, note it in the ADR index, and leave ADR-0016's other decisions
intact. ADR-0017 needs no amendment: promoting Passive Skills is that decision's
own rule applied.

### Step 8: Update the guards and the snapshots

- The structural source guard asserts heading placement from source text, so the
  Weapons heading restructure and the new Spellcasting heading need entries there.
- The large-card snapshot and the parser build-output tests regenerate once the
  parser gains slot data.
- The Alpine runtime test's arrow-key and Home/End cases gain one more step, since
  the bar is one entry longer, asserted through `aria-selected` as the existing
  cases are.

## Testing

A good test asserts what a reader of the card can see: a heading, a plate label, a
figure, a table that is or is not in the panel. It never asserts the internal shape
of a row object.

- **Primary seam: the rendered card, one render per display mode.** The existing
  harness renders the component through Astro's container and slices panels out by
  their data-panel hook. This is the highest seam available and it catches a
  proficiency mark that renders at large but not medium, a Spellcasting panel that
  never reaches the markup, or a carried-weapon table in the wrong panel. The
  majority of new assertions belong here and it needs no new seam.
- **The casting resolver gets its own unit seam.** It runs in frontmatter at build
  time and cannot be reached through a render without asserting on formatted text,
  so it is tested as a pure function: each casting class, a subclass-only match, a
  multiclass tie broken by level, and the inferred fallback. Prior art is the
  weapon-display and skill-display unit tests, the same shape.
- **The weapon-display unit seam gains the equipped-versus-carried split**,
  alongside the existing attack and damage cases, because that is where the filter
  already lives.
- **Snapshot regeneration is expected**, and is a drift guard rather than coverage
  of the new behaviour.
- **Keyboard coverage extends to the seventh entry** through the Alpine runtime
  harness, asserting `aria-selected` rather than class writes.

## Out of Scope

Listed under Non-Goals above. In summary: spell text and mechanics, the small
display mode, not-carried weapons, and any change to the Saving Throws or Skills
tables.

## Further Notes

- Spell-slot plates are the first numbers this card derives rather than reads.
  Everything else it shows is either read straight from the sheet or is an attack
  total the weapon builder already computes, so this is where a derivation bug would
  be least visible.
- Look at one real level 20 caster in the browser before committing to the slot
  row: nine populated levels is the worst case for a plate grid, and the same card
  is ~358px in a roster and 1230px on a character page.
- The section index deliberately keeps a tab label shorter than the heading
  underneath it. With two weapon tables the question sharpens: one heading naming
  the section plus a subheading per table is the honest outline, and it does mean
  the Weapons heading matches its tab label.
- The bar already wraps rather than scrolls below its container threshold, so a
  seventh entry wraps rather than clips. No new overflow behaviour is introduced,
  and the wrap threshold may need measuring once a real caster card renders.