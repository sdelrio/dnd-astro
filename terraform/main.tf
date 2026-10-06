terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Worker script with static assets
# Builds the Astro static site to dist/ and serves via Workers
resource "cloudflare_workers_script" "dnd_astro" {
  account_id         = var.cloudflare_account_id
  script_name        = var.project_name
  content            = file("${path.module}/../worker/index.js")
  main_module        = "index.js"
  compatibility_date = "2026-09-13"
  keep_assets        = true
}

# Custom domain for Worker (optional)
# Renamed from cloudflare_workers_domain in provider v5; the old resource
# type no longer exists, so Terraform drops the old state address without a
# destroy and the real domain re-imports under the new type
# (make import-domain):
resource "cloudflare_workers_custom_domain" "custom" {
  count      = local.has_custom_domain ? 1 : 0
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.custom_domain[0].id
  hostname   = var.custom_domain
  service    = var.project_name
}

# Note: workers.dev subdomain is NOT managed via cloudflare_workers_custom_domain
# It is controlled by the `workers_dev` setting in wrangler.jsonc
# Run `wrangler deploy` to apply changes to workers_dev
# Note: no separate DNS record resource. A Workers custom domain creates and
# owns its own record on the host (a proxied placeholder marked read_only by
# the API); declaring a second record made apply fail with error 81062
# ("A DNS record managed by Workers already exists on that host"), and the v4
# cloudflare_record CNAME could never be created alongside it either

# Zero Trust Access identity provider: Email OTP
# Provider v5 made the config object required for every provider; ONETIMEPIN
# needs none of its fields
resource "cloudflare_zero_trust_access_identity_provider" "otp" {
  account_id = var.cloudflare_account_id
  name       = "One-time PIN login"
  type       = "onetimepin"
  config     = {}
}

# Zero Trust Access applications for each protected path
# Provider v5 inverted the application/policy relationship: policies attach
# inline under `policies` and the standalone application-scoped policy resource
# lost its application_id argument. The removed block drops the old
# cloudflare_zero_trust_access_policy state entry while keeping the remote
# policy; the same policy is then attached inline below. The inline policy
# adopts that remote policy by matching Cloudflare's app-policy payload, so
# apply must not run while the application resource has no policies attribute
# or Cloudflare detaches and garbage-collects it.
resource "cloudflare_zero_trust_access_application" "dnd_astro" {
  for_each                  = local.app_destinations
  account_id                = var.cloudflare_account_id
  name                      = "${var.project_name} Access - ${each.key}"
  domain                    = "${local.production_domain}${each.key}"
  type                      = "self_hosted"
  session_duration          = "24h"
  auto_redirect_to_identity = true
  allowed_idps              = [cloudflare_zero_trust_access_identity_provider.otp.id]

  destinations = each.value

  policies = [
    {
      name       = "Email OTP - ${each.key}"
      decision   = "allow"
      precedence = 1
      include    = [for email in local.email_list : { email = { email = email } }]
    },
  ]
}

removed {
  from = cloudflare_zero_trust_access_policy.protected_paths

  lifecycle {
    destroy = false
  }
}
