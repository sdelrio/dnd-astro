---
status: accepted
date: 2026-09-22
supersedes: null
superseded_by: null
tags: [mermaid, diagrams, starlight, astro, client-side]
---

# ADR-0007: Render Mermaid Diagrams with the astro-mermaid Integration

## Context and Problem Statement

The FG Effects page migration brings a `sequenceDiagram` from the golden-forest
Docusaurus site. The diagram explains the Larger Than Life `EXPIREADD` /
`TREGENA` loop, and the prose around it reads as a walkthrough of the diagram,
so dropping the visual would weaken the page. The dnd-astro site is a static
Astro + Starlight build served as Cloudflare Workers static assets, and
`SPEC.md` Section 3 requires the least client-side JavaScript possible:
frameworks must be scoped to individual component instances or specific layout
islands rather than loaded on documentation pages.

How should the site render Mermaid diagrams without contradicting the zero-JS
default or adding a heavy build-time dependency?

## Decision Drivers

- Align with SPEC.md Section 3 "Rule of Least Client-Side JavaScript"
- Render the sequence diagram as a real diagram, not an unrendered code block
- Follow the site's light and dark themes
- Keep the build static and free of a headless-browser dependency
- Use the smallest integration that works with Starlight

## Considered Options

- **Option A: `astro-mermaid` integration** - an Astro integration that renders
  fenced `mermaid` code blocks client-side at runtime, registered in
  `astro.config.mjs` before `starlight()`. Theme-aware (light/dark). Adds the
  `mermaid` peer dependency and some client JavaScript only to pages that
  contain diagrams.
- **Option B: `rehype-mermaid`** - a rehype plugin that renders diagrams to SVG
  at build time. Zero client JavaScript and no runtime dependency, but it
  requires a headless browser (Playwright) in the build environment, which is a
  heavier CI and build dependency for one diagram.
- **Option C: drop the diagram** - keep the Mermaid code block as plain code so
  the source text renders verbatim. No new dependency at all, but loses the
  visual explanation and leaves the page with an unrendered diagram.

## Decision Outcome

Chosen option: **Option A** - the `astro-mermaid` integration, registered in
`astro.config.mjs` before `starlight()`.

The integration must be registered before `starlight()` so its Markdown/MDX
pipeline and page scripts are in place before Starlight finalizes its own
configuration. The integration is theme-aware, so the diagram follows
Starlight's light and dark themes without custom CSS.

### Consequences

- Good, because the sequence diagram renders as a real, theme-aware diagram in
  both light and dark mode.
- Good, because client-side JavaScript loads only on pages that actually
  contain a diagram, keeping the exception to the Rule of Least Client-Side
  JavaScript scoped rather than site-wide.
- Good, because the production build stays a plain static Astro build: no
  headless browser, no Playwright, and no extra CI steps.
- Neutral, because `mermaid` is added as a runtime peer dependency, and the
  diagram does not render when JavaScript is disabled; no-JS readers see the
  code block instead.
- Neutral, because the diagram is laid out in the browser, so a malformed
  diagram fails at runtime (visible in the console) instead of at build time.
- Bad, because it is a deliberate, scoped exception to `SPEC.md` Section 3; any
  future use must stay limited to pages and components that need diagrams.

## References

- `docs/specs/014-fg-effects-migration/SPEC.md`
- ADR-0001: Icon Component Strategy (zero-JS static hydration)
- ADR-0004: Use Only Supported Starlight Markdown Admonitions
- `SPEC.md` Section 3: Rule of Least Client-Side JavaScript
