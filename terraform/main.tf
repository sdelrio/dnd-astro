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

# Cloudflare Pages project linked to private GitHub repo
# Builds the Astro static site to dist/
#
# Dashboard fallback:
# 1. Go to Cloudflare Dashboard → Workers & Pages → Create
# 2. Connect to GitHub repository
# 3. Configure build settings:
#    - Framework preset: Astro
#    - Build command: npm run build
#    - Build output directory: dist
# 4. Set NODE_VERSION=24 in Pages project settings
resource "cloudflare_pages_project" "dnd_astro" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  source {
    type = "github"
    config {
      owner             = var.github_owner
      repo_name         = var.github_repo_name
      production_branch = var.production_branch
    }
  }
}

# Custom domain for Pages project (optional)
resource "cloudflare_pages_domain" "custom" {
  count        = local.has_custom_domain ? 1 : 0
  account_id   = var.cloudflare_account_id
  project_name = var.project_name
  domain       = var.custom_domain
}

# DNS record for custom domain (optional)
resource "cloudflare_record" "custom_domain" {
  count   = local.has_custom_domain ? 1 : 0
  zone_id = data.cloudflare_zone.custom_domain[0].id
  type    = "CNAME"
  name    = replace(var.custom_domain, ".${var.custom_domain_zone}", "")
  content = "${var.project_name}.pages.dev"
  proxied = true
  ttl     = 1
}

# Zero Trust Access applications for each protected path
resource "cloudflare_zero_trust_access_application" "dnd_astro" {
  for_each                  = local.app_destinations
  account_id                = var.cloudflare_account_id
  name                      = "${var.project_name} Access - ${each.key}"
  domain                    = local.production_domain
  type                      = "self_hosted"
  session_duration          = "24h"
  auto_redirect_to_identity = false

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
