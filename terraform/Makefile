.PHONY: plan-zerotrust apply-zerotrust import-worker import-domain import-dns get-domain-id get-dns-id

# Requires: CF_API_TOKEN, CF_ACCOUNT_ID, CF_ZONE_ID env vars

plan-zerotrust:
	terraform plan \
		-target=cloudflare_zero_trust_access_application.dnd_astro \
		-target=cloudflare_zero_trust_access_policy.protected_paths

apply-zerotrust:
	terraform apply \
		-target=cloudflare_zero_trust_access_application.dnd_astro \
		-target=cloudflare_zero_trust_access_policy.protected_paths

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
