/**
 * Runtime coverage for PointBuy's Alpine expressions.
 *
 * The expressions in the component are strings, so this boots the real
 * component against the real rendered markup and drives it the way a user
 * does. See `src/test-utils/alpine-dom.ts` for why that needs a harness.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import PointBuy from './PointBuy.astro';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

let harness: MountedAlpine;

beforeEach(async () => {
  harness = await mountAlpine(PointBuy);
});

/**
 * The score readout of one ability card, found by its `Decrease` button.
 * happy-dom's types do not line up with the DOM lib; see the dice roller suite.
 */
function card(ability: string): HTMLElement {
  const button = harness.window.document.querySelector(
    `[aria-label="Decrease ${ability}"]`
  );
  const tile = button?.closest('div.bg-white');
  if (!tile) throw new Error(`no card for ${ability}`);
  return tile as unknown as HTMLElement;
}

function click(selector: string): void {
  const el = harness.window.document.querySelector(selector);
  if (!el) throw new Error(`no element for ${selector}`);
  el.dispatchEvent(new harness.window.MouseEvent('click', { bubbles: true }));
}

/** Raises each named ability to its target, one stepper tap at a time. */
async function buy(plan: Record<string, number>): Promise<void> {
  for (const [ability, target] of Object.entries(plan)) {
    let guard = 0;
    while (!card(ability).textContent?.includes(String(target))) {
      click(`[aria-label="Increase ${ability}"]`);
      await harness.settle();
      if (++guard > 10) {
        throw new Error(`${ability} stuck at ${card(ability).textContent}`);
      }
    }
  }
}

describe('PointBuy at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('pointBuy', ...)`, `x-data="pointBuy"` is an
    // unresolved identifier and Alpine warns rather than throwing.
    expect(harness.messages).toEqual([]);
  });

  it('shows every ability at its starting score with a modifier and a cost', () => {
    for (const ability of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
      expect(card(ability).textContent).toContain('8');
      expect(card(ability).textContent).toContain('-1');
      expect(card(ability).textContent).toContain('Cost: 0');
    }
  });

  it('raises a score and spends the pool when the increase stepper is used', async () => {
    click('[aria-label="Increase STR"]');
    await harness.settle();
    expect(card('STR').textContent).toContain('9');
    expect(card('STR').textContent).toContain('-1');
    expect(card('STR').textContent).toContain('Cost: 1');
    expect(harness.window.document.body.textContent).toContain('26 points remaining');
  });

  it('refuses a step the pool cannot pay for', async () => {
    // 8 -> 15 costs 9 points each, and the pool is 27, so exactly three
    // abilities can be maxed and every step after that is refused.
    await buy({ STR: 15, DEX: 15, CON: 15 });
    expect(harness.window.document.body.textContent).toContain('0 points remaining');
    for (const ability of ['WIS', 'CHA']) {
      const increase = harness.window.document.querySelector(
        `[aria-label="Increase ${ability}"]`
      ) as unknown as HTMLButtonElement;
      expect(increase.disabled, ability).toBe(true);
      click(`[aria-label="Increase ${ability}"]`);
      await harness.settle();
      expect(card(ability).textContent).toContain('8');
    }
  });

  it('gives the points back when a score is lowered', async () => {
    click('[aria-label="Increase STR"]');
    await harness.settle();
    click('[aria-label="Decrease STR"]');
    await harness.settle();
    expect(card('STR').textContent).toContain('8');
    expect(harness.window.document.body.textContent).toContain('27 points remaining');
  });

  it('confirms completion only once the pool is empty, and resets back to 27', async () => {
    // The cheapest way to spend the pool exactly is six 8s plus 27 more.
    // 15 + 15 + 14 + 10 costs 9 + 9 + 7 + 2 = 27, so this empties the pool exactly.
    await buy({ STR: 15, DEX: 15, CON: 14, INT: 10, WIS: 8, CHA: 8 });
    expect(harness.window.document.body.textContent).toContain('0 points remaining');
    expect(harness.window.document.body.textContent).toContain('All 27 points spent');

    click('[aria-label="Reset all scores"]');
    await harness.settle();
    expect(harness.window.document.body.textContent).toContain('27 points remaining');
    expect(card('STR').textContent).toContain('8');
    expect(harness.messages).toEqual([]);
  });

  it('disables a decrease at the floor and an increase at the ceiling', async () => {
    const decrease = harness.window.document.querySelector(
      '[aria-label="Decrease STR"]'
    ) as unknown as HTMLButtonElement;
    expect(decrease.disabled).toBe(true);

    for (let i = 0; i < 7; i++) {
      click('[aria-label="Increase STR"]');
       
      await harness.settle();
    }
    const increase = harness.window.document.querySelector(
      '[aria-label="Increase STR"]'
    ) as unknown as HTMLButtonElement;
    expect(increase.disabled).toBe(true);
  });

  it('announces the change through the polite live region', async () => {
    click('[aria-label="Increase STR"]');
    await harness.settle(60);
    const status = harness.window.document.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toBe('STR 9, modifier -1. 26 points remaining.');
  });
});
