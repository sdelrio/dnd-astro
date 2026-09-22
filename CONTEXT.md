# D&D Companion

Domain glossary for the Fantasy Grounds character viewer and the docs site that
hosts it. This file defines the project's language only; implementation
decisions live in specs and ADRs.

## Language

**Character sheet**:
The Fantasy Grounds XML source for one character, parsed at build time into a
`CharacterData` record.
_Avoid_: Character, PC, XML file, sheet XML

**Card**:
The `XmlCard` component rendering one character sheet's data. A card is not a
page and does not own a URL.
_Avoid_: Character card, sheet view, widget

**Display mode**:
The size a card renders at - small, medium, or large. Chosen at build time by
the page that mounts the card.
_Avoid_: Size, zoom, view mode

**Character page**:
The dedicated, prerendered route that shows one character sheet as a single
full-width large card.
_Avoid_: Detail page, sheet page, character view, profile

## Character creation

**Ability Score**:
One of the six numeric traits - STR, DEX, CON, INT, WIS, CHA - that a character
is built from. Each starts at 8 during point buy.
_Avoid_: Stat, attribute, ability

**Point Buy**:
A character-creation method where all six ability scores start at 8, cannot
exceed 15, and are raised by spending a shared 27-point pool on a non-linear
cost curve.
_Avoid_: Point allocation, point-buy calculator

**Standard Array**:
The fixed spread 15, 14, 13, 12, 10, 8 assigned to the six ability scores
instead of spending points.
_Avoid_: Default array, preset scores

**Mulligan**:
Discarding a character's rolled ability scores and rolling a fresh set.
_Avoid_: Reroll, do-over
