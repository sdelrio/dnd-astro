# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the DnD Companion project.

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| 0001 | Icon Component Strategy | accepted | 2026-08-15 |
| 0002 | Import Existing Cloudflare Resources into Terraform | accepted | 2026-09-13 |

## About ADRs

ADRs capture important architectural decisions along with their context and consequences. They are written in [MADR format](https://adr.github.io/madr/) with YAML front matter for machine-parseable metadata.

### Status Values

- `accepted` — Decision is binding and active
- `superseded` — Decision has been replaced by a newer ADR (check `superseded_by` field)
- `deprecated` — Decision is no longer recommended
- `proposed` — Decision is under review

### For Agents

- Only `accepted` ADRs are binding
- Read the index first to find relevant ADRs
- Load specific ADR files as needed for context
- Check `supersedes` / `superseded_by` fields for decision history
