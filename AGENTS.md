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

## Temporary Files

Every temporary file (PR bodies, issue bodies, scratch files, notes, etc.) goes to `tmp/` at the repo root - write there first, e.g. `tmp/pr-<slug>.md`. That directory is gitignored; do not use `/tmp` or other system paths.

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

### Network-font caveat

The site's display face is fetched from a third-party font CDN at runtime with a
`swap` display policy and a silent fallback to a self-hosted face. A screenshot
taken after that fallback has the wrong heading metrics and the wrong line
lengths, and **nothing errors and no console warning is emitted**. A capture
therefore proves less than it appears to. Treat font readiness as an open
question to resolve separately, not something a PNG settles on its own.

### Workflow Steps

1. **Never push to master directly**: Always prepare a Pull Request for review
2. **Always merge PRs with squash** (`gh pr merge <number> --squash`): this repo does not allow merge commits, and squash keeps history linear with one conventional commit per PR
