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

Static Astro site deployed to Cloudflare Workers with static assets, with Cloudflare Zero Trust Access (Email OTP) protecting `/reference/*` and `/private/*` paths only, infrastructure defined as Terraform IaC.

## Problem Statement

The project needs a secure, zero-server deployment pipeline that gates access to the site without requiring client-side encryption or server-side compute. Security is enforced entirely at the Cloudflare edge.

## Goals

- Zero Node.js server in production (static assets only)
- Git-synced deployment from private GitHub repository to Cloudflare Workers
- Edge-gated access via Cloudflare Zero Trust Email OTP for `/reference/*` and `/private/*` paths only (comma-separated email list via env var)
- Infrastructure as Code via Terraform with fallback to Cloudflare dashboard
- Support initial `*.workers.dev` deployment with migration path to `dnd-companion.lorien.cloud`

## Non-Goals

- No SSR or server-side compute in production
- No client-side cryptographic encryption (Cloudflare gates asset distribution)
- No OAuth/SSO authentication (Email OTP only)
- No CI/CD pipeline for infrastructure beyond Cloudflare Workers Builds

## Implementation Plan

### Step 1: Configure Cloudflare Worker

Create the Cloudflare Worker with static assets linked to the private GitHub repository.

**Terraform (primary):**
- Define `cloudflare_workers_script` resource
- Set compatibility_date
- Content loaded from built `_worker.js`

**Dashboard fallback:**
1. Go to Cloudflare Dashboard → Workers & Pages → Create
2. Select "Worker" (not Pages)
3. Connect to GitHub repository
4. Configure build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Set `NODE_VERSION=24` environment variable in Worker settings

**Importing existing Worker (if created via dashboard):**

If the Worker was already created via the dashboard, import it into Terraform state before applying:

**How to get the IDs:**
- **account_id:** Found in Cloudflare Dashboard → URL bar (`/accounts/<account_id>/...`) or via API:
  ```bash
  curl -s "https://api.cloudflare.com/client/v4/accounts" \
    -H "Authorization: Bearer <api_token>" | jq '.result[].id'
  ```
- **worker_name:** The name shown in Workers & Pages dashboard (e.g., `dnd-astro`)

**Import command:**
```bash
terraform import cloudflare_workers_script.dnd_astro <account_id>/<worker_name>
```

Example:
```bash
terraform import cloudflare_workers_script.dnd_astro b0dc01c04d8d5399bc5d06c4bebb7509/dnd-astro
```

This prevents Terraform from attempting to create a duplicate resource.

### Step 2: Configure Environment Variables

Ensure `NODE_VERSION=24` is set in the Cloudflare Worker settings (Dashboard → Workers & Pages → dnd-astro → Settings → Environment variables).

**Terraform note:** Cloudflare Worker environment variables are not directly supported in Terraform. Use the dashboard or manage via `cloudflare_workers_secret` for sensitive values.

### Step 3: Enable Cloudflare Zero Trust Access

Create an Access application for the Worker domain with path-based policies for `/reference/*` and `/private/*`.

**Terraform:**
- Define `cloudflare_zero_trust_access_application` for the Worker domain
- Define two `cloudflare_zero_trust_access_policy` resources with Email OTP provider:
  - Policy 1: Path matcher `/reference/*`
  - Policy 2: Path matcher `/private/*`
- Configure allowed email list (comma-separated via `TF_VAR_allowed_emails`)

**Dashboard fallback:**
1. Go to Cloudflare Zero Trust → Access → Applications
2. Add application for `*.workers.dev` domain (or custom domain)
3. Create two Access policies:
   - Policy 1: Provider: Email OTP, Path: `/reference/*`, Allowed emails (comma-separated)
   - Policy 2: Provider: Email OTP, Path: `/private/*`, Allowed emails (comma-separated)
4. Enable both policies for the application

### Step 4: Custom Domain Configuration

Configure custom domain `dnd-companion.lorien.cloud` for the Worker.

**Terraform:**
- Define `cloudflare_workers_domain` resource for custom domain
- Define `cloudflare_record` CNAME pointing custom domain to Worker
- Update Access application to include custom domain in destinations
- Manage DNS via Terraform using Cloudflare zone `lorien.cloud`

**Dashboard fallback:**
1. Go to Cloudflare Dashboard → Workers & Pages → dnd-astro → Settings → Domains & Routes
2. Add custom domain `dnd-companion.lorien.cloud`
3. Update Access policy to cover new domain
4. Verify SSL/TLS is active

**Importing existing custom domain (if configured via dashboard):**

If the custom domain was already added via the dashboard, import the resources into Terraform state.

**How to get the IDs:**

1. **account_id:** Found in Cloudflare Dashboard URL or via:
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/accounts" \
     -H "Authorization: Bearer <api_token>" | jq '.result[].id'
   ```

2. **workers_domain_id:** Get via Workers Domains API:
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/domains" \
     -H "Authorization: Bearer <api_token>" | jq '.result[] | {id, hostname}'
   ```
   Returns: `"id": "4c77869efce4fa5bd77542ade1204bad898c34cc"`

3. **zone_id:** Found in Dashboard → lorien.cloud → Overview, or via:
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/zones?name=lorien.cloud" \
     -H "Authorization: Bearer <api_token>" | jq '.result[].id'
   ```

4. **record_id:** Get DNS record ID after zone_id is known:
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records?name=dnd-companion.lorien.cloud" \
     -H "Authorization: Bearer <api_token>" | jq '.result[] | {id, name, type}'
   ```

**Import commands:**
```bash
# Workers domain binding (format: account_id/workersDomainID)
terraform import 'cloudflare_workers_domain.custom[0]' <account_id>/<workers_domain_id>

# DNS CNAME record (format: zone_id/record_id)
terraform import 'cloudflare_record.custom_domain[0]' <zone_id>/<record_id>
```

Example:
```bash
terraform import 'cloudflare_workers_domain.custom[0]' b0dc01c04d8d5399bc5d06c4bebb7509/4c77869efce4fa5bd77542ade1204bad898c34cc
terraform import 'cloudflare_record.custom_domain[0]' e88cfc8197afaa3350144dce80293e37/<record_id>
```

Note: The quotes around the resource address are required because of the `[0]` index.

**DNS Configuration:**
- CNAME record: `dnd-companion` → `dnd-astro.oftheriver.workers.dev`
- Proxied through Cloudflare (orange cloud enabled)

**workers.dev subdomain:**
- When custom domain is configured, set `workers_dev: false` in `wrangler.jsonc` to disable the production workers.dev URL
- Preview URLs (`*-dnd-astro.oftheriver.workers.dev`) remain enabled via `preview_urls: true` and `preview_branches: true`
- This ensures only the custom domain serves production traffic, while branch previews are still accessible
- If custom domain is removed later, set `workers_dev: true` to re-enable the production workers.dev URL

**Dashboard verification locations:**

| Setting | Dashboard Path |
|---------|----------------|
| Worker script content | Workers & Pages → dnd-astro → Editor |
| Compatibility date | Workers & Pages → dnd-astro → Settings → Compatibility Flags |
| Build configuration | Workers & Pages → dnd-astro → Settings → Builds |
| Worker URL (production) | Workers & Pages → dnd-astro → Domains → Worker URL |
| Preview URLs | Workers & Pages → dnd-astro → Domains → Preview |
| Custom domains | Workers & Pages → dnd-astro → Domains → Custom Domains and Routes |
| Triggers (cron, queues) | Workers & Pages → dnd-astro → Settings → Triggers |

## Files to Create/Modify

- `terraform/main.tf` — Cloudflare Worker script, Zero Trust Access application, Access policy
- `terraform/variables.tf` — Input variables (allowed emails, domain, etc.)
- `terraform/terraform.tfvars` — Variable values (gitignored)
- `terraform/.gitignore` — Exclude state files and tfvars
- `wrangler.jsonc` — Workers configuration with static assets

## Cloudflare API Token Permissions

Required for Terraform execution (`terraform apply`):

### Account-level (required for all steps)
- **Workers Scripts: Edit** — create/manage Worker script (`cloudflare_workers_script`)
- **Zero Trust: Edit** — create/manage Access application & policy (`cloudflare_zero_trust_access_application`, `cloudflare_zero_trust_access_policy`)

### Zone-level (required for Step 4: Custom Domain)
- **DNS: Edit** — create CNAME record for custom domain (`cloudflare_record` on specific zone)
- **Workers Routes: Edit** — bind custom domain to Worker (`cloudflare_workers_domain`)

### Resource scope
- **Account Resources:** Include → Specific account (your Cloudflare account)
- **Zone Resources:** Include → Specific zone (e.g., `lorien.cloud`) — required for custom domain DNS and routing

### Token setup summary
1. Go to **My Profile → API Tokens → Create Token** (or edit existing)
2. Add Account permissions:
   - Workers Scripts: Edit
   - Zero Trust: Edit
3. Add Zone permission:
   - DNS: Edit (on your specific zone)
   - Workers Routes: Edit (on your specific zone)
4. Set Account Resources → Include → Your specific account
5. Set Zone Resources → Include → Your specific zone (not "All zones")

Dashboard fallback does not require API token.

## ADR Constraints

- [ADR-0002: Import Existing Cloudflare Resources into Terraform](../../adr/0002-infrastructure-import-existing-resources.md)
- [ADR-0003: Use Cloudflare Workers with Static Assets over Pages](../../adr/0003-workers-static-assets-over-pages.md)

## Testing

1. Run `npm run build` locally — verify `dist/` is generated
2. Push to GitHub — verify Cloudflare Workers Builds triggers a deployment
3. Visit `*.workers.dev` URL — verify public pages load without login
4. Visit `*.workers.dev/reference/` — verify Zero Trust login prompt appears
5. Visit `*.workers.dev/private/` — verify Zero Trust login prompt appears
6. Visit `dnd-companion.lorien.cloud` — verify custom domain works
7. Complete Email OTP flow — verify access is granted to protected paths
8. Verify static assets load correctly after authentication

## Rollback

1. Remove Cloudflare Worker from dashboard
2. Destroy Terraform resources: `terraform destroy`
3. Revert any GitHub repository connection changes

## Status

- [x] Implementation complete
- [x] Tests passing
- [x] ADR updated (if new decision made)
