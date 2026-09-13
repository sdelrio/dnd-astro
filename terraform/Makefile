.PHONY: plan-zerotrust apply-zerotrust

plan-zerotrust:
	terraform plan \
		-target=cloudflare_zero_trust_access_application.dnd_astro \
		-target=cloudflare_zero_trust_access_policy.protected_paths

apply-zerotrust:
	terraform apply \
		-target=cloudflare_zero_trust_access_application.dnd_astro \
		-target=cloudflare_zero_trust_access_policy.protected_paths
