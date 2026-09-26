import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rulebookParts } from '../components/rulebook-index/rulebook-parts';

const indexSource = readFileSync(join(__dirname, '../content/docs/index.mdx'), 'utf8');
const astroConfig = readFileSync(join(__dirname, '../../astro.config.mjs'), 'utf8');

const entries = rulebookParts.flatMap((part) => part.entries);
const folios = entries.map((entry) => entry.folio);

describe('Companion index page', () => {
  it('links the Rules list Character Creation item to the page', () => {
    const entry = entries.find((candidate) => candidate.title === 'Character Creation');

    expect(entry).toBeDefined();
    expect(entry?.href).toBe('/dnd/character-creation/');
    expect(rulebookParts[0]?.entries).toContain(entry);
  });

  it('links the Tools list Point Buy item to the tool page', () => {
    const entry = entries.find((candidate) => candidate.title === 'Point Buy');

    expect(entry).toBeDefined();
    expect(entry?.href).toBe('/dnd-tools/point-buy/');
  });

  it('keeps Point Buy listed rather than promoted to a button', () => {
    // The action-button row is gone from the page entirely - it repeated six of
    // the entries printed directly beneath it, and the Dice Roller appeared as
    // a button and then never again as the entry it is. So this asserts the
    // stronger thing: no destination on this page is a button.
    expect(indexSource).not.toMatch(/<LinkButton/);
  });

  it('lists every destination exactly once', () => {
    const hrefs = entries.map((entry) => entry.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('addresses every entry with a unique folio', () => {
    // The folio is quoted across the table ("look up nine"), so a duplicate
    // would be two answers to one question.
    expect(new Set(folios).size).toBe(folios.length);
    expect(folios.every((folio) => /^\d+$/.test(folio))).toBe(true);
  });

  it('has no unlinked tool placeholder entries', () => {
    expect(entries.filter((entry) => !entry.href).map((entry) => entry.title)).toEqual([]);
    expect(entries.filter((entry) => !entry.description.trim()).map((entry) => entry.title)).toEqual([]);
  });

  it('keeps the Dice Roller in the index, not only in a button row', () => {
    // The Dice Roller was reachable from the page before this rebuild and is
    // still reachable, but as an entry with a folio and a description rather
    // than as an icon-only button.
    const entry = entries.find((candidate) => candidate.title === 'Dice Roller');

    expect(entry).toBeDefined();
    expect(entry?.href).toBe('/dnd-tools/dice-roller/');
    expect(entry?.folio).toBeDefined();
  });

  it('points the Starlight GitHub social link at this repository', () => {
    expect(astroConfig).toContain(
      "{ icon: 'github', label: 'GitHub', href: 'https://github.com/sdelrio/dnd-astro' }"
    );
    expect(astroConfig).not.toContain('https://github.com/withastro/starlight');
  });
});
