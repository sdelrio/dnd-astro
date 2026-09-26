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
Sections 1 to 4 were produced by one command against the built site
(`pnpm build` then `astro preview`, 128 pages). Section 5 was added later, for issue #331, and
drives the same dependency-free CDP stack directly, because the questions there are bounding
boxes and text extents rather than one of the four verdicts `measure` reports. Its figures
were taken against the dev server, which has been valid for measurement since #357 fixed
`node:fs` in the client graph, and every run asserts Alpine booted and no `x-cloak` survived
before reading a box. No figure in either part is computed from a token value, a source string,
or a declaration in a stylesheet.

## What this closes, and what it does not

The ticket this came from closes three questions at the level of **the tooling can now answer
it**. It does not close them at the level of **the underlying defect is fixed**. Two findings
below are open defects this report discovered and did not fix, because fixing them is a
component change with its own ticket. One finding is a limit of the tooling itself. Section 5,
added for #331, is the one part that went on to fix what it measured.

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

The `/dnd-tools/point-buy/` row was first written when that page did not exist (it arrived
in #362), so the 404 it answered with is trivially "clean" and the row proved nothing. It
has been re-measured against the real page, which now renders the calculator and its six
ability cards. It is clean, and this time that is a statement about the page.

The dice roller and the party page were re-measured for #331, after the 44px touch-target
work, and are clean at all four widths.

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

The cause is worth naming, because it is not a missing class but a deliberate one:
`src/styles/tailwind.css` omits Tailwind's preflight so the global reset cannot restyle
Starlight's documentation pages, and preflight is what resets a button's background and border.
Every control that does not declare its own keeps the browser's. The dice roller's per-ability
re-roll was the same defect and is now fixed - see section 5.

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

## 5. The 44px touch targets, measured (issue #331)

#328 raised every interactive control to the WCAG 2.5.8 44px minimum without a browser
available, so three visual consequences were unverified. A resized viewport and a screenshot
verify layout; overlap and layout shift are numeric, so these were measured by reading
bounding boxes out of a rendered page. Where a box could report a line-box edge rather than a
glyph, the text's tight extent was taken from a `Range` over the text node instead, because
that distinction is the difference between "the button touches the name" and "the button
touches the name's side bearing".

One methodological note that changes numbers: emulating `prefers-color-scheme` does **not**
darken this site. `ThemeProvider.astro` reads `localStorage['starlight-theme']` and defaults it
to `'light'`, so a dark run that only sets the media feature silently measures light. Both the
stored preference and `documentElement.dataset.theme` have to be set, as `measure contrast`
already does. Every figure below was taken with both.

### Item 1 - the point-buy layout: passes, unchanged

| Measure | 375 light | 375 dark | 1280 light | 1280 dark |
|---------|-----------|----------|------------|-----------|
| Card height (all six identical) | 206.75px | 206.75px | 206.75px | 206.75px |
| `+`/`-` pair | 44x44 | 44x44 | 44x44 | 44x44 |
| Pair gap | 12px | 12px | 12px | 12px |
| Clear space, pair to card bottom | 17px | 17px | 17px | 17px |
| Clear space, grid to the points-remaining card | 24px | 24px | 24px | 24px |
| Horizontal scroll | none | none | none | none |

The card is taller than a 32px pair made it, and it does not crowd the readout: the score,
modifier and cost stack above the pair, and the "N points remaining" card is a separate block
24px below the grid. The card is 206.75px at both widths, because `grid-cols-1` below `sm` and
`sm:grid-cols-2` above it do not change what is inside a card. Measured on both mounts -
`/dnd-tools/point-buy/` and the guide's calculator - and identical, as the same component
renders both.

### Item 2 - the party filter row: passes

| Measure | 375 light | 375 dark | 1280 light | 1280 dark |
|---------|-----------|----------|------------|-----------|
| Chip height (all six) | 44px | 44px | 44px | 44px |
| Wrap rows | 3 | 3 | 1 | 1 |
| Filter row height | 148px | 148px | 44px | 44px |
| Stat tile to chip row | 16px | 16px | 16px | 16px |
| Chip row to member grid | 49px | 49px | 49px | 49px |
| First member card top | 809px | 809px | 521.39px | 521.39px |
| Horizontal scroll | none | none | none | none |

The ticket expected the wrap to change. It does not, and the reason is worth recording: the
chips wrap by **width**, and the 44px change was to `min-height`, so the widths are unchanged
and so is the wrap. Injecting the pre-#328 `min-height: 22px` and re-measuring gives the same
three rows at 375px.

So the cost is a uniform vertical growth, not a reflow. The filter row goes from 83.5px to
148px, and everything below it moves down by exactly 64.5px: the first member card goes from
744.5px to 809px. Nothing is displaced sideways, nothing re-wraps, and the 16px gap above and
49px gap below are unchanged. Part of that 16px above is #355's deletion of the duplicate role
breakdown row, which is expected.

The audit's recommended fallback - keep the 22px visual, expand the hit area with a
pseudo-element - was also measured, and it produces **the same 83.5px** as the small chip, so
the 64.5px is fully recoverable. It was not applied: at 44px the chips read as comfortable
targets rather than as tall pills with lost 11px text, no overlap, and the growth is uniform
rather than crowding. Whether 64.5px of uniform growth is worth 44px targets is a product
judgement, not a measurement, and the measurements do not argue against it.

### Item 3 - the re-roll button: failed, fixed

This one was real. The re-roll is `absolute top-1 right-1 w-11 h-11`, so its box claims the
tile's top-right 48px including the 4px offset, and the ability name is centred in that same
row. They collide whenever the tile is narrower than the label plus 96px - twice the 48px,
once for each side of a centred box. The widest label is CHA at 41.58px, so the floor is
137.58px.

The ability grid had a `lg:grid-cols-6` step. The container is Starlight's and is **capped at
880px**, verified at 1024, 1280, 1440, 1600, 1920 and 2560 - the cap does not move, so no
wider breakpoint rescues it. Six columns therefore always failed:

| Viewport | Columns | Tile width | Glyph overlap | Clear gap |
|----------|---------|-----------|---------------|-----------|
| 375 | 2 | 165.5px | none | 13.97px - 17.97px |
| 640 | 3 | 192px | none | 27.22px - 31.22px |
| 768 | 3 | 229.33px | none | 45.88px - 49.89px |
| 1024 | 6 | 102px | **13.78px - 17.78px** | 0px |
| 1280 | 6 | 133.33px | **0.3px - 2.13px** | 0px |

At 1024 the button sat across the last glyph of every one of the six names. At 1280 it took a
sliver, 0.3px on WIS and 2.13px on CHA. Five of six tiles intersected at 1280 and all six at
1024. The re-roll also covered 11.5% of the tile's own select button at 1024, so a finger
aimed near the top-right of a tile meant to select it hit re-roll instead.

**The fix is not the audit's pseudo-element fallback, and deliberately so.** Expanding a hit
area with a pseudo-element that reaches left would have put an *invisible* 44px target over the
name, which is worse than a visible one: the visible overlap at least looks broken. The hit
area has to stay out of the name's space, so the tile has to be wide enough. Three columns is
the most that fits the 880px cap:

| Viewport | Columns | Tile width | Glyph overlap | Clear gap | Re-roll share of tile |
|----------|---------|-----------|---------------|-----------|------------------------|
| 375 | 2 | 165.5px | none | 13.97px - 17.97px | 9.1% |
| 1024 | 3 | 220px | none | 41.22px - 45.22px | 6.4% |
| 1280 | 3 | 282.66px | none | 72.55px - 76.55px | 5% |

The 44px minimum is untouched; the re-roll is still `w-11 h-11`. What changed is the tile
count, so the button no longer lands on the name. A padding reservation was rejected: at a
102px tile it needs 36px of right padding and then clears by 0.2px, which is not a margin, it
is a coincidence that breaks if the display face's metrics move by two pixels.

**A second defect on the same control, found while measuring it.** Preflight is off, so the
button painted the browser's default form fill *and* border - a grey rounded box, which is what
made the overlap visible in a screenshot. Sampled:

| `button[aria-label^="Re-roll"]` | Light | Dark |
|--------------------------------|-------|------|
| Before | **4.44:1, fails AA** on `rgb(239,239,239)` | **2.12:1, fails AA** on `rgb(107,107,107)` |
| After | 5.11:1, AA on `rgb(255,255,255)` | 7.09:1, AAA on `rgb(27,23,22)` |

This is the same root cause as the open Filters-button finding above, and the same fix
(`bg-transparent border-0`).

### The two unverified details from the same PR

**The 14% `color-mix` tint is exactly a 14% alpha blend.** Checked by computing the blend and
comparing it with what Chrome resolved, per surface, in both themes. Chrome reports
`color-mix(in srgb, ...)` as an opaque `color(srgb r g b)` with **0-1 components, not bytes** -
comparing those against a byte blend without scaling is a false mismatch, which is how this
looks wrong if you do not scale first. Scaled and rounded, the delta is **0, 0, 0** on every
tinted surface in both themes:

| Surface | Hue | Rendered | Expected at 14% |
|---------|-----|----------|-----------------|
| `.r3-role-pill`, `.r3-chip.is-active` light | `#a06e00` over white | `rgb(242,235,219)` | `rgb(242,235,219)` |
| `.r3-role-pill`, `.r3-chip.is-active` dark | `#d99a2b` over `#2e2421` | `rgb(70,53,34)` | `rgb(70,53,34)` |
| `.r3-chip-all.is-active` light | `#2a2010` over white | `rgb(225,224,222)` | `rgb(225,224,222)` |
| `.r3-chip-all.is-active` dark | `#f1eceb` over `#2e2421` | `rgb(73,64,61)` | `rgb(73,64,61)` |

**The role chip colours, sampled from rendered pixels, pass in both themes.** The audit had
computed these from declared token values; these are read off the rendered paint, with the
background resolved by the ancestor walk:

| Selector | Light | Dark | Grade |
|----------|-------|------|-------|
| `.r3-chip.is-active` (11px) | 12.13:1 | 8.61:1 | AAA both |
| `.r3-role-pill` (12px) | 6.06:1 | 6.53:1 | AA both |
| `.r3-count` (10px bold) | 10.17:1 | 6.02:1 | AAA / AA |

The resting chip was measured too, by toggling "All" off first, since the default all-selected
state never renders one: `#605552` on `#ffffff` light, `#c7c0be` on `#2e2421` dark.

### The screen-reader outline: the reported problem does not reproduce

The ticket expected the six ability `<h3>`s to leave the document outline, because they are
inside a `<button>` whose name comes from its `aria-label`. CDP's own accessibility tree says
otherwise - `Accessibility.getFullAXTree` reports all six as `role: heading` with
`ignored: false`, alongside `h1 Dice Roller` and `h3 Stats`:

```
h1 Dice Roller   ignored=false
h3 Stats         ignored=false
h3 STR           ignored=false
h3 DEX           ignored=false
h3 CON           ignored=false
h3 INT           ignored=false
h3 WIS           ignored=false
h3 CHA           ignored=false
```

So the headings are exposed. That is a statement about Chrome's computed tree, which is what
feeds a screen reader on Chrome - it is **not** a screen-reader pass, and it does not cover how
a name and a heading inside one button are announced in sequence, which is the part a reader
would actually notice. A real pass with VoiceOver or NVDA is still worth its own ticket; this
does not substitute for one, it only removes the specific claim that the headings are gone.

## What the tooling settles, and what still needs a real device

**Settled by measurement, against the built site:**

- No page scrolls horizontally at 320, 360, 390 or 640 on any tool page.
- The collapsed mobile filter panels in the feat explorer and character search open on a real
  synthesized touch tap, at every width below `sm`, and the `sm:flex!` cascade behaves at `sm`.
- The hover tint is gated on `hover: hover`; the press tint is ungated; the chip spacing follows
  the coarse pointer. All three read off the rendered paint, not off the stylesheet.
- The 44px touch targets do not overlap what they sit next to, at 375px or 1280px, in either
  theme. The party chips grow the filter row by a uniform 64.5px without re-wrapping it, and the
  point-buy card has 17px below the `+`/`-` pair and 24px to the readout.
- The dice roller's re-roll button no longer lands on an ability name, and no longer paints the
  default form control.

**Answered, but with a defect found and not fixed:**

- The Filters disclosure button renders below AA in both themes, because it has no declared
  background and paints the browser's default form fill. The dice roller's re-roll was the same
  defect and is now fixed; this one is still open.
- A `.char-meta` line on a character card runs about 17px past a 320px viewport, clipped by an
  ancestor.

**Corrected since first written:**

- The `/dnd-tools/point-buy/` overflow row was measured against a 404 and proved nothing. It is
  now measured against the real page, and is clean.

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
