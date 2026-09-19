---
status: accepted
date: 2026-09-19
supersedes: null
superseded_by: null
tags: [theme, css, tables, starlight]
---

# ADR-0005: Table Row Striping Pattern with Transparent Headers

## Context and Problem Statement

Starlight markdown content tables need D&D-themed row striping. The header row (`<thead>`) must have a transparent background so it blends with the page, while data rows (`<tbody>`) get alternating gradient backgrounds with subtle edge fades.

Earlier attempts used `tr:nth-child(odd/even)` selectors, which accidentally targeted the header row inside `<thead>` since `:nth-child` counts siblings within the same parent.

## Decision Drivers

- Header rows must remain transparent (no striping background)
- Row striping should only apply to data rows in `<tbody>`
- Gradient edge fades create a polished look (golden-forest pattern)
- Rules must work in both light and dark mode

## Decision Outcome

Use `tbody tr:nth-child(...)` selectors to scope striping to data rows only. Pair with an explicit `thead, th { background: transparent }` rule.

### CSS Pattern

```css
/* Header: always transparent */
.sl-markdown-content thead,
.sl-markdown-content th:not(:where(.not-content *)) {
  background: transparent;
  font-family: var(--sl-font-table);
}

/* Data rows: gradient striping with edge fades */
.sl-markdown-content tbody tr:nth-child(odd):not(:where(.not-content *)) {
  background-color: transparent;
  background-image: linear-gradient(to right, transparent, #d9e0d6 2%, #d0e0d6 98%, transparent);
}

.sl-markdown-content tbody tr:nth-child(even):not(:where(.not-content *)) {
  background-color: transparent;
  background-image: linear-gradient(to right, transparent, #e8ede1 2%, #e8ede1 98%, transparent);
}
```

### Consequences

- Good, because `<thead>` rows never receive striping backgrounds.
- Good, because gradient edge fades match the golden-forest D&D theme.
- Good, because `background-color: transparent` alongside `background-image` ensures no flash of solid color.
- Neutral, because color values are hardcoded per mode (consistent with existing theme patterns in this file).

## References

- PR #134: `fix(theme): scope table row striping to tbody, exclude thead`
- golden-forest D&D theme source for gradient pattern
- Starlight docs: [Styling](https://docs.astro.build/en/guides/styling/)
