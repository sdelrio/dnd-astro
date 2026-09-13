terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
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
  name               = var.project_name
  content            = file("${path.module}/../worker/index.js")
  compatibility_date = "2026-09-13"
}

# Custom domain for Worker (optional)
resource "cloudflare_workers_domain" "custom" {
  count       = local.has_custom_domain ? 1 : 0
  account_id  = var.cloudflare_account_id
  zone_id     = data.cloudflare_zone.custom_domain[0].id
  hostname    = var.custom_domain
  service     = var.project_name
  environment = "production"
}

# Note: workers.dev subdomain is NOT managed via cloudflare_workers_domain
# It is controlled by the `workers_dev` setting in wrangler.jsonc
# Run `wrangler deploy` to apply changes to workers_dev

# DNS record for custom domain (optional)
resource "cloudflare_record" "custom_domain" {
  count   = local.has_custom_domain ? 1 : 0
  zone_id = data.cloudflare_zone.custom_domain[0].id
  type    = "CNAME"
  name    = replace(var.custom_domain, ".${var.custom_domain_zone}", "")
  content = "${var.project_name}.${var.cloudflare_username}.workers.dev"
  proxied = true
  ttl     = 1
}

# Zero Trust Access identity provider: Email OTP
resource "cloudflare_zero_trust_access_identity_provider" "otp" {
  account_id = var.cloudflare_account_id
  name       = "One-time PIN login"
  type       = "onetimepin"
}

# Zero Trust Access applications for each protected path
resource "cloudflare_zero_trust_access_application" "dnd_astro" {
  for_each                  = local.app_destinations
  account_id                = var.cloudflare_account_id
  name                      = "${var.project_name} Access - ${each.key}"
  domain                    = "${local.production_domain}${each.key}"
  type                      = "self_hosted"
  session_duration          = "24h"
  auto_redirect_to_identity = true
  allowed_idps              = [cloudflare_zero_trust_access_identity_provider.otp.id]

  dynamic "destinations" {
    for_each = each.value
    content {
      type = destinations.value.type
      uri  = destinations.value.uri
    }
  }
}

# Access policies: Email OTP for each protected path application
resource "cloudflare_zero_trust_access_policy" "protected_paths" {
  for_each       = local.app_destinations
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_zero_trust_access_application.dnd_astro[each.key].id
  name           = "Email OTP - ${each.key}"
  decision       = "allow"
  precedence     = 1

  include {
    email = local.email_list
  }
}
