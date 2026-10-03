---
status: accepted
date: 2026-10-03
supersedes: null
superseded_by: null
tags: [fonts, typography, design-tokens, determinism, print]
---

# ADR-0019: Self-Host Cinzel so Heading Metrics Are Deterministic

## Context and Problem Statement

The site's display face arrives from a third-party CDN. `astro.config.mjs` declares
a `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` and a stylesheet
link to `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap`.
The `swap` display policy means the browser paints with whatever it has while the
face is in flight, and the declared fallback chain is `Cinzel, Bookinsanity,
Georgia, serif`.

Bookinsanity is a different typeface with different metrics. A heading rendered in
it is not a heading rendered slightly wrong, it is a different set of advances, and
therefore a different line length, a different wrap point and a different heading
height. The design system's heading steps, the measure every one of them is tuned
against and the whole Rulebook Spread's proportions were all derived from real
Cinzel.

The failure is silent in the worst way. Nothing errors. Nothing warns. A page
rendered during a network outage, a CDN change or a blocked third party comes back
looking entirely normal and simply is not the design. `make capture` already knows
this is the sharp edge here: it gates on `document.fonts.ready`, a loaded
`FontFace`, a true `document.fonts.check()` and a width probe, precisely because a
PNG taken after the fallback is not evidence about the design.

Two things follow, and they pull in opposite directions.

**The handbook cannot be produced from a face that may not be there.** The printed
artifact has to hold one layout. Two renderings of the same source, one with
Cinzel and one with Bookinsanity, are two different books, and nothing in the
current setup would tell a reader which one they were holding. This is a
prerequisite for the handbook rather than a handbook feature, which is why it lands
first and stands on its own merits.

**Vendoring the face is not a one-line change.** The typeface has to arrive from
the repository, at the same two weights the CDN serves today, declared alongside
the two faces already vendored in `public/fonts/`. Un-vendoring it later would
churn the font path across every page, not just the handbook, which is the cost
that makes this worth a record rather than a pull request.

## Decision Drivers

- A rendering of the site must not depend on a third party being reachable.
- Heading metrics must be identical on every machine and every run.
- The typeface already in use must not change: same family, same two weights, no
  italic added.
- The vendoring must not put a browser, a downloader or a build step into the
  build. ADR-0007, ADR-0011 and ADR-0012 are binding on that point and this ADR
  does not relax any of them.
- The existing tooling, which already knows how to gate on a font, must keep
  working unchanged.

## Considered Options

- **Leave the CDN and make the handbook's generator check the face before it
  prints.** Rejected. It makes the requirement everyone's problem instead of the
  site's problem: every page on the site keeps a render-blocking third-party
  request, and the fix only protects the artifact that happens to check. It also
  leaves the silent-fallback behaviour in place for every reader who is not part
  of this feature.
- **Vendored Cinzel at every weight and style Google serves.** Rejected. There is
  no Cinzel italic on the site today, and vendoring a weight nothing declares is
  repository weight bought for nothing. Two weights, 400 and 700, is what the site
  uses and what the CDN is asked for.
- **Drop Cinzel and design around Bookinsanity.** Rejected, and not for a
  typographic reason alone. Every heading step, every gold-rule pairing and the
  Rulebook Spread's proportions were derived against Cinzel's inscriptional
  capitals. Re-deciding the typeface to dodge a hosting problem inverts the cost
  entirely.
- **Self-host the face as an npm dependency.** Rejected. It would put a font in
  `package.json` and a copying step in the build, which is precisely the shape
  ADR-0011 and ADR-0012 keep out. The face belongs beside the two faces already
  vendored, as files in `public/fonts/`.
- **Vendor the face and drop the fallback chain.** Rejected. `Bookinsanity,
  Georgia, serif` stays. It is what a reader sees while the face loads and what a
  reader with a font failure sees, and removing it buys nothing.

## Decision Outcome

**Cinzel 400 and 700 are vendored into `public/fonts/` and declared from the
site's own stylesheet, alongside Bookinsanity and ScalySans. The three Google
Fonts tags - two `preconnect` and one stylesheet link - are removed from the site
head, and the display face is preloaded.**

Chosen, because it is the only option under which every rendering of the site
resolves the same heading metrics regardless of network conditions, and because it
costs the build nothing: the face is a file in the repository, not a step in the
pipeline.

Four things follow from that, and each is settled rather than deferred:

- **The same two weights, 400 and 700.** No italic is added. A weight vendored
  because a generator might reach for it later is a weight whose rendering has
  never been looked at.
- **The `preload` is what replaces the `preconnect`.** A preconnect to a host the
  site no longer calls is dead markup that reads as intent, and the two together
  would leave the head claiming a third-party dependency the site does not have.
  The preload goes on the face itself, because the face is now the render-blocking
  request.
- **The fallback chain is unchanged.** `Cinzel, Bookinsanity, Georgia, serif`
  stays exactly as written. Swapping who serves the face does not change what a
  reader sees when the face has not loaded, and the font gate is what makes the
  difference between "has loaded" and "has not" observable rather than assumed.
- **Vendoring Cinzel creates an attribution obligation, and it is recorded.**
  `docs/fonts-licensing.md` states that the family is vendored under OFL 1.1 and
  names what vendoring commits the project to. The row for Cinzel already exists
  and names Google Fonts as the source; what it did not say is that the bytes are
  now in the repository and the license travels with them.

### The tooling proof

Two existing gates are the evidence that this ADR was carried out rather than
declared, and both have to stay green:

- `make capture` still passes its font gate for Cinzel. The gate resolves
  `document.fonts.ready`, requires a loaded `FontFace`, a true
  `document.fonts.check()` and a width probe proving the face changes rendering.
  A vendored face that failed any of those would be a silent fallback wearing a
  local filename.
- `make measure ARGS='contrast'` still passes. Vendoring a face can shift a
  contrast finding by changing which glyphs are antialiased onto which pixels, and
  a passing contrast run afterwards is what says the swap moved nothing.

### What this does not decide

The print artifact's geometry, pagination and renderer are
[ADR-0020](0020-sheet-box-renderer.md), which is `proposed`. This ADR is
deliberately upstream of it and independent of it: self-hosting the face is a
correct change to the site whether or not the handbook is ever built, and it must
not be read as conditional on that decision.

### What is explicitly not amended

ADR-0011's browser boundary and ADR-0012's shared client and dev-server boundary
are unchanged and remain binding. Nothing is added to `package.json`,
`pnpm-lock.yaml` or `pnpm-workspace.yaml` by this ADR, and a pull request that
touched them would violate ADR-0011 rather than implement this decision.

## Consequences

- Good, because the display face stops being a render-blocking third-party
  dependency on every page. A reader on a locked-down network, an offline cache or
  a CDN outage gets the design rather than a plausible-looking substitute.
- Good, because heading metrics are now a property of the repository rather than
  of the moment the page was rendered. That is what makes a layout claim in any
  spec checkable at all, and it is the precondition the handbook's fixed-size
  sheets assume.
- Good, because `make capture`'s font gate now proves something stronger. Before
  this ADR a green gate could be green because the CDN answered; after it, a green
  gate means the vendored file is genuinely the face being rendered.
- Good, because the typeface is unchanged, so nothing in DESIGN.md's type scale,
  the gold-rule pairings or the Rulebook Spread's proportions needed re-measuring.
- Bad, because vendoring commits the project to the license. OFL 1.1 permits it
  and requires the license and attribution to travel with the redistributed font,
  so the bytes in the repository carry an obligation the CDN arrangement did not.
  `docs/fonts-licensing.md` is where that obligation lives and it has to be kept
  current if the family is ever replaced.
- Bad, because a vendored face can now rot silently. The CDN version moved
  upstream on its own; the vendored copy does not. A Cinzel revision that fixed a
  glyph will not arrive on its own, and nothing will fail when it is missed. This
  is the accepted cost of determinism, and the font gate catches a missing face
  rather than a stale one.
- Bad, in the smallest way: the repository grows by two font files, in a project
  that is otherwise text. They are a few tens of kilobytes, which is the same
  trade `public/fonts/` already made twice.
- Neutral, because the head loses three tags and gains one. `git diff` on
  `astro.config.mjs` reads like a net simplification, which is roughly what it is.
- Neutral, because no page changes what it shows. Every measurement in this
  project taken with the CDN answering still holds, because the CDN was serving
  the family this ADR vendors.

## Links

- [ADR-0011](0011-headless-browser-mcp-server.md) - the browser boundary this ADR must not disturb, and the manifest diff that proves it did not
- [ADR-0012](0012-dependency-free-cdp-capture-client.md) - the font gate and the shared browser stack this decision is verified through
- [ADR-0020](0020-sheet-box-renderer.md) - the downstream print decision this one unblocks