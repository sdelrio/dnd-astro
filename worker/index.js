// Minimal Worker script - static assets are served by Workers Assets
// via the `assets` block in wrangler.jsonc. This script exists only
// because the cloudflare_workers_script Terraform resource requires content.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
