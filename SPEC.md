# Technical Specification: Custodied D&D Rules Compendium & Character Viewer

## 1. System Overview & Context
This project is a high-performance, secure digital compendium for D&D homebrew and custom rules. It leverages a modern, decoupled static-first approach to maximize loading speeds, minimize client-side JavaScript execution, and isolate interactive logic using the island architecture.

### Tech Stack Constraints
* **Core Framework:** Astro 7.3 (Static Site Generation / SSG mode)
* **Documentation Base:** Astro Starlight
* **Runtime Environment:** Node.js 24
* **Interactivity Tier 1 (Lightweight Client State):** Alpine.js
* **Interactivity Tier 2 (Complex UI/Data Operations):** Not used - the project is Alpine-only; React is not a dependency and no framework runtime is shipped
* **Styling:** Tailwind CSS (Integrated natively via Starlight)
* **Hosting & Security:** Cloudflare Workers static assets (see [ADR 0003](./docs/adr/0003-workers-static-assets-over-pages.md)) + Cloudflare Zero Trust (Access) via Email OTP

---

## 2. Infrastructure & Deployment Architecture

### CI/CD & Deployment Source
* The canonical source of truth is a **private GitHub Repository**.
* The deployment target is **Cloudflare Workers with static assets** (see [ADR 0003](./docs/adr/0003-workers-static-assets-over-pages.md)), synchronized via Cloudflare Workers Builds Git integration.
* **Build Command:** `pnpm build` (Maps to `astro build`)
* **Output Directory:** `dist`, served by Workers via `assets.directory` in `wrangler.jsonc`
* **Worker Entrypoint:** `worker/index.js` - a static passthrough that returns `env.ASSETS.fetch(request)`
* **Toolchain:** Node.js 24 and pnpm are pinned by `devbox.json`; no Pages dashboard `NODE_VERSION` setting applies.

### Network & Security Perimeter
* **No Server-Side Compute (Zero Node.js Server in Production):** The Worker entrypoint only forwards requests to the static asset binding; no application server logic runs at request time.
* **Network Gating:** Security is enforced edge-side by Cloudflare Zero Trust Access.
* **Ingress Guardrails:** Access policies restrict the protected paths on the production domain (`*.workers.dev` or any custom domain mapped via Terraform) via Email One-Time Pin (OTP) authentication for up to 50 allowed emails.
* No cryptographic encryption is needed within the client build because Cloudflare completely gates the asset distribution tier.

---

## 3. UI/UX Architecture & Framework Distribution

### Rule of Least Client-Side JavaScript
To optimize performance, JavaScript frameworks must not be universally bundled or loaded on documentation pages. Frameworks must be scoped strictly to individual component instances or specific layout islands.

### Icon Components (Zero-JS / Static Server Hydration)
Decorative icons from the Iconify ecosystem must be rendered via `src/components/IconifyIcon.astro`, a pure Astro component that reads SVG data from local `@iconify-json` packages (`@iconify-json/game-icons`, `@iconify-json/mdi`) at build time. No network call to the Iconify API is made, so offline builds still render icons. See [ADR 0001](./docs/adr/0001-icon-component.md) for full rationale.

```astro
import IconifyIcon from '../../components/IconifyIcon.astro';

<IconifyIcon icon="game-icons:flat-hammer" width="1.5em" />
<IconifyIcon icon="game-icons:bowman" width={iconSize} />
```

Do **not** use `@iconify/react` in documentation pages - it requires a React renderer and bundles unnecessary client JS.

### Starlight Native Elements (Zero-JS / Static Server Hydration)
Standard rule documentation must use built-in Starlight components. These generate pure semantic HTML and CSS during the build step:
* **Layout Cards:** Use `<Card>` and `<CardGrid>` for category listings.
* **UI Layout Layout Switchers:** Use `<Tabs>` and `<TabItem>` for switching perspectives.
* **Collapsible Sections:** Use native HTML `<details>` and `<summary>` tags, fully styled by Starlight's CSS tokens, for feats, tables, and spell descriptions.

### Alpine.js Boundaries
Used exclusively for local client-side interaction that doesn't rely on remote backend schemas or computational manipulation.
* **Scope:** Mobile navigation states, UI toggle state (light/dark sync adjustments), and minor aesthetic view changes.

### Alpine.js Interactive Components
All interactive components use Alpine.js for client-side behavior. This eliminates React runtime overhead (~40KB) and keeps JavaScript minimal across all pages. Each component is self-contained in its own directory under `src/components/`.

#### Component 1: Dice Roller & Character Sheet Generator
* **File Location:** `src/components/dice-roller/`
* **Hydration Strategy:** Immediate via Alpine.js `x-init` on the component root element.
* **Mechanics:** Mathematical randomization models for multi-dice pools (4d6-drop-lowest for ability scores), modifier injections, and programmatic output into an ephemeral JSON state representing temporary base statistics.
* **Events:** `@click` for roll buttons, `x-model` for modifier inputs, `x-show`/`x-transition` for result display.

#### Component 2: Book-Filtered Feat Matrix
* **File Location:** `src/components/feats-explorer/`
* **Hydration Strategy:** Eager mount via `x-data` on the component root with the feat dataset inlined at build time (no deferred `x-intersect` trigger; the Alpine intersect plugin may remain registered for future use).
* **Mechanics:** Fuzzy client-side searching, sub-category relational indexing, and multi-select filtering over a matrix of pre-compiled rules.
* **Events:** `@input` for search field, `@change` for filter dropdowns, `x-for` for dynamic list rendering.

#### Component 3: Fantasy Grounds XML Character Sheet Viewer
* **File Location:** `src/components/xml-viewer/`
* **Spec:** [SPEC-003: XML Character Sheet Viewer](./docs/specs/003-xml-character-viewer/SPEC.md)
* **Hydration Strategy:** Static Layout Pre-rendering (Build-time compilation) with Alpine.js for lightweight client interactions (display-mode toggle, expand/collapse, role filtering).
* **Execution Flow:** 
  1. During the Astro project compilation phase (`astro build`), a build hook reads `.xml` files from `src/assets/fantasy-grounds-sheets/` via Node.js.
  2. `fast-xml-parser` maps the proprietary Fantasy Grounds XML node trees into clean JSON schemas.
  3. Avatar image paths are pre-resolved at build time (`.jpg` → `.png` → `faceless.svg` fallback).
  4. The JSON data is injected into Astro components via static props at build time.
  5. Alpine.js handles client-side display-mode toggles and interactive filtering.

---

## 4. Repository & File System Conventions

Agents executing changes in this repository must maintain the following file system boundaries:

```text
├── .github/workflows/    # CI Automation (Optional, Cloudflare hooks directly to Git)
├── docs/
│   └── adr/                         # Architecture Decision Records
├── src/
│   ├── assets/
│   │   └── fantasy-grounds-sheets/  # Canonical storage for source .xml dossiers
│   ├── components/
│   │   ├── IconifyIcon.astro        # Zero-JS Astro component for Iconify icons in MDX
│   │   ├── dice-roller/             # Alpine.js component for RNG and sheet generation
│   │   ├── feats-explorer/          # Alpine.js component for advanced lookup tables
│   │   └── xml-viewer/              # Alpine.js component for character presentation
│   ├── content/
│   │   └── docs/                    # Starlight MDX files (Standard static rulebooks)
│   └── pages/                       # Custom Astro routes bypassing default Starlight if needed
├── astro.config.mjs                 # Main engine setup (Astro + Starlight + Alpine integrations)
├── package.json                     # Dependency manifests specifying Node 24 baseline
└── SPEC.md                          # This architectural specification document
```

---

## 5. Development Integrity Rules for Agents

1. **Keep Alpine.js Scopes Isolated:** Each component must define its own `x-data` scope. Never nest Alpine.js components in ways that cause scope leakage or variable shadowing.
2. **Prevent Hydration Mismatch:** Ensure that data injected into Astro components from static frontmatter matches exactly between server-side pre-rendering and client-side Alpine.js activation.
3. **No Direct DOM Mutations:** Let Alpine.js control reactive state and DOM updates. For Starlight documentation pages, rely strictly on declarative HTML attributes.
4. **Enforce Component Splitting:** Do not cluster all 3 systems into a single monolithic bundle. Treat the Dice Roller, Feat Matrix, and XML Viewer as strictly separate Alpine.js components.

