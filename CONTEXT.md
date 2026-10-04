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
One box of the Handbook, exactly the size of the print area, with a break after
it. A Sheet whose content fits is one page; until source pages are split, one that
does not is the pages its content spans, which is a state the split report ends.
A source page becomes as many Sheets as it needs, and a Sheet is not a source
page: the count differs and the two are numbered in different ways.
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
the sheet count, and each sheet's page number, kind and text hash. It is the gate
that makes a stale artifact fail rather than ship. The hash is content-based, never
a timestamp.
_Avoid_: Lockfile, checksum, report, index, log

**Publisher page**:
The page at `/handbook/` that states the Handbook's version and edition date and
links the PDF. It lives outside the house-rule pages so the Handbook is not
printed into itself, and it is reached through a sidebar group, which makes it
discoverable from every page rather than from the homepage only. The index page
carries no download affordance at all, deliberately.
_Avoid_: Download page, index page, landing page

**Contents**:
The sheet after the cover, listing the eight source pages and the page each one
starts on, and nothing else: forty sub-entries on one sheet is a wall. Its page
numbers are filled by the same layout pass that assigns sheets, so the site is
built once and the two cannot disagree.
_Avoid_: Table of contents, index, sheet 2

**Capture**:
One Sheet's page, as a PNG at an exact raster size, taken from the same DOM and
the same stylesheet the PDF is printed from. A Capture is evidence about the
Handbook rather than a second opinion about it, which is why its size is read back
out of the file rather than trusted from the write. It is not a screenshot: a
screenshot is whatever the viewport happened to be. Captures are not in version
control, so a **golden capture** is a local one compared against a **baseline** the
repository does not track, which corroborates the Manifest and never replaces it.
_Avoid_: Screenshot, thumbnail, preview, image, golden

**Column**:
One of the Sheet's two 306px measures. An element too wide for its Column spans
both, measured rather than declared, so wide tables are the expected case in a
book of reference tables. A source page may set `columns: 1` and print in one.
_Avoid_: Text wrap, measure, gutter, span, break

**Ornament**:
The decorative rule at the centre of a Sheet's footer, generated from the site's
own gold rule token so it belongs to the existing rule vocabulary. It is a
committed file rather than a stylesheet value, which is what lets it be replaced
without touching code.
_Avoid_: Flourish, glyph, icon, divider, border

**Parchment**:
The paper a Sheet is printed on: one committed, tileable, generated image rather
than a gradient in a stylesheet. Its contrast against body text is measured
against its darkest pixel, because a decorative background behind text is where
contrast quietly goes and a texture's average is not its darkest pixel.
_Avoid_: Background, texture, paper, surface, pattern

## Vocabulary notes

**folio** on the index page is a contents-entry number, not a print folio. It is
the address a player quotes across the table ("look up nine"), which is what
DESIGN.md means when it calls folio the bindery's word and declines to use it for
a feature count. The number printed in a Sheet's footer is the **page number**.
The existing index usage is deliberately left alone: renaming a tested content
model would touch `rulebook-parts.ts`, its tests and DESIGN.md for no functional
gain, and the collision is harmless as long as both senses are named.
