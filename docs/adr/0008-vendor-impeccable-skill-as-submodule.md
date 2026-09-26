---
status: accepted
date: 2026-09-26
supersedes: null
superseded_by: null
tags: [tooling, agent-skills, submodule, impeccable, opencode, dependencies]
---

# ADR-0008: Vendor the Impeccable Agent Skill as a Pinned Git Submodule

## Context and Problem Statement

Frontend work in this repo benefits from the [impeccable](https://github.com/pbakaus/impeccable)
design skill, an agent harness package that gives coding agents design-system
guidance, an audit workflow, and live browser tooling. To use it, the skill has to
be present on disk and reachable from the agent's skills directory.

The skill is not ours to version. Its repository is large: roughly 73 MB of
working tree across about 3,261 tracked files, covering many provider-specific
build outputs, Rust crates, browser bundles, demos, and its own test suite. Our own
`.git` is comparatively small next to that, and only a small fraction of the
upstream repository is actually needed to run the skill in this project.

Vendoring that content into this repository would push a large amount of
third-party churn into our history, make diffs and clones heavier, and couple our
review process to upstream commits we never chose.

At the same time we still want a known-good version of the skill, and we want to
decide *when* an upstream update lands rather than absorbing updates
unintentionally.

How should we consume a large, externally maintained agent skill without bloating
this repository or losing control over its version?

## Decision Drivers

- Keep third-party content out of this repository's history and working tree size
- Reproducibility: everyone must run the same version of the skill
- Updates must be a deliberate, reviewable act, not an automatic side effect
- A fresh clone must set up the skill with one documented command
- Do not fork or patch upstream; consume it as published

## Considered Options

- **Option A: Pinned git submodule** - add `.impeccable-skill` as a submodule and
  commit only the gitlink (a single SHA). The content is fetched on demand and is
  never stored in our history. The symlink from the agent skills directory is
  committed too, so linking is not a manual step.
- **Option B: Copy the skill into the repo** - place the needed skill files under
  `.opencode/skills/impeccable` and commit them. Simplest to consume, no setup
  step, but permanently adds tens of megabytes of third-party files to our history
  and makes every upstream sync a manual copy-paste merge.
- **Option C: Unpinned install at setup time** - run `npx impeccable install` on
  every fresh clone with no recorded version. Lightweight, but whatever upstream
  `main` happened to be is what each developer and CI run gets, so behaviour is
  not reproducible and an upstream change lands without review.
- **Option D: Track the skill as a package dependency** - add it to `package.json`
  and install through pnpm. This pins a version in the lockfile, but the published
  package is a CLI-only distribution rather than the skill content itself, so it
  does not give us a checkout to link from.

## Decision Outcome

Chosen option: **Option A** - vendor the skill as a pinned git submodule at
`.impeccable-skill`, with the linking step exposed through the Makefile.

Only the gitlink is committed, so the repository records a single SHA rather than
the skill's contents. `.opencode/skills/impeccable` is committed as a relative
symlink into the submodule, so the skill resolves as soon as the submodule is
checked out and stays correct across agent harnesses.

Update timing is controlled by the pin. Because the gitlink names an exact commit,
`make submodule-init` is deterministic and can never pull a new version by
accident. Moving the pin is a separate, explicit act (`make submodule-update`)
whose only effect on this repository is a one-line gitlink change, which is
reviewable on its own.

Setup and updates are wrapped as Make targets so the correct command is
discoverable through `make help`:

```sh
make submodule-init    # check out the pinned submodule, link if needed
make submodule-update  # bump the pin to upstream HEAD, relink
make submodule-link    # relink only, e.g. IMPECCABLE_PROVIDER=claude
```

Never run `git submodule add` for `.impeccable-skill`. The gitlink is already
committed, so adding it again fails with `already exists in the index`.

### Consequences

- Good, because the repository stores a 40-byte gitlink instead of ~73 MB of
  third-party files, so history, clones, and diffs stay focused on our own code.
- Good, because the skill version is pinned to an exact commit, so every
  developer and every agent session runs identical instructions.
- Good, because updates never land implicitly. Bumping the pin is a visible
  one-line diff that a reviewer can accept or reject on its own, and the choice of
  *when* to absorb upstream changes stays with this project.
- Good, because upstream can be consumed as published, with no fork and no
  vendored copy to keep in sync.
- Good, because the committed symlink removes the per-harness linking step, and
  `submodule-link` skips the work entirely when the link already exists.
- Neutral, because a fresh clone needs one extra command before the skill
  resolves. This is documented in `AGENTS.md` and surfaced in `make help`.
- Neutral, because `.gitmodules` sets no `branch`, so `git submodule update
  --remote` tracks upstream's default branch rather than a release tag. The
  current pin is a `main` commit, not a published release, so a bump may land
  unreviewed upstream behaviour. Pinning to a release tag would tighten this.
- Neutral, because the submodule's own JavaScript and tests sit inside the
  working tree, so `eslint` and `vitest` must exclude `.impeccable-skill/**`.
  Without that exclusion `pnpm lint` and `pnpm test` both fail on third-party
  code. The upside is that the build and test gates do not need the submodule
  fetched at all.
- Bad, because the recorded pin can drift behind upstream indefinitely. Nothing
  prompts a bump, so the skill is only as current as the last deliberate update.
- Bad, because the submodule's files are untracked from our perspective, so
  repo-wide tooling, search, and editor features need the same exclusion that
  lint and test need.

## References

- `AGENTS.md`, "Agent skills" section, for the setup prerequisite
- `Makefile`, `submodule-init` / `submodule-update` / `submodule-link` targets
- https://github.com/pbakaus/impeccable
- https://github.com/pbakaus/impeccable/blob/main/docs/CLI-CONTRACT.md
