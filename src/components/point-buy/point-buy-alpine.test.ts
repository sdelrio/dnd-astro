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

const NAMES: Record<string, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
};

/**
 * One ruled line, found by its steppers. The line is the ledger's unit, so the
 * tests read a line rather than a tile: the name, the score, the stamped
 * modifier and the cost all sit on it, and the sheet's whole claim is that
 * they belong together.
 */
function row(ability: string): HTMLElement {
  const button = harness.window.document.querySelector(`[aria-label="Decrease ${NAMES[ability]}"]`);
  const line = button?.closest('[data-ability]');
  if (!line) throw new Error(`no line for ${ability}`);
  return line as unknown as HTMLElement;
}

function text(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
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
    while (!text(row(ability)).includes(String(target))) {
      click(`[aria-label="Increase ${NAMES[ability]}"]`);
      await harness.settle();
      if (++guard > 10) {
        throw new Error(`${ability} stuck at ${text(row(ability))}`);
      }
    }
  }
}

/** The purse on the headband: the constraint every press is judged against. */
function purse(): string {
  const el = harness.window.document.querySelector('[data-purse]');
  if (!el) throw new Error('no purse');
  return text(el as unknown as HTMLElement);
}

/** The trade handle on one line: the name button, not the row. */
function handle(ability: string): HTMLButtonElement {
  const el = harness.window.document.querySelector(
    `.pb-trade[aria-label*="${NAMES[ability]},"], .pb-trade[aria-label^="Put ${NAMES[ability]}"]`
  );
  if (!el) throw new Error(`no trade handle for ${ability}`);
  return el as unknown as HTMLButtonElement;
}

function status(): string {
  return harness.window.document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

function field(label: string): string {
  const nodes = [...harness.window.document.querySelectorAll('.micro-label')];
  const label_ = nodes.find((n) => text(n as unknown as HTMLElement) === label);
  const value = label_?.nextElementSibling;
  if (!value) throw new Error(`no ${label} field`);
  return text(value as unknown as HTMLElement);
}

describe('PointBuy at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('pointBuy', ...)`, `x-data="pointBuy"` is an
    // unresolved identifier and Alpine warns rather than throwing.
    expect(harness.messages).toEqual([]);
  });

  it('writes all six abilities on one sheet, each with a name, score, modifier and cost', () => {
    for (const ability of Object.keys(NAMES)) {
      const line = text(row(ability));
      expect(line, ability).toContain(NAMES[ability]);
      expect(line, ability).toContain('8');
      expect(line, ability).toContain('-1');
      expect(line, ability).toContain('Cost 0, next +1');
    }
    expect(harness.window.document.querySelectorAll('[data-ability]')).toHaveLength(6);
  });

  it('raises a score and spends the pool when the increase stepper is used', async () => {
    click('[aria-label="Increase Strength"]');
    await harness.settle();
    expect(text(row('STR'))).toContain('9');
    expect(text(row('STR'))).toContain('-1');
    expect(text(row('STR'))).toContain('Cost 1, next +1');
    expect(purse()).toBe('26');
    expect(field('Spent')).toBe('1');
  });

  it('refuses a step the pool cannot pay for', async () => {
    // 8 -> 15 costs 9 points each, and the pool is 27, so exactly three
    // abilities can be maxed and every step after that is refused.
    await buy({ STR: 15, DEX: 15, CON: 15 });
    expect(purse()).toBe('0');
    for (const ability of ['WIS', 'CHA']) {
      const increase = harness.window.document.querySelector(
        `[aria-label="Increase ${NAMES[ability]}"]`
      ) as unknown as HTMLButtonElement;
      expect(increase.disabled, ability).toBe(true);
      click(`[aria-label="Increase ${NAMES[ability]}"]`);
      await harness.settle();
      expect(text(row(ability)), ability).toContain('8');
    }
  });

  it('gives the points back when a score is lowered', async () => {
    click('[aria-label="Increase Strength"]');
    await harness.settle();
    click('[aria-label="Decrease Strength"]');
    await harness.settle();
    expect(text(row('STR'))).toContain('8');
    expect(purse()).toBe('27');
    expect(field('Spent')).toBe('0');
  });

  it('inks the modifier total, and a blank sheet is the -6 everyone forgets', async () => {
    expect(field('Modifier total')).toBe('-6');
    click('[aria-label="Increase Strength"]');
    await harness.settle();
    // 8 -> 9 buys no modifier, so the total does not move. That is the whole
    // reason the field exists: a press that cost a point and gained nothing
    // is invisible without it.
    expect(field('Modifier total')).toBe('-6');
    click('[aria-label="Increase Strength"]');
    await harness.settle();
    click('[aria-label="Increase Strength"]');
    await harness.settle();
    expect(field('Modifier total')).toBe('-5');
  });

  it('marks the sheet finished once the pool is empty, and resets back to 27', async () => {
    // 15 + 15 + 14 + 10 costs 9 + 9 + 7 + 2 = 27, so this empties the pool exactly.
    await buy({ STR: 15, DEX: 15, CON: 14, INT: 10, WIS: 8, CHA: 8 });
    expect(purse()).toBe('0');
    expect(harness.window.document.body.textContent).toContain('Pool spent');

    click('[aria-label="Reset all scores to eight"]');
    await harness.settle();
    expect(purse()).toBe('27');
    expect(field('Modifier total')).toBe('-6');
    expect(text(row('STR'))).toContain('8');
    expect(harness.window.document.body.textContent).not.toContain('Pool spent');
    expect(harness.messages).toEqual([]);
  });

  it('disables a decrease at the floor and an increase at the ceiling', async () => {
    const decrease = harness.window.document.querySelector(
      '[aria-label="Decrease Strength"]'
    ) as unknown as HTMLButtonElement;
    expect(decrease.disabled).toBe(true);

    for (let i = 0; i < 7; i++) {
      click('[aria-label="Increase Strength"]');
      await harness.settle();
    }
    const increase = harness.window.document.querySelector(
      '[aria-label="Increase Strength"]'
    ) as unknown as HTMLButtonElement;
    expect(increase.disabled).toBe(true);
    // A stepper that goes dead has to say why on the line, not only in the
    // live region: the price of the next press is the answer.
    expect(text(row('STR'))).toContain('Cost 9, max');
  });

  it('loads a preset spread in one press, and announces it', async () => {
    const standardArray = [...harness.window.document.querySelectorAll('button')].find(
      (b) => text(b as unknown as HTMLElement) === 'Standard Array'
    ) as unknown as HTMLButtonElement;
    standardArray.dispatchEvent(
      new harness.window.MouseEvent('click', { bubbles: true }) as unknown as Event
    );
    await harness.settle(60);

    expect(purse()).toBe('0');
    expect(field('Modifier total')).toBe('+5');
    expect(text(row('STR'))).toContain('Cost 9, max');
    expect(text(row('CHA'))).toContain('Cost 0, next +1');
    const status = harness.window.document.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toBe('Standard Array loaded. Modifier total +5.');
    expect(harness.messages).toEqual([]);
  });

  it('trades two scores on two presses, and announces both the pick and the trade', async () => {
    await buy({ STR: 15, DEX: 10 });

    expect(harness.window.document.querySelectorAll('.pb-trade')).toHaveLength(6);
    expect(harness.window.document.querySelectorAll('.pb-trade[aria-pressed="true"]')).toHaveLength(
      0
    );

    // A handle is labelled with the action it will take, in the state it is
    // in - "Strength" alone says nothing about what pressing it does.
    expect(handle('STR').getAttribute('aria-label')).toBe(
      'Pick up Strength, 15, to trade its score'
    );

    click('[aria-label^="Pick up Strength"]');
    await harness.settle(60);
    expect(handle('STR').getAttribute('aria-pressed')).toBe('true');
    expect(handle('STR').getAttribute('aria-label')).toBe(
      'Put Strength back, cancelling the trade'
    );
    // The other five are the targets. `pb-swapping` on the panel is what
    // draws that, and `alpine-dom.ts` records that a `:class` binding is not
    // observable here, so the state is asserted through `aria-pressed` and
    // the binding itself is asserted in `point-buy.test.ts`.
    expect(harness.window.document.querySelectorAll('.pb-trade[aria-pressed="false"]')).toHaveLength(
      5
    );
    expect(status()).toBe(
      'Strength 15 picked up. Choose another ability to trade it with, or press it again to put it back.'
    );

    click('[aria-label^="Pick up Dexterity"]');
    await harness.settle(60);
    expect(text(row('STR'))).toContain('10');
    expect(text(row('DEX'))).toContain('15');
    expect(status()).toBe('Traded. Strength 10, Dexterity 15. 16 points remaining.');
    expect(harness.window.document.querySelectorAll('.pb-trade[aria-pressed="true"]')).toHaveLength(
      0
    );
  });

  it('spends and totals exactly what it spent before, because a trade moves a score rather than buying one', async () => {
    await buy({ STR: 15, WIS: 12 });
    const before = { purse: purse(), spent: field('Spent'), total: field('Modifier total') };

    click('[aria-label^="Pick up Strength"]');
    await harness.settle(60);
    click('[aria-label^="Pick up Wisdom"]');
    await harness.settle(60);

    expect(purse()).toBe(before.purse);
    expect(field('Spent')).toBe(before.spent);
    expect(field('Modifier total')).toBe(before.total);
  });

  it('puts a picked score back when the same name is pressed twice', async () => {
    await buy({ STR: 12 });
    click('[aria-label^="Pick up Strength"]');
    await harness.settle(60);
    click('[aria-label^="Put Strength back"]');
    await harness.settle(60);

    expect(text(row('STR'))).toContain('12');
    expect(harness.window.document.querySelectorAll('.pb-trade[aria-pressed="true"]')).toHaveLength(
      0
    );
    expect(status()).toBe('Strength put back. No scores traded.');
  });

  it('drops a held score when the sheet changes under it', async () => {
    await buy({ STR: 12 });
    click('[aria-label^="Pick up Strength"]');
    await harness.settle(60);

    // A stepper press moves a score, so the held one was picked up against a
    // different sheet; keeping the ring on would invite a trade the player
    // never saw the result of.
    click('[aria-label="Increase Strength"]');
    await harness.settle(60);
    expect(harness.window.document.querySelectorAll('.pb-trade[aria-pressed="true"]')).toHaveLength(
      0
    );
  });

  it('does not trade a score with itself', async () => {
    click('[aria-label^="Pick up Strength"]');
    await harness.settle(60);
    click('[aria-label^="Put Strength back"]');
    await harness.settle(60);
    expect(text(row('STR'))).toContain('8');
    expect(purse()).toBe('27');
  });

  it('announces the change through the polite live region', async () => {
    click('[aria-label="Increase Strength"]');
    await harness.settle(60);
    const status = harness.window.document.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toBe('Strength 9, modifier -1. 26 points remaining.');
  });
});
