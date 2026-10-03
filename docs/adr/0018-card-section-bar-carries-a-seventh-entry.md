---
status: accepted
date: 2026-10-03
supersedes: null
superseded_by: null
tags: [components, accessibility, layout, characters, spellcasting]
---

# ADR-0018: The Card's Section Bar Carries a Seventh Entry, for Spellcasting

> **The bar's entry count is amended here.** [ADR-0016](0016-character-card-sections-are-tabs.md)
> fixes the card at six sections - Overview, Skills, Inventory, Weapons, Features,
> Powers - and every one of its other decisions is unchanged and remains binding:
> the menu bar, medium as a tablist and large as a table of contents, the bar on the
> header's own surface below the gold rule, the 44px target, wrapping rather than
> scrolling below 620px of container width, and Overview as the unconditional
> landing entry. The count was a consequence of what the card had to show, not a
> design target, and the card now has a seventh thing to show.

## Context and Problem Statement

The card renders six sections, and two of them - Save DC and spell attack bonus -
were not on it at all. They are the two numbers a caster looks up mid-turn, and
neither had a home: not at large, not at medium, not anywhere.

Two facts made this a section decision rather than three more plates on the
Overview panel.

**The numbers do not exist on the sheet.** A Fantasy Grounds sheet records a
proficiency bonus, six ability bonuses, and a nine-node block of spell slots per
level. It records no casting ability, no spell Save DC and no spell attack bonus.
Every one of the three has to be derived, and derived from what: the card has to
decide which of the character's six abilities is the one they cast with, and it has
to do it without a field naming it. The choice is genuinely ambiguous - Fighter 3 /
Wizard 2 casts with Intelligence, but so does Fighter 3 / Eldritch Knight and so does
a Monk 3 with nothing castable at all - and a card that prints one of those as a
recorded fact when it guessed is worse than a card that prints nothing.

**It is not three plates' worth of content on one panel.** The section carries
spell slots as well, and a Wizard 20 has slots at nine levels. That is a plate grid,
and the panel holding it needs a tab: a card whose Overview panel grows a fourth
group is a card where the reader scrolls past the casting numbers to reach anything
else, and ADR-0017 already moved Languages and Feats out of that panel for exactly
this reason.

Two constraints came from the existing system rather than from taste:

- **A menu entry exists only for a section with something in it** (ADR-0016). A
  seventh entry cannot be unconditional, or every martial character in the roster
  gets a Spellcasting tab that opens onto an inferred Save DC built from its
  Strength. That is the one entry on the bar nobody can use.
- **The bar wraps rather than scrolls below 620px of container width** (ADR-0016).
  The threshold was set against six entries, so it had to be re-measured against
  seven rather than assumed. It holds: seven labels measure 524px and so still fit
  on one line above 620px. What changes is how many cards fall below it.

## Considered Options

- **Put the three figures and the slots on the Overview panel.** Rejected: the
  Overview panel is the landing tab, it is the one panel that renders for every
  character, and a nine-plate slot grid on it makes the roster's default view
  taller than the thing it was meant to summarise. ADR-0017 moved Languages and Feats
  out of that panel for the same reason and left the reasoning written down.
- **Put them in the Powers panel**, which already holds spell names and levels.
  Rejected for two reasons. Powers is gated on the sheet listing any power at all,
  so a character whose sheet omits its powers would lose its Save DC along with them;
  and the numbers are not a power list - a reader looking for "what can I still cast"
  wants the DC before the spell names, not after scrolling past them.
- **Give the section a `large`-only policy**, as ADR-0016's original rule would
  have wanted. Rejected: that rule is the one ADR-0017 replaced, and it no longer
  holds. Save DC is a number a caster reaches for mid-turn, which is the roster's
  own question, and the roster card is where the party works out whether the
  sorcerer or the paladin is the one to worry about.
- **Make the bar scroll horizontally at seven entries.** Rejected, and it is the
  same reasoning ADR-0016 rejected scrolling at six: a scrolling strip hides
  sections behind an edge most readers never find, and it is a thumb drag on a
  phone. Wrapping is what the bar already does and it is what it should keep doing.
- **Add a seventh tab.** Chosen.

## Decision

**The card's section bar carries seven entries: Overview, Skills, Spellcasting,
Inventory, Weapons, Features, Powers.** The entry sits directly after Skills and not
down among the powers, because the section index is ordered as a printed character
sheet reads - what the character is made of, then what it can do - and the casting
ability, the Save DC and the attack bonus are all read off one ability. A sheet
prints those beside its ability scores, not beside its spell list.

Four decisions follow from that, and each is settled rather than deferred:

- **The entry is conditional, on a gate that asks the only question that fits a
  caster.** It appears when the character has at least one power in a spell group,
  **or** a class or subclass the casting table recognises. The two halves of that
  disjunction rule out opposite failures, which is the whole reason it is written
  as one `or`. A pure martial character has neither half, and gets no entry - the
  entry nobody can use. A half-caster has the subclass and often no spell entries
  the sheet bothers to list, and would lose its three spells to the other rule.
- **The casting ability is resolved by one pure function, and the section marks a
  guess as a guess.** The order is: a casting class name (Intelligence for Wizard
  and Artificer, Wisdom for Cleric, Druid and Ranger, Charisma for Bard, Sorcerer,
  Warlock and Paladin), then a casting subclass (Intelligence for Eldritch Knight
  and Arcane Trickster), then the highest-level class where more than one entry
  matched, then the best of Wisdom, Intelligence and Charisma - **flagged as
  inferred**. The flag is not decoration. The inferred plate and a recorded plate
  render the same two glyphs, and the difference between "your sheet says you cast
  with Wisdom" and "of your three casting stats, Wisdom is the largest" is the
  difference between a number a reader can check and a number they have to trust.
  A card that shows the second as the first is lying by typography.
- **Save DC is 8 plus proficiency plus the casting modifier; the attack bonus is
  proficiency plus the same modifier.** Both are the printed formulae, computed from
  parsed values, because the sheet stores neither. They live in a module with the
  resolver and the slot-row builder rather than in the card's frontmatter, on the
  argument ADR-0010 and ADR-0013 already make about Alpine expressions: a
  derivation spread across a template is a derivation nothing can unit-test.
- **The slot row is one plate per level with a non-zero maximum, labelled by level
  and reading used out of total.** Levels with no slots are dropped rather than
  rendered as `0/0`, because a grid of zeroes is the first thing a panel shows and
  it says nothing except that the sheet has nine nodes. Used out of total rather
  than a bare total, because `4/4` and `0/4` are different turns and a bare `4`
  cannot tell them apart. The grid is three across on the ~358px roster card, five
  once the card has room for five, and nine on the full character sheet, where a
  level 20 caster's nine levels read as one strip - every breakpoint a container
  query, because the same card is 358px in a roster and 1230px on a character page
  at one viewport.

The heading treatment follows ADR-0016 unchanged: one `h3` naming the section at
`large`, and nothing at `medium`, where the visible tab names the open panel. The
slot plates label themselves with their level, so the section takes **no**
subheading - an `h4` per slot would claim the panel has as many subsections as it
has figures, which is the outline mistake the Weapons restructure was made to fix
rather than repeat.

### What is amended

**The six sections fixed by [ADR-0016](0016-character-card-sections-are-tabs.md)
become seven, and the section index gains an entry between Skills and Inventory.**
Everything else in ADR-0016 stands.

### What is explicitly not amended

The menu bar itself; medium as a `role="tablist"` and large as a `<nav>` of
fragment links; the bar on the header's own surface below the gold rule; the
"a menu entry exists only for a section with content" rule, extended here by the
gate above rather than replaced by it; the 44px target floor from ADR-0009; the bar
wrapping rather than scrolling below 620px of container width, re-measured at seven
entries and unchanged as a threshold; Overview being the unconditional landing
entry; the heading
levels and the mode-by-mode heading rule; and the large sheet shipping no
JavaScript for its menu.

ADR-0017 needs no amendment. `spellcasting: 'medium'` is that decision's own rule
applied - display mode decides which sections exist - and Spellcasting, unlike
Languages and Feats, is a section that owns a whole panel, so its heading follows
the panel rule rather than the fixed-`h3` exception.

## Consequences

- Good, because the two numbers a caster looks up mid-turn are on the card at the
  size the party actually reads it. Before this they were nowhere, and a reader had
  to open the player's handbook or do the arithmetic from the ability grid.
- Good, because the gate keeps the entry off the bar for characters who cannot use
  it. A seventh unconditional entry would have been the worst version of this
  change: a tab that opens onto an inferred Save DC is an empty sheet with a
  confident number in it.
- Good, because the derived numbers are testable as pure functions rather than as
  a rendered plate. A wrong Save DC renders as a plausible number rather than as a
  failure, which is the worst shape a bug can have on a card.
- Bad, because the roster card's bar now takes **two rows where it took one**.
  Measured in the party roster at a 1280px viewport, where the medium card is
  ~432px: six entries measured 427px and fitted on one 46px row, and seven measure
  524px and wrap to two, costing 46px of header per card. That is the sharpest cost
  of this change and it is a cost to a card whose whole job is a glance. The 620px
  wrap threshold itself is unchanged and still correct - seven entries fit on one
  line anywhere above it - but at 432px the seventh entry is the one that tips the
  bar over, and the alternative was a scrolling strip, which ADR-0016 already
  rejected for the same reason at six.
- Bad, because a caster's card is one row of plates taller than it was, on both
  display modes. That is the point of the section, but it is a real cost to the
  roster card's density.
- Bad, because ADR-0016's prose says "six sections" and "two of six" in several
  places that are still binding for everything except the count. A reader who opens
  only ADR-0016 will find a stale count; this pointer is the mitigation, in the
  same shape ADR-0017 used against ADR-0016's section-existence rule.
- Neutral, because the section policy map gained one entry and `CARD_TABS` gained
  one line. The keyboard contract, the id wiring and the `aria-controls` /
  `aria-labelledby` pairing are all derived from `CARD_TABS` and covered the new
  entry the moment it was in the list.
- Neutral, because the slot plates are the first figures on the card that are read
  rather than derived in one place and derived in another. Every other figure is
  either a parsed total or a weapon attack the builder computes, so this is where a
  derivation bug would have been least visible, which is why the formulae are in
  one module with their own unit tests rather than in the markup.

## Links

- [ADR-0009](0009-phone-first-grids-and-touch-targets.md) - phone-first grids, 44px targets, and the container-query rule every breakpoint in the slot grid follows
- [ADR-0010](0010-alpine-data-registration.md) - why a card expression belongs in a registered module rather than in an attribute
- [ADR-0013](0013-browser-safe-data-module-boundary.md) - splitting build-side data out of client graphs, which is why the resolver is importable on its own
- [ADR-0016](0016-character-card-sections-are-tabs.md) - the menu this ADR amends, and the record whose section count is replaced above
- [ADR-0017](0017-medium-card-drops-saving-throws.md) - display mode decides which sections exist, which is what puts Spellcasting on the roster card
