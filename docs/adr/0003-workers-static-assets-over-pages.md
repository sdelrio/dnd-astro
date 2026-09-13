---
status: accepted
date: 2026-09-13
supersedes: null
superseded_by: null
tags: [infrastructure, cloudflare, workers, pages, deployment]
---

# ADR-0003: Use Cloudflare Workers with Static Assets over Pages

## Context and Problem Statement

The project needs to deploy a static Astro site to Cloudflare. Cloudflare Pages was the traditional choice for static sites, but as of 2026, Pages is marked as a legacy workflow in the dashboard and is no longer receiving new features. Workers now supports static assets and is Cloudflare's recommended approach for new deployments.

Should we use Cloudflare Pages (legacy) or Cloudflare Workers with static assets for deploying the static Astro site?

## Decision Drivers

- Follow Cloudflare's current recommended deployment path for 2026
- Ensure access to new features and improvements
- Maintain simplicity for a static-only site
- Enable future flexibility if dynamic routes are needed
- Avoid migrating later when Pages is eventually deprecated

## Considered Options

- **Option A: Cloudflare Pages** — Use the legacy Pages workflow with git-connected builds and preview deployments.
- **Option B: Cloudflare Workers with Static Assets** — Use Workers as the deployment target with static assets configuration in `wrangler.jsonc`.

## Decision Outcome

Chosen option: **Option B** — Use Cloudflare Workers with static assets

### Consequences

- Good, because Workers is Cloudflare's recommended approach for new projects in 2026.
- Good, because Workers receives all new features while Pages is in maintenance mode.
- Good, because the same `wrangler.jsonc` configuration can be used for both local development and production.
- Good, because adding dynamic routes later (e.g., API endpoints) is straightforward with Workers.
- Good, because Workers provides better observability (Workers Logs, Logpush, Tail Workers).
- Neutral, because Workers does not have built-in PR preview deployments like Pages (requires CI/CD setup).
- Neutral, because the Workers dashboard UI is different from Pages but equally functional.

## References

- Cloudflare Docs: [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- Cloudflare Docs: [Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- Cloudflare Blog: [Cloudflare Workers Static Assets vs Pages in 2026](https://blog.oriz.in/blog/cloudflare-workers-static-assets-vs-pages-in-2026/)
