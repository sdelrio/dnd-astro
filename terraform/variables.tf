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
  description = "Name of the Cloudflare Pages project"
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
  description = "Production branch for Cloudflare Pages"
  type        = string
  default     = "main"
}

variable "allowed_emails" {
  description = "Comma-separated list of email addresses allowed via Email OTP"
  type        = string
  default     = "fake@example.com"
}

locals {
  email_list = split(",", var.allowed_emails)
}


