---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [tooling, browser, agents, dev-time, testing, design-review]
---

# ADR-0012: Own the Design Review Captures with a Dependency-Free CDP Client

## Context and Problem Statement

[ADR-0011](0011-headless-browser-mcp-server.md) gave agents a headless browser and
closed the "no browser was available" gap. It did not close the gap the
impeccable design review contract actually cares about, which is *a capture at
an exact width, of a font that is genuinely loaded*.

The contract is exact. The vendored skill
(`skill/reference/new-work.md`, step 6) asks for `desktop.png` at 1440 wide
covering the full page and `mobile.png` at 390, in `.impeccable/review/`.
Nothing in the repo could produce those two files.

Three things stand between the ADR-0011 tool and a usable capture.

1. **The MCP server does not reliably hold the requested width.** Recorded as a
   single unreproduced trial in ticket #339 and confirmed here independently:
   after `resize_page` to 390x844, `window.innerWidth` reports **500**, and the
   returned image is `PNG image data, 500 x 2081`. The reply does not say so.
   A 500px image in a file named `mobile.png` is indistinguishable from a
   correct one in a directory listing, and it is exactly the kind of artifact a
   reviewer would then judge the mobile layout from.
2. **A capture can be taken in the wrong font and nothing says so.** The site's
   heading face is `Cinzel`, fetched at runtime from
   `fonts.googleapis.com` with `font-display: swap`, silently falling back to
   the self-hosted `Bookinsanity` (`--sl-font-heading` in
   `src/styles/tailwind.css`). After that fallback the headings have different
   metrics and different line lengths. There is no console error and no warning.
   The PNG looks fine.
3. **A full-page capture does not scroll the page.** Anything gated on entering
   the viewport is painted in its pre-reveal state. The design skill's own
   capture-validity rule says such an element reads as a *missing* element and
   gets "fixed" into a regression.

The cost has to be weighed against ADR-0007's binding constraint, which keeps
any headless browser out of the production build, and ADR-0011's, which keeps
the browser surface out of the manifest entirely.

## Decision Drivers

- The two contract captures, at exactly 1440 and exactly 390
- A capture must not be writable in a state a reviewer would call correct
- ADR-0007: no headless-browser dependency in the build
- ADR-0011: `package.json`, `pnpm-lock.yaml`, and `allowBuilds` stay byte-identical
- One command, not a documented sequence of browser tool calls
- The failure modes must be visible, not inferred from a file on disk
- Refuse a misleading capture rather than emit one

## Considered Options

- **Option A: keep using the MCP server, and document the widths to ask for** -
  reject the premise. The width is not honoured (measured: 500 for a 390
  request) and the tool cannot be made to gate on a font. A note in the docs
  does not turn a wrong-width image into a right one.
- **Option B: add Playwright or Puppeteer as a devDependency** - the ordinary
  choice, and the one ADR-0007 explicitly rejected. It puts a browser in the
  install graph, changes the lockfile, and makes `allowBuilds` a live question
  for every install.
- **Option C: a dependency-free CDP client on the runtime's built-in `WebSocket`**
  - zero new manifest entries, full ownership of viewport and capture clip, and
  room for the two gates the contract needs. Its cost is that it is a script an
  agent has to know the name of, so it ships with a Makefile target and a
  documented workflow.

## Decision Outcome

Chosen option: **Option C**, in `.opencode/lib/design-review/`, alongside the
existing plugin code, reachable as `make capture`.

### The dependency-free part is load-bearing

The client uses Node's built-in `WebSocket` and `fetch` and nothing else. The
boundary is verified the same way ADR-0011 verifies its own:

```sh
git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml   # must be empty
```

ADR-0007 and ADR-0011 are **not** amended or relaxed by this ADR. They hold for
the same reason they held before: nothing was added to the build, and the
browser is one already on the machine.

### Exact widths are owned twice, then measured

`Emulation.setDeviceMetricsOverride` decides the layout; an explicit
`Page.captureScreenshot` clip of the same width decides the image. Neither
alone is trusted, because the failure mode is a wrong-width file rather than an
error. So every file written is read back: `validateCapture` parses the PNG's
IHDR and refuses a file that is absent, empty, under 1KB, unreadable, or not the
width that was requested. Writes go to a `.part` sibling and are renamed only
after validation, so a crash cannot leave a half-written PNG at the path the
reviewer looks at.

### The font gate is a refusal, not a warning

Before any capture is taken, the command resolves `document.fonts.ready`, then
requires three independent signals for the display family: a `FontFace` whose
status is `loaded`, `document.fonts.check()`, and a width probe that renders the
same string in the display family and in a family that does not exist. The probe
is the decisive one, because it catches the case the ticket is about - a face
the browser is happy with while the fallback is what is actually painted.

If any signal fails, the command exits non-zero, names the font, names where it
comes from, names the check that failed, and writes nothing. The flag
`--simulate-font-cdn-outage` blocks the font CDN so the gate can be *tested*
rather than argued about.

### Entrance animation is neutralised before a full-page capture

`prefers-reduced-motion: reduce` is emulated, an `!important` stylesheet zeroes
animation and transition timing, and the page is scrolled end to end so every
`IntersectionObserver`-driven reveal has fired. All three are needed: the media
emulation alone only covers sites that opt into it, the stylesheet alone does
not fire an observer, and the scroll alone leaves a delay timer running.

### Browser resolution never downloads

In order: the `DESIGN_REVIEW_CHROME` environment override, then Chrome for
Testing builds already in a Puppeteer cache directory, then an installed
browser. The command reports which binary it used and from which tier.

An override that is set but unusable is a hard error, not a fall-through:
someone who named a binary meant it, and capturing with a different browser
than the one asked for is the same class of lie as a capture at the wrong width.
The *other* tiers are tried in turn, because a binary can exist, be executable,
and still never open a DevTools port - the full cached Chrome for Testing bundle
on the machine this was built on does exactly that, while the headless shell and
the installed Chrome both serve. Each skip is reported.

### The dev server is not a second lifecycle

If the target URL is unreachable the command fails and prints the documented
`astro dev --background` command. `--start-dev-server` opts in, and it shells
out to that same documented command and stops it with `astro dev stop`. No
second server lifecycle is introduced next to the documented one.

## Consequences

- Good, because the contract captures exist at all, at the exact widths, in one
  command, in the filenames the vendored skill's reviewer looks for.
- Good, because a capture in the fallback font is impossible to produce by
  accident. The highest-value behaviour in the ticket is a refusal, and it is
  exercised by a flag rather than left to inspection.
- Good, because a wrong-width or truncated artifact is reported rather than
  filed. The `500 x 2081` class of mistake is caught by reading the PNG, not by
  trusting the reply.
- Good, because below-the-fold content is captured revealed, with a fixture
  proving both halves: the same page captured without the warm-up is blank
  where the revealed element should be.
- Good, because the pure helpers (viewport parsing, artifact validation, font
  readiness, browser resolution) have unit tests that need no browser, so the
  decisions that decide whether a capture is believable are the parts under
  test.
- Good, because the dev-time boundary stays verifiable by `git diff` over three
  files, exactly as ADR-0011 left it.
- Neutral, because the wrappers are `.opencode/**`, which ESLint ignores. The
  code is commented to the standard of the rest of the repo, but no lint gate
  covers it.
- Neutral, because `DESIGN_REVIEW_CHROME` and `--start-dev-server` are two new
  knobs on a dev-time tool.
- Bad, because two capture paths now exist: this command and the ADR-0011 MCP
  server. The MCP server remains the right tool for exploration and for
  synthesized input; this command is the one that writes contract artifacts. A
  future agent that reaches for `take_screenshot` when it wanted a capture will
  get an unverified file, which is the same trap this ADR exists to close.
- Bad, because a cached Chrome for Testing build can exist, pass an executable
  check, and fail to serve, so browser resolution has a retry loop it would not
  otherwise need.

## References

- Issue #340: this decision
- Issue #339 / PR #346: the MCP server that preceded this, and the single
  unreproduced 500px trial this ADR measured for itself
- [ADR-0007](0007-mermaid-rendering-strategy.md): no headless browser in the
  build (unchanged; still binding)
- [ADR-0011](0011-headless-browser-mcp-server.md): the pinned local MCP server,
  whose Option C this record takes (unchanged; still binding)
- [ADR-0009](0009-phone-first-grids-and-touch-targets.md): the outstanding
  viewport-verification item that makes exact widths worth owning
- `.impeccable-skill/skill/reference/new-work.md` step 6: the capture contract
  this command implements
- `src/styles/tailwind.css`: `--sl-font-heading`, the `swap` display policy, and
  the self-hosted fallback
- `SPEC.md` Section 3: Rule of Least Client-Side JavaScript
