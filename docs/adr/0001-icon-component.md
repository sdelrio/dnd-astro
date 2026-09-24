---
status: accepted
date: 2026-08-15
supersedes: null
superseded_by: null
tags: [icons, performance, astro-components]
---

# ADR-0001: Icon Component Strategy

## Context and Problem Statement

Starlight documentation pages need to render decorative icons from the [Iconify](https://icon-sets.iconify.design/) ecosystem (e.g. `game-icons:*` sets). The original implementation used `@iconify/react`, a React component, directly inside MDX files. This caused a `NoMatchingRenderer` build error because Astro's MDX integration had no React renderer configured for those pages.

How should we render Iconify icons in MDX documentation pages without shipping unnecessary client-side JavaScript?

## Decision Drivers

- Align with SPEC.md Section 3 "Rule of Least Client-Side JavaScript"
- Minimize client-side JavaScript payload
- Use Alpine.js for all interactive components to minimize bundle size
- Provide a simple developer experience for documentation authors

## Considered Options

- **Option A: Pure Astro Component (Server-Rendered)** - Create a lightweight Astro component that reads SVG data from local `@iconify-json` packages (`@iconify-json/game-icons`, `@iconify-json/mdi`) and renders them as inline HTML at build time. Zero client-side JavaScript is shipped.
- **Option B: React Island** - Add the `react()` integration to `astro.config.mjs` and wrap each icon usage in a `client:load` React island. This bundles the React runtime (~40KB) into every page that uses icons.

## Decision Outcome

Chosen option: **Option A** - Use `src/components/IconifyIcon.astro`

### Consequences

- Good, because decorative icons are purely visual with no interactivity, so shipping a React runtime is unnecessary overhead.
- Good, because Alpine.js is used for all interactive components, keeping the bundle size minimal.
- Good, because the Astro component produces identical SVG output at build time with 0 bytes of client JS.
- Good, because no changes to `astro.config.mjs` integrations are required.
- Good, because icon data ships in local `@iconify-json` packages, so offline builds render icons with no network access to the Iconify API.

## Usage

```astro
import IconifyIcon from '../../components/IconifyIcon.astro';

<IconifyIcon icon="game-icons:flat-hammer" width="1.5em" />
<IconifyIcon icon="game-icons:bowman" width={iconSize} />
```

## Related

- SPEC.md Section 3: UI/UX Architecture & Framework Distribution
- SPEC.md Section 3: Rule of Least Client-Side JavaScript
- SPEC.md Section 4: Repository & File System Conventions
