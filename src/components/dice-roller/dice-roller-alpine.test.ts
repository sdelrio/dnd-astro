/**
 * Runtime coverage for the dice roller's Alpine expressions.
 *
 * These are the expressions #328 shipped broken: the render tests read the
 * `.astro` source as text and passed while the rendered card dropped its swap
 * panel. Everything here boots the real component against the real markup and
 * drives it the way a user does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DiceRoller from './DiceRoller.astro';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

let harness: MountedAlpine;

/**
 * How long a full six-ability roll takes: each ability waits 300ms before its
 * dice land and 150ms before the next one starts, so 450ms x 6, plus the
 * announce delay.
 *
 * Fake timers, not real ones. A real wait for this is unreliable: the roll is a
 * chain of `setTimeout` callbacks, and under the DOM harness each turn takes
 * far longer than its nominal delay, so a real-timed wait either flakes or runs
 * for ten seconds. Advancing the clock is also a stronger assertion - the
 * component is shown to be finished at 2.8s rather than merely finished by the
 * time the test gave up.
 */
const FULL_ROLL_MS = 2800;
/** 300ms of dice, then 50ms for the announcement to clear and restore. */
const INDIVIDUAL_ROLL_MS = 350;

/** Advances fake timers, flushing the effects each callback schedules. */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(async () => {
  // A fixed face keeps every expectation below a worked example rather than a
  // range: Math.random() of 0.5 is die 4 on a d6.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  harness = await mountAlpine(DiceRoller);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * happy-dom's own types do not line up with the DOM lib, so the document and
 * the events are borrowed through a cast. Nothing here depends on the
 * difference: these are the same objects the harness booted Alpine against.
 */
function doc(): Document {
  return harness.window.document as unknown as Document;
}

function mouseEvent(): Event {
  return new harness.window.MouseEvent('click', { bubbles: true }) as unknown as Event;
}

function escapeEvent(): Event {
  return new harness.window.KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
  }) as unknown as Event;
}

function click(selector: string): void {
  const el = doc().querySelector(selector);
  if (!el) throw new Error(`no element for ${selector}`);
  el.dispatchEvent(mouseEvent());
}

/**
 * The text a user can actually see. Alpine's `x-show` hides an element by
 * setting `display: none` and leaves it in the tree, so `textContent` alone
 * would report the "Roll to generate" placeholder as still on screen next to
 * a filled-in tile.
 */
function shown(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll<HTMLElement>('[style*="display: none"]')) {
    hidden.remove();
  }
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function tile(name: string): HTMLElement {
  const found = [...doc().querySelectorAll('button[aria-label^="Select "]')].find((b) =>
    b.getAttribute('aria-label')?.includes(name)
  );
  const el = found?.closest('div.relative');
  if (!el) throw new Error(`no tile for ${name}`);
  return el as HTMLElement;
}

describe('DiceRoller at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('diceRoller', ...)` the root is never initialised
    // and Alpine warns rather than throwing.
    expect(harness.messages).toEqual([]);
  });

  it('renders one tile per ability, each inviting a roll', () => {
    const labels = [...doc().querySelectorAll('button[aria-label^="Select "]')].map((b) =>
      b.getAttribute('aria-label')
    );
    expect(labels).toEqual([
      'Select STR for swap',
      'Select DEX for swap',
      'Select CON for swap',
      'Select INT for swap',
      'Select WIS for swap',
      'Select CHA for swap',
    ]);
    for (const name of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
      expect(shown(tile(name))).toContain('Roll to generate');
    }
  });

  it('fills every tile with dice, a total and a modifier after a full roll', async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    for (const name of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
      const text = tile(name).textContent ?? '';
      // 4d6 of fours, drop the lowest: three fours kept, so 12 and +1.
      expect(text).toContain('4 + 4 + 4 = 12');
      expect(text).toContain('+1');
      expect(shown(tile(name))).not.toContain('Roll to generate');
    }
    expect(harness.messages).toEqual([]);
  });

  it('disables the controls while a full roll is in flight', async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(50);
    const rollAll = doc().querySelector(
      '[aria-label="Roll all ability scores"]'
    ) as unknown as HTMLButtonElement;
    expect(rollAll.disabled).toBe(true);
    expect(rollAll.textContent).toContain('Rolling...');
    const reroll = doc().querySelector('[aria-label="Re-roll STR"]') as unknown as HTMLButtonElement;
    expect(reroll.disabled).toBe(true);

    await advance(FULL_ROLL_MS);
    expect(rollAll.disabled).toBe(false);
    expect(rollAll.textContent).toContain('Roll All Abilities');
  });

  it('re-rolls a single ability without touching the others', async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    vi.mocked(Math.random).mockReturnValue(0.99); // die 6
    click('[aria-label="Re-roll STR"]');
    await advance(INDIVIDUAL_ROLL_MS);

    expect(shown(tile('STR'))).toContain('6 + 6 + 6 = 18');
    expect(tile('STR').textContent).toContain('+4');
    expect(shown(tile('DEX'))).toContain('4 + 4 + 4 = 12');
  });

  it('summarises the session in the stats card and the result log', async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    const body = shown(doc().body);
    expect(body).toContain('Average:');
    expect(body).toContain('Median:');
    // The label and the value sit in sibling spans with no whitespace between,
    // so each line reads as one run of text. Six identical totals: lowest and
    // highest are both 12, each seen six times.
    expect(body).toContain('Average:12.0');
    expect(body).toContain('Median:12');
    expect(body).toContain('Lowest:12 (x6)');
    expect(body).toContain('Highest:12 (x6)');
    expect(body).toContain('STR 12 (+1)');
    expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe(
      'All abilities rolled. STR 12 (+1), DEX 12 (+1), CON 12 (+1), INT 12 (+1), WIS 12 (+1), CHA 12 (+1).'
    );
  });

  describe('the one swap a session allows', () => {
    beforeEach(async () => {
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
    });

    function swapPanel(): HTMLElement | null {
      return doc().querySelector('.dice-swap-panel');
    }

    it('stages a swap, and renders the confirm pair so the swap can be taken', async () => {
      // #328: the panel was a sibling of the tile, so the ability `x-for` had
      // two roots and Alpine cloned only the first. The panel never appeared.
      click('button[aria-label="Select STR for swap"]');
      await harness.flush();
      expect(swapPanel()).toBeNull();

      click('button[aria-label="Select DEX for swap"]');
      await harness.flush();
      expect(swapPanel()?.textContent).toContain('STR ↔ DEX');
      expect(doc().querySelector('[aria-label="Confirm swap"]')).not.toBeNull();
      expect(doc().querySelector('[aria-label="Cancel swap"]')).not.toBeNull();
    });

    it('exchanges the two totals when confirmed', async () => {
      vi.mocked(Math.random).mockReturnValue(0.5);
      click('[aria-label="Re-roll DEX"]');
      await advance(INDIVIDUAL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0.99); // die 6
      click('[aria-label="Re-roll STR"]');
      await advance(INDIVIDUAL_ROLL_MS);

      click('button[aria-label="Select STR for swap"]');
      await harness.flush();
      click('button[aria-label="Select DEX for swap"]');
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      // The dice travel with the score they rolled, so the STR tile is the one
      // that now shows 12 and the DEX tile shows 18.
      expect(shown(tile('STR'))).toContain('4 + 4 + 4 = 12');
      expect(shown(tile('DEX'))).toContain('6 + 6 + 6 = 18');
      expect(swapPanel()).toBeNull();
      // The newest log line is rewritten rather than a second one invented.
      expect(
        (doc().querySelector('.font-mono')?.textContent ?? '').startsWith(
          'STR 12 (+1), DEX 18 (+4)'
        )
      ).toBe(true);
    });

    it('leaves both totals alone when cancelled, by button or by Escape', async () => {
      click('button[aria-label="Select STR for swap"]');
      await harness.flush();
      click('button[aria-label="Select DEX for swap"]');
      await harness.flush();
      click('[aria-label="Cancel swap"]');
      await harness.flush();
      expect(swapPanel()).toBeNull();
      expect(shown(tile('STR'))).toContain('12');

      click('button[aria-label="Select STR for swap"]');
      await harness.flush();
      click('button[aria-label="Select CON for swap"]');
      await harness.flush();
      doc().dispatchEvent(escapeEvent());
      await harness.flush();
      expect(swapPanel()).toBeNull();
      expect(shown(tile('STR'))).toContain('12');
      expect(shown(tile('CON'))).toContain('12');
    });

    it('refuses a second swap and says why', async () => {
      click('button[aria-label="Select STR for swap"]');
      await harness.flush();
      click('button[aria-label="Select DEX for swap"]');
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      click('button[aria-label="Select STR for swap"]');
      await advance(60);
      expect(swapPanel()).toBeNull();
      expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe(
        'This session has already used its swap. Roll all abilities to start a new one.'
      );
    });

    it('deselects a single pick instead of staging a swap with itself', async () => {
      click('button[aria-label="Select STR for swap"]');
      await advance(60);
      const tileButton = doc().querySelector(
        'button[aria-label="Select STR for swap"]'
      ) as unknown as HTMLButtonElement;
      expect(tileButton.getAttribute('aria-pressed')).toBe('true');
      click('button[aria-label="Select STR for swap"]');
      await advance(60);
      expect(tileButton.getAttribute('aria-pressed')).toBe('false');
      expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe('STR deselected.');
    });
  });
});
