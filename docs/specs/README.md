# Specifications

This directory contains feature specifications (specs) for the DnD Companion project.

## Index

| ID | Title | Status | Tags | Affects | Description |
|----|-------|--------|------|---------|-------------|
| 001 | Spec-Driven Development Workflow | archived | workflow, docs | `docs/specs/`, `AGENTS.md` | Structured workflow for spec-first development |
| 002 | Infrastructure & Deployment Architecture | archived | infrastructure, deployment, ci-cd, cloudflare, security, terraform | `wrangler.jsonc`, `terraform/`, `package.json` | Static Astro on Cloudflare Workers (static assets) with Zero Trust edge security |
| 003 | XML Character Sheet Viewer | archived | xml, fantasy-grounds, character-sheet, alpine-js, build-time, party | `src/components/xml-viewer/`, `src/utils/`, `src/assets/fantasy-grounds-sheets/`, `public/fg/` | Build-time XML parsing + Alpine.js character cards + PartyView |
| 004 | Character Search Page with Alpine.js Filtering | archived | character-search, alpine-js, filtering, fantasy-grounds | `src/components/xml-viewer/CharSearch.astro`, `src/content/docs/fantasy-grounds/character-search.mdx`, `astro.config.mjs` | Searchable index of all Fantasy Grounds characters with client-side filtering |
| 005 | Dice Roller & Character Sheet Generator | archived | dice, roller, character-creation, alpine-js, dnd, mechanics | `src/components/dice-roller/`, `src/content/docs/`, `astro.config.mjs` | Alpine.js dice roller for ability scores (4d6-drop-lowest) |
| 006 | Book-Filtered Feat Matrix | archived | feats, filtering, search, alpine-js, dnd, character-options | `src/components/feats-explorer/`, `src/content/docs/`, `astro.config.mjs` | Fuzzy search and multi-select filtering for D&D feats |
| 007 | Passive Skills | archived | character-sheet, xml, fantasy-grounds, skills, passive, xml-viewer | `src/utils/parse-character-xml.ts`, `src/components/xml-viewer/XmlCard.astro`, `src/content/docs/guides/xml-card-test.mdx` | Large-mode Passive Perception/Investigation/Insight subcards from skill totals |

## About Specs

Specs define implementation plans for features. They capture the problem, goals, and step-by-step plan while documenting any architectural constraints from accepted ADRs.

### Status Values

- `draft` — Being written, not ready for implementation
- `active` — Ready for implementation, agent should follow this spec
- `archived` — Implementation complete, kept for audit trail

### For Agents

1. **Read the index first** to identify relevant specs for your task
2. Match your task to specs via **tags** and **description**
3. Load only the relevant spec(s) — do not read all specs
4. Check `affects` field to see which files/directories the spec touches
5. Implement per the spec's implementation plan
6. When done, set spec `status: archived`

### Front Matter Fields

| Field | Type | Purpose |
|-------|------|---------|
| `status` | string | `draft`, `active`, or `archived` |
| `title` | string | Human-readable feature name |
| `author` | string | Who created the spec |
| `date` | string | Creation date (YYYY-MM-DD) |
| `tags` | array | Keywords for grep-based discovery |
| `affects` | array | Files/directories this spec touches |
| `adr_constraints` | array | ADR IDs that constrain implementation |

### Discovery Workflow

```
1. Read docs/specs/README.md (index)
2. Match task → spec (via description + tags)
3. Read only docs/specs/NNN-feature/SPEC.md
4. Implement per plan
5. Archive when done
```
