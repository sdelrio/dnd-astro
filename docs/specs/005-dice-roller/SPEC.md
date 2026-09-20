---
status: archived
title: "Dice Roller & Character Sheet Generator"
author: "opencode"
date: "2026-09-16"
tags: [dice, roller, character-creation, alpine-js, dnd, mechanics]
affects:
  - src/components/dice-roller/
  - src/content/docs/
  - astro.config.mjs
adr_constraints: []
---

# SPEC: Dice Roller & Character Sheet Generator

## Summary

An Alpine.js component for rolling ability scores (4d6-drop-lowest) with animated dice, modifier calculations, and ephemeral character stat generation. Replaces the React-based `StatDiceRoller` from golden-forest with a zero-runtime-dependency Alpine.js implementation.

## Problem Statement

Players need a quick way to roll ability scores during character creation. The golden-forest implementation uses React with `react-dice-complete` (~40KB runtime) and `random-js` for dice rolling. This adds unnecessary JavaScript bloat to documentation pages. An Alpine.js implementation can provide the same functionality with minimal client-side code.

## Goals

- Roll 4d6-drop-lowest for each ability score (STR, DEX, CON, INT, WIS, CHA)
- Display individual dice values and the final sum
- Calculate ability modifiers automatically
- Support "Roll All" to roll all abilities sequentially
- Support individual "Retry" for re-rolling a single ability
- Show rolling animation state
- Generate ephemeral JSON output for temporary character stats
- Zero React runtime dependency

## Non-Goals

- Physical 3D dice animation (use simple CSS transitions)
- Persistent storage of rolled stats (ephemeral only)
- Integration with character sheet PDF export
- Multi-user synchronized rolling

## Edge Cases

1. **Double-click protection**: Disable "Roll All" button while rolling animation in progress
2. **Individual retry during roll**: Disable retry buttons while global roll is active
3. **Rapid clicking**: Debounce roll requests to prevent overlapping animations
4. **Empty initial state**: Show "Roll to generate ability scores" placeholder before first roll
5. **Browser compatibility**: Use `Math.random()` - no crypto API needed for non-security context

## Accessibility

- "Roll All" button has `aria-label="Roll all ability scores"`
- Individual retry buttons have `aria-label="Re-roll [Ability] score"`
- Rolling state announced via `aria-live="polite"` region
- All buttons keyboard-focusable and operable via Enter/Space
- Color contrast meets WCAG AA for dice values

## Implementation Plan

### Step 1: Create Dice Utility Functions

Create `src/components/dice-roller/dice-utils.js` with pure functions:

```javascript
export function rollDie(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count, sides = 6) {
  return Array.from({ length: count }, () => rollDie(sides));
}

export function rollAbility() {
  const dice = rollDice(4);
  const sorted = [...dice].sort((a, b) => b - a);
  const topThree = sorted.slice(0, 3);
  const sum = topThree.reduce((a, b) => a + b, 0);
  return { dice, sorted, topThree, sum };
}

export function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
```

### Step 2: Create DiceRoller Alpine.js Component

Create `src/components/dice-roller/DiceRoller.astro` - an Astro component that:

1. Defines Alpine.js `x-data` component with state:
   - `abilities`: Array of 6 ability objects `{ name, dice, topThree, sum, modifier, rolling }`
   - `isRolling`: Boolean for global rolling state
   - `currentRollingIndex`: Which ability is currently rolling (-1 if none)

2. Implements methods:
   - `rollAll()`: Sequentially rolls all 6 abilities with 150ms delay between each
   - `rollIndividual(index)`: Re-rolls a single ability
   - `rollAbility()`: Core dice logic (4d6-drop-lowest)

3. Renders:
   - "Roll All Abilities" button (disabled during rolling)
   - 6-column grid of ability cards
   - Each card shows: ability name, dice values, top 3 sum, modifier
   - Individual retry button per ability
   - Rolling state animation (CSS transition)

4. Embeds results as JSON in a `<script type="application/json">` tag for downstream consumption

### Step 3: Create Styling

Create `src/components/dice-roller/dice-roller.css` with:
- Responsive grid layout (3 columns mobile, 6 columns desktop)
- Card styling with subtle shadows
- Rolling state animation (pulse effect)
- Disabled state for buttons during rolling
- Dice value display with highlight for kept dice

### Step 4: Add to Starlight Sidebar

Update `astro.config.mjs` to include Dice Roller in the sidebar:

```javascript
{
  label: 'Tools',
  items: [
    { label: 'Dice Roller', slug: 'tools/dice-roller' },
  ],
}
```

### Step 5: Create MDX Page

Create `src/content/docs/tools/dice-roller.mdx`:

```mdx
---
title: Dice Roller
description: Roll ability scores for character creation
tableOfContents: false
---

import DiceRoller from '@/components/dice-roller/DiceRoller.astro';

# Dice Roller

Roll 4d6-drop-lowest for each ability score.

<DiceRoller />
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dice-roller/dice-utils.js` | create | Pure dice rolling functions |
| `src/components/dice-roller/DiceRoller.astro` | create | Alpine.js dice roller component |
| `src/components/dice-roller/dice-roller.css` | create | Component styling |
| `src/content/docs/tools/dice-roller.mdx` | create | Starlight page for dice roller |
| `astro.config.mjs` | modify | Add sidebar entry |

## Testing

### Acceptance Criteria
1. **Page load**: Visit `/tools/dice-roller/` - page renders without errors
2. **Initial state**: 6 ability placeholders shown, "Roll All" button enabled
3. **Roll All**: Click button - 6 abilities roll sequentially with 150ms delay
4. **Dice values**: Each ability shows 4 dice values, top 3 highlighted
5. **Sum calculation**: Sum equals top 3 dice added together
6. **Modifier display**: Modifier shows +3 for 16, +1 for 12, -1 for 8, etc.
7. **Individual retry**: Click retry on STR - only STR re-rolls, others unchanged
8. **Rolling state**: During roll, button disabled, animation playing
9. **JSON output**: Inspect page source - `<script type="application/json">` contains results
10. **Responsive**: Grid shows 3 columns mobile, 6 columns desktop
11. **No React**: Page bundle contains no React runtime

### Manual Verification
- Open browser DevTools, verify Alpine.js components in Components tab
- Check Network tab - no React-related JS downloads
- Test keyboard navigation - Tab through buttons, Enter to activate

## Rollback

- Remove `src/components/dice-roller/` directory
- Remove `src/content/docs/tools/dice-roller.mdx`
- Remove sidebar entry from `astro.config.mjs`

## Accepted Deviations

The following deviations from this spec were accepted during implementation (PR #67 and follow-up PRs) and are recorded here to prevent re-flagging in future reviews.

### 1. Styling: no `dice-roller.css` stylesheet

The spec's Step 3 and Files table called for `src/components/dice-roller/dice-roller.css`. The implementation ships no stylesheet in `src/components/dice-roller/`; styling lives in Tailwind utility classes directly on the markup in `DiceRoller.astro` (for example `grid grid-cols-3 lg:grid-cols-6`, `bg-white dark:bg-gray-800 border rounded-lg shadow-sm`, `animate-pulse`, `disabled:opacity-50`, and accent classes for kept dice), with two inline `style` attributes for the rolling indicator's `z-index` and the empty-state emoji size. Reason: a separate stylesheet was unnecessary once every requirement in Step 3 was expressed with Tailwind utilities and Starlight theme variables, and it avoids maintaining a second styling mechanism.

### 2. Utilities: `dice-utils.ts` instead of `dice-utils.js`

The spec's Step 1 and Files table called for `src/components/dice-roller/dice-utils.js`. The implementation ships `dice-utils.ts`, imported by the `<script>` block in `DiceRoller.astro`. Reason: the repo is TypeScript-first (`typescript` and `@astrojs/check` are devDependencies), and typed exports plus the `Ability` interface keep the Alpine state and utility signatures aligned.

### 3. Vitest suites for the dice utilities

The spec did not plan unit tests. The implementation adds `dice-utils.test.ts` (utility behaviour, created in PR #67 and extended by follow-up PRs) and `dice-roller.test.ts` (asserts `DiceRoller.astro` uses Starlight accent variables instead of hardcoded blue, PR #180). Reason: `vitest` is the repo's configured test runner, the pure utilities are directly unit-testable, and the component assertion guards the theme-color fix against regressions.

## Status

- [x] Implementation complete
- [x] Tests passing (112 unit tests, build verified)
- [x] ADR updated (no new decisions)
