---
status: accepted
date: 2026-09-13
supersedes: null
superseded_by: null
tags: [infrastructure, terraform, cloudflare, import]
---

# ADR-0002: Import Existing Cloudflare Resources into Terraform

## Context and Problem Statement

The Cloudflare Pages project was initially created via the Cloudflare dashboard for quick setup. Terraform is now being used to manage Zero Trust Access policies and custom domains. Running `terraform apply` fails because the `cloudflare_pages_project` resource already exists in Cloudflare but not in Terraform state.

How should we handle pre-existing Cloudflare resources when adopting Terraform?

## Decision Drivers

- Avoid disrupting the existing deployment pipeline
- Maintain single source of truth for infrastructure via Terraform
- Prevent resource duplication or conflicts
- Enable future Terraform-managed changes to the Pages project

## Considered Options

- **Option A: Import existing resource** — Use `terraform import` to bring the dashboard-created Pages project under Terraform management without recreation.
- **Option B: Remove from Terraform** — Delete the `cloudflare_pages_project` resource from Terraform and manage the Pages project exclusively via dashboard.
- **Option C: Recreate via Terraform** — Destroy the dashboard-created project and let Terraform create it fresh (causes downtime).

## Decision Outcome

Chosen option: **Option A** — Import existing resource

### Consequences

- Good, because existing deployment pipeline remains uninterrupted.
- Good, because Terraform becomes the single source of truth for all infrastructure.
- Good, because future changes to the Pages project (build settings, branches) can be managed via Terraform.
- Neutral, because the import command requires knowing the Cloudflare account ID and project name.
- Neutral, because Terraform state must be manually updated via `import` before first `apply`.

## Usage

```bash
# Import existing Pages project into Terraform state
terraform import cloudflare_pages_project.dnd_astro <account_id>/<project_name>

# Verify import
terraform plan  # Should show "no changes" for the Pages project
```

## Related

- SPEC-002: Infrastructure & Deployment Architecture (Step 1)
- Cloudflare Provider Documentation: [Import Resources](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/guides/importing-resources)
