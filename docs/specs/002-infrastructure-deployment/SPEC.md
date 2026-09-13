---
status: accepted
title: "Infrastructure & Deployment Architecture"
author: "sdelrio"
date: "2026-09-12"
tags: [infrastructure, deployment, ci-cd, cloudflare, security, terraform]
affects: [wrangler.jsonc, terraform/, package.json]
adr_constraints: []
---

# SPEC: Infrastructure & Deployment Architecture

## Summary

Static Astro site deployed to Cloudflare Pages via Git integration, with Cloudflare Zero Trust Access (Email OTP) protecting `/reference/*` and `/private/*` paths only, infrastructure defined as Terraform IaC.

## Problem Statement

The project needs a secure, zero-server deployment pipeline that gates access to the site without requiring client-side encryption or server-side compute. Security is enforced entirely at the Cloudflare edge.

## Goals

- Zero Node.js server in production (static assets only)
- Git-synced deployment from private GitHub repository to Cloudflare Pages
- Edge-gated access via Cloudflare Zero Trust Email OTP for `/reference/*` and `/private/*` paths only (comma-separated email list via env var)
- Infrastructure as Code via Terraform with fallback to Cloudflare dashboard
- Support initial `*.pages.dev` deployment with migration path to `dnd-companion.lorien.cloud`

## Non-Goals

- No SSR or server-side compute in production
- No client-side cryptographic encryption (Cloudflare gates asset distribution)
- No OAuth/SSO authentication (Email OTP only)
- No CI/CD pipeline for infrastructure beyond Cloudflare Pages Git sync

## Implementation Plan

### Step 1: Configure Cloudflare Pages Project

Create the Cloudflare Pages project linked to the private GitHub repository.

**Terraform (primary):**
- Define `cloudflare_pages_project` resource
- Set build command: `npm run build`
- Set output directory: `dist`
- Set production branch (e.g., `main`)

**Dashboard fallback:**
1. Go to Cloudflare Dashboard → Workers & Pages → Create
2. Connect to GitHub repository
3. Configure build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Set `NODE_VERSION=24` environment variable in Pages project settings

**Importing existing Pages project (if created via dashboard):**

If the Pages project was already created via the dashboard, import it into Terraform state before applying:

```bash
terraform import cloudflare_pages_project.dnd_astro <account_id>/<project_name>
```

Example:
```bash
terraform import cloudflare_pages_project.dnd_astro b0dc01c04d8d5399bc5d06c4bebb7509/dnd-astro
```

This prevents Terraform from attempting to create a duplicate resource.

### Step 2: Configure Environment Variables

Ensure `NODE_VERSION=24` is set in the Cloudflare Pages project settings (Dashboard → Pages → Settings → Environment variables).

**Terraform note:** Cloudflare Pages project environment variables are not directly supported in Terraform. Use the dashboard or manage via `cloudflare_pages_project` with environment bindings where possible.

### Step 3: Enable Cloudflare Zero Trust Access

Create an Access application for the Pages domain with path-based policies for `/reference/*` and `/private/*`.

**Terraform:**
- Define `cloudflare_zero_trust_access_application` for the Pages domain
- Define two `cloudflare_zero_trust_access_policy` resources with Email OTP provider:
  - Policy 1: Path matcher `/reference/*`
  - Policy 2: Path matcher `/private/*`
- Configure allowed email list (comma-separated via `TF_VAR_allowed_emails`)

**Dashboard fallback:**
1. Go to Cloudflare Zero Trust → Access → Applications
2. Add application for `*.pages.dev` domain
3. Create two Access policies:
   - Policy 1: Provider: Email OTP, Path: `/reference/*`, Allowed emails (comma-separated)
   - Policy 2: Provider: Email OTP, Path: `/private/*`, Allowed emails (comma-separated)
4. Enable both policies for the application

### Step 4: Domain Migration (Future)

When ready to migrate from `*.pages.dev` to `dnd-companion.lorien.cloud`:

**Terraform:**
- Define custom domain in Cloudflare Pages project
- Update Access application to include custom domain
- Manage DNS via Terraform if using Cloudflare DNS

**Dashboard fallback:**
1. Add custom domain to Pages project
2. Update Access policy to cover new domain
3. Verify SSL/TLS is active

## Files to Create/Modify

- `terraform/main.tf` — Cloudflare Pages project, Zero Trust Access application, Access policy
- `terraform/variables.tf` — Input variables (allowed emails, domain, etc.)
- `terraform/terraform.tfvars` — Variable values (gitignored)
- `terraform/.gitignore` — Exclude state files and tfvars
- `wrangler.jsonc` — Optional Wrangler config for local dev / manual deployments

## Cloudflare API Token Permissions

Required for Terraform execution (`terraform apply`):

### Account-level (required for all steps)
- **Cloudflare Pages: Edit** — create/manage Pages project (`cloudflare_pages_project`)
- **Zero Trust: Edit** — create/manage Access application & policy (`cloudflare_zero_trust_access_application`, `cloudflare_zero_trust_access_policy`)

### Zone-level (required for Step 4: Domain Migration)
- **DNS: Edit** — create CNAME record for custom domain (`cloudflare_record` on `lorien.cloud` zone)

### Resource scope
- **Account Resources:** Include → Specific account (your Cloudflare account)
- **Zone Resources:** Include → Specific zone (`lorien.cloud`) — only for domain migration

Dashboard fallback does not require API token.

## ADR Constraints

- [ADR-0002: Import Existing Cloudflare Resources into Terraform](../../adr/0002-infrastructure-import-existing-resources.md)

## Testing

1. Run `npm run build` locally — verify `dist/` is generated
2. Push to GitHub — verify Cloudflare Pages triggers a build
3. Visit `*.pages.dev` URL — verify public pages load without login
4. Visit `*.pages.dev/reference/` — verify Zero Trust login prompt appears
5. Visit `*.pages.dev/private/` — verify Zero Trust login prompt appears
6. Complete Email OTP flow — verify access is granted to protected paths
7. Verify static assets load correctly after authentication

## Rollback

1. Remove Cloudflare Pages project from dashboard
2. Destroy Terraform resources: `terraform destroy`
3. Revert any GitHub repository connection changes

## Status

- [x] Implementation complete
- [x] Tests passing
- [x] ADR updated (if new decision made)
