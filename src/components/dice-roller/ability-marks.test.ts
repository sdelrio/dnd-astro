/**
 * The one assertion that ties the two panels together.
 *
 * Both tools print the same six abilities, and this issue added a mark beside
 * each name in both. The tables are shared and each is asserted to have a single
 * declaration site, which is the mechanism; this is the outcome. It mounts both
 * components, reads the glyph each one actually drew for each ability, and
 * compares the drawing rather than the string that produced it - so a mark
 * rendered from a different icon than the table says, or one tool drawing its
 * own copy of the table, fails here even though both tables still read correct.
 */
import { describe, expect, it } from 'vitest';

import { ABILITY_LABELS, ABILITY_NAMES } from './dice-utils';
import DiceRoller from './DiceRoller.astro';
import PointBuy from '../point-buy/PointBuy.astro';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

function doc(harness: MountedAlpine): Document {
  return harness.window.document as unknown as Document;
}

/**
 * The glyph each tool draws for each ability, as the path data on screen.
 *
 * Point Buy draws inline, the roller draws by reference into a sprite, so the two
 * are read the way each renders rather than through one shared accessor: an
 * inline `<svg>` on the roller would have been accepted by this comparison too,
 * which is deliberate. It is the drawing that has to agree.
 */
function markPaths(harness: MountedAlpine, which: 'roller' | 'buy'): Record<string, string> {
  const document = doc(harness);
  const found: Record<string, string> = {};
  if (which === 'buy') {
    for (const row of document.querySelectorAll('.pb-rule')) {
      const handle = row.querySelector('.pb-trade');
      const label = handle?.getAttribute('aria-label') ?? '';
      // The label names the ability in words ("Pick up Strength, 8, to trade its
      // score"), so the code is resolved back through the shared name table rather
      // than parsed out of the label's prose.
      const code = ABILITY_NAMES.find((name) => label.includes(ABILITY_LABELS[name]));
      expect(code, `no ability named in ${label}`).toBeDefined();
      // Keyed by the display name, the way the roller's sprite ids are, so the two
      // maps are compared ability by ability rather than code by name.
      found[ABILITY_LABELS[code!]] = handle!.querySelector('svg')?.innerHTML ?? '';
    }
    return found;
  }
  for (const use of document.querySelectorAll('.dr-row use')) {
    const href = use.getAttribute('href') ?? '';
    found[href.replace('#dr-mark-', '')] =
      document.querySelector(href)?.innerHTML ?? '';
  }
  return found;
}

describe('the marks both tools print', () => {
  it('draws the same glyph for every ability in both panels', async () => {
    // Read before the second mount, because the harness reuses one window and the
    // second mount replaces the tree the first one rendered into.
    const fromRoller = markPaths(await mountAlpine(DiceRoller), 'roller');
    const fromBuy = markPaths(await mountAlpine(PointBuy), 'buy');

    expect(Object.keys(fromRoller).sort()).toEqual(Object.values(ABILITY_LABELS).sort());
    expect(Object.keys(fromBuy).sort()).toEqual(Object.values(ABILITY_LABELS).sort());
    for (const name of Object.values(ABILITY_LABELS)) {
      expect(fromRoller[name], `${name} is drawn as nothing by the roller`).not.toBe('');
      expect(fromBuy[name], `${name} is drawn as nothing by Point Buy`).not.toBe('');
      expect(fromRoller[name], `${name} is a different glyph in the two tools`).toBe(
        fromBuy[name]
      );
    }
  });

  it('draws six different glyphs, so no two abilities share a picture', async () => {
    const roller = await mountAlpine(DiceRoller);
    const glyphs = Object.values(markPaths(roller, 'roller'));
    expect(new Set(glyphs).size, `two abilities share a glyph: ${glyphs.length} drawn`).toBe(6);
  });
});