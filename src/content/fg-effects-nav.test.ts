import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexSource = readFileSync(join(__dirname, '../content/docs/index.mdx'), 'utf8');
const configSource = readFileSync(join(__dirname, '../../astro.config.mjs'), 'utf8');

describe('FG Effects navigation', () => {
  it('links the Tools FG Effects item to the migrated page', () => {
    const itemPattern =
      /<IconifyIcon icon="mdi:magic-staff" width="2em" class="shrink-0" \/>\s*<span><strong><a href="\/fantasy-grounds\/fg-effects\/">FG Effects<\/a><\/strong> - Advanced automation tips, conditional operators, and custom effects for Fantasy Grounds\.<\/span>/;

    expect(indexSource).toMatch(itemPattern);
    expect(indexSource.match(new RegExp(itemPattern.source, 'g'))).toHaveLength(1);
  });

  it('keeps the FG Effects icon and description', () => {
    expect(indexSource).toContain(
      '<IconifyIcon icon="mdi:magic-staff" width="2em" class="shrink-0" />'
    );
    expect(indexSource).toContain(
      '- Advanced automation tips, conditional operators, and custom effects for Fantasy Grounds.'
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
