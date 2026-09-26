import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./PointBuy.astro', import.meta.url), 'utf8');
const component = readFileSync(new URL('./point-buy-component.ts', import.meta.url), 'utf8');
const utils = readFileSync(new URL('./point-buy-utils.ts', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../../alpine.ts', import.meta.url), 'utf8');

describe('PointBuy Alpine wiring', () => {
  it('roots the component in the registered pointBuy data provider', () => {
    // `x-data="pointBuy"` names an `Alpine.data` registration rather than
    // calling a global, so the component works with no `window` at all.
    expect(source).toContain('x-data="pointBuy"');
    expect(source).toContain('not-content');
  });

  it('delegates score transitions and reset to the pure helpers', () => {
    expect(registration).toContain("Alpine.data('pointBuy', pointBuyComponent)");
    expect(component).toContain('pointBuy.increaseScore(this.scores, ability)');
    expect(component).toContain('pointBuy.decreaseScore(this.scores, ability)');
    expect(component).toContain('pointBuy.resetScores(this.scores)');
  });

  // Every helper used to be a `window` global so an inline `x-data` string
  // could reach it. Eleven globals on one page collide with anything else,
  // are invisible to the type checker, and survive a rename of the helper.
  it('publishes no window globals', () => {
    // Comments are stripped first: the prose above explains what the globals
    // were, and an assertion that trips on its own explanation is one nobody
    // trusts.
    const code = (file: string) =>
      file.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const file of [source, component, registration]) {
      expect(code(file), 'a window global').not.toMatch(/window\s*\./);
      expect(file).not.toContain('declare global');
    }
  });
});

describe('PointBuy ability cards', () => {
  it('renders one card per ability from ABILITY_NAMES', () => {
    expect(source).toContain('ABILITY_NAMES.map');
  });

  it('binds steppers to the bounds and pool helpers with per-ability labels', () => {
    expect(source).toContain("!canIncrease(scores, '${ability}')");
    expect(source).toContain("!canDecrease(scores, '${ability}')");
    expect(source).toContain('Increase ${ability}');
    expect(source).toContain('Decrease ${ability}');
  });

  it('shows the score, modifier and cost for every ability', () => {
    expect(source).toContain('formatModifier(calculateModifier(scores.${ability}))');
    expect(source).toContain('formatCostLine(scores.${ability})');
  });

  it('prices the next press on the tile, so a dead stepper explains itself', () => {
    // Both facts the cost line has to carry: the score's own cost, and what one
    // more press would add. Without the second, `+` going dead at the cap or on
    // an empty pool is unexplained. The arithmetic lives in the helper, and the
    // same helper decides whether the stepper is allowed, so the price shown
    // and the price charged cannot drift apart.
    expect(utils).toContain('export function formatCostLine');
    expect(utils).toContain('export function nextStepCost');
    expect(component).toContain('formatCostLine: pointBuy.formatCostLine');
  });

  it('tells a scripting-off visitor the tool needs JavaScript', () => {
    // Every control is inert without Alpine, and six tiles reading as a real
    // unspent spread is worse than a note. The Dice Roller set the pattern.
    expect(source).toContain('point-buy-needs-js');
    expect(source).toContain('js-only');
    expect(source).toContain('Point Buy needs JavaScript.');
  });

  it('gives every control a visible focus ring, and the numerals a fixed width', () => {
    expect(source).toContain('focus-visible:outline-(--sl-color-accent)');
    expect(source).toContain('tabular-nums');
  });

  it('uses plus and minus icons for the steppers', () => {
    expect(source).toContain('mdi:plus');
    expect(source).toContain('mdi:minus');
  });
});

describe('PointBuy pool counter', () => {
  it('shows the live remaining points', () => {
    expect(source).toContain('pointsRemaining(scores)');
    expect(source).toContain('points remaining');
  });

  it('reveals a completion indicator once no points remain', () => {
    expect(source).toContain('x-if="pointsRemaining(scores) === 0"');
    expect(source).toContain('mdi:check-circle');
    expect(source).toContain('All 27 points spent');
  });

  it('offers an accessible reset control', () => {
    expect(source).toContain('@click="reset()"');
    expect(source).toContain('aria-label="Reset all scores"');
    expect(source).toContain('mdi:restore');
  });
});

describe('PointBuy pool readout', () => {
  it('stays visible for the length of the grid', () => {
    // Six stacked tiles put the readout some 1400px below the first one on a
    // phone, which is the wrong place for the constraint every press is judged
    // against. It is the last block in the flow, so pinning it to the bottom of
    // the viewport hides nothing.
    expect(source).toContain('sticky bottom-0');
  });

  it('reads the remaining points as a string, not a number', () => {
    // The one value this readout takes is 0 on a finished spread, and happy-dom
    // assigns a numeric 0 to textContent as "".
    expect(source).toContain('String(pointsRemaining(scores))');
  });
});

describe('PointBuy responsive layout', () => {
  it('uses one column on small, two on medium and three on large viewports', () => {
    expect(source).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4');
  });
});

describe('PointBuy theme colors', () => {
  it('does not use hardcoded blue utility classes', () => {
    expect(source).not.toMatch(/\bblue-\d+/);
  });

  it('uses the Starlight accent color variables for interactive and highlight elements', () => {
    for (const variable of ['--sl-color-accent', '--sl-color-accent-low', '--sl-color-accent-high']) {
      expect(source).toContain(variable);
    }
  });

  it('follows the repo card language', () => {
    expect(source).toContain('bg-white dark:bg-gray-800');
    expect(source).toContain('border border-gray-200 dark:border-gray-700');
    expect(source).toContain('rounded-lg shadow-sm');
  });
});
