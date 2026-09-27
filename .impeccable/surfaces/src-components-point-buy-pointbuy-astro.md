---
version: 1
slug: "src-components-point-buy-pointbuy-astro"
primary_target: "src/components/point-buy/PointBuy.astro"
related_targets: ["src/content/docs/dnd-tools/point-buy.mdx"]
---

---
name: Point Buy
primary_target: src/components/point-buy/PointBuy.astro
related_targets:
  - src/content/docs/dnd-tools/point-buy.mdx
  - src/components/point-buy/point-buy-utils.ts
visitor_mode: Operate
---

# Point Buy

## Scope and visitor mode

Operate. A 27-point budget spent across six ability scores, at the table, on a
phone more often than not. One page, one job, no navigation to get lost in.

## Audience, job, proof, constraints

- **Audience:** the campaign's players and DM, mid-session and between sessions.
- **Job:** allocate the pool and read back the modifier each score buys.
- **Action:** press a stepper; the sheet re-sums and the next price updates.
- **Proof:** the real 5e cost table maths, run live. No invented numbers.
- **Constraints:** Alpine island only (PRODUCT.md promises near-zero JS);
  44x44px targets and a 16px input floor (ADR-0009); the noscript notice text is
  kept verbatim; existing per-ability score, modifier and cost line all stay.
- **Added, with the user's approval:** running modifier total, points spent, and
  three preset spreads (Standard Array, Striker, Sage). Each preset is pinned to
  exactly 27 points by a test.
- **Added, with the user's approval:** the two-press score trade. Tap a name, tap
  another, and the two abilities' scores are exchanged. Chosen over reordering
  the rows when the user was asked which they meant: the regret a player acts on
  is "the 15 should be on Dexterity", not "Charisma should be printed third".

## Chosen direction and memorable moment

Surface-scope roll `c9162763` dealt three grounded structures; the Ledger Leaf
led. **Memorable moment:** the dotted leader. Each ability name runs a ledger
leader out to its figure, so a spread reads as a written sum rather than six
tiles - and the line is what makes the cost column scannable on a phone. It is
the one part of the direction that survived both revisions untouched, and it is
the reason the tool does not read as a widget.

## Unresolved decisions

- None outstanding. The physical-object question was raised and then **reversed**
  on the user's instruction; see Outcome.

## Direction contract

**THESIS.** The tool is a page of the campaign grimoire, not a calculator widget.
It refuses the six-identical-tiles arrangement, which is what every point-buy
widget on the internet ships, in favour of one ruled leaf whose six lines share a
baseline, a leader and a cost column - so a spread reads as a written sum.

**OWN-WORLD.** The grimoire's own binding, in the tokens already committed. This
was **revised**: the first build added a private material vocabulary for this one
tool - parchment sheet, leather desk, brass fittings, a wax seal - on the
reasoning that a physical object should not invert with the site theme. The
current contract is the reverse, and it is the system's own: the panel is the
Tools panel's material (Bark 100 / Bark 800, a 1px Gold Rule border, the 3px
Oxblood-to-Gold-Leaf cap), Cinzel for every figure and heading, Bookinsanity for
prose, ScalySans for every micro-label and cost. No new palette value, no new
face, and no palette value that exists only for this component.

**STORY.** The visitor understands that this is the campaign's own sheet, spends
the pool a point at a time, watches the purse and the running modifier fall, and
ends with a spread they can read straight off the page and copy onto a character.

**FIRST VIEWPORT.** The head, built as the character Card's header: a printed
title in Cinzel at 1.35rem/600 in the theme's heading ink, an uppercase ScalySans
meta line beneath it, and a **2px gold rule closing the head at its lower edge** -
the same construction, the same two type steps, and the same gold the Card header
uses, so the tool and the Cards are recognisably the same object. The rule is the
reason for the shape rather than decoration: a head banded only by a dotted
leader reads as another row of the sheet, and a head closed by a rule at its own
lower edge reads as a heading over what it heads. The band that sat here through
Revision 3 was rejected for exactly that reason; see Outcome. Directly under it
the ruled leaf begins: a micro-label head row (Ability / Mod / Cost), then six
lines, each a Cinzel name, a dotted leader running to the right, the score at the
Title step, the modifier on a flat chip in the neutral ramp, the cost line, and
two 44px outline steppers. Below 46rem the line breaks after the name and the
figures run beneath it, still one entry.

**THE FOOT.** Three identical entries in one row - `Modifier total`, `Spent`, and
`Points left` - each a Micro Label and a figure at the Headline step, in the same
treatment as its neighbours. The purse is a peer, not a headline: no leader, no
step up, no separate block. When the pool empties the label reads `POOL SPENT`.

**FORM.** Structure 1 of 7 on the ranked grounded list, dealt lead by roll
`c9162763` (surface scope, operate). The Ledger Leaf.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Outcome

**Revision 5 (current) - the purse flattened into the foot.** On the user's
instruction the purse stopped being a treatment and became the third item: the
same `<p>`, the same Micro Label, the same figure step, in the same flex row as
`Modifier total` and `Spent`, with no wrapper of its own. The dotted leader that
reached it and the step up are deleted, and the muted figure on an empty pool
goes with them - the label already reads `POOL SPENT`, which is the whole of
that signal. Setting the remainder apart was the third attempt in a row to make
this one number govern the surface, and the first two (the masthead, the band)
were rejected for exactly that.

**Revision 4 - head reshaped to the Card Heading, purse moved to the foot.** Two
changes on the user's instruction, both reversing Revision 3.

*The head.* The band's own argument - that the head should read as the leaf's
first line rather than as something above it - was wrong, and the user named the
right replacement: the character Card header. A 1.35rem Cinzel title over an
uppercase ScalySans meta line, closed by a **2px gold rule at the head's lower
edge**. The rule is what makes it work, and it is the opposite device to the band:
a dotted leader groups the head's contents with the rows, while a rule at the
head's own bottom edge separates the head from them. Three rejected heads had
each spent vertical space on the premise that a title sits above a sheet; this
one spends none, because the rule already says which is which. It also makes the
tool and the Cards the same object by construction rather than by resemblance.

*The purse.* Moved out of the head and into the foot, beside `SPENT`. It had been
in the head for two revisions and both times read as a headline rather than as the
state of the sheet. In the foot it is the third of three figures that answer the
only three questions asked of a spread - how strong, how much, how much is left.
It is `POINTS LEFT` rather than `POINTS`, which names it as a remainder, and
`POOL SPENT` when the pool empties. Revision 5 took the treatment away from it as
well.

**Revision 3 - head rebuilt as a band, trade added.** Live mode, session
`187ffb28`. Four heads were generated on four different primary axes - hierarchy
(purse governs, figure at the Display step), layout topology (the head becomes
the leaf's first ruled entry, with the purse on a leader), typographic system
(title up to the Card Heading step, purse demoted to a printed ScalySans data
pair), and density (one band, everything on one baseline). **Variant 4, the band,
was accepted** and carbonized into `.pb-band*`.

The three rejected heads are worth recording, because each failed the same way:
they all treated the head as something *above* the sheet rather than as part of
it. A bigger purse is louder, not clearer; a head with its own ruled entry is a
seventh row; a bigger title only makes the ratio between head and leaf worse. The
band won because it is the only one that spends no vertical space on the
premise that the head is a masthead.

The trade is a two-press exchange, and three decisions inside it are load-bearing:

- **It exchanges, it does not reorder.** `tradeScores` moves both values, so the
  spend and the modifier total are unchanged by construction and the exchange
  cannot overspend. A decrease-then-increase detour can.
- **A held score is dropped when the sheet moves.** A stepper press, a preset or
  a reset clears `picked`, because the pickup was taken against a different sheet
  and a trade the player never saw the result of is worse than no trade.
- **The target set is the hairline rule, not the gold rule.** The full-strength
  outline was visible in dark on all five unpressed names and read as five boxes,
  which is a louder page than the one DESIGN.md's Don'ts already rejected twice.

`:class` is not observable in the test harness (`src/test-utils/alpine-dom.ts`
says so), so the pick's live behaviour is asserted at runtime through
`aria-pressed` and the `pb-swapping` binding is asserted on the source. A
synthesized touch tap confirms the class arrives, but `make measure tap` reports
`fails` on this control because it judges display, visibility and `aria-expanded`
and a trade handle is not a disclosure. That verdict is about the tool's pass
criterion, not about the tap.

FINISH discharged: reviewed in both themes at 1440 and 390; every real text ratio
measures 4.67:1 or better in both themes (the band title is unchanged ink at
4.67:1 in dark); no width in ADR-0009's set scrolls sideways; the six handles all
measure 44px tall at both widths.

**Revision 2.** The user rejected the finished first build on two
counts, and both were correct:

1. *It looked the same in light and dark.* The paper was deliberately held fixed
   across themes, so the panel and its heading came out identical in both modes -
   the exact thing a theme toggle exists to prevent. The lesson is worth more
   than the fix: an argument for realism is not an argument against inversion. A
   sheet of paper *depicts* something; a tool surface *is* one.
2. *It drew too much attention compared with the rest of the page.* A leather
   desk wrapped around the panel, a dark headband under a 2px gilt edge, a framed
   brass plate for the points figure, and a gradient disc on every modifier were
   each a separate claim on attention, and the tool's actual job is six numbers.

Rebuilt on the Tools panel's own material - `.rb-panel` in the rulebook index is
the reference - with the private material vocabulary (`sheet`, `desk`, `brass`,
`wax`, `fitted`, `gold-rule-dark`'s old sheet role) deleted from `tailwind.css`,
DESIGN.md's palette, and the sidecar rather than left behind as tokens nothing
paints. Noise removed: the second surface, the frame, the gradients, the ring,
the wax seal, and the shadow on the inner book. Kept: the ledger grammar, which
is the good part - the dotted leader, the shared baseline, the cost column, the
44px targets.

**Revision 1 (superseded).** Built code-led. The finish review returned `fix` on
two rows sharing one root cause - the desk was covered by the book, so the sheet
read as a tan panel rather than parchment on leather. That was a real defect and
the fix worked, but it was fixing the wrong weight: the review was repairing an
object that should not have been there at that size.

Findings worth carrying forward, now pinned by tests:

- Starlight's `.sl-markdown-content :is(h1..h6)` is 0-1-1 in light and 0-2-1
  in dark, so any heading inside a themed surface loses to a single utility
  class - and the dark-theme row labels measured 2.32:1. Use paragraphs for
  printed titles and row labels.
- The pool-pinning test caught a real bug in the first draft of the Sage
  preset: it cost 25, not 27. Worth keeping the whole
  "every preset costs exactly the pool" assertion.
- **A fixed value inside a themed component is a bug, not a stance.** The first
  build pinned ~10 custom properties to one theme and documented why in DESIGN.md
  at length. The test that now catches it is structural rather than a value
  check: every `--pb-*` property declared in the light block must be re-declared
  in the dark block. A future property added to one block and forgotten in the
  other fails the suite without anyone having to remember the rule.

FINISH discharged: reviewed in both themes at 1440 and 390; DESIGN.md and the
`.impeccable/design.json` sidecar both carry the Ledger Panel. Every real text
ratio measures 4.67:1 or better in both themes, and no width in ADR-0009's set
scrolls sideways. No rasters shipped, so there is no provenance to record.
