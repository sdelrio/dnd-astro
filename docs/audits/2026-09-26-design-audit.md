---
title: Design Audit - 2026-09-26
date: 2026-09-26
type: audit
tool: impeccable
scope: src, public, dist (128 pages)
score: 11/20
verdict: implementation-integrity-fail
---

# Design Audit - 2026-09-26

Produced with the vendored `impeccable` skill. The site was built (`pnpm build`, 128
pages) and every finding was verified against `dist/` HTML, computed WCAG contrast
ratios, and the bundled detector (17 mechanical findings).

**Caveats on this pass.** No browser was available in the audit environment, so no
findings come from rendered viewports or synthesized touch gestures. Contrast ratios
were computed from declared token values rather than sampled from rendered pixels -
the role-chip and HP-label figures assume the declared surfaces. Responsive and motion
findings come from source plus built CSS/markup and are labelled as such.

## Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Role chips fail AA in both themes (1.80:1-4.01:1); dice-roller tile is a `div` with `@click` |
| 2 | Performance | 3/4 | Lean (8-15 KB gz pages, 23 KB gz JS); Cinzel via third-party Google CSS, no `x-cloak` |
| 3 | Responsive design | 2/4 | Container queries are good; every tool control is under the 44 px touch target |
| 4 | Theming | 2/4 | Card body still on Tailwind's cool `gray-*`; role chips and feat chips are cool hex |
| 5 | Implementation integrity | 2/4 | Card heading is a real product-specific system; the body and tools are generic Tailwind |
| **Total** | | **11/20** | **Acceptable (significant work needed)** |

**Issues:** 0 P0, 6 P1, 12 P2, 5 P3.

## Implementation integrity verdict

**Fail, with a clear direction of travel already proven in-repo.**

The detector's mechanical findings were 13 colors outside DESIGN.md, 1 font size off
the ramp, 1 border-accent flag, 2 broken-image flags.

- **Verified real:** the 13 off-palette colors are the drift DESIGN.md itself names -
  `#4a90d9/#5cb85c/#d9534f/#f0ad4e/#9b59b6` in `party-roster.ts:8-12` (cool
  blues/greens/purples, no dark-theme variant), and the admonition palette in
  `tailwind.css:202,287-319` (`#eff6ff`, `#14532d`, `#7f1d1d`, `#78350f`, `#1e3a5f` plus
  a stray cool `#d0e0d6` in the light table stripe at line 202, where ADR 0005's stripe
  should be moss/warm).
- **False positives, verified in context:** `broken-image` x2 are regex literals inside
  `xml-card-passives.test.ts:1308,1314`, not markup. `border-accent-on-rounded` at
  `XmlCard.astro:738` is the DESIGN.md-documented 3 px HP cap. `rgb(0 0 0 / 0.08)` at
  `PartyView.astro:239` is a neutral chip-count badge, not a palette entry.
- **Coherent and specific:** `.char-*` (`XmlCard.astro:649-795`) is the strongest unit in
  the repo - Cinzel name, ScalySans meta, outlined gold pills, 45% arch portrait,
  tabular-numeral HP plate, all correctly inverted in dark. It is genuinely specific to a
  D&D statblock.
- **Interchangeable with an unrelated product:** everything below the header. The vitals
  tiles, ability grid, tag chips, tool inputs and filter chips are stock Tailwind
  (`bg-gray-50`, `text-gray-600`, `rounded-lg`, `shadow-sm`, `focus:ring-blue-500`). The
  same card would ship unchanged for a recipe app. The body is also 795 lines of
  repeated utility strings with no token layer, so the palette cannot be changed in one
  place.

## P1 - major (WCAG AA violations; fix before release)

### P1.1 Role chips fail contrast in both themes

- **Location:** `src/components/xml-viewer/party-roster.ts:8-12`, rendered at
  `PartyView.astro:93,119,150`
- **Category:** accessibility / theming
- **Impact:** chip text is set to the raw role color on a 12% tint of that same color.
  Measured against the light page: `#f0ad4e` 1.80:1, `#5cb85c` 2.23:1, `#4a90d9` 2.95:1,
  `#d9534f` 3.40:1, `#9b59b6` 4.01:1. On the dark card: `#9b59b6` 2.79:1, `#d9534f`
  3.31:1, `#4a90d9` 3.73:1. Every role chip on the party page - the primary scan
  affordance - is unreadable for low-vision players at the table, and the active filter
  state (color-only) fails with it.
- **WCAG:** 1.4.3 Contrast (Minimum) AA; 1.4.11 Non-text Contrast for the active border.
- **Recommendation:** move role colors into warm-palette tokens with a light and a dark
  step each, and stop using the hue as text color. Tint the background from the token and
  set the text to a text-strength partner (bark-600 light, parchment dark), as the card
  heading already does.
- **Command:** `/impeccable colorize`

### P1.2 HP plate micro-label at 3.40:1

- **Location:** `XmlCard.astro:740-746` (`.char-hp-label`, 9 px) and `:755-758`
  (`.char-hp-temp`, 10 px)
- **Category:** accessibility
- **Impact:** `#948985` on the white HP plate measures 3.40:1. "Hit Points" is the label
  above the single number a player looks up mid-session, at 9 px, on every card.
- **WCAG:** 1.4.3 AA.
- **Recommendation:** step the label to bark-600 `#605552` (6.68:1 on white). The temp
  value is secondary, so bark-500 is acceptable only at 4.5:1, which it is not - use
  bark-600 too.
- **Command:** `/impeccable colorize`

### P1.3 Dice-roller ability tile is a `div` with `@click`

- **Location:** `src/components/dice-roller/DiceRoller.astro:41-46`
- **Category:** accessibility
- **Impact:** selecting an ability to stage a swap is the tool's core interaction and it is
  mouse-only - no `role`, no `tabindex`, no key handler. A keyboard or screen-reader user
  cannot reach the swap feature at all. The nested re-roll `<button>` inside that div is
  also nested interactive content.
- **WCAG:** 2.1.1 Keyboard; 4.1.2 Name, Role, Value.
- **Recommendation:** make the tile a `<button type="button">` with `aria-pressed` for
  selection state, and move the re-roll control to a sibling rather than a descendant.
- **Command:** `/impeccable harden`

### P1.4 No `aria-live` region on any of the four interactive tools

- **Location:** absent from `dist/` for `current-party`, `character-search`,
  `dice-roller`, `character-creation` (verified: 0 matches for `aria-live`)
- **Category:** accessibility
- **Impact:** every value change in this product happens without announcement - point-buy
  scores and remaining points, dice results, search result counts, party filter results. A
  screen-reader user presses "+3" on Strength and receives silence, with no way to know
  whether it worked or how many points remain.
- **WCAG:** 4.1.3 Status Messages (AA).
- **Recommendation:** add a visually-hidden `aria-live="polite"` region to each island and
  write the changed value into it (point-buy: "Strength 14, 5 points remaining"; search:
  "12 characters found"; party: "Filter: Tank. 2 members").
- **Command:** `/impeccable harden`

### P1.5 Touch targets under 44 px in every interactive component

- **Location:** `PointBuy.astro` `w-8 h-8` (32 px) +/- buttons; `PartyView.astro:198-216`
  `.r3-chip` (~22 px); `CharSearch.astro:71-81` and `FeatExplorer.astro:81-89`
  icon-only clear buttons (~20 px); `DiceRoller.astro` re-roll button and the two
  `p-1.5` swap buttons (~24 px)
- **Category:** responsive / accessibility
- **Impact:** this is a phone-at-the-table product (PRODUCT.md principle 2). The point-buy
  +/- pair and the party role filters are the two controls most used mid-session, and both
  are well under the minimum, with the point-buy pair spaced `gap-3` apart so mis-taps cost
  a wrong score.
- **WCAG:** 2.5.8 Target Size (Minimum) AA.
- **Recommendation:** give each control a 44 px min hit area - `min-w-11 min-h-11` on the
  point-buy pair, and for the chips and icon buttons keep the visual size but expand the
  hit box with padding or a pseudo-element.
- **Command:** `/impeccable adapt`

### P1.6 White on `green-600` confirm button at 3.30:1

- **Location:** `DiceRoller.astro:110-116` (swap confirm)
- **Category:** accessibility / theming
- **Impact:** `#ffffff` on `#16a34a` measures 3.30:1, and the cancel button beside it is a
  24 px gray circle. The confirm/cancel pair guarding the only destructive action in the
  tool is the least legible thing on the page, and `green-600` is off-palette besides.
- **WCAG:** 1.4.3 AA.
- **Recommendation:** rebuild the pair on the sap/gold accent with a bark-black or
  parchment glyph, keeping the circular shape.
- **Command:** `/impeccable colorize`

## P2 - minor

- **Section labels are hover-only** - `XmlCard.astro:85,244-248,295,319` ("Vitals",
  "Abilities", "Passive Skills", "Saving Throws", "Overview") sit at `opacity-0` until
  `group-hover`. In the DOM but invisible to keyboard focus, never shown on touch. Use a
  persistent micro-label or a real `<h4>`. `/impeccable clarify`
- **Proficiency and spell-preparation marks are color-and-`title` only** -
  `XmlCard.astro:348,439-450,468-483,616-637`. The dots have no text alternative; `title`
  on a `<span>` is not reliably announced. Add visually-hidden text or an `aria-label`.
  `/impeccable harden`
- **Cool Tailwind scale across the card body and all tool inputs** -
  `XmlCard.astro:84,209,249-624`, `CompactAbilityGrid.astro:26`, `PointBuy.astro`,
  `FeatExplorer.astro`. DESIGN.md names this as the remaining debt ("the Card body is the
  remaining drift to pull back onto bark and sap") and the Warm-Only Rule forbids it. Nine
  of ten `gray-*` steps here are Tailwind's cool default, not the bark ramp.
  `/impeccable colorize`
- **Admonition palette is off-system and one stripe is cool** - `tailwind.css:202` uses
  `#d9e0d6/#d0e0d6` where ADR 0005 and the dark counterpart (`#404521` moss) imply warm;
  `tailwind.css:287-319` sets cool blue/green/red aside fills with no warm counterpart.
  `/impeccable colorize`
- **No `prefers-reduced-motion` handling anywhere** - verified absent from all of `src/`,
  while the code ships `animate-pulse` (infinite, `DiceRoller.astro:101`),
  `hover:scale-105`, `group-hover:rotate-180`, `duration-200` transitions, and a 400 ms
  admonition shadow ease. One `@media (prefers-reduced-motion: reduce)` block in
  `tailwind.css` covers all of it. `/impeccable animate`
- **No `x-cloak`, so Alpine-managed states flash** - verified absent from `src/`. On load,
  "No feats match your filters.", "Roll to generate", "No stats yet!" and the result log
  are all painted before Alpine boots, then vanish. Add `[x-cloak]{display:none}` plus the
  attribute. `/impeccable polish`
- **Cinzel loads from Google Fonts, render-blocking and third-party** -
  `astro.config.mjs:59-73`. Bookinsanity and ScalySans are self-hosted under
  `public/fonts/` per `docs/fonts-licensing.md`; Cinzel is not, and no `@font-face`
  declares it locally even though `tailwind.css:78` and `XmlCard.astro:685` both name it. A
  third-party stylesheet sits in the critical path of every page, on a site behind Zero
  Trust, and headings reflow on swap. Self-host Cinzel and preload it.
  `/impeccable optimize`
- **Duplicate `<h1>` on the party page** - verified in
  `dist/fantasy-grounds/current-party/index.html` (2 occurrences): Starlight renders the
  frontmatter title and `PartyView.astro:49` renders `partyName` as another `h1`.
  `/impeccable typeset`
- **"+0 temp" printed on every card** - `XmlCard.astro:236` renders the temp line
  unconditionally; verified `+0 temp` in
  `dist/fantasy-grounds/characters/abbath/index.html`. Guard on `tempHp > 0`.
  `/impeccable clarify`
- **Character pages visually hide the site header for everyone** - `[slug].astro:31-41`
  applies the visually-hidden recipe to `#_top` outside any media or screen-reader query,
  so sighted users lose the site title, nav and theme picker too, and the page is
  `--sl-content-width: 100%`. A character sheet becomes an orphan document with one text
  link back. `/impeccable harden`
- **Card data tables have no captions and sections have no headings** -
  `XmlCard.astro:334,416,501,543` and `<section title="Abilities">` at `:271` (a `title`
  attribute is not a label). Landmarks are unnamed. `/impeccable typeset`

## P3 - polish

- **~20 `window.*` globals** - `DiceRoller.astro` and `PointBuy.astro` each attach ten-plus
  functions to `window` purely so inline `x-data` strings can reach them. Collision-prone
  and untypeable. `/impeccable distill`
- **Dead file** - `src/components/feats-explorer/feat-explorer.css` is twelve comment
  lines and is not imported. `/impeccable distill`
- **Emoji glyph and off-ramp size** - `DiceRoller.astro:110` renders the dice glyph at
  inline `font-size: 2.25rem` (the detector's font-size finding); it is off-world next to
  the game-icons set used everywhere else. `/impeccable typeset`
- **Cool feat-tier chips** - `FeatExplorer.astro:100-101` uses `green-100`/`purple-100`/
  `blue-100` for Origin / Epic Boon / General. The text pairs pass contrast (6.49-7.39:1),
  so this is palette drift only, not an a11y failure. `/impeccable colorize`
- **Blue focus rings** - `CharSearch.astro:31,40,49` and `FeatExplorer.astro:31,42,53,64`.
  Measured 3.68:1 on white, which clears WCAG 2.4.11, so this is the documented "reads as
  generic SaaS" drift rather than a violation. `/impeccable colorize`

## Patterns and systemic issues

1. **No token layer below the card heading.** DESIGN.md exists and the `.char-*` block
   follows it exactly, but the other ~600 lines of card body are raw utility strings
   (`bg-gray-50 dark:bg-gray-900 border-gray-300`). A palette change is currently a
   multi-file find-and-replace, which is precisely why the migration stalled. This one gap
   drives the Theming score, the Implementation Integrity verdict, and 13 of the
   detector's 17 findings.
2. **Cool hues enter through data, not CSS.** The `party-roster.ts` role hexes and the
   admonition fills are the only places colors are chosen away from the design system, and
   both are invisible to a CSS-only review. Any future color needs a token, not a literal.
3. **Interactivity was built mouse-first.** The `div @click` tile, hover-only labels,
   sub-44 px controls, and total absence of `aria-live` are one pattern: the state changes
   were designed for a pointer and never given a non-visual or touch channel.
4. **Micro-labels were sized for density, not contrast.** The 9 px and 10 px labels are on
   the ramp by design, but the gray chosen for them was never checked against the surface
   they sit on.

## Positive findings

- The **`.char-*` heading system** is the reference implementation the rest of the site
  should be migrated toward: one closed stack, both themes inverted rather than redesigned,
  gold rule, arch portrait, tabular numerals.
- **Container queries** (`@container`, `@6xl`, `@7xl`, `@lg`) let the card reflow on its
  own width instead of the viewport's - the party grid and character page both get correct
  layouts from one component.
- **Contrast discipline elsewhere is genuinely good**: body text 10.38:1, meta 8.42:1,
  oxblood headings 12.56:1, gold on bark-black 5.50:1, all table stripes 5.86:1+, and every
  feat-tier chip pair clears 6.4:1.
- **Performance is close to the product promise**: 8 KB gz for the dice roller, 13 KB for
  the party page, 23 KB gz of JS on any page. Mermaid, cytoscape and KaTeX are code-split
  away from pages that do not use them (verified: zero mermaid references outside
  `fg-effects`).
- **Theming works at the token layer** - Starlight's inverted
  `--sl-color-white`/`--sl-color-black` convention is overridden correctly in both
  directions, and the accent swaps sage/sap per mode as specified.
- `aria-pressed` on the party filter chips and real `<label for>` on every tool input are
  already right and should be the template for the rest.

## Recommended order

1. `[P1]` `/impeccable colorize` - role-chip palette (light + dark steps, text no longer
   the hue), HP micro-label, green-600 confirm button, feat-tier chips, blue focus rings.
2. `[P1]` `/impeccable harden` - dice-roller tile to a real `<button>`, `aria-live` regions
   across all four islands, text alternatives for the proficiency/prepared marks.
3. `[P1]` `/impeccable adapt` - 44 px hit areas on the point-buy pair, filter chips, and icon
   buttons.
4. `[P2]` `/impeccable colorize` - the card body migration off `gray-*` onto bark/sap
   tokens, including the admonition and table-stripe literals in `tailwind.css`.
5. `[P2]` `/impeccable animate` - one `prefers-reduced-motion: reduce` block covering the
   pulse, scale, rotate, and shadow transitions.
6. `[P2]` `/impeccable optimize` - self-host Cinzel with a preload, and add `x-cloak` to
   kill the pre-Alpine flash.
7. `[P2]` `/impeccable clarify` - drop the "+0 temp" line, make the hover-only section
   labels persistent and real headings.
8. `[P2]` `/impeccable typeset` - the duplicate `h1` on the party page, and table captions
   on the card's four data tables.
9. `[P3]` `/impeccable polish` - remove the `window.*` globals and the dead
   `feat-explorer.css`.

Re-run `/impeccable audit` after fixes to see the score improve.
