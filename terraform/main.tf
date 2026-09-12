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
  account_id      = var.cloudflare_account_id
  name            = var.project_name
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
