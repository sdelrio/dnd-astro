---
status: archived
title: "Spec-Driven Development Workflow"
author: "opencode"
date: "2026-09-12"
tags: [workflow, docs, process]
affects:
  - docs/specs/
  - AGENTS.md
adr_constraints: []
---

# SPEC: Spec-Driven Development Workflow

## Summary

Structured workflow for spec-first development, ensuring agents follow a repeatable process with ADR constraint tracking.

## Problem Statement

We need a structured workflow for agents to follow when implementing features, ensuring consistency with architectural decisions and proper documentation of changes.

## Goals

- Enforce spec-first development for all features
- Maintain ADR constraints throughout implementation
- Create a repeatable process for agents to follow
- Archive completed specs for audit trail

## Non-Goals

- Change existing ADR format (MADR with YAML front matter)
- Replace existing SPEC.md (root-level technical spec)
- Add new build tools or dependencies

## Implementation Plan

### Step 1: Create Documentation Structure

Create `docs/specs/` directory with:
- `_TEMPLATE.md` — Reusable spec template
- `001-spec-workflow/SPEC.md` — This spec (the first dogfood)

### Step 2: Define Template Fields

Template includes:
- `status`: draft | active | archived
- `adr_constraints`: List of binding ADRs
- Implementation plan with numbered steps
- Files to create/modify
- Testing and rollback procedures

### Step 3: Update AGENTS.md

Add workflow rules to AGENTS.md:
1. Check for active spec before implementing
2. Read ADR constraints from spec
3. Implement per spec
4. Draft ADR if new decision made
5. Archive spec when complete

## Files to Create/Modify

- `docs/specs/_TEMPLATE.md` — Reusable spec template
- `docs/specs/001-spec-workflow/SPEC.md` — This spec
- `AGENTS.md` — Add workflow rules

## ADR Constraints

No ADR constraints for this workflow setup spec.

## Testing

1. Create a test spec with ADR constraints
2. Verify agent reads ADR before implementing
3. Verify spec is archived after implementation

## Rollback

Remove `docs/specs/` directory and revert AGENTS.md changes.

## Status

- [x] Implementation complete
- [x] Tests passing
- [ ] ADR updated (if new decision made)
