import { describe, expect, it, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SavesTable from './SavesTable.astro';
import SkillsTable from './SkillsTable.astro';

// A column-splitting helper that rounded up used to hand a one-row or empty list
// a trailing column, and both tables render one `<table>` per column with a full
// header row. Splitting fewer rows than columns therefore produced a table shell
// with a header and no body - the empty sheet ADR-0016 exists to prevent. The
// fix lives in `chunk()`; these guards hold the table components to it so a
// regression through the component is visible rather than silently rendered.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function tables(html: string): number {
  return [...html.matchAll(/<table/g)].length;
}

function theads(html: string): number {
  return [...html.matchAll(/<thead/g)].length;
}

const oneSave = { short: 'STR', save: 5, saveprof: 1 };
const oneSkill = { name: 'Perception', total: 3, prof: 1, stat: 'wisdom' };

describe('SavesTable empty-column guard', () => {
  it('renders no table for an empty save list', async () => {
    const html = await container.renderToString(SavesTable, {
      props: { rows: [], columns: 2 },
    });
    expect(tables(html)).toBe(0);
    expect(theads(html)).toBe(0);
  });

  it('renders exactly one table for a single save asked to split in two', async () => {
    const html = await container.renderToString(SavesTable, {
      props: { rows: [oneSave], columns: 2 },
    });
    expect(tables(html)).toBe(1);
    expect(theads(html)).toBe(1);
    expect(html).toContain('STR');
  });

  it('still renders two tables for a full six-save split', async () => {
    const rows = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((short, i) => ({
      short,
      save: i,
      saveprof: 1,
    }));
    const html = await container.renderToString(SavesTable, {
      props: { rows, columns: 2 },
    });
    expect(tables(html)).toBe(2);
  });
});

describe('SkillsTable empty-column guard', () => {
  it('renders no table for an empty skill list', async () => {
    const html = await container.renderToString(SkillsTable, {
      props: { rows: [], columns: 2 },
    });
    expect(tables(html)).toBe(0);
    expect(theads(html)).toBe(0);
  });

  it('renders exactly one table for a single skill asked to split in two', async () => {
    const html = await container.renderToString(SkillsTable, {
      props: { rows: [oneSkill], columns: 2 },
    });
    expect(tables(html)).toBe(1);
    expect(theads(html)).toBe(1);
    expect(html).toContain('Perception');
  });

  it('still renders two tables for a six-skill split', async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      name: `Skill ${i + 1}`,
      total: i,
      prof: 1,
      stat: 'wisdom',
    }));
    const html = await container.renderToString(SkillsTable, {
      props: { rows, columns: 2 },
    });
    expect(tables(html)).toBe(2);
  });
});
