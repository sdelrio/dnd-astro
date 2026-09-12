---
status: draft
title: "Infrastructure & Deployment Architecture"
author: "sdelrio"
date: "2026-09-12"
tags: [infrastructure, deployment, ci-cd, cloudflare, security, terraform]
affects: [wrangler.toml, terraform/, package.json]
adr_constraints: []
---

# SPEC: Infrastructure & Deployment Architecture

## Summary

Static Astro site deployed to Cloudflare Pages via Git integration, secured edge-side with Cloudflare Zero Trust Access (Email OTP), infrastructure defined as Terraform IaC.

## Problem Statement

The project needs a secure, zero-server deployment pipeline that gates access to the site without requiring client-side encryption or server-side compute. Security is enforced entirely at the Cloudflare edge.

## Goals

- Zero Node.js server in production (static assets only)
- Git-synced deployment from private GitHub repository to Cloudflare Pages
- Edge-gated access via Cloudflare Zero Trust Email OTP (6 allowed emails, built-in provider)
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

### Step 2: Configure Environment Variables

Ensure `NODE_VERSION=24` is set in the Cloudflare Pages project settings (Dashboard → Pages → Settings → Environment variables).

**Terraform note:** Cloudflare Pages project environment variables are not directly supported in Terraform. Use the dashboard or manage via `cloudflare_pages_project` with environment bindings where possible.

### Step 3: Enable Cloudflare Zero Trust Access

Create an Access application and policy to gate the entire `.pages.dev` deployment.

**Terraform:**
- Define `cloudflare_zero_trust_access_application` for the Pages domain
- Define `cloudflare_zero_trust_access_policy` with Email OTP provider
- Configure allowed email list (6 emails, Cloudflare built-in Email OTP)

**Dashboard fallback:**
1. Go to Cloudflare Zero Trust → Access → Applications
2. Add application for `*.pages.dev` domain
3. Create Access policy:
   - Provider: Email OTP
   - Add allowed email addresses (6 emails, built-in provider)
4. Enable policy for the application

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
- `wrangler.toml` — Optional Wrangler config for local dev / manual deployments

## ADR Constraints

No existing ADRs constrain this implementation.

## Testing

1. Run `npm run build` locally — verify `dist/` is generated
2. Push to GitHub — verify Cloudflare Pages triggers a build
3. Visit `*.pages.dev` URL — verify Zero Trust login prompt appears
4. Complete Email OTP flow — verify access is granted
5. Verify static assets load correctly after authentication

## Rollback

1. Remove Cloudflare Pages project from dashboard
2. Destroy Terraform resources: `terraform destroy`
3. Revert any GitHub repository connection changes

## Status

- [ ] Implementation complete
- [ ] Tests passing
- [ ] ADR updated (if new decision made)
