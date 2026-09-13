variable "cloudflare_api_token" {
  description = "Cloudflare API token with Pages permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "dnd-astro"
}

variable "github_owner" {
  description = "GitHub repository owner (e.g. sdelrio)"
  type        = string
}

variable "github_repo_name" {
  description = "GitHub repository name (e.g. dnd-astro)"
  type        = string
  default     = "dnd-astro"
}

variable "production_branch" {
  description = "Production branch for Cloudflare Workers Builds"
  type        = string
  default     = "main"
}

variable "allowed_emails" {
  description = "Comma-separated list of email addresses allowed via Email OTP"
  type        = string
  default     = "fake@example.com"
}

variable "protected_paths" {
  description = "Comma-separated list of paths to protect with Zero Trust (e.g. /reference/*,/private/*)"
  type        = string
  default     = "/reference/*,/private/*"
}

variable "custom_domain" {
  description = "Custom domain for the Pages project (e.g. dnd-companion.lorien.cloud)"
  type        = string
  default     = ""
}

variable "custom_domain_zone" {
  description = "Cloudflare zone name for the custom domain (e.g. lorien.cloud)"
  type        = string
  default     = ""
}

variable "cloudflare_username" {
  description = "Cloudflare account username for workers.dev URL (e.g. oftheriver)"
  type        = string
  default     = ""
}

variable "custom_domain_zone_id" {
  description = "Cloudflare zone ID for the custom domain (optional, auto-resolved if empty)"
  type        = string
  default     = ""
}

locals {
  email_list            = split(",", var.allowed_emails)
  protected_path_list   = split(",", var.protected_paths)
  has_custom_domain     = var.custom_domain != ""
  custom_domain_zone_id = var.custom_domain_zone != "" ? data.cloudflare_zone.custom_domain[0].id : null

  # Production domain: custom_domain if set, else workers.dev, else pages.dev
  production_domain = local.has_custom_domain ? var.custom_domain : (
    var.cloudflare_username != "" ? "${var.project_name}.${var.cloudflare_username}.workers.dev" : "${var.project_name}.pages.dev"
  )

  app_destinations = {
    for p in local.protected_path_list : p => [
      { type = "public", uri = "https://${local.production_domain}${p}" }
    ]
  }
}

data "cloudflare_zone" "custom_domain" {
  count = var.custom_domain_zone != "" ? 1 : 0
  name  = var.custom_domain_zone
}


