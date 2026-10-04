## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Verification

Run these from the repo root before opening a PR:

```
pnpm lint        # ESLint (Astro-aware, zero warnings allowed)
pnpm typecheck   # Astro diagnostics; use CI=true pnpm typecheck for noninteractive runs
pnpm test        # Vitest unit tests
pnpm build       # Production build
```

## Architecture Decisions

- Location: `docs/adr/`
- Index: `docs/adr/README.md`
- Format: MADR with YAML front matter
- Only `accepted` ADRs are binding. Check status before relying on a decision.

## Spec-Driven Development

Before implementing any feature:

1. Read `docs/specs/README.md` to find a relevant spec.
2. Match your task to specs via **tags** and **description** - only load the relevant spec.
3. Read the ADRs listed in `adr_constraints` front matter.
4. Implement per the spec's implementation plan.
5. If a new architectural decision was made, draft an ADR and update the index.
6. When done, set spec `status: archived`. Do not delete the folder.

Template: `docs/specs/_TEMPLATE.md`

## Agent skills

### Setup

The [impeccable](https://github.com/pbakaus/impeccable) design skill is vendored as a git submodule at `.impeccable-skill`, pinned to one commit. A fresh clone must check it out before the skill resolves, otherwise the committed symlink at `.opencode/skills/impeccable` dangles:

```
git submodule update --init --recursive
```

The Makefile wraps this and the relink step:

- `make submodule-init` - check out the pinned submodule, then link it if needed
- `make submodule-update` - bump to upstream HEAD, then link it if needed
- `make submodule-link` - link only; pass `IMPECCABLE_PROVIDER=claude` (or another harness) to change agent

Never run `git submodule add` for `.impeccable-skill`. The gitlink is already committed, so adding it again fails with `already exists in the index`. To move the pin, use `make submodule-update` and commit the gitlink.

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

**Always** read `docs/agents/issue-tracker.md` before publishing tickets. Use `gh issue create`, never write local `.scratch/` files unless the tracker is explicitly set to local markdown. Publish **all** tickets, including blocked ones - blockers indicate ordering, not whether to create the ticket.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. ADRs live in `docs/adr/`. See `docs/agents/domain.md`.

## Writing Style

- Never use the em dash "—". Use plain dash "-" instead.
- Starlight markdown admonitions: only `:::note`, `:::tip`, `:::caution`, and `:::danger` are supported. Do not use `:::info` or `:::warning`.
- In a house-rule page, a horizontal rule means "start a new sheet" in the printed
  Handbook, and it needs a **blank line above it**. That is a parser constraint
  rather than a style one: in CommonMark a rule on the line immediately after
  paragraph text is a setext heading level two rather than a rule, and the
  weapon-properties table reader treats a lone `---` after a table's last data row
  as a table separator, which silently deletes that row and fails four assertions.
  [The guard](src/content/handbook-sheet-breaks.test.ts) walks every
  `src/content/docs/dnd/` page and fails on a rule that does not have one.

The em dash rule is enforced by a test, not by good intentions. See
[the guard](src/content/prose-style.test.ts) and the covered surfaces below.

### Covered prose surfaces

The rule is tested over the prose this project authors: the root documents
(`README.md`, `AGENTS.md`, `CONTEXT.md`, `SPEC.md`, `PRODUCT.md`, `DESIGN.md`),
`docs/adr/`, `docs/agents/`, `docs/audits/`, `docs/specs/` including the index and
the template, and the site content under `src/content/docs/`. Adding a new
maintained document means adding it to the `proseSurfaces` list in that test;
a pattern that matches nothing fails, so a stale path cannot turn the guard
into a no-op.

The test exempts the line above, because the rule has to quote the character it
bans. The exemption is an exact-line allow list, and a test asserts it covers
every em dash in `AGENTS.md` and nothing else, so it cannot quietly widen.

## Temporary Files

Every temporary file (PR bodies, issue bodies, scratch files, notes, etc.) goes to `tmp/` at the repo root - write there first, e.g. `tmp/pr-<slug>.md`. That directory is gitignored; do not use `/tmp` or other system paths.

Nothing there is kept forever. `make clean-tmp` deletes files under `tmp/` that have not been touched in more than three days, then the directories those files emptied; `make clean-tmp ARGS='-n'` lists what it would remove without deleting anything, and `make clean-tmp TMP_RETENTION_DAYS=1` sets a different age. Nothing is recorded in the repository when a file goes, so anything a later session needs has to live in a commit rather than in `tmp/`.

## Browser evidence (dev-time only)

An agent can open a page in a real headless browser and read a screenshot back. The
browser tools come from a pinned local MCP server registered in `opencode.json` at the
repo root, which is the only discovery mechanism that works here: the vendored
`impeccable` skill's `allowed-tools` front matter is inert in OpenCode. See
[ADR-0011](docs/adr/0011-headless-browser-mcp-server.md).

### Workflow

1. Start the dev server in background mode: `astro dev --background`. It manages
   itself; use `astro dev stop`, `astro dev status`, and `astro dev logs`.
2. Call the `chrome-devtools_*` tools: `new_page` to a `http://localhost:4321/...`
   URL, then `take_screenshot` with an explicit `filePath`.
3. Read the written PNG back with the Read tool.

The background dev server is the one lifecycle to use; do not start a second
server beside it. The server is headless and reuses a single page, so a
desktop-then-mobile pair is two `resize_page` calls and two `take_screenshot`
calls on the same `pageId` - never a re-navigation.

`--filesystem-root` is what lets `take_screenshot` write inside the repository.
It holds an **absolute path**, so if you clone the repository elsewhere, edit that
one value in `opencode.json` before expecting writes to land.

### The dev-time boundary

Nothing here enters the build. `package.json`, `pnpm-lock.yaml`, and the
`allowBuilds` map in `pnpm-workspace.yaml` are untouched, and the server resolves
via `pnpm dlx` into a cache outside the repo. This is what keeps
[ADR-0007](docs/adr/0007-mermaid-rendering-strategy.md) satisfied - its
no-headless-browser-in-the-build constraint holds *because* nothing was added to
the build. Do not add Playwright or Puppeteer to the manifest to "fix" a browser
problem; verify the boundary instead with `git diff -- package.json pnpm-lock.yaml
pnpm-workspace.yaml`, which must come back empty.

The browser is one already installed on the machine (`PUPPETEER_SKIP_DOWNLOAD` is
set for that reason). Nothing downloads a browser.

### After changing any flag: grep the stderr

**Unknown flags do not fail.** The server logs a single `Unknown arguments:` line
to stderr and starts anyway on the default, so a typo in `--headless` silently
launches a *visible* browser. That line is the only signal, it appears in stderr
only (never in the server's `--log-file`, and not in `opencode --print-logs`), and
so must be checked against captured stderr:

```
pnpm dlx chrome-devtools-mcp@1.10.1 <the flags from opencode.json> </dev/null >/dev/null 2>tmp/mcp-stderr.log
rg "Unknown arguments" tmp/mcp-stderr.log    # expect no match
```

Also verify by capture, not by inspection: confirm a screenshot actually exists
inside the repository and is a real image. A write rejected as outside the
workspace roots and a successful write look similar in a tool's reply, so check
the file, not the message.

Do not change `--screenshot-format`. The server rewrites the extension to match
the requested format, which would silently rename the files the design review
contract depends on. That belongs to the wrapper capture command, not to this
config.

### The font gate, and what it is not

The site's display face is self-hosted (ADR-0019), so a rendering no longer
depends on a third party answering. That removes the caveat that used to sit
here: a capture could previously be taken after a silent fallback to a
self-hosted face, with the wrong heading metrics and the wrong line lengths, and
**nothing errored and no console warning was emitted**.

What replaced it is the gate below. It refuses rather than warns, which is a
stronger property than the one it took the place of: a missing face produces no
capture at all, not a wrong one.

A green gate still says nothing about a *real* device, and `make capture` is
still a photograph rather than a measurement. See the measuring section below
for the questions a PNG cannot answer.

### The capture command, for contract artifacts

The MCP server is the tool for exploration and for synthesized input. It is not
the tool for writing a design review artifact, because it does not reliably hold
a requested width: after `resize_page` to 390x844 the page reports
`window.innerWidth` of 500 and the returned image is 500 wide, with nothing in
the reply saying so ([ADR-0012](docs/adr/0012-dependency-free-cdp-capture-client.md)).

For the contract captures, use:

```
make capture
```

That writes `.impeccable/review/desktop.png` (full page, exactly 1440 wide) and
`.impeccable/review/mobile.png` (exactly 390) - the exact filenames the
vendored skill's reviewer looks for - in one invocation. The underlying command
is `node .opencode/lib/design-review/capture.mjs`; run it with `--help` for the
options.

What it does that a `take_screenshot` call cannot:

- **Gates on the display font.** It resolves `document.fonts.ready`, then requires
  a loaded `FontFace` for `Cinzel`, a true `document.fonts.check()`, and a width
  probe proving the face changes rendering. If any of those fail it exits
  non-zero, names the font, and writes **no** capture. That is the resolution of
  the network-font caveat above, and it is a refusal rather than a warning.
  `--simulate-font-cdn-outage` blocks the CDN. The face is local now, so the
  gate stays green through it, and that green is what demonstrates the capture
  no longer depends on a third party answering.
- **Owns the exact width**, then reads it back out of the PNG it wrote. A file
  that is absent, empty, under 1KB, unreadable, or the wrong width is reported
  as a failure rather than filed.
- **Neutralises entrance animation** before a full-page capture: reduced motion
  is emulated, animation and transition timing are zeroed, and the page is
  scrolled end to end so viewport-gated reveals have fired.

Browser resolution never downloads anything, in this order: the
`DESIGN_REVIEW_CHROME` override, then Chrome for Testing builds already in a
Puppeteer cache directory, then an installed browser. The command prints which
binary it used. A `DESIGN_REVIEW_CHROME` that is set but unusable is a hard
error rather than a fall-through.

If the dev server is not running the command **fails** and prints the documented
`astro dev --background` command. It does not start a second server lifecycle.
`--start-dev-server` is the explicit opt-in, and it shells out to that same
documented command.

Like everything else browser-related here, it is dev-time only. It adds nothing
to the manifest, so `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml`
must still come back empty.

### Measuring a page instead of photographing it

A resized viewport and a screenshot verify layout. They never verify a contrast
ratio and never verify a gesture. For those, use:

```
make measure ARGS='<overflow|contrast|tap|pointer> [options]'
node .opencode/lib/design-review/measure.mjs --help
```

- `overflow` reports, per width, whether the page scrolls sideways and which
  element is too wide, with a selector path and a right edge. It defaults to ADR
  0009's widths: 320, 360, 390, 640.
- `contrast` returns a WCAG ratio per selector, sampled from rendered computed
  colours, with the effective background resolved by walking ancestors and
  compositing alpha, in both themes. `--theme light` or `--theme dark` measures
  one, for a document that declares exactly one - a ratio against a background
  that document cannot have is not a finding about it.
- `tap` dispatches a real touch tap through `Input.dispatchTouchEvent` and
  reports the resulting display, visibility, `aria-expanded` and class change.
- `pointer` measures whether the hover, press and spacing rules branch the way
  ADR 0009 decided, under the device profiles a browser can be emulated into.

It reuses ADR-0012's browser stack rather than adding a second one, keeps the
same dev-server boundary (`--start-dev-server` is still the explicit opt-in),
and exits non-zero on a finding, so a run can be a gate. `--no-fail` makes it a
report.

The measure commands work against either the dev server or a preview build.

```
make measure ARGS='tap --url http://localhost:4321/dnd-tools/feat-explorer/ --selector "button[aria-controls=\"feat-filter-panel\"]"'
```

What a synthesized tap and an emulated pointer profile do and do not establish
is written down in
[`docs/audits/2026-09-26-rendered-verification-report.md`](docs/audits/2026-09-26-rendered-verification-report.md).
Read it before quoting a measurement as assurance about a real device.

### Printing the handbook

```
make handbook
node .opencode/lib/design-review/handbook.mjs --help
```

`make handbook` renders `/handbook/print/` into one A4 vector PDF at
`tmp/handbook/handbook.pdf` plus one PNG per sheet in `tmp/handbook/sheets/`, with
the site's own fonts, colours and spacing and none of its chrome. It reuses the
same browser stack, browser-resolution order, font gate and `--start-dev-server`
boundary as `make capture`, and like every command here it adds nothing to the
manifest.

- The page geometry lives in `src/styles/handbook-print.css` and nowhere else, and
  **every length in that file is a custom property on `:root`** - a test fails on a
  `px`, `em` or `rem` anywhere outside it. `@page { size: A4; margin: 25mm 15mm 15mm
  25mm }` is the page; `--handbook-sheet-width` / `--handbook-sheet-height`
  (643 x 972 CSS px) are the sheet box; `--handbook-page-width` /
  `--handbook-page-height` (794 x 1123) are the page box, which is what a capture
  is taken at. The command reads all of it out of the rendered page rather than
  carrying a copy.
- A sheet is **two 306px columns with a 30px gutter** by default. Anything wider
  than its column spans both columns, decided by measurement rather than by a rule
  that guesses which elements need it: the house-rule pages contain both a wide
  table and a scroll container whose own box fits while its table does not. A page
  that reads worse in 306px sets `columns: 1` in its frontmatter, and reading that
  key requires `docsSchema({ extend: ... })` in `src/content.config.ts` - the
  default schema is a Zod object in strip mode and would drop it silently.
- Each sheet's footer carries the source page and the section it starts in on the
  left, a decorative rule in the centre and the page number on the right, reading
  `12 of 48` rather than a bare number.
- Each sheet's PNG is **exactly 1588 x 2246**, which is the 794 x 1123 page box at
  the vertical raster scale. The scale is `--raster-scale` and defaults to 2. The
  size is read back out of the PNG's own header, and a capture at the wrong size is
  a failure rather than a file.
- The PNG and the PDF come from one DOM and one stylesheet, and that is checked:
  the captures move the page, and the command compares the layout either side of it
  and refuses if it differs.
- The print route ships no JavaScript of its own. The sheet assignment is injected
  at document start by the command, so the committed route is inert HTML. What the
  document carries besides that is what Astro attaches to every route here: the
  Vite client and the dev toolbar in development, the `@astrojs/alpinejs` bootstrap
  in a production build.
- The run reads the written file back and refuses it if the PDF magic, the
  `%%EOF` trailer, the A4 page box or the page-count bounds do not hold, and it
  writes to a `.part` sibling and renames so a crash cannot leave half a file where
  a reader looks for one.
- Every sheet is named in the output with its page number, the source page it is
  part of, the section it starts in and the height it measured. Content that does
  not fit is split rather than clipped, and every break the generator invented is
  printed by name and recorded in the manifest; see below.
- **A block's height is read from its client height, not from its bounding rect.**
  Chrome reports the *column's* height rather than a block's own for some blocks
  laid out inside a multicolumn - measured in this book as a 56px paragraph
  reporting a 1557px box - and a run that believed it broke sheets that had room
  for them and reported boundaries nobody wrote.
- **The Point Buy panel prints in its wide layout.** The sheet box is 643px, which
  is inside the 46rem at which that panel switches to its stacked phone layout, and
  printed that way it is 1093px tall: taller than a sheet, and broken at a boundary
  inside the component where no authored rule in a markdown page can reach. Three
  rules at the foot of `handbook-print.css` give it back the ledger it was designed
  as; the component itself is unchanged, because the phone layout is right on a
  phone.

### The split report and the manifest

Two mechanisms, one for layout and one for content.

**Every break is named.** A source page that does not fit a sheet is broken at the
nearest block boundary and its pieces become sheets of their own. The break is
never inside a block and never a clip: a block with no boundary inside it goes to a
sheet whole and prints down both columns, and one longer than the whole sheet spans
its pages with nothing cut. The run prints every boundary it chose, by name:

```
  7/38  dnd/skills  sheet 17  begins at p at "Rare Finds: If the final check..."
```

An authored horizontal rule at that point removes the split, which is how the book
converges on breaks a person chose. The assignment honours a rule wherever it finds
one - a sheet carrying an `hr` is split even when its content would have fitted
without it - so the same rule means the same thing in every sheet.

The plan is a plan. It applies, re-measures every sheet, and splits whatever is
still too tall until a pass finds nothing left to break. That is why
`column-fill` is `balance` rather than `auto`: with every sheet one page long,
`auto` fills the first column to the bottom of the page and leaves the second empty,
which measured 67 sheets where the content accounts for 48.

**The manifest is the gate.** `public/handbook/manifest.json` is committed and is a
few kilobytes:

| Field | What it is |
|-------|------------|
| `sourceHash` | one sha256 over the eight source files' own bytes, in slug order |
| `sources` | each source page's slug, path and content hash |
| `sheetCount`, `sheets` | each sheet's page number, source page, part of parts and **text hash** |
| `splits` | every boundary the generator chose, by sheet and by block |

Two tests read it back off disk, and both are gates rather than reports:

- The source hash is recomputed from `src/content/docs/dnd/` and compared. Edit a
  house rule without regenerating and the suite fails.
- **The suite fails while any split remains recorded.** That is deliberate: a
  generator that invents a page boundary can change which page a rule lands on
  with nothing to show for it, and the gate is how that gets fixed rather than
  forgotten. Clearing it means authoring `hr`s at the named points, which is
  editorial work and not a code change. Do not delete the assertion to get a green
  suite.
- **It is green.** Every break in the book is one an author wrote, which means the
  eight pages now carry forty-odd authored `hr`s and that two of them needed more
  than prose: `dnd/weapon-mastery` prints in one column (`columns: 1`) because its
  eight-row reference table is 918px tall in a 306px column, and the Point Buy
  panel needed the print-stylesheet rules above. An `hr` fixes a boundary a page
  can reach and nothing else.

It is **version 2**: version 1 recorded only sheets printed from a source page,
which left the cover and the contents unaccounted for, and a record that does not
account for the first two pages of a book is not a record of it. Each sheet now
carries a `kind`, and the two cases are checked against each other rather than both
being asked to name a source page.

The hash is content-based and never a timestamp, so it survives a clone, a rebase
and a fresh checkout on another machine; the validator refuses a `generatedAt`, a
`timestamp` or a `date` by name, because a record that changes when nothing does
cannot be a staleness gate. The file is written to a `.part` sibling, renamed, and
read back: a truncated manifest is a failure, not a record of a book with no sheets.

Run it against something that is not the book, and it records nothing:

```
make handbook ARGS='--url http://localhost:4321/handbook/spike-fixture/ --out tmp/spike.pdf --no-manifest'
```

### Golden captures are not committed

At the raster scale of 2 a sheet is several hundred kilobytes and the book is 66 of
them, so the PNGs live under `tmp/` and the comparison is a local mode with a
baseline the repository does not track:

```
make handbook ARGS='--baseline tmp/handbook/baseline'   # record this run as the baseline
make handbook ARGS='--compare tmp/handbook/baseline'    # which sheets differ from it
```

It reports which sheets changed, which are new and which are gone. It is
**corroboration, not ground truth**, and the command says so in its own output: two
runs of the same content on two machines can differ in one pixel of anti-aliasing,
and two runs on one machine can match while the browser changed underneath both.
Neither mode can fail a run, and the manifest is the gate.

### The Handbook's generated artwork

Two files, generated once and committed, at two single documented paths. Replacing
one file changes the paper without touching code, which is the entire point of
having them as files:

```
make handbook-art              # rewrite both
make handbook-art ARGS='--check'   # fail when either is stale
```

| Path | What | Properties |
|------|------|------------|
| `public/handbook/parchment.png` | the paper | 256 x 256 px tile, sRGB with the profile embedded, tiled by CSS at its natural size |
| `public/handbook/ornament.svg` | the footer's decorative rule | 88 x 10, drawn in `--color-gold-rule` read out of `tailwind.css` |

Contrast on that paper is **measured, not assumed**. `handbook-art.test.mjs` reads
the committed PNG's own pixels - its own small decoder, not the library that wrote
it - and checks the **worst** pixel of the tile against every step body text is set
in, because a decorative background behind body text is exactly where contrast
quietly goes and a texture's average is not its darkest pixel. The runtime check is
the existing command:

```
make measure ARGS='contrast --theme light --url http://localhost:4321/handbook/print/ --width 643 --selectors ".sl-markdown-content p,.sl-markdown-content td,.sl-markdown-content th,.sl-markdown-content h2"'
```

`--theme light` is there because the print route declares exactly one theme: paper
has no theme switch. Measuring it in the other one reports ratios against a
background that document cannot have, which is not a finding about it. Measured:
**10.52:1 at worst, AAA**, against the parchment.

The two-sheet fixture at `/handbook/spike-fixture/` is what ADR-0020's spike ran
against and it stays as the regression:

```
make handbook ARGS='--url http://localhost:4321/handbook/spike-fixture/ --out tmp/spike.pdf --no-manifest'
```

Read [ADR-0020](docs/adr/0020-sheet-box-renderer.md) before changing any of this.
It records what the spike measured, including the one clause of the mechanism it
broke.

### Workflow Steps

1. **Never push to master directly**: Always prepare a Pull Request for review
2. **Always merge PRs with squash** (`gh pr merge <number> --squash`): this repo does not allow merge commits, and squash keeps history linear with one conventional commit per PR
