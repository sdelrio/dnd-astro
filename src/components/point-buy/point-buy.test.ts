import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./PointBuy.astro', import.meta.url), 'utf8');
const component = readFileSync(new URL('./point-buy-component.ts', import.meta.url), 'utf8');
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
    expect(source).toContain('getScoreCost(scores.${ability})');
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
