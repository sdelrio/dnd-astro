---
status: accepted
date: 2026-10-01
supersedes: null
superseded_by: null
tags: [components, accessibility, layout, characters]
---

# ADR-0016: The Character Card's Sections Sit Behind a Menu, Not One Scrolling Column

> **The section-existence rule is replaced by [ADR-0017](0017-medium-card-drops-saving-throws.md).**
> The claim below that the display mode decides how much a section holds and never
> whether the section exists no longer holds: medium drops Saving Throws and gains
> Feats, so a section can now be absent at one mode and present at another. The
> replacement rule is that the display mode decides which sections exist and which
> panel holds them, and the heading treatment of Languages and Feats is fixed at
> `h3` at both modes because neither panel carries a heading of its own. Everything
> else in this decision is unchanged and remains binding: the six sections, the
> menu bar, medium as a tablist and large as a table of contents, and Overview as
> the unconditional landing entry.

## Context and Problem Statement

`XmlCard` renders six sections - Overview, Skills, Inventory, Weapons, Features,
Powers - as one long column. At `display="large"` that is a complete character
sheet and the length is the point. At `display="medium"` it was not: medium gated
Inventory, Weapons, Features and Powers behind `large`, so the party roster's
medium cards were long *and* incomplete. A reader at the table asking "what
spells does this character have prepared" had to leave the roster, open the
character page, and scroll.

Medium existed for the roster specifically. `PartyView.astro` mounts six medium
cards in two columns, so the card's own width is ~358px at a 1280px viewport -
and the card is the thing that has to fit, not the window.

Three constraints came from the existing system rather than from taste:

- **A display mode may shorten a section, never re-style it** (DESIGN.md, Card
  sections). Medium already renders the same Skills and Saving Throws tables as
  large, passing only the proficient rows.
- **The card's sections are `<section>` elements and are deliberately unnamed**,
  because six cards × six names would produce "Vitals" as a `region` landmark
  six times over.
- **Container queries, not viewport queries, because the card is its own
  container** (ADR-0009's rule, applied here since ADR-0009).

## Considered Options

- **Keep the column and gate at large.** Rejected: it is the status quo and it is
  what put an incomplete card in the roster.
- **Collapse sections behind per-section disclosures.** Rejected: six independent
  open/closed controls on a card is a wall of small toggles, and a reader still
  has to open each one to know whether anything is in it. The Feat Explorer's
  tier medallion solves the same "is this worth opening" question with a count.
- **Render sections on demand, per tab.** Rejected: a reader without JavaScript
  loses the other five sections entirely, and the card's content is static data
  already available at build time. There is nothing to fetch.
- **Print a count on every menu entry**, so the reader can see whether a section
  is worth opening before opening it. Chosen, then reverted. A count sitting to
  the right of its label reads as part of the name and widens the bar; the reader
  opens the section and sees its length anyway.
- **Server-render every panel, hide inactive ones with `x-show`, and drive it
  with `Alpine.data('xmlCard', ...)`.** Chosen, for `medium` only.

## Decision

**The six sections sit behind a menu bar under the header, and the display mode
decides what the menu *does* rather than what it contains.** Both modes render the
same sections in the same order; they differ in whether a click opens a section or
scrolls to one.

They are two instruments because the two cards are different problems. A `medium`
card in the roster is ~358px wide and shares a column with five others, so its
sections compete for vertical space and only one should be open at a time. A
`large` sheet is already a full-page scroll: hiding five of six sections behind a
click costs the reader their sense of the whole character, which is most of the
value of a character sheet.

- **`medium` is a tab bar**: a `role="tablist"` with one `role="tabpanel"` each,
  every panel in the DOM at build time, toggled with `x-show` and driven by
  `Alpine.data('xmlCard', ...)`. Keyboard is the standard tab pattern - roving
  `tabindex`, arrows plus Home/End, activation following focus.
- **`large` is a table of contents**: a `<nav>` of `<a href="#...">` to a real `id`
  on each section, and every section rendered visible. It carries no `x-data`, no
  `x-show` and no `x-cloak`, so **the large sheet needs no JavaScript at all** -
  a fragment identifier is the whole mechanism. Selection states are therefore
  absent there too: `aria-selected` on a link that hides nothing would be false.
- **The bar sits on the card header's own surface, below the header's 2px gold
  rule**, so identity and navigation read as one band.
- **A menu entry exists only for a section with content.** An entry that opens an
  empty sheet is worse than a shorter bar. Overview is unconditional: Vitals and
  Abilities render for every character, so the bar always has a landing entry.
- **At medium a section has no heading of its own.** The visible tab names the open
  panel, so an `h3` repeating that word 20px below would be the same name twice.
- **At large every section names itself.** The bar is a row of links that all look
  alike and nothing is selected, so on a page-long scroll a section that is only
  tables gives the reader no way to tell where they have landed. The headings use
  the same `sectionHeadingClass` as Vitals and Saving Throws, and Inventory's
  carried-weight total rides its baseline again - the pairing it always had.
  Overview stays unnamed at both modes, because there the menu entry does name it.
- **The `Level N` groups step down one level at large** (`h3`/`h4` at medium,
  `h4`/`h5` at large) because the section heading now genuinely owns them. Two
  `h3`s in a row under Features would claim Features and its first level group are
  siblings. `h2 > h3 > h4 > h5` is contiguous in both modes.
- **The bar reads as a menu strip, not a control floating between two blocks:**
  zero vertical padding, so it sits flush against the header above and the sheet
  below, and 8px of horizontal padding on both the bar and each entry, tight
  enough that six labels read as one band. The 44px target from ADR-0009 is held
  by the entry's `min-height`, so tightening the inset costs a thumb nothing.
- **The bar wraps below 620px of container width; it never scrolls.** A scrolling
  strip hides two of six sections behind an edge most readers never find.
- **A jumped-to section adds no `scroll-margin-top` of its own.** Starlight sets
  `scroll-padding-top` on `html` in `Page.astro` to `1.5rem` plus the nav and
  mobile-TOC heights, and that is what clears the sticky header. A per-section
  offset stacks on it rather than replacing it; measured, it pushed every target
  112px down.
- **The section heading is the jump target's first visible line**, so a link lands
  the reader on the name rather than on a table with the name scrolled off above it.

Promoting Inventory and Weapons to medium put their four- and three-column
tables into a 358px card for the first time. Both **drop a column below `@lg` and
carry it as a second line under the name** - Weight and State for inventory,
Properties for weapons - while the attack bonus and damage keep their own columns
at every width.

## Consequences

- Good, because the roster's cards now carry the whole sheet. Every section is
  one tap from the roster instead of one navigation away.
- Good, because the medium card got *shorter*: a medium card in the roster is now
  one panel tall rather than an Overview-plus-Skills-plus-Saves stack.
- Good, because restoring the headings at large fixed a real gap rather than adding
  chrome. The tab-name arrangement had removed them on the argument that the tab
  already says the word, which is true on the roster and false on a character page:
  there is no tab, no selection, and no heading, so a reader scrolling arrived at an
  unlabelled block of pills. The card outline is now `h2` name, `h3` sections,
  `h4` level groups, `h5` power groups - a document outline that matches what the
  eye does on a long scroll.
- Good, because the large character page ships **no client JavaScript for its
  menu**, and its sections are all in the markup with no post-boot reveal. The
  `x-cloak` cost below is now confined to the roster.
- Good, because the medium menu is a standard affordance rather than an invented
  one, and the keyboard contract came with it rather than being designed
  separately.
- Bad, because `medium` is the site's first client-side state inside a component
  that was previously rendered at build time and hydrating nothing. A reader
  without JavaScript gets every panel in the markup, in order, and no bar - the
  pre-menu layout, intact. That is deliberate: the bar is cloaked so its dead
  labels stay off the page, but the panels are **not** cloaked, because
  `[x-cloak]` is `display: none !important` and cloaking them would render a
  medium card as a header and nothing else. Graceful degradation is worth more
  here than suppressing a flash of panels on the way to boot.
- Bad, because a reader with JavaScript sees all six panels for the frame or two
  between first paint and Alpine booting, where they saw one. The panels are the
  same server-rendered markup either way, so this is a reveal rather than a
  fetch, and the alternative - cloaking - costs a no-JS reader the whole card.
- Bad, because the two pairing grids at `@6xl` (Skills beside Inventory, Features
  beside Powers) are gone. Only the Overview panel still splits, because it alone
  holds two independent groups. A large character sheet is now taller than it
  was.
- Bad, because `xml-card-passives.test.ts` sliced each section out by walking
  back from its heading to the nearest `<section>`. That walk still terminates
  after the tab bar and now returns the wrong element - it silently swallowed the
  following panels - so every section helper was rewritten to slice by
  `data-panel`. A test that passes for the wrong reason is worse than one that
  fails, and this is the second time in this repo's history that a
  structure-slicing helper outlived the structure it sliced.
- Neutral, because `src/alpine.ts` grew a sixth registration, and the client
  module graph is one module wider (ADR-0010, ADR-0013). Only `medium` reaches
  it.

## Links

- [ADR-0009](0009-phone-first-grids-and-touch-targets.md) - phone-first grids,
  44px targets, and the container-query rule the menu bar and both tables follow
- [ADR-0010](0010-alpine-data-registration.md) - why the medium tab behaviour is a
  registered `Alpine.data` component and not a `window` global
- [ADR-0014](0014-tool-rows-not-tiles.md) - the ruled-row argument applied to a
  table: a row's width is its container's, and it holds a name and its figures at
  any width