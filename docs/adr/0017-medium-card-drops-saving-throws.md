---
status: accepted
date: 2026-10-03
supersedes: null
superseded_by: null
tags: [components, layout, characters, display-mode]
---

# ADR-0017: Medium Is a Glance, So It Carries Languages and Feats and Drops Saving Throws

## Context and Problem Statement

ADR-0016 put the card's six sections behind a menu and drew one rule about what
display mode may and may not do: **display mode decides how much a section holds,
never whether the section exists.** Six sections, two modes, and every entry of the
bar reachable from both. Medium differed from large only in row sets - proficient
saves, proficient skills - never in which sections were on the page.

That rule has stopped describing the card. `XmlCard`'s `sectionPolicy` already
encodes sections that render from one display mode up (`saves`, `skills`,
`languages`) and sections that render from `large` only (`allSaves`, `allSkills`,
`passives`, `feats`), so a medium card was never quite the six-section menu ADR-0016
described. The code and the record disagreed, and the code was the one a reader
met.

Two facts about the medium card decided what to do about it. The card is ~358px
wide in `PartyView.astro`'s two-column roster at a 1280px viewport, and it is a
**glance**, not a sheet: a reader scanning a party of six wants to recognise who
each person is in the time it takes to move their eye down a column, and does not
want to compute anything. The roster's medium cards sit beside five others, so a
section that is worth opening is one that answers "who is this" faster than it
answers "what does this number come to".

Measured against that, the current medium Overview panel is doing the wrong job.
It carries Saving Throws - a 3-6 row table of numbers that the character page and
the large sheet already print properly, and that a reader computes with, not
reads from a roster card - while Languages, which the same parser already produces
and medium already renders, sits in a plate in the same panel as an afterthought
next to a table of figures, and Feats does not render at all. Feats are the single
most identifying thing on a D&D character: "which feat did they take" is a
recognition question, and medium is where recognition happens.

There is a second problem the same change has to settle, and it is a content-loss
problem rather than a styling one. ADR-0016's own rule is that **a menu entry
exists only for a section the card has something to put in it**, and ADR-0016's
`showSkills` currently derives from `proficientSkills.length > 0` at medium. A
character with languages and feats but no proficient skills would therefore have
no Skills panel, and if Languages and Feats ride that panel at medium they would
have nowhere to render at all. The bar's tidy rule would silently delete content,
which is the one outcome worse than an empty sheet.

## Considered Options

- **Extend ADR-0016's rule instead of replacing it**, by arguing that dropping
  Saving Throws at medium is "how much a section holds" rather than "whether it
  exists". Rejected: a section that renders zero rows at medium is a section that
  does not exist, and calling that a reduction in quantity is a definition that
  will absorb any future cut. The rule is replaced, and the replacement is written
  down.
- **Give Languages and Feats a panel of their own.** Rejected: a seventh tab on a
  358px bar for two sections that are a handful of pills each, and a bar that
  already wraps below 620px of container width would wrap further. A reader who
  wants to know what languages someone speaks does not need a destination for it.
- **Leave Languages and Feats where they are at medium**, in the Overview panel,
  and only add Feats. Rejected on the same grounds: it leaves the two sections
  sharing a panel with a table, which is the arrangement that reads worst.
- **Move Saving Throws to the large sheet only, promote Feats to medium, and put
  Languages and Feats in the Skills panel at medium and the Overview panel at
  large.** Chosen.

## Decision

**Display mode decides which sections exist and which panel holds them.** The
card's section policy is one rule read at three ranks, not three lists of sections:

- **`small` renders no Saving Throws, no Skills, no Languages and no Feats.** It
  is a portrait card: identity, avatar, tags, and nothing that needs a panel to
  hold it. This is unchanged.
- **`medium` renders Skills, Languages and Feats, and does not render Saving
  Throws.** The two pill sections ride the Skills panel. Medium is the mode that
  answers "who is this", and all three sections on it are recognition material.
- **`large` renders every section medium renders, plus Saving Throws, and adds
  nothing of its own.** Languages and Feats return to the Overview panel. Large
  is the sheet: it is already a page-long scroll, it has the room, and a reader
  who came for a saving throw is the reader who came to the character page.

The rule is "display mode decides which sections exist and which panel holds
them", and the three ranks above are what it evaluates to. A mode may not be
described by restating a list of sections, because that is how the list and the
`sectionPolicy` map drift apart in the first place.

Four further decisions follow from that, and each is settled rather than deferred:

- **Languages and Feats ride the Skills panel at medium and the Overview panel at
  large.** They do not gain a panel. At large the Overview panel is the panel
  that already held them, and moving them would change what large shows for no
  gain. At medium the Overview panel is the one holding a table, and two pill
  plates inside a panel whose name is "Overview" are content the reader is
  scrolling past to reach the character sheet. The Skills panel at medium is a
  panel of short lists, which is what these are.
- **The Skills tab appears whenever the Skills panel has anything in it, and the
  Languages and Feats plates count as content.** `showSkills` at medium is
  therefore `proficientSkills.length > 0 || showLanguages || showFeats`. Without
  this, a character with feats and no proficient skills loses its feats at
  medium, and ADR-0016's "a menu entry exists only for a section with content"
  rule becomes a rule that deletes content rather than one that hides an empty
  sheet. The Overview entry stays unconditional, because Vitals and Abilities
  render for every character.
- **Both sections get an `h3` heading above the plate and drop their in-plate
  label.** The in-plate label is a 600-weight uppercase micro-label sitting inside
  the plate, side by side with the pills at `@md`, so the section name and its
  contents compete for the same row and the name is the thing that loses at
  358px: it wraps before the first pill does. Moving the name above the plate puts
  it in the one position the card already uses for a section name, which is what
  `sectionHeadingClass` is for, and it puts it on the gold rule rather than inside
  the plate.
- **The heading level is `h3` at both modes.** This is the one place the two modes
  agree on a heading level rather than each choosing its own, and the agreement is
  the point. Neither the Skills panel nor the Overview panel carries a heading of
  its own at either mode: at large, ADR-0016 leaves Overview unnamed because the
  menu entry names it, and at medium no panel has a heading because the visible tab
  does. So there is no panel heading for these two sections to sit beneath, and
  `h3` is correct in both places for the same reason. They are the only two
  sections on the card whose heading level is fixed rather than derived from the
  surrounding panel, and the reason is written down rather than left to be inferred.

The heading-level change is the one place this ADR parts company with ADR-0016's
general shape. ADR-0016 says the heading *level* is honest per mode because at
large a panel heading is the `h3` and its groups step to `h4`/`h5`. That argument
depends on a panel heading existing, and for a panel that has none the level has
nothing to derive from. This is not a second heading system: it is the same
`sectionHeadingClass` at the same level as Vitals and Saving Throws, which is the
treatment the card already gave these sections' neighbours.

### What is superseded

**The "display mode decides how much a section holds, never whether the section
exists" rule in [ADR-0016](0016-character-card-sections-are-tabs.md) is replaced
by this ADR.** Medium no longer renders Saving Throws, and Feats is no longer
large-only, so the rule has to be able to describe a section that is absent at one
mode and present at another. ADR-0016 carries a pointer here.

### What is explicitly not superseded

Everything else in ADR-0016 stands, and most of this ADR depends on it. The six
sections behind a menu bar; medium as a `role="tablist"` and large as a `<nav>` of
fragment links; the bar on the header's own surface below the gold rule; the
44px target floor from ADR-0009; the bar wrapping rather than scrolling below
620px of container width; Overview being the unconditional landing entry. The
"a menu entry exists only for a section with content" rule is not superseded
either - it is extended, in the one place where it would otherwise delete content
rather than hide an empty sheet, and the extension is stated above rather than
assumed.

ADR-0009 is unaffected. The card is still its own container and every width test
inside it stays a container query, because the card is 358px in a roster and
1230px on a character sheet at the same viewport. The `h3` treatment and the plate
reuse are the same components the card already had.

### Out of scope

- **No parser change.** `languages` and `feats` are already parsed and already
  reach the card as `string[]`. This is a rendering decision about two arrays
  that are in hand.
- **No new tab.** Six entries, before and after.
- **No change to what large shows.** Large keeps all six tabs, keeps all six
  saving throws in the two 3+3 table, keeps Languages and Feats in the Overview
  panel, and keeps every section it renders today. What changes at large is the
  heading treatment of the two pill sections, not their content or their panel.

## Consequences

- Good, because the medium roster card answers the question the roster is asked.
  "Which feat did that character take" and "what languages does that character
  speak" are recognition questions and both are now answerable from the roster,
  which was the whole reason medium exists (ADR-0016).
- Good, because the medium card got shorter and more specific at the same time.
  The saving throws are the rows a medium reader was scrolling past to reach the
  feats; the character page and the large sheet still print all six of them, in
  the two-column layout they were designed for.
- Good, because the heading change fixes a real wrapping problem rather than
  adding chrome. At `@md` the in-plate label and the pills share one row, and at
  358px the label is the part that wraps.
- Bad, because a character who reads the roster and wants a saving throw has to
  leave the roster for it. That is the same trade ADR-0016 made in the other
  direction when it promoted four sections to medium, and it is a trade rather
  than an oversight: the roster is for recognition.
- Bad, because ADR-0016's "never whether the section exists" rule is now replaced,
  and a reader who opens only ADR-0016 will find a rule that no longer describes
  the card. The pointer in ADR-0016 is the mitigation, in the same shape ADR-0014
  used against ADR-0009.
- Neutral, because the section policy is still one map in `XmlCard.astro` keyed by
  rank. This ADR changes two entries in it (`saves` to `large`, `feats` to
  `medium`) and the panel that renders two sections, rather than adding a
  mechanism.
- Neutral, because the pill markup is unchanged. Only the label moves out of the
  plate and onto a heading, so the plate keeps its role and its `cardPlateClass`.

## Links

- [ADR-0009](0009-phone-first-grids-and-touch-targets.md) - phone-first grids, 44px
  targets, and the container-query rule that keeps the card measuring itself
  rather than the viewport
- [ADR-0014](0014-tool-rows-not-tiles.md) - the precedent for superseding one
  decision inside an accepted ADR rather than marking the whole record superseded
- [ADR-0016](0016-character-card-sections-are-tabs.md) - the menu this ADR revises,
  and the record whose section-existence rule is replaced above