---
version: 1
slug: "src-components-feats-explorer-featexplorer-astro"
primary_target: "src/components/feats-explorer/FeatExplorer.astro"
related_targets: ["src/content/docs/dnd-tools/feat-explorer.mdx"]
---

---
name: Feat Explorer
primary_target: src/components/feats-explorer/FeatExplorer.astro
related_targets:
  - src/content/docs/dnd-tools/feat-explorer.mdx
  - src/components/feats-explorer/feat-filter.ts
  - src/components/feats-explorer/feat-data.js
visitor_mode: Operate
---

# Feat Explorer

## Scope and visitor mode

Operate. 219 feats, four filters, no session state worth keeping. One page, one
job: get to the feat you are considering, or check what a feat requires, in
seconds, on a phone, mid-session.

## Audience, job, proof, constraints

- **Audience:** the campaign's players and DM, at the table and between sessions.
- **Job:** find a feat by name, or narrow 219 down to the ones that raise an
  ability at a level they can take.
- **Action:** type a name, or set a filter; the list re-runs and the count says
  how many survived.
- **Proof:** the real feat records, unedited. 219 of them, with their real books,
  levels, ability increases and prerequisites.
- **Constraints:** Alpine island only (PRODUCT.md's near-zero-JS promise);
  44x44px targets and the 16px input floor (ADR-0009); the search box stays
  visible on a phone and the three selects stay behind the disclosure toggle,
  because four stacked full-width controls pushed the first result off the
  screen; the fuzzy name match stays Levenshtein-based.
- **Data truth, decided with the user:** `description` is absent on all 219
  records, so the slot renders only when present. No line of feat copy is
  invented to fill it.
- **Scope of the redesign, decided with the user:** the elements stay (search,
  three filters, the count, the clear, the cards and every field on them); the
  arrangement and the surface are free. The world is not: the Tool Panel
  material, the palette, the three faces, and a surface that inverts per theme.

## Chosen direction and memorable moment

**LOCKED: 1, Leather Codex.** Three variants went to the user on the built page -
Leather Codex, Feat Register, Campaign Board - and the Leather Codex is the one
that ships. The other two and the pre-existing grid were removed from
`FeatExplorer.astro`; one root remains, `data-fx="codex"`, and there is no
variant buffer, no `[data-impeccable-variants]` wrapper, and no per-variant
palette left behind. **The name is now entirely historical.** Two later passes on
the user's instruction stripped it: first the binding (no folio, no stitched
spine), then the leather (no parchment tint, no mottle, no wax ribbon). What
ships is the Tool Panel with a bigger job. Read the contract below, not the
variant's name.

**Memorable moment:** the page, not the wall. 219 feats are not 219 cards. They
are 219 catalogue entries in one panel - 2-up on a single Tool Panel surface,
each stamped with a wax-seal medallion carrying its tier, and one 3px cap over
the top edge to say "instrument" once. The memorable moment is that the panel is
*the same panel* as Point Buy's, at a scale that fits 219 rows: the user opens
the two tools side by side and finds one material, not two that resemble each
other.

## Unresolved decisions

None. The arrangement is locked (see above).

## Direction contract

**THESIS.** The explorer is a panel of printed entries, not a grid of cards. It
refuses the uniform tile wall - name in bold top-left, chip top-right, muted meta
in a footer, 219 times over - in favour of printed catalogue entries, where each
feat's name carries a wax-seal tier medallion, its prerequisite is its own line
beneath the name, and the tier and book close the entry above a hairline rule, so
a player reads the list the way they read a catalogue and the count and the
filters are the only things on the page that have to be looked at deliberately.

**OWN-WORLD.** The Tool Panel, the material Point Buy and the Dice Roller are
made of: Bark 100 stepping to Bark 800, a 1px Gold Rule border stepping to Gold
Rule Dark, an 8px radius, card-rest in light and no shadow in dark, the 3px
accent cap (Oxblood in light, Gold Leaf in dark), and the head built as the Card
Heading - Cinzel 1.35rem/600 in the theme's heading ink over a ScalySans 0.8125rem
uppercase 0.04em meta line, closed by a 2px gold rule at its own lower edge.
Cinzel names, Bookinsanity prose, ScalySans for every label and figure, tabular
numerals. The dotted leader from the Ledger Panel, shared, not re-invented.

**This surface IS the Tool Panel.** `--fx-page` is `--pb-surface` (Bark 100 /
Bark 800) and `--fx-card` is `--pb-raised` (Bark 200 / Bark 700). The edge,
radius, shadow, cap and head rule are the panel's own. It holds **no private
value of any kind** - no hex, no private ramp - and that discipline started as a
correction (the first build shipped thirteen hand-picked hexes and read as a
different website from the two tool panels it sits beside) and then became
literal: the user removed the material that was left. What is shared and what is
a tint: the rule and the 2px head rule are Gold Rule and Gold Rule Dark, the
focus ring is Bark Black, the field is a 40% Parchment mix over Bark 100, the
chip is Gold Rule at 16% over the card, and the three seal inks are Moss 800 /
Gold / Oxblood, with Moss 100 / Gold / Parchment-lifted Oxblood in dark.

**What the user removed, in order.** The folio ("Folio N of 219 entries" is the
bindery's word) and the 2px radius; then the stitched spine, the one thing that
made the surface read as a page in a binding; then the wax ribbon, described as
"the 2 lines on the right part of the border" - two 6px tongues reading as a
doubled border rather than as an ornament; and then the **parchment itself**: the
25% Parchment page tint and the three-tile mottle plus 7px fibre layer. Do not
put any of it back. `::before` (the cap) is the **only** pseudo-element the root
draws - one accent on this surface, and it is the cap.

**Removing an ornament means removing its reservation.** The right padding was
2rem against 1.75rem on the left, to clear the ribbon's 24px reach, with a
comment saying so. It is now symmetric: 1.5rem / 1.75rem, and 1.25rem all round
below `sm`. A phantom gutter on one side of a panel reads as accidental
misalignment, which is worse than the ornament it was reserving space for.

**STORY.** The visitor narrows 219 feats to the handful they can take at their
next level, reads what each one raises and what it requires, and leaves with a
name they can write on a sheet. Nothing on the page is a decision aid they did
not ask for.

**FIRST VIEWPORT.** The page head: `Feat Codex` in Cinzel over the count on its
own baseline - the one live region on the component - closed by a 2px gold rule.
Beneath it the **filter line**, one wrapping flex row: the search field, the
disclosure toggle below `sm`, the three selects, and the clear control at the
trailing edge. The clear control is a **sibling of the panel, never a child**:
below `sm` the panel is collapsed, so a clear inside it would be unreachable
until the user opened the filters. Then the **tier legend** - a `dl` of the
three seal marks and their names, real text, not `aria-hidden`, outside the
collapsible panel. Then the entries: 2-up catalogue cards (auto-fill, `minmax(min(100%,
17rem), 1fr)`), each a name with its wax-seal medallion, the prerequisite as a
second line under the name when there is one, ability chips, and the tier and
book closing the card below a hairline rule.

**FORM.** Locked, 1 Leather Codex, with the leather taken back out too. It is the
Tool Panel - 8px radius, 1px Gold Rule, 3px cap, 2px head rule, symmetric
padding - holding 2-up catalogue cards, each with a wax-seal tier medallion. The
prerequisite is a second line beneath the name, not a fifth column - a column
gives the longest string in the dataset a narrow track, and a narrow track is
what makes a phone page scroll sideways.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Constraints found by measurement, not by looking

Three things in the locked arrangement were wrong on the built page and are
fixed. They were invisible while the variant buffer was in place, because the
panel being measured was a hidden one.

- **The wax ribbon's gutter is gone with the ribbon.** The first version of this
  note is the wrong instruction now, and it is kept here because the shape of the
  mistake is worth not repeating: the ribbon reached 24px in from the border box -
  an 8px offset, a 6px bar and a 10px box-shadow tongue - and at the 16-24px of
  right padding an earlier variant carried, the tongue sat *under* the count line,
  a decorative element over live text. The fix at the time was to hold the right
  padding at 2rem so the ribbon had a gutter of its own. The ribbon is now gone,
  so the padding is symmetric, and the standing rule is the general one: **a
  removed ornament takes its reservation with it.** A 4px phantom on one side of
  a panel is a visible misalignment, not a subtle one. A test asserts both sides
  match, in both bands.
- **The Level select is 7.5rem, not 6rem.** The custom caret reserves 2.25rem on
  the right, and at 6rem that left a 46px text box against a 60px "All Levels" -
  the control clipped its own default label. Book stays at 12rem; a selected
  long book name still clips in the closed control, which is what a native
  select does and the full value is in the dropdown.
- **Two heading colours were arriving from outside.** `tailwind.css` sets
  `.sl-markdown-content :is(h1..h6){ color }` and its dark counterpart *without*
  the `:not(:where(.not-content *))` guard every neighbouring rule in that file
  has, so both reach inside this component - and the dark one is
  `:root[data-theme='dark'] .sl-markdown-content :is(h1..h6)` at (0,3,1), which
  beats a class-qualified rule. The feat name was therefore rendering in Gold on
  Bark 700 in dark: 3.64:1, under AA. Both headings now set their colour with an
  element-qualified class that out-specifies it. The feat name is Ink rather than
  the heading accent, because the seal is the card's colour marker. The better
  fix is to add the missing guard to those two rules in `tailwind.css`, which
  would reach every other `not-content` component too; that is a separate change.

The worst-case prerequisite in the dataset is 105 characters including its
label ("Master of Magic feat. Spellcasting ability score 18+. Arcane spellcasting
or Divine spellcasting."). At 320px it wraps to four lines inside a 2-up card's
measure and no page scrolls sideways at 320, 360, 390 or 640.


