import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rulebookParts } from '../components/rulebook-index/rulebook-parts';

const configSource = readFileSync(join(__dirname, '../../astro.config.mjs'), 'utf8');

const entries = rulebookParts.flatMap((part) => part.entries);

describe('FG Effects navigation', () => {
  it('links the Tools FG Effects item to the migrated page', () => {
    const matches = entries.filter((entry) => entry.href === '/fantasy-grounds/fg-effects/');

    expect(matches).toHaveLength(1);
    expect(matches[0]?.title).toBe('FG Effects');
  });

  it('keeps the FG Effects icon and description', () => {
    const entry = entries.find((candidate) => candidate.href === '/fantasy-grounds/fg-effects/');

    expect(entry?.icon).toBe('mdi:magic-staff');
    expect(entry?.description).toBe(
      'Automation tips, conditional operators, and custom effects for Fantasy Grounds.'
    );
  });

  it('adds FG Effects first in the Fantasy Grounds sidebar group', () => {
    expect(configSource).toContain(
      "{ label: 'FG Effects', slug: 'fantasy-grounds/fg-effects' }"
    );

    const groupStart = configSource.indexOf("label: 'Fantasy Grounds'");
    const fgEffectsIndex = configSource.indexOf(
      "{ label: 'FG Effects', slug: 'fantasy-grounds/fg-effects' }"
    );
    const currentPartyIndex = configSource.indexOf(
      "{ label: 'Current Party', slug: 'fantasy-grounds/current-party' }"
    );

    expect(groupStart).toBeGreaterThanOrEqual(0);
    expect(fgEffectsIndex).toBeGreaterThan(groupStart);
    expect(currentPartyIndex).toBeGreaterThan(fgEffectsIndex);
  });
});
