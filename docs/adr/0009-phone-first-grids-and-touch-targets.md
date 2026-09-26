---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [responsive, touch, css, tailwind, alpine]
---

# ADR-0009: Phone-First Grids and Touch Targets in the Tool Layer

## Context and Problem Statement

The site is read at the table, on whatever phone or laptop someone brought. An audit found the tool layer had been written for a mouse and a wide viewport, and broke in three specific ways on a phone:

1. **The Dice Roller scrolled sideways.** Its ability grid was `grid-cols-3 lg:grid-cols-6`. At a 360px viewport each tile received about 106px, but a tile's floor is its row of four dice (4 x 28px + 3 x 4px gap = 124px) plus 12px padding either side. The content could not fit, so the whole page scrolled horizontally.
2. **Every text control was a 38px target at a 14px font.** Seven controls across the Feat Explorer and Character Search used `py-2 text-sm`, below the 44x44px of WCAG 2.5.8. Separately, iOS Safari zooms the viewport when a focused input's computed font is under 16px, so tapping the character search field magnified the page and pushed the results off screen.
3. **Filter stacks buried the results.** Four stacked full-width controls in the Feat Explorer, three in the Character Search. The user had to scroll past the entire filter apparatus before seeing a single result.

A fourth, lower-severity finding: the Party View's role chips carried `:hover` tints only, spaced 4px apart. `:hover` sticks after a tap on iOS and never fires for a stylus, so touch users got a stale tint and no press feedback.

`DESIGN.md` had recorded the Dice Roller's grid as "3 columns expanding to 6 at `lg`, always with a 16px gap", so the documented system and the phone both had to give.

## Decision Drivers

- The phone is a primary context, not a fallback, and it is the context the site is *read* in
- A horizontal page scroll mid-session is the worst failure mode: the table loses the row they were reading
- 44x44px is a hard accessibility floor, not a preference
- Core functionality must never be hidden on mobile; only chrome may be
- Layout rhythm and the palette are already documented and should not drift
- Near-zero client JavaScript is a product promise

## Decision Outcome

**1. The Dice Roller grid becomes `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4`,** with the die row and tile padding stepping down below `sm` (`w-7 h-7 sm:w-8 sm:h-8`, `p-3 sm:p-4`). Two columns clear a 320px viewport. The 12px base gap is a deliberate departure from the documented 16px, because at two columns on a narrow screen the 4px is what buys the fit.

The `DESIGN.md` layout and inputs sections are updated in the same change. The Card's own ability grid is untouched: it is container-query driven, so it already measures the Card rather than the viewport.

**2. Every text control carries `min-h-11` and `text-base sm:text-sm`.** The height satisfies WCAG 2.5.8. The 16px base font is not cosmetic: it is the threshold below which iOS Safari zooms on focus, and it is the difference between tapping a search field and losing the page.

**3. Surfaces with more than two secondary filters collapse them below `sm`.** The primary search stays visible; the selects sit behind a toggle that badges the active count. The panel is `class="sm:flex! sm:flex-row sm:items-start gap-4"` with `x-show` and `x-cloak`.

The `!` is load-bearing and the absence of `hidden` is load-bearing, in opposite directions. `x-show` reveals by *removing* Alpine's inline `display`, so a class-based `display: none` on the same element wins the moment the toggle is pressed. `sm:flex!` uses Tailwind's important flag to outrank the inline style at `sm` and above; adding `hidden` alongside it silently breaks the button on a phone.

The first implementation shipped `hidden sm:flex!` and the toggle did nothing. A code review caught it, not a test - one of the new tests asserted the exact buggy class string and so passed on broken markup. Both panels now carry a regression test asserting the panel class list contains no `hidden`, plus an inline comment at each call site. The transferable lesson: a source-string assertion is only as good as the string it was written against, and a test drafted from the same reading that produced the bug will not catch it. Write the test against the invariant ("visibility below `sm` comes from `x-show` alone"), not against the markup you happened to write.

**4. Hover tints move inside `@media (hover: hover)`,** with a matching `:active` press inside `@media (hover: none)`, both themes, and chip spacing widening to 8px under `@media (pointer: coarse)`. Gating the rules rather than resetting them afterwards keeps the dark-theme overrides intact, since a later unscoped reset would repaint dark chips with the light resting fill.

### Consequences

- Good, because the page no longer scrolls sideways at any phone width, which was the finding most likely to disrupt a live session
- Good, because the iOS focus-zoom is gone, so the search field is usable one-handed
- Good, because nothing is hidden on mobile: search stays visible and every filter is one tap away
- Good, because pointer media queries now match the input method rather than assuming a mouse
- Neutral, because the Dice Roller shows 2 columns on a phone where the Card shows 3; they are different components with different content floors, and the container-query Card is unaffected
- Neutral, because `text-base` below `sm` makes the filter labels optically larger on a phone; this is the intended trade
- Bad, because the `sm:flex!` plus no-`hidden` combination is easy to reintroduce by accident, and the failure is silent. It is now documented here and in `DESIGN.md`, commented at both call sites, and asserted by a test in each component
- Bad, because a hybrid touchscreen laptop reports `hover: hover` *and* `pointer: coarse`, so it takes the 8px gap but only hover feedback. Pairing `any-hover` with `any-pointer` would cover it; settling that needs a real hybrid device, so it is left and reported rather than guessed at

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (517 tests) and `pnpm build` pass.

No browser automation was available, so **none of this was confirmed by a rendered screenshot or synthesized touch input**. The layout arithmetic, the `sm:flex!` cascade, and the pointer gating are all static reasoning over the stylesheet and the shipped Alpine source. Testing on a real phone at 320px and 390px remains outstanding, and it is the only way to close the last bullet above.

## References

- PR #336: `fix(responsive): adapt four tools for phone grids, touch targets, and coarse pointers`
- `docs/audits/2026-09-26-design-audit.md`: finding P1.5 (touch targets under 44px in every interactive component) and the Responsive design score of 2/4
- WCAG 2.5.8 Target Size (Minimum)
- MDN: `@media (hover)`, `@media (pointer)`
- Tailwind CSS v4: important modifier (`!` suffix)
