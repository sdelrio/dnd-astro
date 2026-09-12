# Technical Specification: Custodied D&D Rules Compendium & Character Viewer

## 1. System Overview & Context
This project is a high-performance, secure digital compendium for D&D homebrew and custom rules. It leverages a modern, decoupled static-first approach to maximize loading speeds, minimize client-side JavaScript execution, and isolate interactive logic using the island architecture.

### Tech Stack Constraints
* **Core Framework:** Astro 7.3 (Static Site Generation / SSG mode)
* **Documentation Base:** Astro Starlight
* **Runtime Environment:** Node.js 24
* **Interactivity Tier 1 (Lightweight Client State):** Alpine.js
* **Interactivity Tier 2 (Complex UI/Data Operations):** React 19+
* **Styling:** Tailwind CSS (Integrated natively via Starlight)
* **Hosting & Security:** Cloudflare Pages (Free Tier) + Cloudflare Zero Trust (Access) via Email OTP

---

## 2. Infrastructure & Deployment Architecture

### CI/CD & Deployment Source
* The canonical source of truth is a **private GitHub Repository**.
* The deployment target is **Cloudflare Pages**, synchronized natively via Git integration.
* **Build Command:** `npm run build` (Maps to `astro build`)
* **Output Directory:** `dist`
* **Environment Variable Constraint:** `NODE_VERSION=24` must be explicitly configured in the Cloudflare Pages Dashboard.

### Network & Security Perimeter
* **No Server-Side Compute (Zero Node.js Server in Production):** The build output must evaluate strictly to static assets.
* **Network Gating:** Security is enforced edge-side by Cloudflare Zero Trust Access. 
* **Ingress Guardrails:** Access policies restrict the entire `.pages.dev` deployment (and any custom domain mapped via Terraform) via Email One-Time Pin (OTP) authentication for up to 50 allowed emails.
* No cryptographic encryption is needed within the client build because Cloudflare completely gates the asset distribution tier.

---

## 3. UI/UX Architecture & Framework Distribution

### Rule of Least Client-Side JavaScript
To optimize performance, JavaScript frameworks must not be universally bundled or loaded on documentation pages. Frameworks must be scoped strictly to individual component instances or specific layout islands.

### Icon Components (Zero-JS / Static Server Hydration)
Decorative icons from the Iconify ecosystem must be rendered via `src/components/IconifyIcon.astro`, a pure Astro component that fetches SVGs from the Iconify API at build time. See [ADR 0001](./docs/adr/0001-icon-component.md) for full rationale.

```astro
import IconifyIcon from '../../components/IconifyIcon.astro';

<IconifyIcon icon="game-icons:flat-hammer" width="1.5em" />
<IconifyIcon icon="game-icons:bowman" width={iconSize} />
```

Do **not** use `@iconify/react` in documentation pages — it requires a React renderer and bundles unnecessary client JS.

### Starlight Native Elements (Zero-JS / Static Server Hydration)
Standard rule documentation must use built-in Starlight components. These generate pure semantic HTML and CSS during the build step:
* **Layout Cards:** Use `<Card>` and `<CardGrid>` for category listings.
* **UI Layout Layout Switchers:** Use `<Tabs>` and `<TabItem>` for switching perspectives.
* **Collapsible Sections:** Use native HTML `<details>` and `<summary>` tags, fully styled by Starlight's CSS tokens, for feats, tables, and spell descriptions.

### Alpine.js Boundaries
Used exclusively for local client-side interaction that doesn't rely on remote backend schemas or computational manipulation.
* **Scope:** Mobile navigation states, UI toggle state (light/dark sync adjustments), and minor aesthetic view changes.

### React Island Breakdown (Targeted Pages)
React must only be bundled and loaded on the specific pages managing the three high-interactivity mechanics detailed below. If a page does not load these explicit islands, React runtime bundles must be completely omitted from the network payload.

#### Island 1: Dice Roller & Character Sheet Generator
* **File Location:** `src/components/dice-roller/`
* **Hydration Strategy:** `client:load` (Needs immediate responsiveness upon initialization).
* **Mechanics:** Mathematical randomization models for multi-dice pools, modifier injections, and programmatic output into an ephemeral JSON state representing temporary base statistics.

#### Island 2: Book-Filtered Feat Matrix
* **File Location:** `src/components/feats-explorer/`
* **Hydration Strategy:** `client:visible` (Deferred execution until the viewport crosses the component boundary).
* **Mechanics:** Fuzzy client-side searching, sub-category relational indexing, and multi-select filtering over a matrix of pre-compiled rules.

#### Island 3: Fantasy Grounds XML Character Sheet Viewer
* **File Location:** `src/components/xml-viewer/`
* **Hydration Strategy:** Static Layout Pre-rendering (Build-time compilation) OR `client:load` if deep nested state manipulation is present.
* **Execution Flow:** 
  1. During the Astro project compilation phase (`astro build`), Node.js native filesystem routines (`node:fs`) extract raw text payloads from `.xml` schemas stored directly inside `src/assets/fantasy-grounds-sheets/`.
  2. A secure server-side parser maps the proprietary Fantasy Grounds XML node trees into clean JSON schemas.
  3. The structural JSON schema is injected directly into the React component via static data attributes (`props`).
  4. The React component consumes the JSON data to display rich, highly stylized visual character dossiers.

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
│   │   ├── dice-roller/             # Isolated React UI for RNG and sheet generation
│   │   ├── feats-explorer/          # Isolated React UI for advanced lookup tables
│   │   └── xml-viewer/              # Isolated React UI for character presentation
│   ├── content/
│   │   └── docs/                    # Starlight MDX files (Standard static rulebooks)
│   └── pages/                       # Custom Astro routes bypassing default Starlight if needed
├── astro.config.mjs                 # Main engine setup (Astro + Starlight + React + Alpine integrations)
├── package.json                     # Dependency manifests specifying Node 24 baseline
└── SPEC.md                          # This architectural specification document
```

---

## 5. Development Integrity Rules for Agents

1. **Never Anidate React inside Alpine or vice versa:** Keep context scopes entirely isolated to avoid unhandled DOM collisions.
2. **Prevent Hydration Mismatch:** Ensure that data injected into React components from the static Astro frontmatter matches exactly between server-side pre-rendering and client-side activation.
3. **No Direct DOM Mutations:** For React islands, let React control the DOM tree. For Starlight documentation pages, rely strictly on declarative HTML attributes.
4. **Enforce Component Splitting:** Do not cluster all 3 systems into a single monolithic bundle. Treat the Dice Roller, Feat Matrix, and XML Viewer as strictly separate application islands.

