---
name: D&D Companion
description: A golden-forest grimoire for a homebrew 5e campaign - warm bark neutrals, sap-amber accents, inscriptional headings.
colors:
  sap: "#f7860f"
  sap-low: "#293400"
  sap-light: "#d1dfa5"
  sage: "#697066"
  sage-deep: "#394036"
  sage-light: "#b9c0b6"
  oxblood: "#58180d"
  gold: "#c68000"
  gold-rule: "#c9ad6a"
  gold-rule-dark: "#867347"
  parchment: "#d4c4a8"
  ink: "#2a2010"
  surface-white: "#ffffff"
  bark-black: "#1b1716"
  bark-800: "#2e2421"
  bark-700: "#3f3632"
  bark-650: "#4a403a"
  bark-600: "#605552"
  bark-500: "#948985"
  bark-500-lift: "#9a908c"
  bark-400: "#c7c0be"
  bark-200: "#f1eceb"
  bark-100: "#f8f6f5"
  moss-800: "#363b17"
  moss-700: "#404521"
  moss-100: "#e8ede1"
  stripe-odd-a: "#dfe4d1"
  stripe-odd-b: "#d5dcc6"
  aside-caution-fill: "#faf0dc"
  aside-caution-fill-dark: "#46331d"
  aside-danger-fill: "#f7ebe6"
  aside-danger-fill-dark: "#3d1f18"
  gold-deep: "#b06f00"
typography:
  display:
    fontFamily: "Cinzel, Bookinsanity, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.2
  headline:
    fontFamily: "Cinzel, Bookinsanity, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.3
  title:
    fontFamily: "Cinzel, Bookinsanity, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Bookinsanity, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  table:
    fontFamily: "ScalySans, Bookinsanity, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
  card-heading:
    fontFamily: "Cinzel, Bookinsanity, Georgia, serif"
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.01em"
  card-meta:
    fontFamily: "ScalySans, Bookinsanity, Georgia, serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.04em"
  label:
    fontFamily: "Bookinsanity, Georgia, serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  micro-label:
    fontFamily: "ScalySans, Bookinsanity, Georgia, serif"
    fontSize: "0.5625rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  micro-value:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 400
  pill:
    fontFamily: "ScalySans, Bookinsanity, Georgia, serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  metric:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
rounded:
  sm: "4px"
  tile: "7px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-contrast}"
    textColor: "var(--sl-color-text-invert)"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-high}"
    textColor: "var(--sl-color-text-invert)"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.sap}"
    rounded: "{rounded.lg}"
    size: "32px"
  card:
    backgroundColor: "{colors.bark-100}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-header:
    backgroundColor: "{colors.bark-100}"
    padding: "16px 20px"
  card-header-dark:
    backgroundColor: "{colors.bark-800}"
    padding: "16px 20px"
  card-hp-plate:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.tile}"
    padding: "8px 14px"
  card-hp-plate-dark:
    backgroundColor: "{colors.bark-black}"
    rounded: "{rounded.tile}"
    padding: "8px 14px"
  stat-tile:
    backgroundColor: "{colors.bark-200}"
    rounded: "{rounded.tile}"
    padding: "8px"
  tool-panel:
    backgroundColor: "{colors.bark-100}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  tool-panel-list:
    backgroundColor: "{colors.bark-100}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px 28px"
  tool-panel-list-dark:
    backgroundColor: "{colors.bark-800}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "24px 28px"
  tool-panel-dark:
    backgroundColor: "{colors.bark-800}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "16px"
  tag:
    backgroundColor: "{colors.bark-200}"
    textColor: "{colors.bark-600}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.bark-100}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
---

# Design System: D&D Companion

## Overview

**Creative North Star: "The Golden Forest Grimoire"**

D&D Companion reads as a campaign grimoire kept in a golden forest: warm bark-brown neutrals for surfaces, an amber sap accent that glows like resin, oxblood and gold-leaf headings, and mossy green stripes running through data tables. It is warm, curious, and handcrafted - closer to a shared notebook carried between sessions than to a product dashboard. The mood is set by the three D&D-inflected webfaces: Cinzel's inscriptional capitals for headings, Bookinsanity for prose, and ScalySans for tables and stat blocks.

The system is deliberately lifted and tactile. Cards sit on soft ambient shadows and rise slightly on hover; stat tiles wear a 3px accent cap like stamped leather; ability scores are cut into arch-topped plates. Nothing floats in a void - every panel feels placed on a table. Density is high but legible: the character Card is built for scanning mid-session, with compact grids, uppercase micro-labels, and monospaced numbers for anything you might add up.

The implementation still has a seam between two layers, now uneven. The Starlight documentation layer uses the warm bark/moss palette throughout, and the character Card heading has joined it - Cinzel name, gold rule, warm surfaces, correct dark-theme inversion. The Card *body* has since joined it: the `gray` scale is redefined onto the bark ramp in `@theme`, so the vitals and ability tiles, the tag chips, and the tool-page focus rings are all warm. The heading remains the reference implementation.

**Key Characteristics:**
- Warm bark neutrals and an amber "sap" accent; oxblood (light) and gold (dark) for headings.
- Inscriptional Cinzel headings over a readable serif body; ScalySans for tabular data.
- Lifted, tactile surfaces: ambient card shadows, hover lift, 3px accent caps, arch-topped tiles.
- High-density stat blocks with uppercase micro-labels and monospaced numerals.
- A single warm palette intended to unify docs and interactive islands.

## Colors

The palette is a forest floor: warm bark browns, resin amber, and moss, with oxblood and gold leaf reserved for headings and markers.

### Primary
- **Sap Amber** (#f7860f): The one interactive accent in the default (dark) theme. Primary buttons, active selection rings, and emphasis. It is the color of resin catching light - keep it for actions and highlights, not surfaces.
- **Sap Light** (#d1dfa5): Pale chlorophyll green, used as the primary button's hover fill and as the selected-state ring.
- **Sap Low** (#293400): A deep olive that anchors accent tints; used for subtle selected backgrounds.

### Secondary
- **Sage** (#697066): The light-theme accent - a muted forest gray-green for buttons and outlines when the grimoire is opened in daylight.
- **Sage Deep** (#394036): Sage's text-strength partner for hover and high-contrast accent text.
- **Accent Contrast** (`--sl-color-accent-contrast`): The only accent step painted behind text - Sap Amber `#f7860f` in dark, a deep moss `#3f4a3a` in light. It exists because the label colour is `--sl-color-text-invert`, which Shoelace resolves to `--sl-color-accent-low` and **not** to white: on the accent itself that pairing reaches 5.28:1 in dark but only 2.74:1 in light. The step is separate rather than a repaint of the accent because the accent also drives borders, focus rings and highlights. See [#329](https://github.com/sdelrio/dnd-astro/issues/329).

### Tertiary
- **Oxblood** (#58180d): Light-theme heading ink and the 3px cap on stat tiles. A dried-blood brown-red; the grimoire's ink.
- **Gold Leaf** (#c68000): Dark-theme heading color and the proficiency marker; also the top cap on stat tiles in dark mode.
- **Gold Rule** (#c9ad6a): The 2px underline beneath section headings (h2) and the 2px bottom rule of the character card header, plus the pill border, in light mode; aged gold rather than bright.
- **Gold Rule Dark** (#867347): The dark-mode counterpart of the same rule - muted so it does not glare against a dark surface.

### Neutral
- **Bark** (#1b1716 - #f8f6f5): The warm neutral ramp, dark to light - `bark-black #1b1716`, `bark-800 #2e2421`, `bark-700 #3f3632`, `bark-600 #605552`, `bark-500 #948985`, `bark-400 #c7c0be`, `bark-200 #f1eceb`, `bark-100 #f8f6f5`. Note the theme inversion: Starlight re-points these tokens per mode, so the same step name can be a surface or a text color depending on `[data-theme]`.
- **Bark 650** (#4a403a): A dark-only hairline between bark-700 and bark-600. It is the border color for every dark-theme element inside the character card heading - the pill outline and the HP plate edge - where a pure bark-700 line disappears against bark-800.
- **Parchment** (#d4c4a8): Dark-mode body text and dark-theme pill text - warm and paper-like, never pure white.
- **Ink** (#2a2010): Light-mode body text - a dark warm brown, never pure black.
- **Surface White** (#ffffff): The one true white in the system. It is a light-theme surface only (the HP plate), never text and never a dark-theme surface. Named explicitly so its scarcity stays meaningful.
- **Moss** (#404521, #363b17, #e8ede1): The olive greens behind striped table rows in dark mode, with a pale sage stripe (`moss-100`) in light mode. Light mode's odd row is not one flat fill but a two-stop gradient across the row - `#dfe4d1` at 2% to `#d5dcc6` at 98% - so the stripe fades out at both edges instead of stopping like a band; the even row is flat `moss-100`. Both pairs are warmed from what were cool stripes, and [ADR-0005](docs/adr/0005-table-row-striping-pattern.md) fixes the pattern rather than the hues.
- **Aside fills** (`#faf0dc` / `#46331d` caution, `#f7ebe6` / `#3d1f18` danger): The only two off-ramp tints in the system, and they are tinted surfaces rather than palette steps - a pale gold and a pale oxblood in light, a deep amber and a deep oxblood in dark. The note and tip asides need none: their light fills are Bark 100 and `moss-100`, already on the ramp.
- **Gold Deep** (#b06f00): One step below Gold Leaf, and it exists for one reason. The Dice Roller's swap confirm button sits exactly on the 3:1 shape boundary against the light panel, so there is no headroom to lighten it on hover - a lighter gold drops the button to 2.26:1 and its edge disappears. The hover darkens to this value instead, which holds every bar in both themes rather than only at rest.
- **Bark 500, lifted** (#9a908c): The same step as Tailwind's `--color-bark-500` and `--color-gray-400`, raised off #948985 to clear 4.5:1 on the dark Card surface. It is a second value for one name, and the reason is that the two systems disagree about what `bark-500` is: the docs shell's `--sl-color-gray-3` is #948985, tuned for the light surface, and the Tailwind alias of the same name is the lifted step. Reach for the lifted one on a dark surface and the docs one on a light one; a lifted `bark-500` on white lands near 2.9:1, which is why the rulebook's folios take Bark 600 instead.

### Utility tokens
`src/styles/tailwind.css` exposes the palette as Tailwind theme tokens so call
sites name intent rather than a hex. `bark-*`, `moss-*`, `gold`, `gold-rule`,
`oxblood`, `ink`, `parchment` and `sage*` mirror the values above.

The `gray` scale is **redefined onto the bark ramp** rather than left as
Tailwind's cool default. The Card body and every tool input were written against
`gray-*` - 259 call sites across eleven steps, 175 of them `text-gray-*`, in the
58 non-test files under `src/` - and a find-and-replace would have to be redone
every time the palette moved. Redefining the scale in
`@theme` warms all of them from one place, so the palette is now changeable in
one file. The step *numbers* keep Tailwind's meaning - 50 lightest, 950 darkest -
so `text-gray-900` on a light surface and `dark:text-gray-100` on a dark one
behave as before. New code should prefer the named tokens.

All eleven steps Tailwind ships are redefined. `@theme` merges rather than
replaces, so a step left undefined silently keeps its cool built-in - which is
what `gray-950` did until it was pinned.

Scope: this reaches further than the character viewer. Starlight's own components
use 32 `gray-*` utilities, so the documentation chrome warms too. That is
intended - the docs shell is already on the bark ramp via `--sl-color-gray-*` -
and no Starlight step crosses a WCAG threshold in either direction. Omitting
preflight keeps the *reset* off the docs pages; it is not what contains this
change.

`gray-200`, `gray-300`, `gray-500` and `gray-950` are interpolated and have no
DESIGN.md counterpart; the rest are literal palette values, with `gray-400` the
one exception that is a *lifted* named step rather than an invented one.
`gray-500` in
particular is balanced rather than pure: no single mid-tone can clear 4.5:1
against both a white surface and a near-black one, so on the surfaces it is
actually used with:

| | `gray-50` (light) | `gray-900` (dark) |
|---|---|---|
| Tailwind `#6b7280` | 4.49:1 | 3.68:1 |
| this system `#786d6a` | 4.65:1 | 3.55:1 |

Neither theme regresses, and the light surface - where `gray-500` is
overwhelmingly used - is above AA. Every `text-gray-N` call site carries a `dark:`
counterpart (re-verified at this refresh: all 175 sites, the single line without
one being a comment that quotes the class), so each step only has to
clear the theme it appears in.

`src/styles/tailwind.test.ts` pins all eleven values, the derived-step comments,
the admonition pairings and the stripe stops, so the mapping cannot drift
silently.

### Named Rules
**The Warm-Only Rule.** No cool blue-gray, electric purple, or cyan enters the system. Neutrals are warm browns. The `gray` scale is now bark, the tool-input focus rings and the feat-tier seals are on the moss/gold/oxblood ramps, and the admonition palette has been pulled onto the bark/moss/gold/oxblood ramps. There is no remaining named drift; `tailwind.test.ts` fails on any cool utility class or blue-dominant hex in a component or page, and the Feat Explorer's own surface test additionally fails on *any* hex, warm or not, because that surface is not permitted a private value at all. Admonitions set both `--sl-color-asides-border` and `--sl-color-asides-text-accent`; Starlight's own defaults for both are cool.

**Specificity over order for third-party overrides.** Starlight declares
`--sl-color-asides-text-accent` on the same bare class our rules target, later in
its stylesheet. At equal specificity the later declaration wins, so an override
there is silently dead. The light admonition rules therefore carry a `:root`
prefix to outrank it - the dark rules were already specific enough via
`:root[data-theme='dark']`. Asserted in `tailwind.test.ts`.

**The Rarity Rule.** Sap Amber is an action and emphasis color, used on well under a tenth of any screen. Gold Leaf and Oxblood belong to headings and markers, not to large fills.

**The Themed-Surface Rule.** A tool surface is a themed surface, made of the ramps
the rest of the system already uses. Every value is a custom property declared
once and re-declared under the dark theme selector, so nothing holds one value
across both modes. Point Buy's first build kept its paper the same parchment in
light and dark, on the reasoning that a physical object should not invert; the
result was a panel and a heading that looked identical in both modes and
outweighed the page around them. Do not exempt a surface from the theme because
it depicts something. A sheet of paper *depicts* something; a tool surface *is*
one.

A surface may name a **material** - leather, parchment, brass - as long as the
material is themed with the rest of the system and its inks come off the
existing ramps. What the Point Buy build actually got wrong was a material that
was *unthemed*, and that is the half the rule forbids. Naming a material is not
permission to name *values*: a surface that paints its own hexes is a second
palette wearing the first palette's clothes, and it does not sit beside the tool
panels - it argues with them. **Reach a tint with `color-mix()` over a shared
token.** That is the idiom, it is what the Ledger Panel already does for its
hairline rule, and it is what a tint is for - a tint, not a surface. The Feat
Codex Panel took it further than that and is now the Ledger Panel's own material
with a larger job: it kept its name and lost the parchment, the mottle, the
spine and the ribbon, because a tool surface that has to *argue* for its
material is a surface that has already lost. See the Feat Codex Panel below.

## Typography

**Display Font:** Cinzel (with Bookinsanity, Georgia, serif)
**Body Font:** Bookinsanity (with Georgia, serif)
**Table Font:** ScalySans (with Bookinsanity, Georgia, serif)
**Component Font:** System UI sans (Tailwind `font-sans`), used inside dense interactive islands only.

**Character:** A scholar's grimoire: Cinzel's carved capitals announce sections the way a title page does, Bookinsanity keeps long rules text warm and readable, and ScalySans gives tables and stat blocks the compact authority of a printed D&D statblock. The system sans in the interactive cards is the odd one out - tolerated for density, but not part of the world.

### Hierarchy
- **Display** (500, 1.75rem/28px, line-height 1.2): h2 section headings, underlined with a 2px Gold Rule border in light mode and a muted 2px gold in dark.
- **Headline** (500, 1.5rem/24px): h3 subsection headings; deliberately lighter in weight than Starlight's default.
- **Title** (400, 1.25rem/20px): h4 and card names; regular weight so density stays calm.
- **Body** (400, 1rem, line-height 1.75): Rules prose in Bookinsanity, max content width 55rem on wide screens (from 72rem up).
- **Table** (400, 1rem): All markdown tables and statblock tables in ScalySans, with transparent headers and striped rows.
- **Card Heading** (600, 1.35rem, letter-spacing 0.01em, line-height 1.15): The character name in Cinzel, the single largest type on a Card. It is the only place the display face appears inside a component. It is **single-line and truncates with an ellipsis**, the same three declarations the meta line uses, so the header keeps its shape at any card width. This reverses an earlier decision that let the name wrap: a long name in a two-column roster gains a second line, which read worse than losing its tail. The tradeoff is accepted - the tail is lost to the ellipsis - and the full name stays reachable from the name's hover `title` and from the character page the portrait links to.
- **Card Meta** (400, 0.8125rem, letter-spacing 0.04em, uppercase, line-height 1.4): Race, class, and subclass in ScalySans, tracked out and set small so the Cinzel name keeps the top of the hierarchy.
- **Label** (500, 0.75rem, letter-spacing 0.05em, uppercase): Micro-labels above stat values in the documentation layer.
- **Section Label** (600, 0.7rem/11.2px, letter-spacing 0.08em, uppercase): The heading of every card section, on the gold rule. One step above **Pill** and the largest of the card ramp's small steps, because a section heading has to out-rank the values it labels. It is one class, `sectionHeadingClass`, at every display mode - see *Card sections*.
- **Micro Label** (600, 0.5625rem/9px, letter-spacing 0.08em, uppercase): The card-scale label, as small as the design goes. Used for "Hit Points" on the plate; **Micro Value** (400, 0.625rem/10px) covers secondary values and statblock legends, and **Pill** (500, 0.6875rem/11px, letter-spacing 0.04em, uppercase) covers tags and role chips. Together 9/10/11/11.2px are the card ramp, distinct from the documentation layer's 12px Label. The step ships as a `@utility micro-label` in `src/styles/tailwind.css` rather than as a repeated class string, so it is one value and a later change to it moves every call site at once; the family is the `--sl-font-table` token, so a call site names intent rather than a font stack. An earlier draft shipped it at 700 and 0.1em, inventing a second value for a documented step while claiming in its own comment to *be* the step - the detector, which reads this ramp, is what caught it.
- **Metric** (700, 1.125rem-1.5rem): Numeric values in stat tiles and metric cards, monospaced (`font-mono`) when they are read as data (saves, skills, attack bonuses). The card's HP value is ScalySans at 1.35rem with tabular numerals rather than the sans stack.

### Named Rules
**The Two-Family Rule.** Cinzel only ever sets headings and card titles; it never sets body text, labels, or numbers. If it is a sentence, it is Bookinsanity; if it is a table, it is ScalySans.

**The One-Voice Heading Rule.** A Card heading is a closed three-part stack - Cinzel name, ScalySans meta, outlined pills - in the warm bark and gold scheme in *both* themes. Do not reintroduce the system sans stack or Tailwind's cool `gray-*` scale into it; the heading is the reference for how the rest of the Card should migrate.

## Layout

The documentation shell is Starlight's sidebar-plus-content layout, with content capped at 55rem from the 72rem breakpoint up. Interactive tool pages and Cards use a single-column-safe responsive grid: 1 column on mobile, 2 from `sm`, 3 from `lg`, with a 16px gap (`gap-4`). Character Cards are container-query driven (`@container`), folding from one column to two at `@6xl` and `@7xl` when the Card itself is wide enough, independent of viewport. The two D&D tools are the exceptions, and they are exceptions for the same reason: they are **ruled rows, not tiles**. A tile has to be wide enough for its content at every viewport, whereas a row's width is the content column's and its columns can hold a name, a figure and a 44px control at any width. The Dice Roller is one ability per row, always, at every width - the name and its arithmetic on the left, a **dotted leader** out to the dice tray, the score plate, then the 44px re-roll - and it is legible at 320px without a single breakpoint because there is nothing to reflow. [ADR-0009](docs/adr/0009-phone-first-grids-and-touch-targets.md) decided the grid for a Dice Roller that has since become a row list; see [ADR-0014](docs/adr/0014-tool-rows-not-tiles.md) for what replaced it. Point Buy is the same shape, one ability per line, and the two are the same object by construction rather than by resemblance.

Spacing follows a 4/8/16/24 rhythm: 4px inside tight grids (`gap-1`), 8px between paired items (`gap-2`, `p-2`), 16px inside cards (`p-4`) and between blocks (`space-y-4`), 24px between major sections (`space-y-6`, `p-6`). Ability scores inside a Card sit in a 3-column grid that expands to 6 at the `lg` *container* width, which measures the Card rather than the viewport and so is already phone-safe; the Dice Roller's ability grid is the viewport-driven one and follows [ADR-0009](docs/adr/0009-phone-first-grids-and-touch-targets.md). Party stat summaries use a 2-column grid that expands to 5 at `md`.
## Elevation & Depth

The system is lifted and tactile. Surfaces are raised on soft ambient shadows at rest and lift further on interaction - cards use Tailwind `shadow-sm` and rise to `shadow-md` on hover, filter chips take `shadow-md` when active. Structure is reinforced by a 3px accent cap on top of stat tiles and a 45% arch radius on ability tiles, so a tile reads as physical even before its shadow lands. Admonitions carry a deeper, softer shadow (`0 0.25em 1.25em -0.5em rgba(0,0,0,0.5)`) that eases over 400ms.

### Shadow Vocabulary
- **card-rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): default card and input resting state.
- **card-hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): hover on interactive cards and active chips.
- **aside** (`box-shadow: 0 0.25em 1.25em -0.5em rgba(0, 0, 0, 0.5)`): the advisory callout ribbon, transitioning over 400ms.

### Named Rules
**The Lifted-Not-Floating Rule.** Every raised surface still reads as sitting on the page: shadows stay soft and low, and a tile's accent cap or border does the structural work. No hard drop shadows, no glassmorphism, no blur.

## Shapes

Corners are gently rounded and occasionally arched. Cards, buttons, inputs, and buttons use an 8px radius (`rounded-lg`); stat tiles use a 7px radius; tags, chips, badges, and circular icon buttons are fully round (`rounded-full`). Two 5px radii are derived rather than chosen, and neither is a ramp step: the primary button's gilt inner rule is its own 8px less the 3px inset, so the two corners stay parallel, and a d6 takes 5px because a die's corner is not a card's corner. The signature geometry is the **arch**: ability tiles, the character portrait, and the stat caps use 45% top corners over 8px bottom corners, evoking a carved stone or a shield. Admonitions break the pattern on purpose - zero radius with clipped triangular notches on the left and right, so the callout reads as a pulled scroll ribbon rather than a box.

## Components

### Buttons
- **Shape:** Rounded 8px (`rounded-lg`).
- **Primary:** `--sl-color-accent-contrast` background with `--sl-color-text-invert` text, `padding: 12px 24px`. Used for "Roll All Abilities", "Reset", and other single primary actions per view. The fill is the contrast step rather than the accent: the label is `--sl-color-text-invert`, which resolves to `--sl-color-accent-low` and **not** to white, so on the accent itself the pairing reaches 5.28:1 in dark but only 2.74:1 in light. On the contrast step it is 5.28:1 dark and 5.01:1 light, and on hover 9.34:1 dark and 5.75:1 light.
- **Hover / Focus:** Hover shifts to Sap Light (dark theme) or Sage Deep (light theme) over a 150ms color transition. Disabled drops to 50% opacity with a not-allowed cursor.
- **Outline / Icon:** Transparent background, Sap Amber border and glyph, rounded 8px; used for the point-buy +/− controls. All controls carry a **44×44px minimum target** (WCAG 2.5.8) - where the visual is smaller than that, the hit area expands via padding or a pseudo-element rather than growing the control.
- **Round icon buttons:** Circular (`rounded-full`) 44px swap confirm/cancel buttons. Confirm is a filled Gold `#c68000` circle with a bark-black `#1b1716` glyph (5.50:1 in both themes); cancel is an outlined circle, bark-600 border `#605552` with an ink `#2a2010` glyph in light, bark-400 border `#c7c0be` with bark-200 in dark. Neither is painted from `--sl-color-accent`, for the reason given under Primary above.
- **Panel behind the pair:** Bark-100 `#f8f6f5` with a gold-rule `#c9ad6a` border in light, bark-800 `#2e2421` with `#867347` in dark. Needed because an accent-filled panel leaves the gold button at 1.74:1 and the cancel button at 1.59:1 against it, i.e. neither keeps a perceivable boundary.
- **Focus ring:** Never the same value as the control it outlines, in either theme. Bark-black `#1b1716` in light, bark-100 `#f8f6f5` in dark - 5.50:1 and 3.00:1 against the gold fill. An accent-coloured ring on an accent-filled button is invisible at 1.00:1, and gold-rule on gold is only 1.49:1.

### Chips
- **Style:** `rounded-full` pills. **Role chips** carry a light and a dark hue step (`ROLE_CONFIG` in `party-roster.ts`) exposed as the `--role-light` / `--role-dark` custom properties. The hue is used **only** for a 14% background tint and the border; the label text stays bark (`#605552` light, `#c7c0be` dark) and clears 4.5:1 in both themes. Tinting with the hue *and* colouring the text with the same hue cannot reach 4.5:1 - a saturated colour on a tint of itself is too light. Non-role chips use pale gray fill with gray text at `text-xs`. The Feat Explorer's Origin / General / Epic Boon tiers are **not** chips on this surface - they are the wax-seal medallion on a catalogue card (Feat Codex Panel below). A tier chip in the corner of every one of 219 cards is the tile-wall tic the Codex was chosen to refuse.
- **State:** Role filter chips are outlined when inactive (gray fill, subtle hover) and filled with the role hue when active; selection is also carried by `aria-pressed` and font weight, never by colour alone. A horizontal 1-3 dot marker denotes proficiency tiers.
- **Pointer feedback:** Hover tints sit inside `@media (hover: hover)`, because `:hover` sticks after a tap on iOS and never fires for a stylus. Press feedback is deliberately **ungated**, and chip spacing widens under `@media (any-pointer: coarse)` rather than `pointer: coarse`. `hover` and `pointer` describe the *primary* pointing device, so a touchscreen laptop reports `hover: hover` and `pointer: fine` and its digitizer shows up only in the `any-*` features; gating the press or the gap on the non-`any` forms silently excludes exactly that device. See [ADR-0009](docs/adr/0009-phone-first-grids-and-touch-targets.md).

### Role hues
Defined once in `ROLE_CONFIG` (`src/components/xml-viewer/party-roster.ts`) and surfaced to CSS as `--role-light` / `--role-dark`. All five are warm, satisfying the Warm-Only Rule. The light step is used on white surfaces, the dark step on the bark-800 card surface.

| Role | Light | Dark |
|---|---|---|
| Tank | `#a06e00` | `#d99a2b` |
| Healer | `#4a6b1f` | `#8fae5c` |
| Damage Dealer | `#8f2f12` | `#c2603f` |
| Support | `#9a5410` | `#d08a4a` |
| Utility | `#6b2f4c` | `#b07a94` |

### Card sections
The card's subdivisions are headed, not labelled by tooltip or hover. The six
**panels** are named by their tabs and carry no heading of their own; the
sections *inside* a panel are headed. Heading levels step down from the card name,
which is the `h2` (Starlight supplies the page `h1`): the inner sections are
`h3`, and the "Level N" groups inside Features and Powers step to `h4` at large,
where the Features and Powers headings own them, and stay at `h3` at medium, where
they sit directly under the card name. The power group name is one step below the
"Level N" group at each mode. They were `h4` and `h5` under a Features and Powers
`h3` that the tab bar removed; promoting them is what keeps the outline unbroken
after the panels stopped having headings of their own. See **Character Card**.

**Languages and Feats are the one pair whose level is fixed at `h3` in both
modes** rather than derived from the panel holding them. Neither panel has a
heading to be subordinate to - at `large` the menu entry names Overview, and at
`medium` the visible tab names the panel - so there is no level above them to
derive from and `h3` is correct in both places for the same reason. They name
themselves at both modes, where the sections that own a whole panel take a heading
only at `large`. `h2 > h3 > h4 > h5` is contiguous at both modes either way.

One treatment, and it is one class: `sectionHeadingClass` in
`section-heading.ts`, 0.7rem uppercase semibold with 0.08em tracking in
`accent-high` - the **Section Label** step, one notch above Pill. Every section
heading is it - Vitals, Abilities, Passive Skills, Saving Throws, Languages and
Feats - at every display mode. It is not the treatment for the six panels
themselves: those are tabs, and the tab label carries the
Section Label's size and tracking at 11px. Below a
section heading the ramp steps down once, to 0.625rem: the
`Level N` groups inside Features and Powers, the power group name beneath them,
the value annotating a heading's baseline, and the proficiency and prepared-dot
legends. Case and weight carry the last step, not size.

There used to be two treatments, a micro-label for the dense upper region and a
1rem `SectionHeader` for the full-width blocks lower down. The `SectionHeader`
heading declared no font-size, so it inherited Starlight's content `h3` at
16.38px and rendered in sentence case - 1.5x the micro-label, against it in the
same card. Medium mode showed the split inside one column, since Saving Throws
carried the micro-label and Skills carried the other. The split is gone and the
"Card Heading" reference unit is the only heading scale in a Card.

A section's *contents* are one design per section, too. Skills
(`SkillsTable.astro`) and Saving Throws (`SavesTable.astro`) are each a single
table on a single `cardPlateClass` plate, and display mode only chooses the rows
and the column count. Medium used to swap in a bare name/value grid instead: no
plate, no ability column, no proficiency dots, no legend. The section therefore
read as one thing at large and another at medium, and a medium reader had no way
to tell an expertise dot from a proficient one because medium had none. The rule
is that a display mode may shorten a section but never re-style it: medium lists
the proficient skills, large lists all of them, and both render the same table.
**A tab switch is not a display mode**, and it does not restyle anything either -
every panel is server-rendered and hidden with `x-show`, so the markup a reader
gets is identical whichever tab is open.

Languages and Feats (`LanguagesFeats.astro`) are the same idea at panel scale: one
component, one pill plate per section, mounted in the Overview panel at `large`
and the Skills panel at `medium`. Neither section's name sits *inside* its plate.
It was an uppercase micro-label beside the pills at `@md`, so at the 358px a
roster card measures the section name was the part that wrapped before the first
pill did; as a heading it is in the one position every other section name is in,
on the gold rule rather than inside the plate.

The subdivisions are `<section>` elements but are deliberately **unnamed**. A
`<section>` maps to a `region` landmark only when it has an accessible name, and
the party page renders six cards - naming them produced "Vitals" as a landmark six
times over, which is worse than no names. The heading carries the navigation. The
six **panels** are the exception and are named: a `tabpanel` is given an
`aria-labelledby` pointing at its tab, which is the tab pattern's own wiring and
not a landmark. `role="tabpanel"` is not a landmark role either way, so six cards
put six tabpanels on the page and none of them becomes one.

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`).
- **Background:** White in light mode, `gray-800` in dark mode. The *section plate* a card's contents sit on (`cardPlateClass`) is the recessed surface, Bark 100 (`gray-50`) stepping to Bark Black (`gray-900`); the Card *header* is its own thing and takes Bark 100 to Bark 800 - see the Card Heading tables.
- **Shadow Strategy:** `card-rest` at rest, `card-hover` on hover (see Elevation).
- **Border:** 1px `gray-200` / `gray-700`, plus a 3px top accent cap (Oxblood in light, Gold Leaf in dark) on stat tiles.
- **Internal Padding:** 16px (`p-4`) body, 16px header; stat tiles tighten to 8px (`p-2`).

### Inputs / Fields
- **Style:** White or `gray-800` fill, 1px `gray-300` / `gray-600` stroke, 8px radius, `text-sm` from `sm` up, `shadow-sm`.
- **Touch floor:** Every control is at least 44x44px (`min-h-11`), and its font is 16px (`text-base`) below `sm`, stepping back to `text-sm` above. The height is WCAG 2.5.8; the 16px floor is because iOS Safari zooms the whole page when a focused input's font is under 16px, which on a phone at the table means losing your place mid-session. See [ADR-0009](docs/adr/0009-phone-first-grids-and-touch-targets.md).
- **Focus:** A 2px ring and border shift in the accent (`--sl-color-accent`), so focus matches the accent in both themes. This replaced a `blue-500` ring, the last element that read as generic SaaS.
- **Labels:** Uppercase micro-labels are for stat tiles; form fields use a 14px medium label above the control. 14px and 15px are the two sizes off the type ramp and both are accounted for: 14px is the form label and the Dice Roller's swap popover, 15px is an icon glyph and the roll progress bar's label. Neither sets a sentence of prose, so neither is taking a step the ramp already provides.
- **Mobile disclosure:** Where a surface carries more than two secondary filters, the selects collapse behind a labelled toggle below `sm` and the primary search stays visible. The panel is `sm:flex!` so the important flag outranks Alpine's inline `display`, which is what `x-show` reveals by removing. Do **not** also put `hidden` on that panel: the class-based `display:none` outranks the reveal and the toggle silently does nothing.

### Feat Codex Panel
`src/components/feats-explorer/FeatExplorer.astro`, root `[data-fx="codex"]`.
**It is the Tool Panel.** Not a themed copy of it, not a parchment page with the
decoration stripped - the Ledger Panel's own values, at the Ledger Panel's
surface scale: `--fx-page` is `--pb-surface` (Bark 100 / Bark 800), `--fx-card` is
`--pb-raised` (Bark 200 / Bark 700), the edge is 1px Gold Rule / Gold Rule Dark,
the radius is 8px, the shadow is `0 1px 2px 0 rgb(0 0 0 / 0.05)` in light and
`none` in dark, the 3px cap is Oxblood stepping to Gold Leaf, and the head is
closed by the 2px Gold Rule.

**One thing is not the Tool Panel: the padding.** The Ledger Panel is 16px; this
is `24px 28px`, and 20px all round below `sm`. That is a deviation, not an
oversight, and it is named in the token block above as its own entry
(`tool-panel-list` / `tool-panel-list-dark`) rather than left to contradict
`tool-panel`. The reason is the job: the Ledger Panel holds six ability lines and
a foot, and 16px puts that content one step inside the rule, which is what you
want when the panel is a frame around a small amount of writing. This one holds
219 entries on a grid, and at 16px the outer column of cards sat close enough to
the 1px Gold Rule that the panel read as a border wrapped around the grid rather
than as a panel the grid sits inside. The extra 8-12px is the gutter that makes
the last column read as a column, and it is symmetric on both sides and in both
width bands. A test asserts that symmetry, in both bands.

It got there by subtraction, and each subtraction is a decision worth keeping.
It had a **parchment page** - a 25% Parchment mix over Bark 100, then 20% Ink
over Bark 800 in dark, warm in opposite directions in the two themes - and a
**mottle** on it: three soft tiles at 23/31/17rem plus a 7px fibre layer, so a
37,000px page would be uneven everywhere instead of evenly tinted. The user
called both decoration and the surface went. **A plain surface takes a
`background` and nothing else**; a `background-image` is how a panel becomes a
picture of a material rather than the material. It had a **stitched spine** down
the binding edge and then a **wax ribbon** off the fore-edge - two 6px tongues at
40% - and the user read the ribbon as "the 2 lines on the right part of the
border". Both are gone, and the cap is now the **only** pseudo-element the root
draws: exactly one accent on this surface, and it is the cap.

**Removing an ornament means removing its reservation.** The right padding was
2rem against 1.75rem on the left to clear the ribbon's 24px reach, with a comment
explaining why. The ribbon is gone, so the padding is symmetric - 1.5rem/1.75rem,
and 1.25rem all round below `sm`, where 320px cannot spend 28px on both sides. A
phantom gutter on one side of a panel reads as accidental misalignment, which is a
worse defect than the ornament it was reserving space for. Both the custom
property the ornament read and the decoration itself are deleted rather than left
declared, because a defined-but-unused token is a claim nothing backs up, and an
undefined one silently drops the declaration that used it.

The head's own copy stopped pretending earlier and still has: the count is
`219 of 219 feats on this sheet`, not a folio, because folio is the bindery's
word. The entries are **catalogue cards** on
`repeat(auto-fill, minmax(min(100%, 17rem), 1fr))`, so the count per row is a
consequence of the measure and the track never sets a floor the container cannot
meet at 320px. A card is a single-column flex flow - name with its medallion,
prerequisite, ability chips, then a `margin-top:auto` foot - so a feat with no
prerequisite leaves no gap and one with a very long prerequisite wraps at the
card's full measure rather than being squeezed into a column beside a label.
`overflow-wrap:anywhere` on the name, the prerequisite and the book is what breaks
the unbreakable runs (a feat name, a `18+`) that would otherwise push a card wide
on a phone. **A prerequisite is a second line under the name, never a fifth column
of a grid**: the grid is what produced the narrow track, and the narrow track is
what produced sideways scroll.

Every colour on the surface is a shared token or a `color-mix()` over one, and
that is enforced rather than asserted in a comment: a test fails on **any** hex
in the block, another fails if a `--fx-*` declaration does not resolve to a
`--color-*` or `--sl-color-*` one, a third fails if any custom property is
declared and unused or used and undeclared, and a fourth fails if the padding's
two sides disagree.

The **filter line** is one wrapping flex row: search, the disclosure toggle, the
three selects, and the clear control at the trailing edge. The clear control is a
**sibling of the panel, never a child of it** - below `sm` the panel is
collapsed, so a clear inside it would be unreachable until the user opened the
filters, which is a regression in a control that is otherwise always one tap
away. The row is `[search] [Filters] [clear]` below `sm` and
`[search] [ability] [book] [level] [clear]` at the widths where all five fit on
one line; the search drops from a 100% basis to 14rem at `sm`, which is the
point at which the three selects and the clear control fit beside it. `align-items:
flex-end` puts the clear's 44px square on the selects' baseline rather than
centring it in the label's taller box.

The **tier medallion** is a 2rem circle stamped on the name row, carrying a
two-letter monogram (OR / GE / EB) rather than the tier's name, in three inks -
Moss 800 for Origin, Gold for General, Oxblood for Epic Boon in light; Moss 100,
Gold, and a Parchment-lifted Oxblood in dark, because a dark seal on a dark page
is not a seal. The monogram on a card is `aria-hidden` because the foot already
carries the tier name in words; a seal that announced its own contents twice
would be the tile-wall tic again. It replaces the tier chip this surface used to
carry on every card. **Two-letter marks need a key**, and the **tier legend** is
one: a `dl` of the three marks and their names, above the cards and outside the
collapsible panel so it is on the page at 320 as well as at 1440, in real text
and not `aria-hidden` because a screen reader user needs the same three mappings
a reader gets. The marks are the seals themselves at key size - one class, two
sizes - so the key cannot drift from the seals. It carries no colour of its own,
which is what keeps it a key rather than a fourth accent beside the cap and the
head rule.

**The key also has to state the tier's scope, and on this one it is load-bearing.**
EB is `level >= 19`, which is 78 feats: the 40 "Boon of ..." entries at level 19
and 38 at level 21, and the level-21 ones are class builds rather than boons. The
Level filter keeps 19 and 21 as separate buckets, so a reader can land on 21 and
find an EB seal. The user was asked whether to split the tier, rename "Epic
Boon", or read the dataset's `category` field, and chose none of those - one
tier, the name kept, and **the legend says so in as many words**: a trailing note
reading `EB covers Level 19 and Level 21`, in visible text beside the key, using
the filter's own option labels. A key that names a tier without naming its
scope is a key that can mislead, and the general rule is that a legend on this
site states what the mark covers, not only what it is called. `category` cannot
be the answer: it carries only `Origin` and `General` across all 219 records, so
it cannot express the third tier at all.

**The card edge is the full Gold Rule, not the panel's hairline.** At the 42%
hairline the fill step alone is about 1.06:1 in light - Bark 200 on Bark 100 -
so all 219 cards were held by a faint outline and read as one wash rather than as
entries. The user chose the stronger edge, in both themes. It is still 1px, so
the **2px head rule and the 3px cap remain the only structural cues** on the
surface: strengthening a border is not permitted to promote it to a cue, and a
wall of 219 edges does not out-shout two bars. That ordering is the whole
reason the cap and the head rule exist on a surface this size.

**The count is announced once.** It was a `role="status" aria-live="polite"`
region in the head *and* another one on the bar below, both saying the same
number, so a screen reader announced the count twice on every filter change. The
head line is the one that survived; the bar and its copy are gone.


### Navigation
- **Style:** Starlight's sidebar with Bookinsanity item text, grouped under uppercase group headings. Theme selection is a native Starlight `<Select>` with sun/moon/laptop icons; the site defaults to light mode when no preference is stored.
- **Active / Hover:** Starlight's accent-tinted active item; the accent resolves to Sage in light mode and Sap Amber in dark.

### Signature Components
- **Stat Tile:** A 7px-radius plate with a 3px Oxblood/Gold top cap, an uppercase 12px label, and a bold metric. It is the atom of the character Card.
- **Arch Ability Tile:** A 45%-top-radius plate holding an abbreviated ability, its modifier, score, and save; it is the system's most recognizable silhouette.
- **Admonition Ribbon:** A full-width callout with zero radius, 2px top and bottom borders, and triangle-notched ends. Only the four Starlight types are used, and each carries a light and a dark step from the bark/moss/gold/oxblood ramps - there is no blue left in it. The border is the type's identity and the title takes the same ramp one step in, because Starlight's own defaults for both are cool:

  | Type | Border (light / dark) | Title (light / dark) | Fill (light / dark) |
  |---|---|---|---|
  | note | `#697066` / `#b9c0b6` | `#394036` / `#b9c0b6` | `#f8f6f5` / `#2e2421` |
  | tip | `#404521` / `#8fae5c` | `#363b17` / `#8fae5c` | `#e8ede1` / `#363b17` |
  | caution | `#a06e00` / `#d99a2b` | `#8a5600` / `#d99a2b` | `#faf0dc` / `#46331d` |
  | danger | `#58180d` / `#c2603f` | `#58180d` / `#d98a6b` | `#f7ebe6` / `#3d1f18` |

  Every border steps lighter in dark: the dark fills sit close enough to the light-theme border values that the border vanished against them (tip was 1.17:1, danger 1.10:1). `tailwind.test.ts` holds every cell to 3:1 for the border and 4.5:1 for the title.
- **Character Card:** The largest composition - a container-query card whose six sections sit behind a **menu bar**. The bar sits on the header's own surface and closes with the same 2px gold rule the header closes with, so identity and navigation read as one band; the six entries in reading order are Overview, Skills, Inventory, Weapons, Features, Powers. It has **zero vertical padding** and 8px horizontal padding on the bar and on each entry, so it sits flush between header and sheet and reads as a menu strip rather than a control floating between two blocks; the 44px target is held by each entry's `min-height`, so the tight inset costs a thumb nothing. **A menu entry is offered only for a section with something in it** - an entry that opens an empty sheet is worse than a shorter bar - and Overview is unconditional because Vitals and Abilities render for every character. Six entries measure ~560px, so the bar **wraps below 620px of container width rather than scrolling**: a scrolling strip hides two of six sections behind an edge most readers never find. It is a *container* query because the card is 1230px on a character sheet and ~358px in a two-column roster at the same viewport, and it is the card, not the window, that has to fit.

  **The display mode decides what the menu does, not what it holds - the two are different instruments.** At `medium` (the roster) it is a standard `role="tablist"`: roving `tabindex`, one Tab press leaves the bar, the arrows and Home/End move within it, activation follows focus because every panel is already in the DOM, and selection rides four channels, never colour alone - `aria-selected`, a weight step from 500 to 600, a colour step from bark-600 to Oxblood (Sap Amber in dark), and a 2px marker at the entry's lower edge in that same ink. Sap Amber rather than Gold Leaf because this is an interactive selection state and DESIGN.md reserves Sap Amber for exactly that; it also measures better on the dark bar, 6.02:1 where Gold Leaf reaches 4.67:1. Every panel is server-rendered and hidden with `x-show`, so switching reveals rather than fetches. At `large` it is a `<nav>` of `<a href="#...">` and every section is rendered visible, because a full character sheet is already a page-long scroll and hiding five of six sections costs the reader their sense of the whole character. That mode carries no `x-data`, no `x-show` and no `x-cloak`, so **the large sheet needs no JavaScript for its menu** - a fragment identifier is the whole mechanism, and selection states are absent
because `aria-selected` on a link that hides nothing would be false. A jumped-to
  section adds no `scroll-margin-top` of its own: Starlight sets `scroll-padding-top`
  on `html` to clear the sticky header, and the two would stack.

  **The menu degrades rather than disappearing.** At `large` there is nothing to
  degrade: anchors and a fragment identifier are the whole mechanism. At `medium`
  the bar is `x-cloak`ed so a reader without JavaScript is not shown six labels
  that do nothing, but the panels are **not** cloaked - `[x-cloak]` is
  `display: none !important`, so cloaking them would leave a no-JS reader with a
  card header and no card. Uncloaked, they get every section in the markup, in
  order: the pre-menu layout, intact.

  **Whether a section names itself is a heading-level decision, and it differs by display mode - with one pair that does not differ.** At `medium` a panel has no heading of its own: the visible tab names it, and an `h3` repeating that word twenty pixels below would be the same name twice - read twice by a screen reader, seen twice by an eye. At `large` every section names itself, in the same `sectionHeadingClass` treatment as Vitals and Saving Throws. The argument that removed the headings is true on the roster and false on a character page: there is no tab, no selection state, and the page is one long scroll, so a section that is only tables and pills arrives unlabelled and the reader cannot tell where they have landed. Inventory's carried-weight total rides its heading's baseline again - the pairing it always had, and the only trailing value on the card.

  **Languages and Feats are the exception, and the exception is the point.** They name themselves at `medium` too, at the same `h3`, because the rule that a medium panel is named by its tab protects against a heading that repeats *the tab's own word* - and neither of these two is the tab's word. Neither panel that holds them has a heading at either mode, so there is no level above them to derive from; `h3` under the card name is correct in both places for one reason, and that reason is written at the mount sites rather than left to be inferred.

  **That moves the `Level N` groups down a level, and correctly so.** Under a Features `h3` at large, the level groups are genuinely inside it and sit at `h4`, with a power group name at `h5`; two `h3`s in a row would claim Features and its first level group are siblings. At medium, where no section heading exists, the same groups step straight down from the card name and stay at `h3`/`h4`. The tag is chosen in one place rather than written twice, and `h2 > h3 > h4 > h5` is contiguous in both modes - the deepest heading on a Card is now `h5`, and that is a fourth step rather than a skipped one.

  Display mode decides **which sections exist and which panel holds them** (ADR-0017, which replaces the earlier rule that a mode only ever shortens a section). Read at three ranks rather than as three lists of sections: `small` renders identity, avatar and tags and nothing that needs a panel to hold it; `medium` renders Skills, Languages and Feats and does not render Saving Throws, the two pill sections riding the Skills panel because that is a panel of short lists; `large` renders every section `medium` renders, adds Saving Throws back to the Overview panel, and adds nothing of its own. The mode may not be described by restating that list - that is how a list and the `sectionPolicy` map drift apart in the first place.

  Medium is a **glance**, and the sections on it are recognition material: who is this character, not what does this number come from. Saving Throws is a 3-6 row table of figures the character page and the large sheet print properly and a roster reader computes with rather than reads; Feats are the single most identifying thing on a D&D character, and they did not render at `medium` at all before this. That is a trade, not an oversight: a reader who wants a saving throw has to leave the roster for it, and the roster is for recognition.

  What that means for the bar: **a menu entry exists only for a section the card has something to put in it**, and the two pill sections count as content in the Skills panel. `showSkills` at `medium` is therefore `proficientSkills.length > 0 || showLanguages || showFeats`, or a character with feats and no proficient skills would have its feats deleted by a rule about hiding empty sheets. Overview stays unconditional, because Vitals and Abilities render for every character.

  The card used to pair sections side by side at `@6xl` - Skills beside Inventory, Features beside Powers - and one pairing grid survives, inside the **Overview panel at `large`**, because there that panel alone holds two independent groups: the character in the left half, Saving Throws and the pill sections in the right. At `medium` it is a single column, because there is nothing that could sit beside the character at any width. Promoting Inventory and Weapons to medium put their four- and three-column tables into a 358px card for the first time, so both **drop a column below `@lg` and carry it as a second line under the name**: Weight and State for inventory, Properties for weapons. The attack bonus stays its own column at every width, because it is the column a player reaches for. That is ADR-0014's argument applied to a table - a row's width is its container's, and it must hold a name and its figures at any width - and it is a container query for the same reason the tab bar's is.
- **Tool Panel:** The material every D&D tool surface is built from, so the page that opens a tool and the page that lists the tools are made of one surface. There are three instances of it - the **Ledger Panel** (Point Buy), the **Dice Tray Panel** (Dice Roller), and the **Tools Panel** in the rulebook spread, which is the surface `.rb-panel` and the reference both other tools were built against - and they are three instances of one panel, not three designs: same Bark 100 (#f8f6f5) surface stepping to Bark 800 (#2e2421), same 1px Gold Rule (#c9ad6a) border stepping to Gold Rule Dark (#867347), same 8px radius, same card-rest in light and **no shadow** in dark, same 3px accent cap (Oxblood in light, Gold Leaf in dark) as the only accent bar, and the same head built as **the Card Heading's construction**: a printed title in Cinzel at 1.35rem/600 in the theme's heading ink over a meta line in ScalySans at 0.8125rem, uppercase, 0.04em tracked, in Bark 600 (Bark 400 in dark), closed by a **2px Gold Rule at its lower edge**, which steps to Gold Rule Dark. That rule is the reason for the shape: a head banded only by a dotted leader reads as another row of the sheet, while a head closed by a rule at its own lower edge reads as a heading over what it heads. The cap above and the rule below bracket the surface without either carrying colour alone. A tool surface is a themed surface; one that held its paper fixed across both themes was the same object in light and in dark, which is the one outcome a theme toggle exists to prevent. Every value is a `--pb-*`, `--dr-*` or `--rb-*` custom property declared once and re-declared under `:root[data-theme='dark']`, and a test enforces that re-declaration for the first two.

  The **Ledger Panel's** body is a ruled leaf of six ability lines. The points readout is **not in the head** - it is in the foot, beside `SPENT`, because a governing number set in a title band reads as a headline rather than as the state of the sheet, and because down there the three figures answer the only three questions asked of a spread: how strong, how much, how much is left. It is `POINTS LEFT`, and it is the **third of three identical entries** - label at the Micro Label step, figure at the Title step (1.25rem Cinzel 600, tabular), one item each, in one row: no leader, no step up, no separate treatment. It reached the same figures by the same dotted leader and at a step of its own through Revision 4, and that made the remainder the loudest object on a surface whose job is six numbers; a leader out to the right only means "look here". When the pool empties the label reads `POOL SPENT`, which is how a finished sheet reads as finished without the figure having to become a status.

  The **Dice Tray Panel's** body is six rows that each answer one question - what did this ability roll - and the row's three parts are the evidence, the figure, and the control. The **dotted leader** is shared with the Ledger Panel and is load-bearing rather than ornamental: the content column runs to about 880px and a row holds four numbers, so without a rule spanning the slack between a row's subject and its own evidence the line falls apart into a name at one edge and a figure at the other. The **tray** is a recessed well, one ramp step *into* the panel in each theme (Bark 200 under Bark 100 in light, Bark Black under Bark 800 in dark), holding the four d6 immediately left of the score plate so the evidence and the figure read as one object. It is never empty: an unrolled ability renders four blank **engraved sockets** rather than a gap, so a row arrives complete and no score column moves when a roll lands. The dice are drawn as d6 - nine pip slots lit by the face - because a numeral with a strikethrough cannot distinguish two identical discarded faces, and a discarded die is inactive content under WCAG 1.4.3; it keeps a dimmed fill and a dashed edge rather than going transparent, since transparent inside a tray resolves to the tray's own fill and a hairline one step off that is invisible. The die's 1px rim is the only thing separating a die from its tray, so it is a per-theme token: Bark 600 reaches 6.15:1 in light and Gold Rule Dark 3.86:1 in dark, where Bark 600 would be 2.47:1. The rolled score is the loudest number on the row and the panel's job is six numbers, so the four pips stay decoration and the plate carries the figure.

  The six lines sit on a 5-column grid - name in Cinzel, a dotted leader out to the figure, the score at the Title step, the modifier on a flat 28px chip in the neutral ramp, the cost line in ScalySans, and two 44px outline steppers. Below 46rem the line breaks after the name and the figures run beneath it, still one entry.

  Each name is also a **trade handle**: two presses exchange two abilities' scores. It is a button rather than the whole row because the row already contains two 44px steppers, it borrows no border or fill from them at rest so the name still reads as writing, and it wraps the mark and the name only - the leader stays outside it, because a leader inside a button can only be as long as the button. While a score is held the panel takes `pb-swapping`, the other five names take a 1px outline in the **hairline** rule step (not the full gold rule: in dark, six full-strength gold outlines out-shout the one ring that means something), and the held name takes a 2px offset ring in the action accent. `aria-pressed` carries the state, and the accessible name changes with it ("Pick up Strength, 15, to trade its score" / "Put Strength back, cancelling the trade") so the control names its action rather than its subject.
  Every one of those values is a themed custom property (`--pb-*` on the component root), declared once and re-declared under `:root[data-theme='dark']`. The tool's earlier build kept its paper the same parchment in both themes on the reasoning that a physical object should not invert; the effect was that the panel and its heading were identical in light and dark, and the object outweighed the prose around it. **A tool surface is a themed surface.** One bark step plus the gold rule per theme, and no private material vocabulary.
- **Card Heading (the reference unit):** The header of every Card, in `.char-*`. It is a flex row - portrait, identity block, HP plate - on a single 16px gap, 16px/20px padding, square corners, closed by a 2px gold bottom rule. Below 400px of container width the HP plate is dropped and the identity block takes the row. The **name and the meta line are both single-line and both truncate with an ellipsis** (`white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`). This reverses an earlier decision that let the name wrap on a second line. The accepted tradeoff is that a long name in a two-column roster loses its tail; the full name stays reachable from the name's own hover `title` and from the character page the portrait links to.
  **Light theme**

  | Part | Treatment |
  | --- | --- |
  | Header surface | Bark 100 (#f8f6f5), 2px Gold Rule (#c9ad6a) bottom border |
  | Portrait | 60x76, 1px Bark 400 (#c7c0be) stroke, Bark 200 (#f1eceb) fill, 7px top corners over 45% bottom corners |
  | Portrait focus | 2px Oxblood (#58180d) outline at 2px offset |
  | Name | Cinzel 600 1.35rem, Oxblood (#58180d), single line, ellipsis when it does not fit |
  | Meta | ScalySans 0.8125rem uppercase, 0.04em tracking, Bark 600 (#605552) |
  | Tags | 6px gap, 8px above the meta; pills are transparent with a 1px Gold Rule (#c9ad6a) border, ScalySans 11px uppercase, Bark 600 text |
  | HP plate | 7px radius, 1px Gold Rule border with a 3px Oxblood cap, Surface White (#ffffff) fill, centered |
  | HP label / value / temp | 9px uppercase Bark 500 (#948985) / ScalySans 700 1.35rem Oxblood, tabular numerals / 10px Bark 500 |

  **Dark theme**

  | Part | Treatment |
  | --- | --- |
  | Header surface | Bark 800 (#2e2421), 2px Gold Rule Dark (#867347) bottom border |
  | Portrait | 1px Bark 600 (#605552) stroke, Bark 700 (#3f3632) fill |
  | Portrait focus | 2px Gold Leaf (#c68000) outline |
  | Name | Bark 200 (#f1eceb) |
  | Meta | Bark 400 (#c7c0be) |
  | Tags | Parchment (#d4c4a8) text, Bark 650 (#4a403a) border |
  | HP plate | Bark Black (#1b1716) fill, Bark 650 (#4a403a) border, 3px Gold Leaf cap |
  | HP value | Gold Leaf (#c68000) |

  The two themes are one system inverted, not two designs: the surface steps down, the ink steps up, and the single accent swaps from Oxblood to Gold Leaf. Nothing in the heading changes shape, size, or spacing between themes.
- **Rulebook Spread:** The site index, and the reason the Tool Panel has a third instance. It is one printed sheet rather than a grid of destination cards: a 28px gutter column and the leaves beside it, `width: min(70rem, calc(100vw - 2.5rem))` and centred on the content column with the standard `translateX(-50%)` breakout, where the 2.5rem is the overflow guard that keeps ADR-0009's widths clean. Desktop divides it into two leaves with a 2px gold gutter rule; a phone stacks them in reading order and the gutter becomes a sticky left spine carrying the current part's Roman numeral at the Label step (0.75rem Cinzel 700) above a 2px fully-round track whose fill is `scaleY`-driven, so the only motion on the page stays off the layout path. The part heading is the numeral *inside* the title on the title's own baseline - `I  House Rules` - because a small uppercase kicker above a heading is the one device this page refuses outright; the numeral itself is Gold Leaf against the Oxblood heading ink. Entries are printed contents rows separated by hairlines, never cards: a card per entry would put fifteen raised boxes on a page whose one panel is meant to be the only raised thing. Each row is folio, icon, name, cue on a grid, floors at ADR-0009's 44px, and the name takes the Title step at the Card Heading's weight because a link at weight 400 does not read as one. The cue is a Pill in bark ink, never a hue - a tinted cue cannot clear 4.5:1 on the panel it sits on.

### Named Rules
**The Tool-Weight Rule.** A tool does not outweigh the page it sits on. One panel, one border, one accent cap, and the numbers left as the loudest thing on it. A second surface wrapped around the panel, a frame around the governing figure, and a gradient or a ring on every row are three ways of saying the same thing louder; each was removed from the Ledger Panel, and each is worth noticing the first time one comes back.

**The Figure-Beside-Its-Remainder Rule.** A figure that describes the state of a thing belongs with the other state figures, not above them in a heading. Point Buy carried the points readout in its head through two revisions, as a masthead and then as a band, and both read as a headline rather than as the state of the sheet. It lives in the foot beside `SPENT`, which it is the remainder of, and it is the third of three identical entries there - no leader, no step up, no treatment of its own.

## Do's and Don'ts

### Do:
- **Do** keep the accent to one role per screen; Sap Amber for actions and selection, Gold Leaf and Oxblood for headings and markers.
- **Do** use the warm bark ramp for neutrals and let surfaces invert per theme rather than hard-coding a single mode; the Card heading's light and dark tables are the worked example.
- **Do** give raised surfaces both a soft shadow and a structural cue (accent cap, arch, or border).
- **Do** set headings in Cinzel, prose in Bookinsanity, and tables in ScalySans - never mix their jobs.
- **Do** use uppercase micro-labels with tabular monospaced numerals inside stat blocks.
- **Do** set a list-shaped thing as ruled rows rather than a wall of tiles. A tile has to be wide enough for its content at every viewport; a row's width is the content column's, and its columns can hold a name, a figure and a 44px control at any width. [ADR-0014](docs/adr/0014-tool-rows-not-tiles.md).

### Don't:
- **Don't** introduce neon or cyberpunk: no electric purple or cyan, no glassmorphism, no glowing sci-fi gradients or blur.
- **Don't** reach for Tailwind's default cool `gray-*` scale or a `blue-500` focus ring in new work. The `gray` scale is already remapped onto bark, but a hardcoded cool hex in new markup will still render cool. `tailwind.test.ts` fails the build on either.
- **Don't** put the system sans stack in a Card heading. Cinzel for the name, ScalySans for everything else, in both themes.
- **Don't** treat Surface White as a general surface or an ink. It is the light-theme HP plate and nothing else.
- **Don't** use pure black or pure white for text; use Ink and Parchment.
- **Don't** set body copy or numeric data in Cinzel, or apply the arch/45% radius to ordinary cards.
- **Don't** use a heading element for a printed title or a row label inside a themed surface. Starlight colours every heading in the content column to the accent (`.sl-markdown-content :is(h1..h6)` is 0-1-1 in light and 0-2-1 in dark), so a heading outranks a single utility class. An `h3` title inside the Point Buy panel rendered the theme's heading ink as a heading rather than as a printed title; an `h4` per ability measured 2.32:1. Use the element the thing actually is - a printed title and a row label are paragraphs.
- **Don't** give a tool its own material vocabulary, and don't hold one surface fixed across both themes. Point Buy carried `sheet`, `desk`, `brass`, `wax` and `fitted` for a parchment-on-leather object that did not invert; the tool came out looking like a different website pasted into the page, with a heading and a surface that were the same in light and dark. Surfaces invert per theme, and they come from the ramps the rest of the system already uses.
- **Don't** let a tool outweigh the page it sits on. The same build wrapped its panel in a second padded surface, framed the points readout, and put a gradient disc on every modifier - six small objects competing with the figures they explain. One panel, one border, one cap, and the numbers left to be the loudest thing.
- **Don't** set a governing figure inside a title band. Point Buy carried the points readout in the head through two revisions, as a masthead and then as a band, and both read as a headline rather than as the state of the sheet. A figure that describes the state of a thing belongs with the other state figures - beside `SPENT`, which it is the remainder of - not above them in a heading.
- **Don't** fabricate campaign branding, logos, or imagery; the world is built from the existing palette, faces, and real assets only.
