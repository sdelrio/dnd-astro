# D&D Companion

D&D rules, Fantasy Grounds xml visualizer. A static-first Starlight docs site plus a Fantasy Grounds character viewer for a homebrew D&D 5e campaign.

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Starlight](https://img.shields.io/badge/Starlight-0.42-A855F7?logo=astro&logoColor=white)](https://starlight.astro.build)
[![Alpine.js](https://img.shields.io/badge/Alpine.js-3-8BC0D0?logo=alpinedotjs&logoColor=white)](https://alpinejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Node.js](https://img.shields.io/badge/Node-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Static_Assets-F38020?logo=cloudflareworkers&logoColor=white)](https://workers.cloudflare.com)

## Overview

D&D Companion is a static-first SSG compendium that hosts the campaign's house rules alongside three interactive tools:

- **Dice Roller**: rolls 4d6-drop-lowest ability scores for character creation.
- **Feat Explorer**: browses and filters feats by ability, book, and level.
- **XML Character Viewer**: parses Fantasy Grounds character XML at build time into character cards and pages.

Interactivity runs as Alpine.js islands on top of the static HTML, so the pages ship without a client-side framework runtime.

## Tech stack

| Layer | Technology |
| --- | --- |
| Site framework | Astro 7 (SSG) + Starlight |
| Interactivity | Alpine.js islands |
| Styling | Tailwind v4 |
| Character data | fast-xml-parser build pipeline |
| Diagrams | Mermaid |
| Tests | Vitest |
| Hosting | Cloudflare Workers static assets |
| Infrastructure | Terraform |
| Toolchain | devbox / Node 24 |

## Quick start

Prerequisites:

- Node 24
- pnpm 11
- Optional: devbox, which pins Node 24 and pnpm for the repo

```sh
pnpm install
pnpm dev
```

Per AGENTS.md, start the dev server in background mode:

```sh
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start the local dev server at `localhost:4321` |
| `pnpm build` | Build the production site to `./dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm typecheck` | Run Astro diagnostics; use `CI=true pnpm typecheck` for noninteractive runs |
| `pnpm lint` | Lint `.astro`, `.ts`, and `.js` files with ESLint, zero warnings allowed |
| `pnpm test` | Run the Vitest unit tests |
| `pnpm astro` | Run the Astro CLI |
| `make check` | Run every gate: lint, typecheck, test, build |
