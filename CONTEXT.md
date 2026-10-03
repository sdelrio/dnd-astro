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
Discarding a character's rolled ability scores and using the fixed Mulligan
array 15, 14, 12, 12, 10, 8 instead.
_Avoid_: Reroll, do-over

**Starting spread**:
One of the complete allocations the Point Buy tool offers as a one-press load.
Each is a legal 5e spread costing exactly the full 27-point pool, so loading one
is a finished allocation rather than a head start. The set is Standard Array,
Striker (15/15/14/8/10/8) and Caster (8/14/14/15/12/8).
_Avoid_: Preset, template, build, loadout

**Trade**:
Exchanging the scores of two Ability Scores on the Point Buy sheet. A trade
moves both values at once, so the spend and the modifier total are unchanged by
construction and it cannot overspend.
_Avoid_: Swap, exchange, drag-and-drop reorder

**Modifier total**:
The six Ability Scores added up once each is read as a bonus or a penalty. It is
the one figure that says whether an allocation or a roll is any good - a spread
can spend all 27 points and still be a worse character than one that spends 25 -
and both the Point Buy ledger and the Dice Roller panel print it. A trade never
changes it.
_Avoid_: Total bonus, score total, power level

## The printed handbook

**Handbook**:
The single committed PDF of the eight house-rule pages, generated at dev time and
downloadable from the site. One file, one edition, one version: a reader holding
it is holding a specific rendering of specific content.
_Avoid_: PDF, book, printable, export, download

**Sheet**:
One fixed-size page of the Handbook, exactly the size of the print area, with a
break after it. A source page becomes as many Sheets as it needs, and a Sheet is
not a source page: the count differs and the two are numbered in different ways.
_Avoid_: Page, leaf, folio, screenshot, PNG

**Source page**:
One of the eight `dnd/` documents the Handbook is rendered from. It is a web page
first and prints second, and it is the unit the contents lists and the unit an
author breaks between.
_Avoid_: Web page, doc, article, chapter, entry

**Split**:
A point where the generator broke one source page across two Sheets because the
content did not fit. Every split is named in the output and recorded, and an
authored horizontal rule replaces it in the end.
_Avoid_: Page break, overflow, truncation, pagination, clip

**Manifest**:
The small committed record of the Handbook: a content hash of the eight sources,
the sheet count, and each sheet's page number and text hash. It is the gate that
makes a stale artifact fail rather than ship. The hash is content-based, never a
timestamp.
_Avoid_: Lockfile, checksum, report, index, log

## Vocabulary notes

**folio** on the index page is a contents-entry number, not a print folio. It is
the address a player quotes across the table ("look up nine"), which is what
DESIGN.md means when it calls folio the bindery's word and declines to use it for
a feature count. The number printed in a Sheet's footer is the **page number**.
The existing index usage is deliberately left alone: renaming a tested content
model would touch `rulebook-parts.ts`, its tests and DESIGN.md for no functional
gain, and the collision is harmless as long as both senses are named.
