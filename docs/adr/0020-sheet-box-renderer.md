---
status: accepted
date: 2026-10-03
supersedes: null
superseded_by: null
tags: [print, pdf, layout, browser, dev-time, cdp]
---

# ADR-0020: Render the Handbook with a Sheet Box, Not With Print CSS

## Context and Problem Statement

The project wants a printed handbook: the eight `dnd/` house-rule pages as one A4
document, committed to the site so a reader can download it. Producing it needs a
real browser, because the only renderer that already knows how to produce the
project's fonts, colours and spacing is the browser this site is built to be
looked at in.

Every decision that has been made about browser-driven tooling in this repository
says the same thing: a headless browser may be used by an agent at development
time, and may not enter the build.

- **ADR-0007** fixes diagram rendering on `astro-mermaid`, chosen precisely so no
  headless browser is needed to build the site.
- **ADR-0011** puts the browser behind a pinned local MCP server and keeps it out
  of the manifest entirely. Its acceptance condition is that
  `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` comes back empty.
- **ADR-0012** then owns the design-review captures with a dependency-free CDP
  client, and forbids two things explicitly: a second browser stack, and a second
  dev-server lifecycle. The capture client, the browser-resolution order, the font
  gate and the `--start-dev-server` boundary are each one copy.

So the handbook needs a browser, and three accepted ADRs collectively mean the
browser cannot be a dependency, cannot be duplicated and cannot start its own
server. What is left is the interesting part: the artifact has to be produced by
the tooling that already exists, and it has to be produced by the *same* render the
tooling already performs, or the PNG evidence and the PDF are two opinions about
the same page.

There is a second constraint that makes the obvious approaches unusable. Three
accepted ADRs leave no room for a second browser stack, and a print stylesheet
written for print media is not an answer to the layout question anyway: it is a
second description of the design, in a second cascade layer, that can disagree with
the first without anything failing.

## Decision Drivers

- Three accepted ADRs stay intact. No browser enters the build, and no browser
  stack or dev-server lifecycle is duplicated.
- The PNG evidence and the PDF are the same rendering. A screenshot that
  corroborates a layout is only evidence if it was taken of that layout.
- Page geometry is stated in numbers and read back out of the written file, not
  assumed from the fact that the command exited zero.
- The site's own fonts, colours and styling are what gets printed. The handbook
  must not be a second design.
- Nothing renders client-side JavaScript into the artifact. The shipped route is
  inert and the generator injects only what it needs, at document start.
- The display font is genuinely loaded or nothing is written. This is ADR-0012's
  refusal, not a warning.

## Considered Options

- **Add a PDF library to the manifest and render server-side.** Rejected. It is a
  runtime dependency in a project whose tech-stack list is a binding document, and
  it produces a *different* rendering from the site: a library has its own idea of
  line breaking, font metrics and tables, none of them the ones DESIGN.md was
  written against. It would also be the first thing in this repository that puts
  a third-party renderer on the critical path of producing something a reader
  holds.
- **Reuse ADR-0012's capture client as-is and ask it for a PDF.** Rejected,
  because the client captures at exact device-pixel widths for on-screen review
  and the handbook needs page geometry. Overloading it would put two incompatible
  geometry models in one client, and the width-ownership rules ADR-0012 wrote down
  are load-bearing for the captures. The *browser stack* is shared; the command
  is not.
- **Let the reader print the page from their own browser.** Rejected. It is the
  cheapest option by an order of magnitude and it is not the product. The reader
  gets no cover, no contents, no page numbers, no two-column sheets and no
  parchment, and the site is not the artifact. It also hands the reader the
  problem this feature exists to solve.
- **Author the handbook as a second source of truth, hand-built for print.**
  Rejected. The house rules change, the handbook would not, and nothing would say
  so. The staleness this avoids by construction is the staleness the manifest in
  the follow-up ticket exists to detect, and detection is a better property than
  two documents that can drift.
- **A sheet box in the page, printed through the screen-media cascade.** Chosen.

## Decision Outcome

**The handbook is rendered by one page route that lays its content out into
sheet boxes, and printed by extending ADR-0012's browser stack with a new
command that drives it. The route is emitted through the screen-media cascade;
page geometry comes from explicit boxes and a break after each, not from print
media.**

This started `proposed` because the pagination assumption was unproven, and it is
now `accepted` because the spike ran and is recorded below. The spike answered
its question in the affirmative and also broke one clause of the mechanism, which
is why the sheet box is a `min-height` box rather than a fixed-height one.

### Geometry

Stated once, in one place, as the numbers every later ticket inherits:

| Property | Value |
|----------|-------|
| Page | A4, 210 x 297mm |
| Margins | 25mm top and left, 15mm right and bottom |
| Sheet box | 643 x 972 CSS px |
| Columns (default) | 2, each 306px, 30px gutter |

The sheet box is the exact size of the page content area: A4 less the margins is
642.5 x 971.3 CSS px, rounded up to whole pixels, because a sheet one pixel short
would clip the last line of a rule.

It is a `min-height` box with a break after it, and the spike is why that is not
written as `height`. A page boundary is still a property of the DOM rather than a
hope about the renderer, and a source page that fits is still exactly one page. A
source page that does not fit spans the pages it needs; splitting it into named
sheets is the later ticket's job.

### The spike, and what it measured

The question this decision rested on was narrow:

> Do page-size and break rules still paginate when the page is emulated as screen
> media rather than print media?

**Yes.** The two-sheet fixture at `/handbook/spike-fixture/` printed two pages,
one per sheet, read back out of the written file: PDF magic `%PDF-1.4`, a `%%EOF`
trailer, two `/Type /Page` objects, a `/Count 2` page tree, and a page box of
`[0 0 594.95996 841.91998]` - A4 as Chrome writes it. The sheet boxes measured
643 x 972 CSS px in the rendered page, which is A4 less the margins rounded up.
The forced break after each sheet paginated, the trailing break was suppressed on
the last sheet, and no blank page appeared at the end. Screen-media emulation
loses nothing that print media was providing, so Starlight's print stylesheet is
never in play and the cascade ordering it would have made load-bearing is not.

The colour question the spike existed to protect is settled by measurement too.
Under screen emulation the site stylesheet's own ramp is what is on the page:
`--sl-color-gray-6` computes to `#f1eceb`, the bark step, and not to the
`hsl(224, 20%, 94%)` Starlight's print stylesheet would have declared.

**What the spike broke.** The decision as proposed said the sheet box would be a
fixed-height box. It is not, because a fixed height does not paginate its own
overflow, and the failure is silent and out of order. Measured on a two-sheet
fixture where the first source page was 3122px and the second 86px: the first
sheet's content past its box landed on the pages after it, but the *second*
sheet's box was placed at the end of the first one's border box, so the second
sheet printed in the middle of the first one's spill. Paragraph 43, then sheet
two's heading, then paragraph 44. Both sheets were in the file and neither was
readable.

`min-height` fixes it and costs the mechanism nothing: a source page that fits is
still exactly one page, and one that does not fit spans the pages it needs with
the next source page still starting on a fresh sheet. The mechanism is rewritten
here rather than patched because it was wrong in its central claim, which is what
`proposed` status was for.

**What else the spike measured, and the ticket recorded:**

- The print fragmentainer holds 972 CSS px of document per page plus a fraction.
  A fixture of exactly 1944px printed two pages; the same fixture one pixel taller
  printed three. The page count a run checks is therefore a floor and a ceiling
  rather than an exact total: the floor is one page per source page, which is what
  catches a lost or shared sheet, and the ceiling is the arithmetic of the measured
  extents, which catches a document that grew.
- Chrome writes A4 as 594.96 x 841.92pt, which is 0.32pt off the exact 595.28 x
  841.89. The validator's one-point tolerance is what lets a correct file pass, and
  the measured value is in the test rather than the nominal one.
- The display face is a variable font, so Chrome writes it as a Type3 font whose
  glyphs are vector procedures with a `ToUnicode` map. The body face is a
  `CIDFontType2` with an embedded `FontFile2`. Text is selectable and searchable in
  both: the headings and the body of the fixture both extract as their own words.
- The dev toolbar hides itself with `@media print`, which screen-media emulation
  does not apply, so the print stylesheet hides it outright.

### What is settled regardless of the spike

These do not depend on the answer, and they are the parts that keep the three
accepted ADRs intact:

- **The generator reuses ADR-0012's stack.** One browser session, one
  browser-resolution order (the `DESIGN_REVIEW_CHROME` override, then a Puppeteer
  cache, then an installed browser, and never a download), one font gate, one
  `--start-dev-server` boundary. A command that grew its own copy of any of those
  is the defect ADR-0012 exists to prevent, and the manifest diff is the check.
- **The route ships no client-side JavaScript.** The sheet-assignment logic is
  injected at runtime by the command, through the same document-start mechanism
  the capture command already uses to seed the theme before first paint. The
  committed route is inert HTML; the artifact is not a page that runs code a
  reader could run.
- **The font gate is a refusal, not a warning.** If the display face is not
  genuinely loaded, the command exits non-zero, names the font and where it comes
  from, and writes nothing. [ADR-0019](0019-self-host-cinzel.md) is what makes
  this gate meaningful rather than a coin flip.
- **The dev server is not a second lifecycle.** With no server answering, the
  command fails and prints the documented `astro dev --background` command.
  Starting one is an explicit opt-in flag that shells out to that same command.
- **Every written file is staged and renamed, and read back.** A file that is
  absent, empty, truncated or the wrong length is a failure, not a warning, and
  validation covers the PDF magic, the end-of-file trailer, the page box and the
  real page count rather than trusting that the write landed.
- **The PNG and the PDF come from the same stylesheet and the same DOM.** One
  stylesheet serves both, which is what makes a PNG evidence about the PDF rather
  than a second opinion. The later per-sheet PNGs are a corollary of this and
  nothing else.

### What the spike result settled

Recorded above: the route is emitted as screen media, not print media, and the
cascade ordering between Starlight's stylesheet and the site's own is not
load-bearing in a second place. The sheet box is a `min-height` box. The page
count is checked as bounds, not as an exact total.

## Consequences

- Good, because the browser never enters the build and no dependency is added.
  `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` stays empty, which
  is the check ADR-0011 already sets and which this decision passes by
  construction rather than by discipline.
- Good, because the PNG evidence and the PDF cannot disagree about layout. One
  stylesheet and one DOM means a screenshot is a statement about the artifact, not
  a lookalike.
- Good, because page boundaries are authored rather than discovered. A sheet box
  is in the DOM, so "where does this page end" has an answer that a diff can
  review.
- Good, because the handbook is a rendering of the house rules rather than a second
  statement of them. A rule edited on the site and regenerated reaches the artifact,
  and the manifest is what makes a missed regeneration fail.
- Good, because the spike found the one clause of this mechanism that was wrong
  before a single house rule was printed into the artifact. A fixed-height sheet
  box prints the following sheet inside the previous sheet's overflow, and nothing
  about that is visible in the file's structure: both sheets are in the PDF and the
  page count is plausible.
- Bad, because the exact page count cannot be predicted from the page's own
  geometry, so the check is a floor and a ceiling. The print fragmentainer's
  capacity is fractional and a print layout can be a little shorter than its screen
  measurement, so a run knows how many pages there must be and how many there can
  be, and not the number in between. The split report replaces that with exact
  per-sheet counts.
- Bad, because the artifact is a committed binary in a repository that is
  otherwise text. That is the deliberate trade: a downloadable handbook has to be
  in the tree for the publisher page to link to something stable, and the
  manifest is what keeps it honest.
- Bad, because emulating print geometry without print media is a trick with sharp
  edges. Break behaviour, page-size behaviour and `@page` are three related
  features and this decision uses them in a way none of them was designed for.
- Bad, because a fixed sheet box is a rigid layout primitive. A wide table has to
  span both columns or it is clipped, and a source page that does not fit is split
  at the nearest block boundary. Neither is free, and both are answered in later
  tickets rather than here.
- Neutral, because ADR-0012's client gains a sibling command rather than a mode.
  The stack is shared; the geometry model is not, and conflating them would have
  damaged the capture path that already works.
- Neutral, because ADR-0007, ADR-0011 and ADR-0012 are unchanged and none of their
  decisions is amended. This ADR lives beside them, not above them.

## Links

- [ADR-0007](0007-mermaid-rendering-strategy.md) - the first decision to keep a headless browser out of the build, and still binding
- [ADR-0011](0011-headless-browser-mcp-server.md) - the manifest boundary and the browser boundary this decision keeps intact
- [ADR-0012](0012-dependency-free-cdp-capture-client.md) - the client, browser-resolution order, font gate and dev-server boundary this decision reuses rather than duplicates
- [ADR-0019](0019-self-host-cinzel.md) - the deterministic display face the font gate depends on
- Issue #420: this decision's spike, the generator command and the print route
- `src/pages/handbook/spike-fixture.astro`: the two-sheet fixture the spike ran
  against, kept as the regression that the mechanism still paginates