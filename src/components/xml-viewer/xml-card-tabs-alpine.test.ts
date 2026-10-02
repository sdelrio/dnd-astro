/**
 * Runtime coverage for the card's tab bar.
 *
 * The tab bar is the one part of XmlCard that carries Alpine, so every one of its
 * expressions is a string the compiler cannot see - exactly the shape ADR-0010
 * exists to cover, and exactly the shape that let #328 ship broken. These tests
 * boot the real component over the real rendered card and press the real
 * controls.
 *
 * The harness cannot observe `:class` writes (happy-dom drops some of them), so
 * selection is asserted through `aria-selected` and `aria-controls`, and panel
 * visibility through the inline `display` that `x-show` writes. That is also the
 * better assertion: both are what a screen reader reads, not what the eye sees.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import XmlCard from './XmlCard.astro';
import type { CharacterData } from '@/utils/parse-character-xml';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

const character: CharacterData = {
  name: 'Runtime Hero',
  race: 'Human',
  alignment: 'Neutral',
  background: 'Soldier',
  deity: '',
  classes: [{ name: 'Fighter', level: 3 }],
  abilities: {
    strength: { score: 16, bonus: 3, save: 5, saveprof: 1 },
    dexterity: { score: 12, bonus: 1, save: 1, saveprof: 0 },
    constitution: { score: 14, bonus: 2, save: 4, saveprof: 1 },
    intelligence: { score: 10, bonus: 0, save: 0, saveprof: 0 },
    wisdom: { score: 13, bonus: 1, save: 1, saveprof: 0 },
    charisma: { score: 8, bonus: -1, save: -1, saveprof: 0 },
  },
  ac: 18,
  hp: 28,
  tempHp: 0,
  speed: 30,
  initiative: 1,
  profBonus: 2,
  skills: [],
  allSkills: [
    { name: 'Athletics', total: 6, prof: 1, stat: 'strength' },
    { name: 'Perception', total: 4, prof: 1, stat: 'wisdom' },
  ],
  passives: { perception: 14, investigation: 11, insight: 10 },
  languages: ['Common'],
  feats: [],
  features: [{ level: 1, name: 'Second Wind', source: 'Fighter' }],
  powers: [
    { level: 1, name: 'Rage', group: 'Barbarian Actions', prepared: 0, preparedDomain: 0 },
  ],
  weapons: [
    {
      name: 'Greatsword',
      attackbonus: 0,
      attackstat: '',
      properties: '',
      carried: 2,
      type: 0,
      damage: [{ bonus: 0, dice: '2d6', stat: 'base', statmult: 1, type: 'slashing' }],
    },
  ],
  inventory: [{ name: 'Rope', count: 1, weight: 10, carried: 1 }],
  coins: { pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 },
  filename: 'runtime-hero',
  avatarPath: '/fg/avatar/faceless.svg',
};

let harness: MountedAlpine;

/** happy-dom's element types are not the DOM lib's; the objects are the same. */
function doc(): Document {
  return harness.window.document as unknown as Document;
}

function tab(id: string): HTMLElement {
  const found = doc().querySelector(`[data-tab="${id}"]`);
  if (!found) throw new Error(`no tab for ${id}`);
  return found as HTMLElement;
}

function panel(id: string): HTMLElement {
  const found = doc().querySelector(`[data-panel="${id}"]`);
  if (!found) throw new Error(`no panel for ${id}`);
  return found as HTMLElement;
}

function selected(): string[] {
  return [...doc().querySelectorAll('[role="tab"]')]
    .filter((el) => el.getAttribute('aria-selected') === 'true')
    .map((el) => el.getAttribute('data-tab') ?? '');
}

/** `x-show` writes inline `display`, so this is what the panel actually is. */
function visible(id: string): boolean {
  return panel(id).style.display !== 'none';
}

function press(id: string): void {
  tab(id).dispatchEvent(
    new harness.window.MouseEvent('click', { bubbles: true }) as unknown as Event
  );
}

/**
 * A keydown to dispatch on a tab. `cancelable` is load-bearing: the component
 * calls `preventDefault()` on the keys it handles, and an event that cannot be
 * cancelled would make that assertion vacuous.
 */
function key(name: string): KeyboardEvent {
  return new harness.window.KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  }) as unknown as KeyboardEvent;
}

beforeEach(async () => {
  harness = await mountAlpine(XmlCard, { character, display: 'medium' });
});

describe('XmlCard tab bar at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('xmlCard', ...)`, `x-data="xmlCard"` is an
    // unresolved identifier and every expression on the card throws.
    expect(harness.messages).toEqual([]);
  });

  it('opens on Overview with only that panel showing', () => {
    expect(selected()).toEqual(['overview']);
    expect(visible('overview')).toBe(true);
    for (const id of ['skills', 'inventory', 'weapons', 'features', 'powers']) {
      expect(visible(id)).toBe(false);
    }
  });

  it('keeps every panel in the DOM, so a switch reveals rather than fetches', () => {
    for (const id of ['overview', 'skills', 'inventory', 'weapons', 'features', 'powers']) {
      expect(panel(id), `${id} is missing from the DOM`).toBeTruthy();
    }
  });

  it('wires each tab to its panel with a resolved id pair', () => {
    for (const id of ['overview', 'skills', 'inventory', 'weapons', 'features', 'powers']) {
      const controls = tab(id).getAttribute('aria-controls');
      const labelledby = panel(id).getAttribute('aria-labelledby');
      expect(controls, `${id} has no aria-controls`).toBeTruthy();
      expect(labelledby, `${id} has no aria-labelledby`).toBeTruthy();
      expect(panel(id).id).toBe(controls);
      expect(tab(id).id).toBe(labelledby);
    }
  });

  it('gives the ids per instance, since a page renders six cards', async () => {
    const first = panel('overview').id;
    await mountAlpine(XmlCard, { character, display: 'medium' });
    expect(panel('overview').id).not.toBe(first);
  });

  it('shows only the pressed tab after a click', async () => {
    press('powers');
    await harness.settle();
    expect(selected()).toEqual(['powers']);
    expect(visible('powers')).toBe(true);
    expect(visible('overview')).toBe(false);
  });

  it('moves the selection and the panel together on an arrow key', async () => {
    tab('overview').dispatchEvent(key('ArrowRight'));
    await harness.settle();
    expect(selected()).toEqual(['skills']);
    expect(visible('skills')).toBe(true);
  });

  it('wraps at both ends rather than stopping dead', async () => {
    tab('overview').dispatchEvent(key('ArrowLeft'));
    await harness.settle();
    expect(selected()).toEqual(['powers']);
  });

  it('jumps to the ends on Home and End', async () => {
    tab('overview').dispatchEvent(key('End'));
    await harness.settle();
    expect(selected()).toEqual(['powers']);
    tab('powers').dispatchEvent(key('Home'));
    await harness.settle();
    expect(selected()).toEqual(['overview']);
  });

  it('keeps focus on the tab it just moved to', async () => {
    // A roving tabindex with focus left behind would make the next arrow press
    // start from the wrong tab.
    tab('overview').dispatchEvent(key('ArrowRight'));
    await harness.settle();
    expect(doc().activeElement?.getAttribute('data-tab')).toBe('skills');
  });

  it('leaves an unrelated key to the browser', async () => {
    const event = key('a');
    tab('overview').dispatchEvent(event);
    await harness.settle();
    expect(selected()).toEqual(['overview']);
    expect(event.defaultPrevented).toBe(false);
  });

  it('stops the arrow keys from scrolling the page out from under the reader', async () => {
    const event = key('ArrowDown');
    tab('overview').dispatchEvent(event);
    await harness.settle();
    expect(event.defaultPrevented).toBe(true);
  });

  it('holds a tab stop on the selected tab only, so Tab leaves the bar in one press', async () => {
    const stops = [...doc().querySelectorAll('[role="tab"]')].map(
      (el) => el.getAttribute('tabindex') ?? ''
    );
    expect(stops).toEqual(['0', '-1', '-1', '-1', '-1', '-1']);
    press('weapons');
    await harness.settle();
    expect(tab('weapons').getAttribute('tabindex')).toBe('0');
    expect(tab('overview').getAttribute('tabindex')).toBe('-1');
  });
});