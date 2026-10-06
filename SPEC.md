# Technical Specification: Custodied D&D Rules Compendium & Character Viewer

## 1. System Overview & Context
This project is a high-performance, secure digital compendium for D&D homebrew and custom rules. It leverages a modern, decoupled static-first approach to maximize loading speeds, minimize client-side JavaScript execution, and keep interactive logic in small, scoped components rather than a UI framework runtime.

### Tech Stack Constraints
* **Core Framework:** Astro 7.3 (Static Site Generation / SSG mode)
* **Documentation Base:** Astro Starlight (`@astrojs/starlight`)
* **Runtime Environment:** Node.js 24
* **Interactivity Tier 1 (Lightweight Client State):** Alpine.js (`alpinejs`, registered through `@astrojs/alpinejs`). The integration is configured with an explicit entrypoint, `src/alpine.ts`, so the runtime is injected site-wide while the interactive behavior stays in small, scoped `x-data` components
* **Interactivity Tier 2 (Complex UI/Data Operations):** Not used - the project is Alpine-only. No UI framework runtime is shipped to the browser: React, Vue, Svelte and their peers are absent from `package.json`, and no page bundles one. That claim is scoped to framework runtimes, not to client JavaScript as a whole. Everything that does reach the browser is named in this list: Alpine.js, Starlight's own small chrome scripts, and the Mermaid loader and library described below, alongside the inline scripts the build emits
* **Diagram Rendering:** `mermaid`, rendered client-side by the `astro-mermaid` integration registered in `astro.config.mjs` (see [ADR 0007](./docs/adr/0007-mermaid-rendering-strategy.md)). The integration injects a small loader into every page, but it imports the `mermaid` library dynamically and only on pages that contain a Mermaid diagram, so the exception to the rule of least client-side JavaScript stays scoped to those pages rather than becoming site-wide
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
To optimize performance, no UI framework runtime is shipped to the browser, and interactive behavior lives in small, scoped Alpine.js components. The Alpine runtime itself is injected site-wide by `@astrojs/alpinejs` with an explicit entrypoint, so the behavior is scoped even though the runtime is not.

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

### Interactive Component Inventory
The site ships exactly five interactive components, one directory each under `src/components/`. There is no sixth, and a new one is added by creating a directory here and naming it in this section.

Four of the five are Alpine components. Their behaviour lives in a `.ts` module beside the `.astro` view, exports a factory, and is registered once in the site-wide entrypoint `src/alpine.ts` as `Alpine.data('<name>', factory)`. The markup then names the registration with a bare `x-data="<name>"` on the component root. No component assigns to `window`, and none declares a `Window` interface. See [ADR-0010](./docs/adr/0010-alpine-data-registration.md) for the decision, and [ADR-0013](./docs/adr/0013-browser-safe-data-module-boundary.md) for the boundary that keeps a browser-bound module from reaching a build-side one.

The fifth, the rulebook spread, is deliberately not an Alpine component, and says so below.

Two other files sit directly in `src/components/` and are deliberately **not** among the five. `IconifyIcon.astro` is a pure build-time Astro component covered in its own subsection above. `ThemeProvider.astro` and `ThemeSelect.astro` are Starlight theme overrides injected through the `components` map in `astro.config.mjs`; they are site chrome rather than tool content, they own a small inline script each, and no `x-data` scope is registered for them. They are listed in the file tree below so the tree stays accurate, and they are named here so their absence from the inventory reads as a decision rather than an oversight.

#### Component 1: Dice Roller & Character Sheet Generator
* **File Location:** `src/components/dice-roller/`
  * `DiceRoller.astro` - the view
  * `dice-roller-component.ts` - the behaviour factory, registered as `Alpine.data('diceRoller', ...)`
  * `dice-utils.ts` - the pure roll and formatting helpers the factory delegates to
* **Spec:** [SPEC-005: Dice Roller & Character Sheet Generator](./docs/specs/005-dice-roller/SPEC.md) (archived)
* **Hydration Strategy:** Eager mount. The root carries `x-data="diceRoller"`, and the factory runs once on init. There is no `x-init` and no deferred trigger.
* **Mechanics:** Mathematical randomization models for multi-dice pools (4d6-drop-lowest for ability scores), modifier injections, and programmatic output into an ephemeral JSON state representing temporary base statistics.
* **Events:** `@click` on the roll buttons and on the swap handles, `@keydown.escape.window` to cancel a staged swap, `x-for` to render the die pips and the ability rows, `x-if` to mount the staged-swap panel, `x-show` for the per-ability rolling pulse, and `x-show` with `x-cloak` for the result log.

#### Component 2: Book-Filtered Feat Matrix
* **File Location:** `src/components/feats-explorer/`
  * `FeatExplorer.astro` - the view
  * `feat-explorer-component.ts` - the behaviour factory, registered as `Alpine.data('featExplorer', ...)`
  * `feat-data.js` and `feat-filter.ts` - the generated dataset and the pure matching helpers. `feat-data.js` is fetched as its own content-hashed chunk, reached from the behaviour module by a dynamic import, so it stays out of the site-wide entrypoint (#387, ADR-0015)
* **Spec:** [SPEC-006: Book-Filtered Feat Matrix](./docs/specs/006-feat-matrix/SPEC.md) (archived)
* **Hydration Strategy:** Eager mount via `x-data` on the component root (no deferred `x-intersect` trigger; the Alpine intersect plugin was removed in #383 now that nothing uses it). `init()` requests the dataset chunk immediately and the view names the brief in-flight state, so no scroll trigger and no deferred hydration.
* **Mechanics:** Fuzzy client-side searching, sub-category relational indexing, and multi-select filtering over a matrix of pre-compiled rules.
* **Events:** `x-model` with `@input.debounce.300ms` for the search field, `x-model` with `@change` for the ability, book and tier dropdowns, `@click` to open the filter panel and to clear filters, `x-for` for dynamic list rendering, `x-show` with `x-cloak` for the panel, the active-filter badge and the empty state.

#### Component 3: Point Buy Ability Score Calculator
* **File Location:** `src/components/point-buy/`
  * `PointBuy.astro` - the view
  * `point-buy-component.ts` - the behaviour factory, registered as `Alpine.data('pointBuy', ...)`
  * `point-buy-utils.ts` - the pure score, cost and modifier helpers. It re-exports the ability names, labels and modifier maths from `dice-roller/dice-utils.ts` rather than redeclaring them, so the two tools cannot drift apart.
* **Hydration Strategy:** Eager mount. The root carries `x-data="pointBuy"`, registered in the same site-wide entrypoint as every other Alpine component. An agent extending this tool must add to the factory, not to a `<script>` inside the `.astro` file.
* **Mechanics:** A 27-point pool spent across the six abilities, scores bounded to 8-15, on the non-linear 5e cost table (1 point per step to 13, then 2 for each of the last two). Each press announces the resulting score, its modifier and the points remaining into a polite live region. A two-press trade moves a score from one ability to another: the first press picks an ability up, the second names where its score goes, and pressing the picked ability again puts it back down. Named starting spreads load in one press, and a reset returns the sheet to its default.
* **Events:** `@click` on each ability's increase, decrease and trade handles, on each starting-spread button, and on reset. A drawable picked state is backed by `aria-pressed` and by the live region, because a ring on one of six names tells a screen reader nothing.

#### Component 4: Fantasy Grounds XML Character Sheet Viewer
* **File Location:** `src/components/xml-viewer/`
  * `PartyView.astro` - the party view, registered as `Alpine.data('partyView', ...)` via `party-view-component.ts`
  * `CharSearch.astro` - the character search, registered as `Alpine.data('charSearch', ...)` via `char-search-component.ts`
  * `XmlCard.astro` and its satellites (`SavesTable`, `SkillsTable`, `CompactAbilityGrid`, `SectionHeader`) - the per-character card, rendered at build time. Its six sections sit behind a menu bar that works two ways: `medium` tabs (`role="tablist"`, registered as `Alpine.data('xmlCard', ...)` via `xml-card-component.ts`), `large` anchor links that jump to a section with no JavaScript. `card-tabs.ts` is the one list of what the six sections are and in what order.
  * `char-filter.ts`, `party-roles.ts`, `party-roster.ts`, `skill-display.ts`, `weapon-display.ts`, `inventory-display.ts`, `card-plate.ts`, `section-heading.ts` - the pure display and filter helpers
* **Spec:** [SPEC-003: XML Character Sheet Viewer](./docs/specs/003-xml-character-viewer/SPEC.md) (archived)
* **Hydration Strategy:** Static Layout Pre-rendering (Build-time compilation) with Alpine.js for lightweight client interactions (card section tabs, role filtering). Every panel is server-rendered and hidden with `x-show`, so the markup a reader gets is complete before Alpine boots and a section switch reveals a section rather than fetching one. This is the one component directory holding three `x-data` roots, so it occupies three registration lines in `src/alpine.ts`.
* **Execution Flow:** 
  1. During the Astro project compilation phase (`astro build`), a build hook reads `.xml` files from `src/assets/fantasy-grounds-sheets/` via Node.js.
  2. `fast-xml-parser` maps the proprietary Fantasy Grounds XML node trees into clean JSON schemas.
  3. Avatar image paths are pre-resolved at build time (`.jpg` → `.png` → `faceless.svg` fallback).
  4. The JSON is written to `src/generated/characters.json` and is read by every consumer through the single typed entry point `src/utils/generated-characters.ts`, so the shapes cannot drift apart. The parser itself is a build-side module, which is why a browser-bound module in this directory may not import it (see [ADR-0013](./docs/adr/0013-browser-safe-data-module-boundary.md)).
  5. Alpine.js handles client-side display-mode toggles and interactive filtering.

#### Component 5: Rulebook Spread (Site Index)
* **File Location:** `src/components/rulebook-index/`
  * `RulebookSpread.astro` - the view, and the one scroll listener it owns
  * `rulebook-parts.ts` - the content model: three parts, each with a stable folio per entry
* **Hydration Strategy:** Not Alpine, and not by omission. This is the site's only component that carries a scoped `<script>` of its own rather than an `Alpine.data` registration, and the choice is what keeps it the cheapest page on the site: one scroll listener, one `requestAnimationFrame`, and two property writes, with no Alpine scope and no framework runtime involved. The behaviour is not importable and so is not unit tested, which is the trade ADR-0010 makes for a component whose whole client cost is a progress readout. Any expansion past that should be a migration to a registered component, not a second embedded script.
* **Mechanics:** The index is set as an open rulebook spread: two printed leaves (House Rules, Reference) and one raised tools panel, with a gutter between them. The gutter reports where the reader is - the current part's Roman numeral and the sheet's scroll fraction as a custom property - and CSS crossfades the numeral and scales the fill. Positions come from `offsetTop` rather than `getBoundingClientRect`, because the gutter is `position: sticky` and a rect would lie. There is deliberately no entrance animation: on an index, a row that has not appeared yet is a row the reader thinks is missing.
* **Events:** `scroll` and `resize` listeners, both passive, both funnelled through a single `requestAnimationFrame`. No `x-data`, no `x-show`, no `x-for`.

---

## 4. Repository & File System Conventions

Agents executing changes in this repository must maintain the following file system boundaries:

```text
├── .github/
│   └── dependabot.yml               # Weekly dependency updates; groups Astro and Starlight
├── .opencode/
│   └── lib/
│       └── design-review/           # Dev-time browser capture, page measurement, and handbook generators
├── docs/
│   ├── adr/                         # Architecture Decision Records (the binding decisions)
│   ├── specs/                       # Per-feature specifications, indexed in docs/specs/README.md
│   ├── agents/                      # Agent-facing process notes
│   └── audits/                      # Dated audit reports
├── src/
│   ├── assets/
│   │   └── fantasy-grounds-sheets/  # Canonical storage for source .xml dossiers (111 files)
│   ├── components/
│   │   ├── IconifyIcon.astro        # Zero-JS Astro component for Iconify icons in MDX
│   │   ├── ThemeProvider.astro      # Starlight theme override (injected via astro.config.mjs)
│   │   ├── ThemeSelect.astro        # Starlight theme override (injected via astro.config.mjs)
│   │   ├── dice-roller/             # Alpine.js component for RNG and sheet generation
│   │   ├── feats-explorer/          # Alpine.js component for advanced lookup tables
│   │   ├── point-buy/               # Alpine.js component for the 27-point pool calculator
│   │   ├── rulebook-index/          # Site index, set as a spread; no Alpine, one scroll script
│   │   └── xml-viewer/              # Alpine.js component for character presentation
│   ├── generated/
│   │   └── characters.json          # Generated artifact (gitignored): build-hook output from the .xml sheets
│   ├── layouts/
│   │   └── PrintDocument.astro      # Chrome-free shell for the printed handbook routes
│   ├── styles/
│   │   ├── tailwind.css             # Site stylesheet, loaded as Starlight customCss
│   │   ├── handbook-print.css       # Printed handbook page geometry and print-only rules
│   │   └── contrast.ts              # Contrast-ratio helper used by the colour tests
│   ├── test-utils/
│   │   └── alpine-dom.ts            # Mounts a component with astro/container and boots real Alpine
│   ├── utils/                       # Build-side helpers: XML parsing, the build hook, chunking
│   ├── types/                       # Shared ambient declarations
│   ├── alpine.ts                    # THE site-wide Alpine entrypoint: every Alpine.data registration
│   ├── content.config.ts            # Content collection config (the docs collection, via Starlight)
│   ├── content/
│   │   └── docs/                    # Starlight MDX files (Standard static rulebooks)
│   └── pages/                       # Custom Astro routes bypassing default Starlight if needed
│       ├── fantasy-grounds/
│       │   └── characters/
│       │       └── [slug].astro     # Prerendered character page
│       └── handbook/
│           ├── print.astro          # Inert print route the handbook generator renders
│           └── spike-fixture.astro  # Two-sheet regression fixture for the handbook renderer
├── astro.config.mjs                 # Main engine setup (Astro + Starlight + Alpine integrations)
├── package.json                     # Dependency manifests specifying Node 24 baseline
└── SPEC.md                          # This architectural specification document
```

### The Five Entries That Carry Load

Five of the paths above are load-bearing in a way that is easy to mistake for incidental, so they are called out rather than left to the tree:

* **`src/alpine.ts` - the Alpine entrypoint.** `@astrojs/alpinejs` is configured with `entrypoint: '/src/alpine.ts'`, so this one file is injected into **every page on the site**. It holds the only `Alpine.data` registrations in the project, one per `x-data` root: `diceRoller`, `featExplorer`, `pointBuy`, `partyView`, `charSearch`, `xmlCard`. A new interactive component is not wired up until it is registered here, and a bad import edge here is site-wide, not page-wide (ADR-0013). `src/alpine-client-graph.test.ts` walks the module graph from this file to keep it browser-safe.
* **`src/content.config.ts` - the content configuration.** Declares the `docs` collection with Starlight's `docsLoader` and `docsSchema`. This is what gives the rulebook pages frontmatter, the sidebar, and type checking.
* **`src/styles/` - the styles directory.** `src/styles/tailwind.css` is the site stylesheet and is wired in through Starlight's `customCss` in `astro.config.mjs`, not imported by a component. `src/styles/handbook-print.css` defines the printed handbook's page geometry and print-only rules. `src/styles/contrast.ts` is a shared helper the colour tests use.
* **`src/test-utils/alpine-dom.ts` - the test harness.** Renders a component with `astro/container` and boots a real Alpine over it, so behaviour is exercised by clicking real controls in a real DOM rather than by scanning `.astro` source text for strings. ADR-0010 requires this shape, and the source-scanning tests it replaced could not tell a working Alpine expression from a broken one.
* **`src/generated/` - the generated-data directory.** Holds `src/generated/characters.json`, the single artifact written by the XML build hook and consumed by the character pages and the card components. It is generated, not authored: do not hand-edit it, and do not expect it to exist in a fresh clone until a render command has run.

---

## 5. Development Integrity Rules for Agents

1. **Keep Alpine.js Scopes Isolated:** Each component must define its own `x-data` scope. Never nest Alpine.js components in ways that cause scope leakage or variable shadowing.
2. **Prevent Hydration Mismatch:** Ensure that data injected into Astro components from static frontmatter matches exactly between server-side pre-rendering and client-side Alpine.js activation.
3. **No Direct DOM Mutations:** Let Alpine.js control reactive state and DOM updates. For Starlight documentation pages, rely strictly on declarative HTML attributes.
4. **Enforce Component Splitting:** Do not cluster the five systems into a single monolithic bundle. Treat the Dice Roller, Feat Matrix, Point Buy Calculator, XML Viewer and Rulebook Spread as strictly separate components.
5. **New Interactive Component Checklist:** A sixth component is a directory under `src/components/` plus a line in this section. To be complete it needs:
   1. A `.ts` module beside the `.astro` view, exporting a factory that returns every helper the template's expressions call.
   2. An `Alpine.data('<name>', factory)` registration in `src/alpine.ts`, and a bare `x-data="<name>"` on the component root. The one exception is the Rulebook Spread, which is not an Alpine component, and it is documented as such in section 3.
   3. A runtime test through `src/test-utils/alpine-dom.ts`. Per ADR-0010 a new component is expected to arrive with one: an Alpine expression is a string, and only running it catches a broken one.
   4. No `window` assignment, and no import edge from a browser-bound module into a build-side one (ADR-0013).

