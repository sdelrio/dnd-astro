---
status: accepted
date: 2026-09-19
supersedes: null
superseded_by: null
tags: [documentation, starlight, markdown, admonitions]
---

# ADR-0004: Use Only Supported Starlight Markdown Admonitions

## Context and Problem Statement

The project migrated from Docusaurus to Astro Starlight for documentation. Docusaurus supports a wider range of admonition types (`:::info`, `:::warning`, `:::note`, `:::tip`, `:::caution`, `:::danger`), but Starlight only supports four: `:::note`, `:::tip`, `:::caution`, and `:::danger`.

Should we maintain Docusaurus admonition syntax or migrate to Starlight-supported admonitions?

## Decision Drivers

- Follow Starlight documentation standards
- Ensure admonitions render correctly in the documentation site
- Maintain consistency across all documentation files
- Avoid build errors from unsupported admonition types

## Considered Options

- **Option A: Maintain Docusaurus syntax** — Keep `:::info` and `:::warning` and hope for future Starlight support.
- **Option B: Migrate to Starlight admonitions** — Replace unsupported admonitions with supported equivalents.

## Decision Outcome

Chosen option: **Option B** — Migrate to Starlight admonitions

### Consequences

- Good, because all admonitions now render correctly in Starlight.
- Good, because documentation follows Starlight's supported syntax.
- Good, because prevents future build errors from unsupported admonition types.
- Neutral, because `:::info` → `:::note` and `:::warning` → `:::caution` are semantically similar.

## Migration Guide

| Docusaurus | Starlight | Usage |
|------------|-----------|-------|
| `:::info` | `:::note` | Informational content |
| `:::warning` | `:::caution` | Warning/prerequisite content |
| `:::note` | `:::note` | No change needed |
| `:::tip` | `:::tip` | No change needed |
| `:::caution` | `:::caution` | No change needed |
| `:::danger` | `:::danger` | No change needed |

## References

- Starlight Docs: [Admonitions](https://starlight.astro.build/guides/admonitions/)
- Docusaurus Docs: [Admonitions](https://docusaurus.io/docs/markdown-features/admonitions)
