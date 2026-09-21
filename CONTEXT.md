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
