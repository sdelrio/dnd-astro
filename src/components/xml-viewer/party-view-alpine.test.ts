/**
 * Runtime coverage for PartyView's Alpine expressions.
 *
 * The component used to be an `is:inline` script that assigned
 * `window.partyView`, so its expressions were as unchecked as the other two
 * components' and just as invisible to the type checker. This boots the real
 * component against real rendered markup and filters the roster by role.
 *
 * What is asserted here is the filter's *state*: the pressed chips, and the
 * count the component reports in the live region. The `hidden` class it puts on
 * a filtered-out card is not asserted - happy-dom silently drops class writes on
 * some of these elements, so a class assertion would be testing the DOM
 * emulator rather than the component. `party-view.test.ts` still pins the
 * markup that carries the class.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import PartyView from './PartyView.astro';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

let harness: MountedAlpine;
let tempDir: string;
let rosterPath: string;

const ROSTER = {
  partyName: 'Runtime',
  members: [
    { filename: 'draknor', roles: ['tank'] },
    { filename: 'elarion', roles: ['damage'] },
    // `vogun` is the only member carrying the healer role and nothing else, so
    // switching healers off has to leave nobody standing.
    { filename: 'vogun', roles: ['healer'] },
  ],
};

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'party-view-alpine-'));
  rosterPath = join(tempDir, 'party.json');
  writeFileSync(rosterPath, JSON.stringify(ROSTER));
  harness = await mountAlpine(PartyView, { rosterPath });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tempDir, { recursive: true, force: true });
});

/** happy-dom's types do not line up with the DOM lib; see the dice roller suite. */
function doc(): Document {
  return harness.window.document as unknown as Document;
}

function chip(label: string): HTMLElement {
  const found = [...doc().querySelectorAll('.r3-chip')].find((c) =>
    c.textContent?.trim().startsWith(label)
  );
  if (!found) throw new Error(`no role chip for ${label}`);
  return found as HTMLElement;
}

function click(label: string): void {
  chip(label).dispatchEvent(
    new harness.window.MouseEvent('click', { bubbles: true }) as unknown as Event
  );
}

/** What the component tells a screen reader the filter is showing. */
function status(): string {
  return doc().querySelector('[aria-live="polite"]')?.textContent ?? '';
}

/**
 * The roles whose chip reports itself pressed. The trailing count in the chip's
 * own markup is stripped, so this reads labels.
 */
function pressedRoles(): string[] {
  return [...doc().querySelectorAll('.r3-chip')]
    .filter((c) => c.getAttribute('aria-pressed') === 'true')
    .map((c) => (c.textContent ?? '').trim().replace(/[0-9]+$/, '').trim());
}

describe('PartyView at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('partyView', ...)`, `x-data="partyView"` is an
    // unresolved identifier and every expression on the page throws.
    expect(harness.messages).toEqual([]);
  });

  it('starts with every role active and every member shown', () => {
    expect(pressedRoles()).toEqual(['All', 'Tank', 'Healer', 'Damage Dealer', 'Support', 'Utility']);
    expect(status()).toBe('Filter: all roles. 3 members shown.');
  });

  it('renders one card per member in the roster', () => {
    expect(doc().querySelectorAll('section[role="list"] > [role="listitem"]')).toHaveLength(3);
    const body = doc().body.textContent ?? '';
    for (const name of ['Drakknor', 'Elarion Myrthas', 'Vogun']) {
      expect(body).toContain(name);
    }
  });

  // A chip is a toggle, so a chip is switched *off* by pressing it. Leaving
  // only Tank on is therefore pressing the other four.
  it('counts down to the members who carry the roles that are left on', async () => {
    for (const role of ['Damage', 'Support', 'Healer', 'Utility']) {
      click(role);
       
      await harness.settle();
    }
    expect(status()).toBe('Filter: Tank. 1 of 3 members shown.');
    expect(pressedRoles()).toEqual(['Tank']);
  });

  it('restores every member when the same chip is pressed again', async () => {
    click('Damage');
    await harness.settle();
    expect(status()).not.toBe('Filter: all roles. 3 members shown.');
    click('Damage');
    await harness.settle();
    expect(status()).toBe('Filter: all roles. 3 members shown.');
  });

  it('says so when every role is switched off, rather than reporting a stale count', async () => {
    for (const role of ['Tank', 'Damage', 'Support', 'Healer', 'Utility']) {
      click(role);
       
      await harness.settle();
    }
    expect(status()).toBe('Filter: no roles. 0 of 3 members shown.');
    expect(pressedRoles()).toEqual([]);
  });

  it('brings every member back through the All chip', async () => {
    click('Damage');
    await harness.settle();
    click('All');
    await harness.settle();
    expect(status()).toBe('Filter: all roles. 3 members shown.');
    expect(pressedRoles()).toEqual(['All', 'Tank', 'Healer', 'Damage Dealer', 'Support', 'Utility']);
    expect(harness.messages).toEqual([]);
  });
});
