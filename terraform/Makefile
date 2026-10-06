.PHONY: help plan/% apply/% import-worker import-domain env

# Resource targets
# Provider v5 inlined application-scoped Access policies onto the application
# resource, so the zerotrust group plans/applies one resource type
ZEROTRUST_RESOURCES = cloudflare_zero_trust_access_application.dnd_astro

# Read from terraform.tfvars if env vars not set
CF_API_TOKEN   ?= $(shell [ -f terraform.tfvars ] && grep 'cloudflare_api_token' terraform.tfvars | sed 's/.*"\(.*\)".*/\1/')
CF_ACCOUNT_ID  ?= $(shell [ -f terraform.tfvars ] && grep 'cloudflare_account_id' terraform.tfvars | sed 's/.*"\(.*\)".*/\1/')
CUSTOM_DOMAIN  ?= $(shell [ -f terraform.tfvars ] && grep '^custom_domain' terraform.tfvars | grep -v zone | sed 's/.*"\(.*\)".*/\1/')

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  help              Show this help"
	@echo "  env               Show current environment variables"
	@echo "  plan/<group>      Plan resources for a group"
	@echo "  apply/<group>     Apply resources for a group"
	@echo "  import-worker     Import Worker script into state"
	@echo "  import-domain     Import Workers custom domain binding"
	@echo ""
	@echo "Resource groups:"
	@echo "  zerotrust         Zero Trust Access applications and policies"
	@echo ""
	@echo "Examples:"
	@echo "  make plan/zerotrust"
	@echo "  make apply/zerotrust"
	@echo "  make import-worker"
	@echo "  make import-domain"
	@echo ""
	@echo "Environment variables (or set in terraform.tfvars):"
	@echo "  CF_API_TOKEN      Cloudflare API token"
	@echo "  CF_ACCOUNT_ID     Cloudflare account ID"
	@echo "  CUSTOM_DOMAIN     Custom domain name"
	@echo ""
	@echo "Notes:"
	@echo "  terraform/.terraform.lock.hcl is committed on purpose: it pins provider"
	@echo "  versions for every operator. Do not delete it; if it was removed, restore"
	@echo "  it with 'git checkout -- .terraform.lock.hcl' before running terraform init."

plan/%:
	@echo "Planning $* resources..."
	@echo "Resources: $($(shell echo '$*' | tr '[:lower:]' '[:upper:]')_RESOURCES)"
	@echo "---"
	terraform plan $(foreach r,$($(shell echo '$*' | tr '[:lower:]' '[:upper:]')_RESOURCES),-target=$(r))

apply/%:
	@echo "Applying $* resources..."
	@echo "Resources: $($(shell echo '$*' | tr '[:lower:]' '[:upper:]')_RESOURCES)"
	@echo "---"
	terraform apply $(foreach r,$($(shell echo '$*' | tr '[:lower:]' '[:upper:]')_RESOURCES),-target=$(r))

import-worker:
	terraform import cloudflare_workers_script.dnd_astro $(CF_ACCOUNT_ID)/dnd-astro

import-domain:
	terraform import 'cloudflare_workers_custom_domain.custom[0]' $(CF_ACCOUNT_ID)/$(shell $(MAKE) get-domain-id)

get-domain-id:
	@curl -s "https://api.cloudflare.com/client/v4/accounts/$(CF_ACCOUNT_ID)/workers/domains" \
		-H "Authorization: Bearer $(CF_API_TOKEN)" | jq -r '.result[] | select(.hostname == "$(CUSTOM_DOMAIN)") | .id'

env:
	@echo "CF_API_TOKEN  = $(if $(CF_API_TOKEN),$(CF_API_TOKEN),NOT SET)"
	@echo "CF_ACCOUNT_ID = $(if $(CF_ACCOUNT_ID),$(CF_ACCOUNT_ID),NOT SET)"
	@echo "CUSTOM_DOMAIN = $(if $(CUSTOM_DOMAIN),$(CUSTOM_DOMAIN),NOT SET)"
