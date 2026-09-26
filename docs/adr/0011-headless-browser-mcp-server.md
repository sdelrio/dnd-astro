---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [tooling, mcp, browser, agents, dev-time]
---

# ADR-0011: Give Agents a Headless Browser via a Pinned Local MCP Server

## Context and Problem Statement

Three records in this repo state the same gap, and the gap is why the site's
visual work has been reasoned about rather than looked at.

1. **ADR-0009** (Phone-First Grids and Touch Targets) closes with an explicit
   outstanding verification item: "No browser automation was available, so
   **none of this was confirmed by a rendered screenshot or synthesized touch
   input** ... Testing on a real phone at 320px and 390px remains outstanding and
   is the main thing still open."
2. **`docs/audits/2026-09-26-design-audit.md`** opens its caveats with "No
   browser was available in the audit environment, so no findings come from
   rendered viewports or synthesized touch gestures. Contrast ratios were
   computed from declared token values rather than sampled from rendered
   pixels."

Both of those are *earlier records of the same gap* that this ADR addresses.

The gap is not hypothetical. ADR-0009 shipped a `hidden sm:flex!` bug that a
test written from the same reading as the bug passed straight through. Every
subsequent layout, theming, and capture decision inherits that risk, and #331
is already open asking for viewport verification at 375px and 1280px in both
themes.

Two things have to be true at once, and they pull against each other. An agent
needs to *see* a rendered page, which wants a browser in the toolchain. The
production build must not grow a browser dependency, which ADR-0007 made an
explicit decision driver.

Discovery is the second problem. The vendored `impeccable` skill declares an
`allowed-tools` front matter block, but that is inert in OpenCode: the skill
schema reads only `name`, `description`, and `slash`, and the skill's own
harness matrix marks OpenCode as ignoring it. An agent is never told the
capability exists. Registering the server in a repo-committed OpenCode config is
the only mechanism that actually surfaces the tools.

## Decision Drivers

- ADR-0007's binding constraint: no headless-browser dependency in the build
- Satisfy `SPEC.md` Section 3, the Rule of Least Client-Side JavaScript
- Use a browser already on the machine, never a downloaded one
- Keep the tooling discoverable, because a capability nobody is told about does
  not get used
- Fail loudly on a misconfigured flag, or at least fail *visibly*
- Do not depend on a moving default, or on a harness-inert front matter block

## Considered Options

- **Option A: pinned local MCP browser server in a repo-committed OpenCode
  config** - `chrome-devtools-mcp`, pinned to an exact version, launched by
  `pnpm dlx` with headless, isolated, PNG, and a repository filesystem root.
  Nothing enters `package.json`, the lockfile, or the build allow-list. The
  server reaches the browser over an already-installed Chrome.
- **Option B: add Playwright or Puppeteer as a devDependency** - the ordinary
  choice, and the one ADR-0007 explicitly rejected. It puts a browser in the
  install graph, changes the lockfile, and makes `allowBuilds` in
  `pnpm-workspace.yaml` a live question for every install.
- **Option C: a hand-rolled CDP script under `.opencode/`** - what #340 is
  building. Zero new dependencies, and it can assert artifact validity. But on
  its own it is a script an agent has to know the name of, so it does not solve
  discovery, and it does not get built until that ticket lands.

## Decision Outcome

Chosen option: **Option A**, a pinned `chrome-devtools-mcp` local server
registered in `opencode.json` at the repo root.

### This ADR does not modify ADR-0007

**ADR-0007 is unchanged and remains binding.** Its constraint was that the
production build must stay free of a headless browser, with no Playwright and no
extra CI step. That constraint is still satisfied, and it is satisfied *precisely
because this ADR adds nothing to the build*. `chrome-devtools-mcp` is resolved
by `pnpm dlx` at the moment an agent needs it and is cached outside the repo;
`package.json`, `pnpm-lock.yaml`, and the `allowBuilds` map in
`pnpm-workspace.yaml` are byte-identical before and after. There is no
`astro.config.mjs` change and no `rehype-mermaid`. ADR-0007 is not superseded,
amended, or relaxed, and this ADR must not be cited as precedent for touching
the build.

### The server is configured, not merely installed

Every flag below is a decision, and the default on each is the wrong one for
this repo:

- **Pinned to an exact version.** The package shipped four releases in a month
  and the `--pageIdRouting` default changed mid-series. An unpinned `@latest`
  changes the tool contract under the agent's feet, so the version is exact and
  bumping it is a deliberate commit.
- **`--headless`.** No part of this needs a visible window. The design skill's
  separate human-in-the-loop live mode keeps its own documented opener and does
  not route through this tool.
- **`--isolated`.** A throwaway profile per run, so agent sessions cannot leak
  cookies or state into each other or into a developer's real Chrome.
- **`--javascript-evaluation` (left at `true`).** The design skill's
  browser-evidence flow preflights by *mutating* the page (setting the document
  title, appending a script tag) and explicitly does not count read-only
  evaluation. Turning this off would make the preflight report a false negative.
- **`--screenshot-format=png` (the default, stated explicitly).** The server
  rewrites a screenshot's file extension to match the requested format, so a
  non-default format would silently rename the very files the design review
  contract looks for. Pinning the default makes the contract's filenames a
  property of the config rather than of a default. Format and quality control
  belong to the wrapper ticket, not this one.
- **`--filesystem-root=<repo path>`.** File-writing tools are otherwise
  restricted to the OS temp directory, and the review artifacts belong in the
  repository. The trap here is the neighbouring flag: `--allow-unrestricted-paths`
  *sounds* like the one that widens this, but it only relaxes the restriction
  that applies when the client does **not** negotiate the roots capability, so
  once the client does negotiate roots it is a silent no-op. `--filesystem-root`
  is the option that widens the allow-list unconditionally.
- **`--no-usage-statistics` and `--no-performance-crux`.** No telemetry and no
  outbound trace URLs.
- **`CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1` in the environment.** The update
  check has **no command-line flag**: it runs before argument parsing and
  spawns a detached network fetch on every cold start, so an argument could not
  reach it. The environment variable is the only lever.
- **`PUPPETEER_SKIP_DOWNLOAD=true` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.**
  Belt and braces against the install hook fetching a browser, so "a browser
  already on the machine" is enforced rather than assumed.
- **`timeout: 180000`.** OpenCode's MCP tool-fetch timeout defaults to 5000ms,
  which is far too tight for a first navigation against a cold dev server on
  this machine.

### Unknown flags do not fail

The server logs a single `Unknown arguments:` line to stderr and starts anyway
using the default. A typo in the headless flag therefore does not fail loudly;
it **silently launches a visible browser** and the agent gets a window it did
not ask for. Grepping the MCP server's stderr for that line is the only signal
available.

That line goes to **stderr only**. It does not appear in the server's own
`--log-file`, and OpenCode's `--print-logs` output does not surface it either.
The check is therefore only meaningful against captured stderr:

```sh
pnpm dlx chrome-devtools-mcp@1.10.1 <flags> </dev/null >/dev/null 2>tmp/mcp-stderr.log
rg "Unknown arguments" tmp/mcp-stderr.log   # no match expected
```

### Verify by capture, not by inspection

Whether a screenshot actually lands inside the repository cannot be read off the
config. File-writing tools restricted outside the workspace roots and a write
that succeeded produce superficially similar symptoms (an error mentioning a
path, or a file at a temp location), so the only trustworthy check is to
capture and then confirm the file exists inside the repo and is a real image.

### What this closes

This ADR closes the outstanding verification item **ADR-0009** left open, and
with it the **two earlier records of the same gap**: the ADR-0009 verification
note itself and the caveats section of
`docs/audits/2026-09-26-design-audit.md`. Contrast ratios and responsive
findings that were computed from declared token values now have a path to
rendered evidence.

The *questions* those records raised stay open. Having a browser is not the
same as having run the checks: #331's viewport verification, #341's tool-layer
questions, and #340's capture command are all still unbuilt. What changes is
that they are now reachable, and none of them requires hand-rolling a script.

### Consequences

- Good, because a rendered screenshot is now a first-class agent output, which
  removes the incentive to reason about layout from source and call it evidence
  - the failure mode ADR-0009 documents.
- Good, because the dev-time boundary is enforced by three untouched files that
  are trivially checkable with `git diff`, not by a convention.
- Good, because the capability is discoverable: it is in the tool list, not
  behind an inert front matter block.
- Neutral, because `--filesystem-root` holds an absolute path, so the committed
  config is correct for this checkout and must be edited if the repository is
  cloned elsewhere. There is no workspace-relative form of the option.
- Neutral, because a pinned version is a maintenance obligation: security fixes
  do not arrive automatically, and a version bump changes the tool contract.
- Bad, because a mistyped flag is nearly invisible. The `Unknown arguments:`
  grep is the only defence, and it is not automatic, so it is documented in
  `AGENTS.md` and belongs in review whenever the flags change.
- Bad, because a browser now appears in the agent's tool list with a website's
  worth of navigation ability and no visible window, which is a real prompt
  surface. It is scoped to local development by the filesystem root, not by the
  browser itself.

## References

- Issue #339: this decision
- ADR-0007: Render Mermaid Diagrams with the astro-mermaid Integration
  (unchanged; its no-headless-browser-in-the-build constraint is what makes this
  ADR's dev-time-only boundary possible)
- ADR-0008: Vendor the Impeccable Agent Skill as a Pinned Git Submodule (its
  `allowed-tools` front matter is inert in OpenCode, hence the config route)
- ADR-0009: Phone-First Grids and Touch Targets in the Tool Layer (outstanding
  verification item closed here)
- `docs/audits/2026-09-26-design-audit.md`: caveats section (earlier record of
  the same gap)
- Issue #331: viewport verification that this unblocks
- Issue #340: the wrapper capture command that builds on this
- `SPEC.md` Section 3: Rule of Least Client-Side JavaScript
- `chrome-devtools-mcp` configuration reference (`--filesystem-root`,
  `--allow-unrestricted-paths`, `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS`)
