# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The whole table for a homebrew D&D 5e campaign: the players and the DM.
They use it live during a session for fast rule and character lookups, and
between sessions for character building, leveling, feat and skill choices, and
campaign prep. Access is mixed: most pages are open, while one or two pages are
private to the table.

## Product Purpose

D&D Companion centralizes the campaign's house custom rules, balance patches,
and essential mechanics, and hosts a Fantasy Grounds character viewer. It exists
so the table has one consistent, authoritative reference instead of scattering
rulings across notes, books, and chat. Success means rulings stay consistent and
gameplay is streamlined.

## Positioning

A single companion that pairs the campaign's own homebrew rule fixes with
shareable Fantasy Grounds character sheets, so the table can consult both the
rules they actually play by and each other's characters in one place. A generic
rules site or the official books could not carry this table's rulings or its
parsed sheets.

## Operating Context

- Homebrew D&D 5e campaign; the rules are the campaign's "fixes" and balance
  patches layered on the base game.
- Fantasy Grounds is the table's VTT; character sheets originate as exported
  Fantasy Grounds XML.
- Sessions happen at a table; the site is read on the devices people bring
  (phones and laptops) and needs to be quick to search and scan mid-game.
- The site is a private GitHub repo deployed as a static site behind Cloudflare
  Zero Trust email OTP, with most pages open to the table and a small number
  kept private.

## Capabilities and Constraints

- Static-first SSG (Astro + Starlight); every page ships as HTML and CSS.
- Near-zero client JavaScript is a product promise, not just a technique:
  interactivity lives in small, self-contained Alpine.js islands and no
  framework runtime is shipped.
- Four interactive tools: Dice Roller (4d6-drop-lowest), Feat Explorer
  (filter by ability, book, and level), Point Buy (27-point 5e calculator), and
  the Fantasy Grounds XML Character Viewer.
- The Fantasy Grounds XML is parsed at build time into `CharacterData`
  (`src/generated/characters.json`, rebuilt on every dev start and build);
  Character pages are prerendered, with no server code at runtime.
- Hosting is Cloudflare Workers static assets; there is no request-time
  application server.
- Durable domain vocabulary lives in `CONTEXT.md`; use it in code, tests, and
  docs.
- Undecided: the exact set of pages that stay private is not yet fixed.

## Brand Commitments

- Product name: "D&D Companion".
- Voice: light tabletop flavor ("Roll for Initiative!"), but the rules content
  itself is plain and precise.
- No public logo, campaign name, or external brand identity exists; do not
  invent one.

## Evidence on Hand

- Real Fantasy Grounds character sheets and avatars: `src/assets/` and
  `public/fg/avatar/`; current party roster in `public/fg/party.json`
  ("Stats & Filters", six members with roles).
- Self-hosted fonts under `public/fonts/`, licensed and documented in
  `docs/fonts-licensing.md` (Bookinsanity, CC-BY-SA 4.0; Cinzel, SIL OFL 1.1).
- Architecture decisions under `docs/adr/` and specs under `docs/specs/`.
- Absent, and not to be fabricated: testimonials, customer counts, pricing,
  benchmarks, press, or public user metrics.

## Product Principles

1. One authoritative source: when a ruling exists here, it is the version the
   table plays by.
2. Fast at the table: lookups and scans must work on a phone mid-session.
3. Static and quiet: ship HTML and CSS; add JavaScript only as a scoped island.
4. Private where it matters, open where it helps: keep table-only material
   gated without hiding the rules that everyone can share.
5. Preserve campaign truth: this table's homebrew and its real characters are
   the content, never invented ones.
