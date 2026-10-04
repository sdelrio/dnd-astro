---
status: accepted
date: 2026-10-04
supersedes: null
superseded_by: null
tags: [print, pdf, layout, handbook, geometry]
---

# ADR-0023: The Sheet Is the Page Box

## Context and Problem Statement

ADR-0020 renders the Handbook as sheet boxes printed through the screen-media
cascade, and it put the page geometry in the `@page` rule: A4 with a 25mm top and
left and 15mm right and bottom margin. The sheet box was the *printable area*
those margins left, 643 x 972 CSS px, and the page box around it was 794 x 1123.

That geometry produced a defect visible on every page of the generated PDF:
Chrome does not paint a root element's propagated background into the `@page`
margins, so the parchment stopped at the printable area and every page carried
four white bands. The artifact was a page with a picture in the middle of it, not
a sheet of paper.

The workaround of painting each *sheet* rather than the root does not hold
either: the margins are outside the sheet, so the paper would still stop at the
printable area and the problem would merely move.

## Decision Drivers

- A reader holds a page, not a printable area. The paper has to reach the page's
  edge on all four sides, or the artifact is not a page.
- The white bands are a property of where the margins are declared, so the fix
  has to move the margins rather than work around them.
- The text block is settled: two 306px columns with a 30px gutter, inset 25mm top
  and left and 15mm right and bottom. This decision changes where the furniture
  sits, not how much text a sheet holds.
- A capture and the PDF must remain the same rendering of the same DOM.
- A sheet a fraction *over* the page box paginates a second, near-empty page,
  which is a defect a reader finds; a sheet a fraction *under* it costs nothing.

## Considered Options

- **Keep the `@page` margins and paint the paper some other way.** Rejected. The
  margins are outside every element the document can reach, so nothing the
  stylesheet paints can cover them. Working around the geometry is not possible.
- **Split every page into two boxes, a paper box and a content box, both inside
  the page.** Rejected as a second geometry: two boxes that can disagree about
  where the text is, when one box with padding states it once.
- **Set `@page { margin: 0 }` and make the sheet the page box, with the margins as
  the sheet's own padding.** Chosen.

## Decision Outcome

**The `@page` rule declares no margin and the sheet box is the page box. The
25mm top and left and 15mm right and bottom insets are the sheet's own padding,
the paper is painted on the root so it reaches every edge, and the footer prints
inside the bottom margin band.**

### Geometry

Stated once, in `src/styles/handbook-print.css`, as the numbers every later
ticket inherits:

| Property | Value |
|----------|-------|
| `@page` | A4 portrait, margin 0 |
| Page box, and therefore the sheet box | 793.7 x 1122.51 CSS px |
| Sheet padding | 25mm top and left, 15mm right and bottom (94.49/56.69 CSS px) |
| Text block | The page box less the padding: 642.52 x 971.33 CSS px |
| Columns (default) | 2, each 306px, 30px gutter |

The page box is declared a hair *under* A4 rather than rounded up. This reverses
the round-up rule ADR-0020 gave and its reason: a sheet a fraction over the page
box paginates a second, near-empty page, and a sheet a fraction under it costs
nothing. A4 at the CSS reference resolution is 793.7008 x 1122.5197px, and each
side is truncated to two decimals - 793.70 x 1122.51 - so both are genuinely
under, where rounding to two decimals would put the height 0.0003px over.

### The footer

The footer is absolutely positioned and inset by the left and right margins, so
it lines up with the text block, and it sits at the foot of the page box, inside the
bottom margin band. It is no longer inside the text block, so the flow reserves
no space for it: the previous 34px reserve is gone and every sheet has that 34px
of text back. No rule can print under it, because it is not in the flow, and no
`break` rule can sit over it, because it is not in the flow either.

### The captures

The capture is the page box, unchanged at 1588 x 2246 at a raster scale of 2. The
command no longer offsets the body by the left margin and no longer extends the
root by the bottom margin: the sheet is the page box and one translation puts any
sheet on the first page box, and the root's propagated paper covers the whole
captured page box. The viewport the screen layout is measured at stays the text
block, not the page box, so the media queries content is laid out against do not
change; the sheet's padding, not the viewport, is what holds the text off the
paper's edge.

### Amends ADR-0020

ADR-0020's Geometry section said the sheet box is the printable area and the
margins live in the page box and nowhere in the document. That clause is amended
here: the margins now live in the document as the sheet's padding and nowhere in
the page box. The rest of ADR-0020 stands: the sheet is still a `min-height` box
with a break after it, the route still ships no JavaScript, the browser still
does not enter the build, and the PNG and the PDF are still one rendering.

## Consequences

- Good, because every page of the PDF is paper to all four edges, which is what a
  page is. Verified by rasterising page 1 and sampling a pixel inside the top-left
  25mm margin: paper, not white.
- Good, because the geometry is still stated once. Every length is a custom
  property on `:root`, and a test fails on a length anywhere else.
- Good, because the text block is unchanged, so no rule moved and the page count
  is unchanged by this decision alone.
- Good, because a sheet a fraction under the page box cannot paginate a second
  page, where the previous round-up rule could.
- Bad, because the footer can no longer sit under a rule: there is no rule in the
  margin band, and the flow has no room reserved for it. A page whose content is
  exactly the text block tall now ends at the foot of the text, with the footer in
  the band below it rather than in the flow.
- Neutral, because the sheet is a fractional number of pixels where it used to be
  whole: the captures and the viewport read the page box through `ceil`, and the
  laid-out sheet width is compared against the declared width after the same
  rounding.

## Links

- [ADR-0020](0020-sheet-box-renderer.md) - the sheet-box renderer this decision
  amends, and the source of the round-up rule it reverses
- [ADR-0012](0012-dependency-free-cdp-capture-client.md) - the browser stack and
  capture client this command reuses
- Issue #433: this decision's ticket
