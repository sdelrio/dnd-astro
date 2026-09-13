.PHONY: plan/% apply/% import-worker import-domain import-dns get-domain-id get-dns-id env

# Resource targets
ZEROTRUST_RESOURCES = cloudflare_zero_trust_access_application.dnd_astro cloudflare_zero_trust_access_policy.protected_paths

# Read from terraform.tfvars if env vars not set
CF_API_TOKEN   ?= $(shell [ -f terraform.tfvars ] && grep -oP 'cloudflare_api_token\s*=\s*"\K[^"]+' terraform.tfvars || echo "")
CF_ACCOUNT_ID  ?= $(shell [ -f terraform.tfvars ] && grep -oP 'cloudflare_account_id\s*=\s*"\K[^"]+' terraform.tfvars || echo "")
CF_ZONE_ID     ?= $(shell [ -f terraform.tfvars ] && grep -oP 'custom_domain_zone_id\s*=\s*"\K[^"]+' terraform.tfvars || echo "")
CUSTOM_DOMAIN  ?= $(shell [ -f terraform.tfvars ] && grep -oP 'custom_domain\s*=\s*"\K[^"]+' terraform.tfvars || echo "")

plan/%:
	terraform plan $(foreach r,$($(*)_RESOURCES),-target=$(r))

apply/%:
	terraform apply $(foreach r,$($(*)_RESOURCES),-target=$(r))

import-worker:
	terraform import cloudflare_workers_script.dnd_astro $(CF_ACCOUNT_ID)/dnd-astro

import-domain:
	terraform import 'cloudflare_workers_domain.custom[0]' $(CF_ACCOUNT_ID)/$(shell $(MAKE) get-domain-id)

import-dns:
	terraform import 'cloudflare_record.custom_domain[0]' $(CF_ZONE_ID)/$(shell $(MAKE) get-dns-id)

get-domain-id:
	@curl -s "https://api.cloudflare.com/client/v4/accounts/$(CF_ACCOUNT_ID)/workers/domains" \
		-H "Authorization: Bearer $(CF_API_TOKEN)" | jq -r '.result[] | select(.hostname == "$(CUSTOM_DOMAIN)") | .id'

get-dns-id:
	@curl -s "https://api.cloudflare.com/client/v4/zones/$(CF_ZONE_ID)/dns_records?name=$(CUSTOM_DOMAIN)" \
		-H "Authorization: Bearer $(CF_API_TOKEN)" | jq -r '.result[0].id'

env:
	@echo "CF_API_TOKEN  = $(if $(CF_API_TOKEN),$(CF_API_TOKEN),NOT SET)"
	@echo "CF_ACCOUNT_ID = $(if $(CF_ACCOUNT_ID),$(CF_ACCOUNT_ID),NOT SET)"
	@echo "CF_ZONE_ID    = $(if $(CF_ZONE_ID),$(CF_ZONE_ID),NOT SET)"
	@echo "CUSTOM_DOMAIN = $(if $(CUSTOM_DOMAIN),$(CUSTOM_DOMAIN),NOT SET)"
