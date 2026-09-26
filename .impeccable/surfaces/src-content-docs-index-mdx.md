---
version: 1
slug: "src-content-docs-index-mdx"
primary_target: "src/content/docs/index.mdx"
related_targets: []
---

---
scope: src/content/docs/index.mdx (site index, `splash` template)
mode: Read - rulebook wayfinding
adr_constraints:
  - docs/adr/0009-phone-first-grids-and-touch-targets.md
  - docs/adr/0012-dependency-free-cdp-capture-client.md
---

# Surface brief: D&D Companion index

## Audience, job, action

A player at the table, on a phone, mid-session, who needs one house rule or one
tool right now. Job: find the rule or open the instrument. Action: tap a
destination. Proof: the 15 real routes, each with a description that says what
is actually in it. Constraints: phone-first (ADR-0009), no marketing gloss, no
slogans, no invented value props, warm bark/gold world only, splash hero block
untouched.

## Direction

**The Rulebook Spread.** Chosen structure, index 3 of the grounded list, seed
key `773a4ec3`, dealt lead (THE ROLL). Code-led, so no comp exists; the
ambition lives in FIRST VIEWPORT and SIGNATURE INTERACTION below.

Memorable moment: the gold gutter rule down the centre of the desktop spread,
which on a phone becomes a sticky left spine carrying the part numeral and
scroll progress - the page keeps telling you which part of the rulebook you are
in, the way a thumb-reachable book margin does.

Rejected: The Ledger (too little differentiation, hairlines read as a plain
list on a phone); The Rulebook Contents (closest to the incumbent link list, so
it risked re-setting the same thing).

## Resolved at finish

Three of these were open questions before the build; each is now settled by a
measurement, and the reasoning is kept so a later session does not re-open them
by intuition.

- **The spine at 320px: it stays.** It costs 28px of a 320px line, and it is the
  only position indicator on a page that is 2957px tall on a phone. Measured
  legible at 320 and 390, and `make measure overflow` is clean at 320/360/390/640.
  The two marginalia columns beside it were narrowed to 1.25rem below `sm` so the
  description keeps its measure at 320, where folio plus icon had been taking a
  quarter of the line.
- **The tools panel's heading: it is "Tools", a part title, and it sits outside
  the panel box.** "At the Table Right Now" was written as working copy and was
  not used - it is a phrase, and the page's own voice is declarative. Putting the
  heading inside the raised box also put the panel's border a third of a line
  above the left leaf's cap-height, so the two leaves opened out of register;
  level with the two headings on the left, the spread opens on one line. The
  panel's 3px cap now closes the heading instead of the box carrying it.
- **The desktop gutter numeral: retired, and the fill carries position alone.**
  The contract's SIGNATURE INTERACTION already said desktop shows the fill
  rather than the numeral, so this discharges it rather than breaking it.
  Measured reason: the left leaf is about 1.3 viewport-heights tall, so a probe
  line near the top of the screen never gets past Part I's start and the numeral
  sat on "I" for the entire scroll. A readout that never moves is a stuck label,
  and on the open spread both leaves are visible at once, so it has nothing left
  to disambiguate. On a phone the sheet is 2957px against an 844px viewport and
  the numeral does the real work, cycling I to II to III.

## Direction contract

THESIS: An open rulebook spread, not a link list. The page refuses the category
default of a grid of destination cards on a neutral ground: it is one printed
sheet, the part owns the left leaf, the tools occupy the standing right-hand
panel a table always reaches for, and a gold gutter rule binds them.

OWN-WORLD: The committed DESIGN.md world, unchanged - bark ramp neutrals
(bark-100 #f8f6f5 to bark-black #1b1716), Oxblood #58180d in light and Gold Leaf
#c68000 in dark for headings, gold rule #c9ad6a / #867347 as the only rule
weight, parchment #d4c4a8 body ink. Cinzel for part titles and destination
names, Bookinsanity for prose, ScalySans for numerals, folios and the use cue.
8px radius, card-rest to card-hover, the 45% arch reserved for ability tiles
only. No new colour, no new face, no glass, no cool gray.

STORY: The visitor understands this is one household's settled rulebook plus the
instruments that run it, believes every entry is already decided rather than
proposed, and acts by tapping a numbered entry. Part One is what the game is,
Part Two is what to look up, Part Three is what to hold in your hands.

FIRST VIEWPORT: The untouched splash hero (dragon and dice, both themes, the
existing tagline) fills the opening. Immediately below, the spread begins:
desktop is two leaves divided by a 2px gold gutter rule - left leaf carries
`I HOUSE RULES` in Cinzel over the gold rule with six numbered contents entries
beneath it, then `II REFERENCE` with three; right leaf carries `III TOOLS` in
the same Display treatment, level with the two on the left, over a recessed
bark panel with a 3px Oxblood cap holding the six tools as rows of at least
44px. The panel is sticky: it holds station while the rulebook scrolls past.
At 390 the two leaves stack in reading order (parts, then the panel) and a 28px
sticky left spine shows the current part numeral in Cinzel above a gold rule
that fills with scroll. No action button anywhere: the whole surface is the
index, so the primary action is the first entry under Part One.

Two amendments, both made during the build against the version first written
here and both settled by measurement rather than taste. The tools panel's
heading moved out of the panel box and level with the other two, because inside
it the panel's border sat a third of a line above the left leaf's cap-height and
the leaves opened out of register. The desktop numeral was retired, leaving the
fill as the gutter's whole desktop expression, because the left leaf is about
1.3 viewport-heights tall and a probe near the top of the screen never gets past
Part I's start - the numeral could not have moved. Both are in *Resolved at
finish* with the numbers.

SIGNATURE INTERACTION: The gutter spine. One rAF-coalesced scroll pass picks the
last part the reader's probe line has reached and writes its numeral and the
scroll fraction onto the fill; CSS transitions the numeral's colour and scales
the fill from the top. Positions come from `offsetTop` and never from
`getBoundingClientRect`, because a stuck element's rect is pinned and adding
scrollY to it manufactures motion for an element that is not moving. A part
starts at the later of its own top and the bottom of the part before it, which
is what makes the two leaves, whose Parts I and III share a line, resolve to one
reading order - and which returns the part's own top on a phone, where the parts
are a single column. Progress runs from the sheet's top reaching the bottom of
the viewport to the bottom of the page; measured 0.05 to 1.00 monotonic at 1440
and 0.10 to 1.00 monotonic at 390. The repo's global reduced-motion block zeroes
the transition, so the reduced-motion path needs no branch of its own. This is
the only motion on the page.

FORM: The chosen form is the open rulebook spread, position 3 on the ordered
grounded list of seven, seed key `773a4ec3`, dealt as the lead under THE ROLL.
Code-led: no comp, no comp-diff, ambition carried by FIRST VIEWPORT and SIGNATURE
INTERACTION above and audited there at finish.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance
