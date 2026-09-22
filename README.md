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

## Project structure

Committed layout, with generated output annotated:

```text
docs/                    Architecture decisions, specs, and agent workflow docs
  adr/                   Accepted architecture decision records (ADR 0001 - 0007)
  agents/                Issue tracker, triage, and domain conventions
  specs/                 Feature specifications
public/                  Static assets served as-is
  fg/
    avatar/              Character portrait images
    party.json           Current party roster
  fonts/                 Self-hosted webfont files
scripts/                 One-off content extraction scripts
src/
  components/
    dice-roller/         Dice Roller Alpine.js island
    feats-explorer/      Feat Explorer Alpine.js island
    point-buy/           Point Buy Alpine.js island
    xml-viewer/          XML Character Viewer components (XmlCard, CharSearch, PartyView)
  content/
    docs/                Starlight Markdown and MDX content
  generated/             gitignored: characters.json, rebuilt on every dev/build
  pages/
    fantasy-grounds/
      characters/
        [slug].astro     Prerendered Character page route
  styles/                Tailwind v4 entry and theme CSS
  utils/                 XML parsing and build pipeline modules
terraform/               Cloudflare infrastructure as code
worker/                  Cloudflare Worker static assets entrypoint
astro.config.mjs         Astro, Starlight, Alpine.js, and Mermaid setup plus the XML hook
wrangler.jsonc           Cloudflare Workers static assets config
devbox.json              Pinned Node 24 / pnpm toolchain
Makefile                 Verification gates (make check)
AGENTS.md                Agent workflow and repo conventions
CONTEXT.md               Domain glossary
SPEC.md                  Technical specification
```

Build output and local scratch space (`dist/`, `.astro/`, `src/generated/`, `tmp/`, `.scratch/`) are gitignored and never committed.

## Architecture

### Least client-side JavaScript

The site is statically generated: every page ships as HTML and CSS, and interactive behavior lives in small Alpine.js islands scoped to the component that needs it. New interactivity belongs in an island, not in a site-wide framework bundle.

### Build-time Fantasy Grounds XML pipeline

`astro.config.mjs` registers an `xml-character-viewer` integration whose `astro:config:setup` hook runs on every Astro startup, dev and build, so the generated data exists before any page renders. The hook calls `buildXmlCharacters()` in `src/utils/build-xml-characters.ts`, which:

1. Reads the committed Fantasy Grounds `.xml` sheets under `src/assets`.
2. Parses each Character sheet with `fast-xml-parser` (through `src/utils/parse-character-xml.ts`) into a `CharacterData` record.
3. Resolves each avatar path with the `.jpg` -> `.png` -> `faceless.svg` fallback.
4. Writes `src/generated/characters.json`, which is gitignored and rebuilt on every dev server start and production build.

`src/generated/characters.json` feeds the Character viewer at build time. A Card (`XmlCard`) renders one Character sheet's data in a Display mode, small, medium, or large, chosen at build time by the page that mounts the Card. The route in `src/pages/fantasy-grounds/characters/[slug].astro` uses `getStaticPaths()` to turn every generated entry into a prerendered Character page: one Character sheet shown as a single full-width large Card, with no server code at runtime.

## Rendering conventions

These follow the accepted ADRs under `docs/adr/`:

- **Icons**: render decorative Iconify icons with `IconifyIcon.astro`. The component fetches SVGs at build time and ships zero client-side JavaScript. See [ADR 0001](docs/adr/0001-icon-component.md).
- **Diagrams**: `mermaid` code fences render through the `astro-mermaid` integration registered in `astro.config.mjs`, which loads Mermaid only on pages that contain a diagram. See [ADR 0007](docs/adr/0007-mermaid-rendering-strategy.md).
- **Admonitions**: Starlight supports exactly four types - `:::note`, `:::tip`, `:::caution`, and `:::danger`. Docusaurus-era `info` and `warning` admonitions are not supported and must not be used. See [ADR 0004](docs/adr/0004-starlight-admonitions.md).
- **Tables**: Markdown content tables are striped with a transparent header row and alternating gradient data rows in the golden-forest theme. See [ADR 0005](docs/adr/0005-table-row-striping-pattern.md).
