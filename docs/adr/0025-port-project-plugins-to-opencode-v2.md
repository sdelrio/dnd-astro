---
status: accepted
date: 2026-10-15
supersedes: null
superseded_by: null
tags: [tooling, agents, plugins, dev-time, opencode]
---

# ADR-0025: Port the Project Plugins to the OpenCode V2 Plugin API

## Context and Problem Statement

Two project plugins live in `.opencode/plugins/`: `strip-coauthor.js`, which
rewrites `git commit` shell commands so a `Co-authored-by` trailer cannot land in
a commit, and `tmp-redirect.js`, which refuses shell commands that reference
`/tmp` and redirects `write` and `edit` targets under `/tmp` into the
repo-relative `tmp/` directory. Both are enforcement, not convenience: `AGENTS.md`
states the trailer rule and points at the plugin as the mechanism that holds it.

After the OpenCode 2.0.30 upgrade neither plugin loaded. The server logged:

```
failed to load plugin cwd=.opencode/plugins/strip-coauthor.js
  PluginModule.LoadError: Plugin must export a default definition with an id
  and an effect or setup function. (cause: SchemaError(Missing key at ["default"]))
```

The V1 plugin API returns one object of hooks keyed by string, exported as a named
function: `export const StripCoauthor = async () => ({ 'tool.execute.before': ... })`.
V2 is an intentional breaking change. A plugin default-exports `Plugin.define({ id,
setup })` and registers each hook on the domain that owns the operation, so the
one string key a finding is written against no longer exists.

Renaming the file, or moving it, is not enough. Nothing about the mismatch is
visible in the repository, because the failure is a warning in a server log and a
capability that silently stops being enforced. A model that writes a trailer, or a
scratch file to `/tmp`, would simply succeed.

The upgrade also renamed the things the plugins match on. The V2 shell tool is
`shell` rather than `bash` (`bash`, `task` and `apply_patch` are normalized to
`shell`, `subagent` and `patch`), and the file tools take `path` rather than
`filePath`. A hook that keeps the V1 names compiles, loads, and never matches.

## Decision Drivers

- The two plugins are enforcement, so a silent non-load is the worst outcome.
  Whatever shape they take has to be verifiable as loaded.
- V1 plugin implementations do not run in V2 at all. Keeping the old shape keeps
  the old failure.
- The V2 plugin API is the documented target, and the project is on V2.
- The renames are upstream facts, not preferences: matching on `bash` or
  `filePath` in V2 matches nothing.
- Anything browser-adjacent or plugin-adjacent here stays dev-time only. Nothing
  may enter the build, which keeps `git diff -- package.json pnpm-lock.yaml
  pnpm-workspace.yaml` empty under [ADR-0007](0007-mermaid-rendering-strategy.md).

## Considered Options

- **Leave the plugins in their V1 shape.** Rejected: they do not run, and the
  failure is a warning nobody reads while the enforcement is quietly gone.
- **Default-export one object that carries both a V1 `server()` and a V2
  `setup()`.** Rejected: the dual form keeps two implementations of one rule
  alive and a reader cannot tell which one is in force. This project is on V2, so
  it ports to the V2 API.
- **Port both plugins to a V2 default definition.** Chosen. Each `setup(ctx)`
  registers one `ctx.tool.hook('execute.before', ...)` callback, and the tests
  exercise the callback the same way the loader does.

## Decision Outcome

Chosen option: **port both project plugins to the V2 plugin API**, and record the
two renames the port depends on.

Each plugin default-exports `Plugin.define({ id, setup })`. `id` is the stable
plugin identity (`strip-coauthor`, `tmp-redirect`); `setup` registers a hook on
its owning domain rather than returning a map of string keys. The hook receives a
single mutable event whose tool name is `event.tool` and whose arguments are
`event.input`, replacing V1's separate `input` and `output` objects.

The port follows three renamed facts:

- `bash` is `shell`. A hook that matches `bash` never fires.
- The registerable hook is `ctx.tool.hook('execute.before', ...)`, not the
  `tool.execute.before` key.
- `write` and `edit` take `path`, not `filePath`. `tmp-redirect` reads and writes
  `path`.

`tmp-redirect` resolves its repo root from `ctx.location.project.canonical`, with
`ctx.location.directory` as the fallback, which is V2's equivalent of the V1
`worktree` plugin argument the plugin used before.

Each rewrite mutates `event.input` in place and reassigns it. Mutation matches the
V1 contract the plugins already followed; the reassignment is what holds if the
host reads the field back rather than holding the reference. Doing both costs one
line and removes a way for the redirect to depend on which contract V2 uses.

The hook callbacks are synchronous, because nothing in either guard needs to
await. A hook may return a promise or not, so the tests match a synchronous
return rather than asserting `.resolves`.

`.opencode/package.json` tracks the V2 authoring package, `@opencode/plugin` at
`2.0.30`, in place of the V1 `@opencode-ai/plugin`. It is a type and
module-resolution dependency for local editors and tests; the two plugins import
`Plugin` for `define` and nothing else. `.opencode/` is gitignored, so the
manifest and lockfile are local to a checkout and never in a diff.

`AGENTS.md` says "shell commands" where it said "bash commands", because that is
the tool the plugin now matches.

## Consequences

- Good, because both plugins load in 2.0.30 with no `failed to load plugin`
  warning, and the live hooks were exercised: a probe `write` to `/tmp/plugin-probe.txt`
  landed at `tmp/plugin-probe.txt`, and a shell command writing to `/tmp` was
  refused with the `AGENTS.md` guidance.
- Good, because a test in each plugin suite asserts the export is a V2 definition
  with an `id` and a `setup` function. That is the exact property whose absence
  broke the load, so the regression is covered rather than remembered.
- Good, because the port is verified against the renames instead of assumed:
  `bash` normalizes to `shell` and the file tools read `path` in the 2.0.30
  binary, and the tests use those names.
- Bad, because the plugins are now coupled to a specific V2 API version, and a
  future V2 API change repeats this port. There is no dual-version implementation
  to soften it, which was a deliberate rejection above.
- Neutral, because `pnpm lint` ignores `.opencode/**`, so the port is covered by
  the Vitest suites for the plugin modules and their helpers, not by ESLint.
- Neutral, because nothing entered the build: the dependency is local to
  `.opencode/`, and `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml`
  is still empty.
