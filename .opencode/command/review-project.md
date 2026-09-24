---
description: Review the project and suggest features, improvements and fixes
agent: build
---

Review this project and produce a structured list of suggested work items.

## Steps

1. Read `SPEC.md` at the repo root first - it is the reference for what the project must do; findings should be checked against it (violations are bugs, gaps are features). Also read `docs/specs/README.md` (feature specs; `active` is in-flight) and the `accepted` entries in `docs/adr/README.md` (binding architectural decisions). If the code and `SPEC.md` disagree, report it explicitly as a "Spec mismatch" finding rather than assuming which side is wrong.

2. Explore the repository: `README.md`, `astro.config.mjs`, `wrangler.jsonc`, `worker/index.js`, `terraform/`, `scripts/`, and `src/` (`components/`, `utils/`, `content/docs/`, `pages/`). Tests are colocated as `*.test.ts` next to the code they cover and run with Vitest. There is no `.github/` directory in this repo.

3. Check open GitHub issues to avoid suggesting duplicates, per `docs/agents/issue-tracker.md`:
   ```bash
   gh issue list --state open --limit 100
   ```
   Skip any finding that substantially overlaps an existing issue and note "(dup of #N)" instead. GitHub issues track pending work; `SPEC.md` and the specs define required behavior - both are sources of truth for their respective concerns.

4. Analyze the code for:
   - **Bugs**: build-time XML parsing edge cases in `src/utils/`, incorrect Alpine.js wiring or hydration mismatches across the static/server boundary, broken internal links, unsupported Starlight admonitions (`:::info` / `:::warning`, ADR 0004), em dashes in prose, missing validation, error-handling gaps, and deviations from `SPEC.md` requirements.
   - **Improvements**: robustness of `build-xml-characters.ts` and the parser, test coverage following the colocated `*.test.ts` + Vitest pattern, adoption of the least-client-JS rule and other ADR conventions.
   - **Features**: useful new capabilities consistent with the project's purpose (static-first compendium + Alpine.js islands) and not excluded by `SPEC.md`'s non-goals.
   - **Docs**: undocumented env vars or behavior, README drift, and pages missing from the explicit Fantasy Grounds sidebar slugs in `astro.config.mjs`.

Where feasible, confirm suspected bugs before reporting by running `pnpm test`, `CI=true pnpm typecheck`, `pnpm lint`, or `make check`.

## Output format

Present findings grouped as:

- **Fixes (bugs)** - numbered, each with file:line references and a short explanation of the problem and proposed fix.
- **Improvements** - numbered, same detail level.
- **Features** - numbered, with a brief design sketch.
- **Docs** - numbered, with the README (or spec/ADR) section to update.

Order each group by severity (correctness/safety first) and mark each finding High/Medium/Low.

Do NOT create any issues yet - wait for explicit confirmation from the user.
