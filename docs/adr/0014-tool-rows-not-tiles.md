---
status: accepted
date: 2026-09-27
supersedes: null
superseded_by: null
amends: 0009
tags: [responsive, touch, css, astro, tools, ledger]
---

# ADR-0014: Tool Abilities Are Ruled Rows, Not Tiles

## Context and Problem Statement

[ADR-0009](0009-phone-first-grids-and-touch-targets.md) found that the Dice Roller scrolled
sideways on a phone, and Decision 1 fixed it by changing the ability **grid** to
`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`. The `lg:grid-cols-6` step was later amended away when
the re-roll moved into a 44x44px box in the tile's corner. The grid survived anyway, as
`grid-cols-2 sm:grid-cols-3`, and it kept costing the same arithmetic on every subsequent change.

A grid of tiles makes the **viewport** decide how many abilities fit. Every breakpoint is a
negotiation between a tile's content floor and the width available, and the content floor is
whatever the tile currently holds: a name, four dice, a score, a modifier and a control. Raising
the dice from 1.5rem to 1.75rem moved that floor. Giving the dice a tray with padding and a border
moved it again. Adding a full ability name moved it a third time. Each time, the fix is another
breakpoint argument, and the argument has to be re-derived from a measurement taken by hand.

The sibling tool, Point Buy, never took this path. Its abilities are six ruled lines on one
column at every width, and it is the same shape the Dice Roller now is.

The intent of ADR-0009 was never the grid. It was that a phone must not scroll sideways and that
every target must clear 44x44px. Both still hold. Only the mechanism is wrong.

## Decision Drivers

- A row's width is the content column's, and the content column is already capped at 55rem
- A tile's content floor is a moving target; a row's columns each have a stable floor
- Six numbers do not benefit from being arranged in a grid. They benefit from sharing a baseline
- 44x44px is a hard floor, per ADR-0009, and is unaffected by this decision
- A horizontal page scroll mid-session is the worst failure mode, per ADR-0009
- Near-zero client JavaScript is a product promise, so a layout that needs no breakpoint observer
  is strictly cheaper

## Decision Outcome

**1. The Dice Roller lays out one ability per row at every viewport width.** Three tracks -
`minmax(0, 1fr)` for the identity, a fixed track for the score plate, a fixed 2.75rem track for
the re-roll - and no `grid-cols-` utility anywhere in the markup. A phone-width screen cannot put
two rows side by side, which is true by structure rather than by a breakpoint kept in step by hand.

**2. The identity track carries a dotted leader out to the dice tray.** This is the load-bearing
part, and it exists because of the width rather than as ornament. The content column runs to about
880px; a row holds a name, a sum, a modifier, four dice and a button. With the name left-packed and
the tray hard against the score, roughly 600px of bare panel sat between a row's subject and its own
evidence and the line fell apart into two unrelated objects. The leader is Point Buy's, and reusing
it is what makes the two tools the same object by construction rather than by resemblance.

**3. Below 40rem the identity track stacks and the leader is removed.** The name and its arithmetic
stop sharing a line with the tray; there is no slack left for a leader to fill, and a dotted rule
pinned beside a stacked block is a stray mark.

**4. The row floor is asserted, not the breakpoint.** A test reads the plate width, the re-roll
width, the row gap, the panel padding, the die size, the tray padding and the trade handle's
`min-width` out of the stylesheet and checks the narrowest row against a 320px viewport. This is
the assertion that has to survive the *next* content change, and it survives it because it
recomputes rather than pinning a number.

### What is superseded

**ADR-0009 Decision 1 is superseded by this ADR.** Everything else in ADR-0009 - the 44x44px and
16px font floors, the filter collapse, the pointer-feature rules, the Card's container-query grid -
is unchanged and remains binding.

### What is explicitly not superseded

The *problem* ADR-0009 recorded. The Dice Roller still must not scroll sideways at 320px, and every
control on it must still clear 44x44px. The test in point 4 exists to hold the first, and the
re-roll's own test holds the second. An ADR that fixes a symptom by deleting the record of the
symptom is how the same bug gets reintroduced in a year.

## Consequences

- Good, because the next content change - bigger dice, a longer name, a fifth column - costs one
  edit to a `--dr-*` token and no new breakpoint argument.
- Good, because the Dice Roller and Point Buy are now the same object: one ruled leaf, one head
  construction, one leader, one set of themed custom properties.
- Good, because a row list needs no `matchMedia`, no resize observer and no layout JavaScript, which
  the product's near-zero-JS promise prefers.
- Neutral, because the tile grid is still the right shape for the Party View's party cards. Those
  are cards of people, not lines of a sheet, and their content floor is a portrait. This decision is
  scoped to the two D&D tool panels.
- Bad, because ADR-0009's Decision 1 now reads as a live instruction in a document whose status is
  `accepted`. This ADR amends it explicitly, and ADR-0009 carries a pointer here, but a reader who
  opens only 0009 will still find a grid prescribed for a component that has no grid. The
  alternative - marking 0009 `superseded` - would have been worse, because the touch-target floors in
  its other three decisions are still binding and are the more important half of it.
