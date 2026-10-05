---
status: accepted
date: 2026-10-04
supersedes: null
superseded_by: null
tags: [print, pdf, typography, handbook, layout]
---

# ADR-0024: A 13px Print Type Scale, and the Generator Owns the Page Breaks

## Context and Problem Statement

ADR-0020 renders the Handbook from the site's own stylesheet, so the sheet set at
the browser's default 16px root. On a 306px column that is 44 characters to the
line, which is a screen measure rather than a printed one, and the book was 66
sheets.

The 66 were not the type alone. Across the eight house-rule pages the print-route
commit had written fifty-six horizontal rules, and a rule meant "start a new
sheet": the assignment honoured a rule wherever it found one, so a sheet carrying
an `hr` was split even when its content would have fitted whole. There were zero
automatic splits, and the artifact's record demanded that there stay zero. Halving
the type without moving the breaks would have produced 66 half-empty sheets. Those
rules were vestigial once a rule stopped breaking a sheet, so they were removed
outright rather than left as stray gold dividers in the book.

## Decision Drivers

- A printed rulebook reads at a smaller size and a tighter measure than a screen.
  The type on a sheet was too large for the content it carried.
- The number of sheets is driven by the breaks, not only by the type, so both
  have to move together.
- A boundary the generator invents can change which page a rule lands on, so it
  has to be reported by name and recorded, or it can move unseen.
- Every boundary has to be a block boundary. Nothing may be split inside a block
  and nothing may be clipped.
- The manifest is a staleness gate. A gate that fails when a boundary merely moves
  is a gate that gets deleted rather than kept.

## Considered Options

- **A smaller root with the authored rules left in place.** Rejected. It produces
  the same 66 half-empty sheets, now with more blank paper on each.
- **An 8px root.** Rejected. It is 88 characters to a 306px column and about 6pt,
  which is a footnote rather than body text.
- **Keep the `hr` as a break and change only the type.** Rejected. The rules are
  56 of the 66 pages; the type is the smaller half of the problem.
- **A 13px root, the `hr` demoted to a divider, and the generator owning every
  break, with the manifest gate a bound on the split count.** Chosen.

## Decision Outcome

**The print routes set a 13px root, restate the three pixel heading steps in rem
against it, keep the cover and contents titles in pixels, print asides flat, drop
the two interactive tools, keep every block - paragraphs, lists, headings, asides
and tables - whole inside its column, weld a heading through its lead-in to the
reference block it introduces so a boundary cannot fall between them, fill the
first column before the second,
charge a spanning band below the taller column it follows, set all four insets to
15mm, and treat a horizontal rule as a gold divider rather than a sheet break. The
generator chooses every page boundary, reports each one by name, and records them
in the manifest, whose gate is a bound on the split count rather than a demand for
zero.**

### The type scale

`src/styles/handbook-print.css` states the scale once, on `:root`:

| Step | Value | At the 13px print root |
|------|-------|------------------------|
| Root | `13px` | - |
| Body | `1rem` on a `1.75` leading | 13px on 22.75px |
| `h2` | `1.75rem` | 22.75px |
| `h3` | `1.5rem` | 19.5px |
| `h4` | `1.25rem` | 16.25px |
| Cover title | `48px` | 48px |
| Contents title | `40px` | 40px |

The three heading steps are the site's own 28px, 24px and 20px restated as the rem
values they were designed at on a 16px root, so they follow the print root down to
81.25% of their screen size. The body is `1rem`, so the same declaration that
moves the root moves all of it. The cover and the contents keep their titles in
pixels, because rem now means "the print body scale" and a title that exists to be
read from across a table must not shrink with the text it dominates. Every other
pixel length that reached the print routes was found by the same audit and
restated the same way.

At 13px the body is 54 characters to a 306px column, where 16px gave 44. The
display face gate is unaffected: the face is still demanded before a capture.

### Asides print flat

`.starlight-aside` carries a drop shadow on the website, which is right for a
screen and is ink that says nothing on paper. The print stylesheet suppresses it
for the print routes only; the screen value is untouched.

### The interactive tools do not print

Point Buy and the Dice Roller are widgets a reader operates on a website. Their
roots (`point-buy-needs-js` and `dice-roller-needs-js`, both `not-content`) are
hidden from the print flow by a rule in the print stylesheet scoped to
`[data-handbook-flow]`. The components and the website's own styling are
untouched, so the screen keeps both exactly as they were.

This replaces the wide-layout workaround the previous decision needed for the
Point Buy panel. The panel's stacked phone layout was taller than a sheet and
broke inside the component at a boundary no markdown rule could reach, so the
print stylesheet forced it back to its ledger layout. A tool that does not print
at all has no layout to correct, so those three rules and their cost-column
custom property are gone.

### A block stays whole inside a column

Chrome breaks a paragraph at a line boundary across the column gutter by default.
The planner places each top-level block in a single column, so the browser's
layout and the plan disagreed about what a block is, and a paragraph drew its
first half at the foot of one column and its second at the head of the next.

`break-inside: avoid` (and the `-webkit-column-break-inside` prefix) is declared
for `p`, `li`, `ul`, `ol`, the heading levels, `.starlight-aside` and
`table`/`tr`/`td`/`th`, scoped to the flow. A block that does not fit the space
left in a column now moves whole to the next column, which is the model the
planner already used. A block taller than an entire column still breaks, because
there is nowhere else for it to go, and the planner reports it. An aside or a
table is a block like any other: the owner's report was that an aside could be
split down the gutter and half of it read at the foot of one column and half at
the head of the next, and the rule makes each one atomic.

A list is such a block too. Without the rule a list could be split across the
gutter item by item, and in `dnd/injuries` the `Medical Treatment (Medicine)`
heading printed at the foot of one column with its list at the foot of the other.

### A heading travels with the block it introduces

`break-after: avoid` is a hint, and a hint cannot cross a sheet boundary the
planner chose: on `dnd/injuries` the `Injury Severity Table` heading was stranded
at the foot of one sheet while its 695px table took the next, leaving 40% of the
first sheet blank. So the fix is in the planner and not only in the stylesheet.
The assignment marks a heading wrapper (`sl-heading-wrapper`, or a bare `h1`-`h6`)
`keepWithNext`; `planSheets` welds a run of such blocks to the block after them
into one unit, packs the unit, and reports it as a single split named for the
heading if it has to move. The unit is transitive, so an `h2` above an `h3` above
the first paragraph is one thing to place, and it is never split between two
columns or two sheets. On `dnd/injuries` the heading and its table now share the
second column of sheet 7.

### The weld runs through the lead-in to the reference block

The weld above stopped one block short of its own purpose. `dnd/skills` shapes
every craft section as a heading, a one-line lead-in ("Utilize: ...") and then a
table, so welding the heading to the block immediately after it left the table a
block of its own: it could start a sheet while the heading and the lead-in that
promised it closed the previous one, and the reader turned the page to find the
table the heading promised.

The assignment now marks each block's own kind - whether it is a heading, whether
it is a reference block (a table, an aside or a list, and Starlight's
`div.starlight-aside` counts) - and `weldRuns` computes the marks `planSheets`
reads: a run starts at a heading, carries every following block, and stops before
the next heading, so one section's table is never welded to the previous section's
heading. Within that section the run ends with the first reference block, which is
the last member of the unit, and a heading whose next block is already a reference
block is unchanged. When no reference block is reachable before the next heading
the run is section-bounded rather than the one-block weld this ADR originally
described: it carries the heading and every following block up to the section end,
and the next heading starts its own run. The section bound is the whole rule, so a
run never welds past an intervening subheading - the transitive heading case (an
`h2` above an `h3` above the paragraph they introduce) still welds through to the
reference block.

The manifest moved with it: the `dnd/skills` craft sheets now begin at `div at h2
"Brewer's Supplies (Intelligence)"` and its siblings rather than at `table at
"Craft Materials Cost ..."`, so a sheet starts with the heading that introduces
its table rather than with the table alone. The section-bounded run moved the
`dnd/weapon-mastery` boundaries the same way: its mastery sheets now begin at
`div at h2 "Cleave"` and `div at h2 "Powerful"` rather than at the paragraphs those
sections contain, so the heading that introduces a mastery travels with it. The
book is still 27 sheets and 17 splits, under the bound of 30.

### A spanning band starts below the taller column

`planSheets` models a `column-span: all` block as a band that resets both columns
below it. The band's top is the height of the **taller** column filled so far in
its row, not the current one: Chrome balances the content of a row that ends at a
spanning element, so a narrow block in column two after an 800px block in column
one puts the band at 800, not at 200. The planner used to charge the band below
the current column alone, which undercounted the sheet and let a later block
overflow. The assignment now carries a per-column used height and charges the
band below the maximum.

The same balance has a second face, and it is fixed in the stylesheet because it
is a placement and not a boundary. A heading immediately before a full-width
table is balanced into the second column, so `dnd/master-armor-table` printed
`HEAVY ARMOR` on the right of the band above it. A heading whose next sibling
spans now carries `break-before: avoid`, which keeps it in column one below the
band; the rule is scoped with `:has(+ [data-handbook-wide])` so a heading that
introduces an ordinary column-width table can still start column two, which is
what lets the `Injury Severity Table` heading move with its table.

### The first column fills before the second

The flow's `column-fill` is `auto`, which fills the first column to the foot of
the flow before it starts the second. **This reverses the `balance` choice**
ADR-0020's amendment made once the sheets became one page each. That amendment
reasoned that `auto` would fill one column and leave the second empty; what it
missed is that `auto` can only fill a *definite* height. With an auto height it
runs every block down one column and grows, which is the same half-empty page by
another route, and the split loop then reads the swollen column and splits sheets
that fit.

The owner's report was the other side of it: `balance` spread each sheet's content
across both columns at half height, so a page read as two half-empty columns
rather than one full column and a remainder, and in `dnd/injuries` the headings
and their blocks were dealt between the columns in the wrong order.

The flow gets its definite height in the assignment, and only after the split has
finished. The split measures block heights to decide where a page ends, and a flow
that overflows a definite height lays those blocks out in columns the measurement
was never meant to see: a block then reports the column's height rather than its
own, the plan believes a sheet that does not fit fits, and the book grows instead
of denser. So the loop holds the flow at `balance`, measures the document as it
falls, and only when every sheet is assigned does each flow get the height of its
sheet's text block and switch to `auto`. The removed title is left out of that
height, read as the distance from the sheet's content-box top to the flow's own
top: assembling it from the heading's height and margins missed the margin that
collapses between the two and printed a blank page after every first sheet.

The result is measurable: the `auto` layout measured **28 sheets** where the
`balance` layout measured 30, and removing the vestigial print rules took it to
**27**. The first column fills before the second begins.

### The insets are 15mm on all four sides

The top and left insets were 25mm and the right and bottom were 15mm; all four are
now 15mm. The page box is unchanged at 793.7 x 1122.51px, so the text block grows
from 642.52 x 971.33px to 680.32 x 1009.13px. This amends ADR-0023's geometry
table; the sheet-is-the-page-box decision itself stands.

The columns are deliberately **not** widened to fill the wider text block. Two
306px columns with a 30px gutter are 642px, and `column-count: 2` on a 680.32px
text block would silently lay each column out at 325.16px to fill it, which is a
longer measure than this book is set to and past the 306px width the assignment
marks a full-width element as wide at. The flow is instead pinned to
`calc(306px * 2 + 30px)` and centred, so a column is a whole 306 and the 38.32px
of slack is equal either side. A single-column page (the `columns: 1` opt-out) goes
back to the full text block, because a page that chose one column chose it for the
wider measure.

### The generator owns the breaks

A horizontal rule in a house-rule page is a gold divider and no longer forces a
sheet, and the vestigial print rules were removed from the eight pages, so they
currently author none. The assignment no longer treats `hr` as authored and no
longer splits a sheet merely because it carries one. Automatic breaks come back, and the planner
is still the block-boundary planner ADR-0020 described: a block with no boundary
inside it goes to a sheet whole and prints down both columns, one longer than the
whole sheet spans its pages with nothing cut, and every break the generator
chooses is named in the run's report and recorded in the manifest.

### The manifest gate is a bound

`public/handbook/manifest.json` is regenerated and records 27 sheets and 17
automatic splits. The test that read the manifest used to fail while any split
remained; it now fails when the split count exceeds a named
`MAX_AUTOMATIC_SPLITS` of 30. A moved boundary is the generator's choice and is
not a regression; an edit that multiplies the page count is. The bound sits above
the measured 17 with headroom for a normal content edit and well below the count a
doubled book would reach. The keep-with-next weld, the corrected spanning-band
accounting, the atomic asides and tables, the removed print rules and the fill-first
columns moved boundaries but not the bound: the book is 27 sheets and 17 splits,
with `dnd/injuries` now two sheets and `dnd/master-armor-table` two.

## Consequences

- Good, because the book is 27 sheets where it was 66, under the ticket's bound of
  30, and no sheet spans two printed pages.
- Good, because the type is asserted, not assumed: the root, the body size and
  leading, and each heading step are checked against the one declaration that
  states them.
- Good, because the two interactive tools are hidden by a print-scoped rule rather
  than by editing a component or the website stylesheet, so the screen is exactly
  what it was and the book carries no steppers or buttons.
- Good, because `break-inside: avoid` makes Chrome's column layout the model the
  planner already used, so a paragraph prints in one column rather than straddling
  the gutter, a whole list moves with the heading it belongs to, and an aside or a
  table is never cut in half down the gutter.
- Good, because a heading is welded through its lead-in to the reference block it
  introduces in the planner, not only hinted at with `break-after: avoid`, so a
  boundary the planner chooses can no longer strand a heading - or the lead-in
  line under it - on the sheet before its table.
- Good, because a spanning band is charged below the taller of the two columns, and
  a heading that introduces a full-width table is kept in column one, so the
  `dnd/master-armor-table` headings read down one side instead of one of them
  landing on the right of the band above.
- Good, because `column-fill: auto` fills the first column before the second, which
  is the planner's model and the owner's reading order, and the book came out 27
  sheets rather than the 30 `balance` measured.
- Good, because the manifest still gates staleness on the source hash, and the
  split count is now a bound that cannot be cleared by authoring a rule.
- Neutral, because the artifact is not published yet (ADR-0022); this decision
  affects only the generated book.
- Bad, because `dnd/skills` still splits more than its continuous content requires:
  it carries full-width tables whose bands reset both columns. That is the existing
  block-boundary planner's behaviour, recorded here rather than hidden.

## Links

- [ADR-0020](0020-sheet-box-renderer.md) - the sheet-box renderer and the planner
  this decision keeps
- [ADR-0022](0022-do-not-publish-the-handbook-yet.md) - the artifact is generated
  but not published
- [ADR-0023](0023-sheet-is-page-box.md) - the page box the sheet is
- Issue #434: this decision's ticket
