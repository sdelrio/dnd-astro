---
title: Rendered Verification Report - 2026-09-26
date: 2026-09-26
type: report
scope: the ADR-0009 checks that were outstanding, measured against a rendered page
command: node .opencode/lib/design-review/measure.mjs
---

# Rendered Verification Report - 2026-09-26

ADR-0009 closed with a paragraph admitting what had not been checked:

> No browser automation was available, so **none of this was confirmed by a rendered
> screenshot or synthesized touch input**. The layout arithmetic, the `sm:flex!` cascade,
> and the pointer gating are all static reasoning over the stylesheet and the shipped Alpine
> source. Testing on a real phone at 320px and 390px remains outstanding.

This report records what that tooling can now answer, what it answered, and what it cannot.
Everything below was produced by one command against the built site
(`pnpm build` then `astro preview`, 128 pages). No figure here is computed from a token
value, a source string, or a declaration in a stylesheet.

## What this closes, and what it does not

The ticket this came from closes three questions at the level of **the tooling can now answer
it**. It does not close them at the level of **the underlying defect is fixed**. Two findings
below are open defects this report discovered and did not fix, because fixing them is a
component change with its own ticket. One finding is a limit of the tooling itself.

## The command

```
node .opencode/lib/design-review/measure.mjs <overflow|contrast|tap|pointer> [options]
make measure ARGS='overflow --url http://localhost:4321/dnd-tools/dice-roller/'
```

It shares ADR-0012's browser stack rather than building a second one: the same CDP client, the
same browser resolution order (env override, cached Chrome for Testing, installed browser,
never a download), the same dev-server boundary, and the same font-readiness gate. It adds
nothing to `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml`
(`git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` is empty), so ADR-0007 and
ADR-0011 still hold.

The arithmetic that decides each verdict - colour parsing, alpha compositing, the ancestor
background walk, the WCAG ratio, selector pathing, overflow arithmetic, the tap and pointer
verdicts - is in `measure-helpers.mjs` and unit tested with no browser at all
(96 tests in that directory, 52 of them for the measurement helpers).

## 1. Horizontal overflow at the tool-layer widths

Default widths are ADR-0009's own: 320, 360, 390, 640.

| Page | 320 | 360 | 390 | 640 |
|------|-----|-----|-----|-----|
| `/dnd-tools/feat-explorer/` | clean | clean | clean | clean |
| `/fantasy-grounds/character-search/` | clean | clean | clean | clean |
| `/fantasy-grounds/current-party/` | clean | clean | clean | clean |
| `/dnd-tools/dice-roller/` | clean | clean | clean | clean |
| `/dnd-tools/point-buy/` | clean | clean | clean | clean |
| `/fantasy-grounds/characters/abbath/` | **one element past the edge** | clean | clean | clean |

No page scrolls horizontally at any measured width. The Dice Roller ability grid - the defect
that started this - does not overflow at 320 or 360.

**One open finding, on a character card at 320px:**

```
320px  clean    no horizontal scroll (viewport 320)
        offender body > … > header.char-header > div.char-id > p.char-meta > span
        - right edge 337.1875, 83.03125px wide, 17.2px past the 320px viewport
        (the page does not scroll, but these are wider than the viewport; something is clipping them)
```

The `.char-meta` line on a character card runs about 17px past a 320px viewport. An ancestor
clips it, so the reader never gets a sideways scroll - which is why it has gone unnoticed -
but the tail of that line is cut off at the narrowest width the site claims to support. This is
a defect to fix in `XmlCard.astro`, not a defect in the measurement. It is reported here rather
than fixed because this ticket is about the questions, not the answers' consequences.

**The detector is not blind.** A synthetic three-column grid of 200px columns, dropped into the
site for one run, was reported correctly at 320px: `body > main > div.grid > div:nth-child(3)`
with a right edge of 632. A clean report from a detector that cannot fail is not a clean report.

## 2. Measured contrast, both themes

Sampled from rendered computed colours, with the effective background resolved by walking
ancestors and compositing alpha. Default selector set: the two findings the last audit flagged
as provisional, the card's own text, and the tool layer's interactive affordances.

### The two provisional findings from the 2026-09-26 design audit

| Finding | Audit figure (from declared tokens) | Measured light | Measured dark | Verdict |
|---------|--------------------------------------|----------------|---------------|---------|
| P1.1 role chips (`party-roster.ts`) | 1.80:1 - 4.01:1 light, 2.79:1 - 3.73:1 dark, **fails AA** | **12.13:1** (`rgb(42,32,16)` on `rgb(225,224,222)`) | **8.61:1** (`rgb(241,236,235)` on `rgb(73,64,61)`) | **The provisional finding does not reproduce.** The role hue is no longer the text colour; the chips now pass AAA in both themes. The audit's numbers described the palette as it was then, and that palette has been replaced. |
| P1.2 HP micro-label (`.char-hp-label`, 9px) | 3.40:1, **fails AA** | **7.20:1** (`rgb(96,85,82)` on `rgb(255,255,255)`) | **9.92:1** (`rgb(199,192,190)` on `rgb(27,23,22)`) | **The provisional finding does not reproduce.** The label is now bark-600, the value the audit itself recommended, and it passes AAA. |

`.char-hp-temp` could not be measured: no character in the site's data has temporary HP, so the
element is not rendered. The command reports it as *not rendered* rather than passing it.

A note on what the compositing did and did not do. Chrome resolves the role chip's
`color-mix(in srgb, var(--role-light) 14%, #fff)` to an opaque `color(srgb ...)` before the
measurement ever sees it, so on this site the alpha-compositing path in
`resolveEffectiveBackground` is exercised by the unit tests rather than by a live measurement.
The parser reads the `color(srgb ...)` form as well as `rgb()`, `rgba()` and hex, because a
parser that skipped it would report a tinted chip as resting.

### Everything else measured

| Selector | Page | Light | Dark | Grade |
|----------|------|-------|------|-------|
| `input[type="text"]` (16.8px) | feat explorer, char search | 17.79:1 | 17.79:1 | AAA |
| `select` (16px) | tool pages | 10.92:1 | 8.42:1 | AAA |
| `.sl-markdown-content p` (16px) | party | 7.20:1 | 4.85:1 | AAA / AA |
| `.char-name` (21.6px) | character card | 12.56:1 | 4.67:1 | AAA / AA |
| `.char-hp-value` (21.6px bold) | character card | 13.54:1 | 5.50:1 | AAA / AA large |
| `.char-meta` (13px) | character card | 6.68:1 | 8.42:1 | AA / AAA |
| `button[aria-controls="feat-filter-panel"]` (16px) | feat explorer | **4.44:1** | **2.12:1** | **fails AA in both** |

**One open finding, on the Filters disclosure button.** The button declares no background, so
it paints Chrome's default form-control fill: `rgb(239,239,239)` in light and `rgb(107,107,107)`
in dark. Against the accent text that is 4.44:1 in light - just under the 4.5:1 floor - and
2.12:1 in dark. The same applies to the character search's Filters button, which uses the same
class list. This is a defect in the two components, not in the measurement, and it is the reason
`measure contrast` exits non-zero.

## 3. A synthesized touch tap

`Input.dispatchTouchEvent`, entering the browser the way a finger does rather than calling
`element.click()`. Reported per tap: computed display, visibility, `aria-expanded`, and the
class delta.

| Page | 320 | 360 | 390 | 640 |
|------|-----|-----|-----|-----|
| Feat explorer, `#feat-filter-panel` | opens | opens | opens | no toggle rendered, panel already shown |
| Character search, `#char-filter-panel` | opens | opens | opens | no toggle rendered, panel already shown |

A representative run at 390px:

```
before      display none, visibility visible, aria-expanded null
after       display block, visibility visible, aria-expanded null
classes     unchanged
control     aria-expanded false -> true, display flex -> none
result      the tap opened the panel [passes]
```

**This is the answer to the question ADR-0009 could only reason about.** The `sm:flex!` plus
no-`hidden` combination works: the panel's inline `display: none` is removed on tap, the toggle
disappears, and `aria-expanded` flips. The class list does not change, which is correct - the
reveal is Alpine removing its own inline style, not a class being added.

At 640 there is no toggle to tap, and that is the design working: `sm:hidden` takes the button
away and `sm:flex!` keeps the panel in a row. The command distinguishes that from a dead
disclosure rather than reporting both as "no change", and it is the difference that makes a
green run at 640 mean something.

## 4. Pointer and press feedback

The three-way split of ADR-0009's decision 4, measured by driving real mouse and touch input
through CDP and reading the paint while each state is held. The run first presses the "All"
chip to put the chips in their resting state, because a selected chip paints its own background
from a later rule at the same specificity and the tints are invisible on it.

| Check | Result |
|-------|--------|
| The two emulable device profiles report the pointer features they should | **settled, passes** |
| The hover tint applies under `hover: hover` and not under `hover: none` | **settled, passes** (tinted on the mouse profile, untinted on the phone profile) |
| A press tints the chip, gated or not | **settled, passes** on both emulable profiles |
| The chip spacing follows a coarse pointer (8px vs 4px) | **settled, passes** |
| A *held touch* puts the chip into `:active` | **not settled** - this browser does not match `:active` for a held synthesized touch, so the finger-side press is unobservable here |
| The hybrid profile (`hover: hover` **and** `any-pointer: coarse`) | **not settled** - Chrome replaces the primary pointer when touch emulation is enabled, so no flag combination reports both |

## What the tooling settles, and what still needs a real device

**Settled by measurement, against the built site:**

- No page scrolls horizontally at 320, 360, 390 or 640 on any tool page.
- The collapsed mobile filter panels in the feat explorer and character search open on a real
  synthesized touch tap, at every width below `sm`, and the `sm:flex!` cascade behaves at `sm`.
- The hover tint is gated on `hover: hover`; the press tint is ungated; the chip spacing follows
  the coarse pointer. All three read off the rendered paint, not off the stylesheet.

**Answered, but with a defect found and not fixed:**

- The Filters disclosure button renders below AA in both themes, because it has no declared
  background and paints the browser's default form fill.
- A `.char-meta` line on a character card runs about 17px past a 320px viewport, clipped by an
  ancestor.

**Still needs real hardware, and this tooling does not pretend otherwise:**

- **How a real device reports `hover`, `pointer` and `any-pointer`.** The two profiles measured
  here are profiles a browser was *told* to report. The hybrid case - the one ADR-0009's
  reasoning was specifically written for - cannot be emulated at all, and remains the ADR's
  own static argument plus its mutation-checked tests.
- **Whether a finger sees the press tint.** A held synthesized touch does not put the element
  into `:active` in this browser, so the press feedback was measured through a held mouse press
  only.
- **The iOS focus-zoom on the search field.** `text-base` below `sm` renders 16.8px here, which
  is the threshold in the ADR's reasoning. Whether Safari zooms is a fact about Safari.
- **Real rendering, real input timing, real safe areas.** A resized viewport is not a phone. A
  synthesized tap is not a finger. The 320px measurement is a 320px-wide viewport in a headless
  browser, not a small phone in someone's hand.

## Two limits of the tooling, recorded so they are not rediscovered

1. **Measure the built site, not the dev server.** Under `astro dev`, Vite externalises
   `node:fs` for the browser, `src/alpine.ts` pulls in a module that imports it, the page module
   throws on evaluation, and Alpine never boots. Nothing logs an error a reader would see,
   `x-cloak` is never removed, and every `x-show` element stays `display: none`. A measurement
   taken in that state is not wrong-looking, it is wrong. The command now refuses in that state
   and says why; use `pnpm build && astro preview` and point `--url` at the preview server.
2. **The font gate does not apply to contrast, and says so when it runs.** A contrast ratio is a
   relationship between two colours and the face that draws the glyphs does not change it, so
   refusing to measure contrast because a font CDN is slow would be theatre. The overflow and tap
   runs *are* gated, because layout measured in the fallback face is a real number about a page
   nobody is going to ship.

A third, smaller finding from building this: the shared font probe used to read the `FontFace`
list before asking the browser to use the family, so any page that did not happen to render
Cinzel reported every face as `unloaded` and the gate refused a page that was perfectly fine.
The probe now requests the face first. The gate is stricter, not weaker: it still fails when the
CDN is blocked, which `--simulate-font-cdn-outage` exercises.
