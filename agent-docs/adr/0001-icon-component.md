# ADR 0001: Icon Component Strategy

## Status
Accepted

## Context
Starlight documentation pages need to render decorative icons from the [Iconify](https://icon-sets.iconify.design/) ecosystem (e.g. `game-icons:*` sets). The original implementation used `@iconify/react`, a React component, directly inside MDX files. This caused a `NoMatchingRenderer` build error because Astro's MDX integration had no React renderer configured for those pages.

Two approaches were evaluated:

### Option A: Pure Astro Component (Server-Rendered)
Create a lightweight Astro component (`src/components/IconifyIcon.astro`) that fetches SVGs from the Iconify API at build time and renders them as inline HTML. Zero client-side JavaScript is shipped.

### Option B: React Island
Add the `react()` integration to `astro.config.mjs` and wrap each icon usage in a `client:load` React island. This bundles the React runtime (~40KB) into every page that uses icons.

## Decision
**Option A** — Use `src/components/IconifyIcon.astro`.

## Rationale
* Aligns with SPEC.md Section 3 "Rule of Least Client-Side JavaScript": decorative icons are purely visual with no interactivity, so shipping a React runtime is unnecessary overhead.
* React must be reserved for the three defined islands (Dice Roller, Feat Matrix, XML Viewer) per SPEC.md Section 3.
* The Astro component produces identical SVG output at build time with 0 bytes of client JS.
* No changes to `astro.config.mjs` integrations are required.

## Consequences
* `src/components/IconifyIcon.astro` is the canonical component for rendering Iconify icons in MDX documentation pages.
* `@iconify/react` remains in `package.json` but is not used in documentation pages. It may be used within React island components if needed.
* Icon availability depends on the Iconify API at build time; offline builds will fail to render icons.

## Usage
```astro
import IconifyIcon from '../../components/IconifyIcon.astro';

<IconifyIcon icon="game-icons:flat-hammer" width="1.5em" />
<IconifyIcon icon="game-icons:bowman" width={iconSize} />
```

## Related
* SPEC.md Section 3: UI/UX Architecture & Framework Distribution
* SPEC.md Section 3: Rule of Least Client-Side JavaScript
* SPEC.md Section 4: Repository & File System Conventions
