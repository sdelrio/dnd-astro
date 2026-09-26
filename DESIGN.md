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
  bark-400: "#c7c0be"
  bark-200: "#f1eceb"
  bark-100: "#f8f6f5"
  moss-800: "#363b17"
  moss-700: "#404521"
  moss-100: "#e8ede1"
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
    backgroundColor: "{colors.sap}"
    textColor: "{colors.bark-black}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.sap-light}"
    textColor: "{colors.bark-black}"
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

The implementation still has a seam between two layers, now uneven. The Starlight documentation layer uses the warm bark/moss palette throughout, and the character Card heading has joined it - Cinzel name, gold rule, warm surfaces, correct dark-theme inversion. What remains on Tailwind's default cool gray scale is the Card *body*: the vitals and ability tiles, the tag chips, and the `blue-500` focus ring on the tool-page inputs. The heading is the reference for where that body is headed.

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
- **Moss** (#404521, #363b17, #e8ede1): The olive greens behind striped table rows in dark mode, with a pale sage stripe (`moss-100`) in light mode.

### Utility tokens
`src/styles/tailwind.css` exposes the palette as Tailwind theme tokens so call
sites name intent rather than a hex. `bark-*`, `moss-*`, `gold`, `gold-rule`,
`oxblood`, `ink`, `parchment` and `sage*` mirror the values above.

The `gray` scale is **redefined onto the bark ramp** rather than left as
Tailwind's cool default. The Card body and every tool input were written against
`gray-*` - roughly 340 call sites across eleven steps - and a find-and-replace
would have to be redone every time the palette moved. Redefining the scale in
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
DESIGN.md counterpart; the rest are literal palette values. `gray-500` in
particular is balanced rather than pure: no single mid-tone can clear 4.5:1
against both a white surface and a near-black one, so on the surfaces it is
actually used with:

| | `gray-50` (light) | `gray-900` (dark) |
|---|---|---|
| Tailwind `#6b7280` | 4.49:1 | 3.68:1 |
| this system `#786d6a` | 4.65:1 | 3.55:1 |

Neither theme regresses, and the light surface - where `gray-500` is
overwhelmingly used - is above AA. Every `text-gray-N` call site carries a `dark:`
counterpart (verified: 112 sites, none without one), so each step only has to
clear the theme it appears in.

`src/styles/tailwind.test.ts` pins all eleven values, the derived-step comments,
the admonition pairings and the stripe stops, so the mapping cannot drift
silently.

### Named Rules
**The Warm-Only Rule.** No cool blue-gray, electric purple, or cyan enters the system. Neutrals are warm browns. The `gray` scale is now bark, the `blue-500` focus rings on the tool inputs are the remaining drift, and the admonition palette has been pulled onto the bark/moss/gold/oxblood ramps. Admonitions set both `--sl-color-asides-border` and `--sl-color-asides-text-accent`; Starlight's own defaults for both are cool.

**Specificity over order for third-party overrides.** Starlight declares
`--sl-color-asides-text-accent` on the same bare class our rules target, later in
its stylesheet. At equal specificity the later declaration wins, so an override
there is silently dead. The light admonition rules therefore carry a `:root`
prefix to outrank it - the dark rules were already specific enough via
`:root[data-theme='dark']`. Asserted in `tailwind.test.ts`.

**The Rarity Rule.** Sap Amber is an action and emphasis color, used on well under a tenth of any screen. Gold Leaf and Oxblood belong to headings and markers, not to large fills.

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
- **Card Heading** (600, 1.35rem, letter-spacing 0.01em, line-height 1.15): The character name in Cinzel, the single largest type on a Card. It is the only place the display face appears inside a component.
- **Card Meta** (400, 0.8125rem, letter-spacing 0.04em, uppercase, line-height 1.4): Race, class, and subclass in ScalySans, tracked out and set small so the Cinzel name keeps the top of the hierarchy.
- **Label** (500, 0.75rem, letter-spacing 0.05em, uppercase): Micro-labels above stat values in the documentation layer.
- **Micro Label** (600, 0.5625rem/9px, letter-spacing 0.08em, uppercase): The card-scale label, as small as the design goes. Used for "Hit Points" on the plate; **Micro Value** (400, 0.625rem/10px) covers secondary values and statblock legends, and **Pill** (500, 0.6875rem/11px, letter-spacing 0.04em, uppercase) covers tags and role chips. Together 9/10/11px are the card ramp, distinct from the documentation layer's 12px Label.
- **Metric** (700, 1.125rem-1.5rem): Numeric values in stat tiles and metric cards, monospaced (`font-mono`) when they are read as data (saves, skills, attack bonuses). The card's HP value is ScalySans at 1.35rem with tabular numerals rather than the sans stack.

### Named Rules
**The Two-Family Rule.** Cinzel only ever sets headings and card titles; it never sets body text, labels, or numbers. If it is a sentence, it is Bookinsanity; if it is a table, it is ScalySans.

**The One-Voice Heading Rule.** A Card heading is a closed three-part stack - Cinzel name, ScalySans meta, outlined pills - in the warm bark and gold scheme in *both* themes. Do not reintroduce the system sans stack or Tailwind's cool `gray-*` scale into it; the heading is the reference for how the rest of the Card should migrate.

## Layout

The documentation shell is Starlight's sidebar-plus-content layout, with content capped at 55rem from the 72rem breakpoint up. Interactive tool pages and Cards use a single-column-safe responsive grid: 1 column on mobile, 2 from `sm`, 3 from `lg`, always with a 16px gap (`gap-4`). Character Cards are container-query driven (`@container`), folding from one column to two at `@6xl` and `@7xl` when the Card itself is wide enough, independent of viewport.

Spacing follows a 4/8/16/24 rhythm: 4px inside tight grids (`gap-1`), 8px between paired items (`gap-2`, `p-2`), 16px inside cards (`p-4`) and between blocks (`space-y-4`), 24px between major sections (`space-y-6`, `p-6`). Ability scores sit in a 3-column grid that expands to 6 at the `lg` container width; party stat summaries use a 2-column grid that expands to 5 at `md`.

## Elevation & Depth

The system is lifted and tactile. Surfaces are raised on soft ambient shadows at rest and lift further on interaction - cards use Tailwind `shadow-sm` and rise to `shadow-md` on hover, filter chips take `shadow-md` when active. Structure is reinforced by a 3px accent cap on top of stat tiles and a 45% arch radius on ability tiles, so a tile reads as physical even before its shadow lands. Admonitions carry a deeper, softer shadow (`0 0.25em 1.25em -0.5em rgba(0,0,0,0.5)`) that eases over 400ms.

### Shadow Vocabulary
- **card-rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): default card and input resting state.
- **card-hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): hover on interactive cards and active chips.
- **aside** (`box-shadow: 0 0.25em 1.25em -0.5em rgba(0, 0, 0, 0.5)`): the advisory callout ribbon, transitioning over 400ms.

### Named Rules
**The Lifted-Not-Floating Rule.** Every raised surface still reads as sitting on the page: shadows stay soft and low, and a tile's accent cap or border does the structural work. No hard drop shadows, no glassmorphism, no blur.

## Shapes

Corners are gently rounded and occasionally arched. Cards, buttons, inputs, and buttons use an 8px radius (`rounded-lg`); stat tiles use a 7px radius; tags, chips, badges, and circular icon buttons are fully round (`rounded-full`). The signature geometry is the **arch**: ability tiles, the character portrait, and the stat caps use 45% top corners over 8px bottom corners, evoking a carved stone or a shield. Admonitions break the pattern on purpose - zero radius with clipped triangular notches on the left and right, so the callout reads as a pulled scroll ribbon rather than a box.

## Components

### Buttons
- **Shape:** Rounded 8px (`rounded-lg`).
- **Primary:** Sap Amber background with dark text, `padding: 12px 24px`. Used for "Roll All Abilities", "Reset", and other single primary actions per view.
- **Hover / Focus:** Hover shifts to Sap Light (dark theme) or Sage Deep (light theme) over a 150ms color transition. Disabled drops to 50% opacity with a not-allowed cursor.
- **Outline / Icon:** Transparent background, Sap Amber border and glyph, rounded 8px; used for the point-buy +/− controls. All controls carry a **44×44px minimum target** (WCAG 2.5.8) - where the visual is smaller than that, the hit area expands via padding or a pseudo-element rather than growing the control.
- **Round icon buttons:** Circular (`rounded-full`) 44px swap confirm/cancel buttons. Confirm is a filled Gold `#c68000` circle with a bark-black `#1b1716` glyph (5.50:1 in both themes); cancel is an outlined circle, bark-600 border `#605552` with an ink `#2a2010` glyph in light, bark-400 border `#c7c0be` with bark-200 in dark. Neither is painted from `--sl-color-accent`: that token is `#f7860f` in dark and `#697066` in light, and `--sl-color-text-invert` is `--sl-color-accent-low`, **not** white, so the pairing reaches 5.28:1 in dark but only 2.74:1 in light.
- **Panel behind the pair:** Bark-100 `#f8f6f5` with a gold-rule `#c9ad6a` border in light, bark-800 `#2e2421` with `#867347` in dark. Needed because an accent-filled panel leaves the gold button at 1.74:1 and the cancel button at 1.59:1 against it, i.e. neither keeps a perceivable boundary.
- **Focus ring:** Never the same value as the control it outlines, in either theme. Bark-black `#1b1716` in light, bark-100 `#f8f6f5` in dark - 5.50:1 and 3.00:1 against the gold fill. An accent-coloured ring on an accent-filled button is invisible at 1.00:1, and gold-rule on gold is only 1.49:1.

### Chips
- **Style:** `rounded-full` pills. **Role chips** carry a light and a dark hue step (`ROLE_CONFIG` in `party-roster.ts`) exposed as the `--role-light` / `--role-dark` custom properties. The hue is used **only** for a 14% background tint and the border; the label text stays bark (`#605552` light, `#c7c0be` dark) and clears 4.5:1 in both themes. Tinting with the hue *and* colouring the text with the same hue cannot reach 4.5:1 - a saturated colour on a tint of itself is too light. Non-role chips use pale gray fill with gray text at `text-xs`.
- **State:** Role filter chips are outlined when inactive (gray fill, subtle hover) and filled with the role hue when active; selection is also carried by `aria-pressed` and font weight, never by colour alone. A horizontal 1-3 dot marker denotes proficiency tiers.

### Role hues
Defined once in `ROLE_CONFIG` (`src/components/xml-viewer/party-roster.ts`) and surfaced to CSS as `--role-light` / `--role-dark`. All five are warm, satisfying the Warm-Only Rule. The light step is used on white surfaces, the dark step on the bark-800 card surface.

| Role | Light | Dark |
|---|---|---|
| Tank | `#a06e00` | `#d99a2b` |
| Healer | `#4a6b1f` | `#8fae5c` |
| Damage Dealer | `#8f2f12` | `#c2603f` |
| Support | `#9a5410` | `#d08a4a` |
| Utility | `#6b2f4c` | `#b07a94` |

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`).
- **Background:** White in light mode, `gray-800` in dark mode; the Card header is a slightly recessed surface (`gray-50` / `gray-900`).
- **Shadow Strategy:** `card-rest` at rest, `card-hover` on hover (see Elevation).
- **Border:** 1px `gray-200` / `gray-700`, plus a 3px top accent cap (Oxblood in light, Gold Leaf in dark) on stat tiles.
- **Internal Padding:** 16px (`p-4`) body, 16px header; stat tiles tighten to 8px (`p-2`).

### Inputs / Fields
- **Style:** White or `gray-800` fill, 1px `gray-300` / `gray-600` stroke, 8px radius, `text-sm`, `shadow-sm`.
- **Focus:** Currently a 2px blue-500 ring and border shift - the one element that reads as generic SaaS. The intended direction is a Sap Amber ring so focus matches the accent.
- **Labels:** Uppercase micro-labels are for stat tiles; form fields use a 14px medium label above the control.

### Navigation
- **Style:** Starlight's sidebar with Bookinsanity item text, grouped under uppercase group headings. Theme selection is a native Starlight `<Select>` with sun/moon/laptop icons; the site defaults to light mode when no preference is stored.
- **Active / Hover:** Starlight's accent-tinted active item; the accent resolves to Sage in light mode and Sap Amber in dark.

### Signature Components
- **Stat Tile:** A 7px-radius plate with a 3px Oxblood/Gold top cap, an uppercase 12px label, and a bold metric. It is the atom of the character Card.
- **Arch Ability Tile:** A 45%-top-radius plate holding an abbreviated ability, its modifier, score, and save; it is the system's most recognizable silhouette.
- **Admonition Ribbon:** A full-width callout with zero radius, 2px top and bottom borders, triangle-notched ends, and a per-type border color (note blue, tip green, caution amber, danger red) with tinted light/dark backgrounds.
- **Character Card:** The largest composition - a container-query card whose sections appear by display mode (small/medium/large), from portrait-plus-vitals up to full skills, inventory, weapons, features, and powers.
- **Card Heading (the reference unit):** The header of every Card, in `.char-*`. It is a flex row - portrait, identity block, HP plate - on a single 16px gap, 16px/20px padding, square corners, closed by a 2px gold bottom rule. Below 400px of container width the HP plate is dropped and the identity block takes the row.

  **Light theme**

  | Part | Treatment |
  | --- | --- |
  | Header surface | Bark 100 (#f8f6f5), 2px Gold Rule (#c9ad6a) bottom border |
  | Portrait | 60x76, 1px Bark 400 (#c7c0be) stroke, Bark 200 (#f1eceb) fill, 7px top corners over 45% bottom corners |
  | Portrait focus | 2px Oxblood (#58180d) outline at 2px offset |
  | Name | Cinzel 600 1.35rem, Oxblood (#58180d) |
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

## Do's and Don'ts

### Do:
- **Do** keep the accent to one role per screen; Sap Amber for actions and selection, Gold Leaf and Oxblood for headings and markers.
- **Do** use the warm bark ramp for neutrals and let surfaces invert per theme rather than hard-coding a single mode; the Card heading's light and dark tables are the worked example.
- **Do** give raised surfaces both a soft shadow and a structural cue (accent cap, arch, or border).
- **Do** set headings in Cinzel, prose in Bookinsanity, and tables in ScalySans - never mix their jobs.
- **Do** use uppercase micro-labels with tabular monospaced numerals inside stat blocks.

### Don't:
- **Don't** introduce neon or cyberpunk: no electric purple or cyan, no glassmorphism, no glowing sci-fi gradients or blur.
- **Don't** reach for Tailwind's default cool `gray-*` scale or a `blue-500` focus ring in new work. The Card heading is already off it; the Card body is the remaining debt.
- **Don't** put the system sans stack in a Card heading. Cinzel for the name, ScalySans for everything else, in both themes.
- **Don't** treat Surface White as a general surface or an ink. It is the light-theme HP plate and nothing else.
- **Don't** use pure black or pure white for text; use Ink and Parchment.
- **Don't** set body copy or numeric data in Cinzel, or apply the arch/45% radius to ordinary cards.
- **Don't** fabricate campaign branding, logos, or imagery; the world is built from the existing palette, faces, and real assets only.
