import { describe, expect, it } from 'vitest';

import { planSheets, splitName } from './handbook-split.mjs';

/**
 * The planner: where a source page stops being one sheet.
 *
 * Pure, because the decision it makes is the one the whole ticket is about. A
 * generator that quietly decides where a page ends is a generator that can
 * quietly change which page a rule appears on, so this decision is a function of
 * measurements, and a function of measurements can be asserted without a browser.
 *
 * The expected values below are worked out by hand from the geometry the print
 * stylesheet states - a text block 971.33px tall, two columns of it, so a sheet
 * holds 1942px of column - rather than recomputed the way the planner computes
 * them.
 */

const SHEET = { blockCapacity: 900, columns: 2 };

/** A measured block. `columns: 2` is an element that spans both columns. */
function block(height, overrides = {}) {
  return {
    height,
    columns: overrides.columns ?? 1,
    name: overrides.name ?? `block ${height}`,
    kind: overrides.kind ?? 'p',
    authored: overrides.authored ?? false,
  };
}

describe('the planner', () => {
  it('leaves content that fits on one sheet alone', () => {
    // 300 + 300 + 200 is 800px of column: 400px a column, one sheet.
    const plan = planSheets({ blocks: [block(300), block(300), block(200)], ...SHEET });

    expect(plan.sheets).toEqual([[0, 1, 2]]);
    expect(plan.splits).toEqual([]);
    expect(plan.oversized).toEqual([]);
  });

  // The sheet is two columns, so two narrow blocks fit where either alone would
  // not, and the arithmetic is what makes a sheet a sheet rather than a column.
  it('fills both columns before it starts a new sheet', () => {
    const plan = planSheets({ blocks: [block(800), block(800), block(800)], ...SHEET });

    // 800 + 800 is 1600 of the 1800 a sheet holds, so the third block does not
    // fit beside them.
    expect(plan.sheets).toEqual([
      [0, 1],
      [2],
    ]);
  });

  it('names every break it makes, and says which block it broke before', () => {
    const plan = planSheets({
      blocks: [block(800), block(800), block(800, { name: 'Long Rest', kind: 'h2' })],
      ...SHEET,
    });

    expect(plan.splits).toEqual([{ block: 2, name: 'Long Rest', kind: 'h2' }]);
  });

  // A block that spans both columns is a full-width band, and what is left of the
  // sheet is a band 100px tall rather than a column 900px tall. Ignoring that is
  // how the last line of a paragraph lands on the page after the table above it.
  it('charges an element that spans both columns the sheet height it takes', () => {
    const plan = planSheets({
      blocks: [block(800, { columns: 2, name: 'Weapon Mastery', kind: 'table' }), block(200, { name: 'Runes', kind: 'h2' })],
      ...SHEET,
    });

    // 800px of band is left on the sheet, and a 200px block does not fit in the
    // 100px that is left of the column it was going into.
    expect(plan.sheets).toEqual([[0], [1]]);
    expect(plan.splits).toEqual([{ block: 1, name: 'Runes', kind: 'h2' }]);
  });

  // The other half of the same rule: a narrow block that does not fit in what is
  // left of this column goes to the next column, which is what a two-column sheet
  // is for and not a break the author has to hear about.
  it('carries a block that does not fit the column into the next column', () => {
    const plan = planSheets({ blocks: [block(700), block(400), block(400)], ...SHEET });

    expect(plan.sheets).toEqual([[0, 1, 2]]);
    expect(plan.splits).toEqual([]);
  });

  // A paragraph too long for one column prints down both of them, which is what
  // the columns are for. It is a break and it is reported, because putting it on
  // a sheet of its own moves everything after it.
  it('gives a block taller than a column a sheet of its own, and reports the break', () => {
    const plan = planSheets({
      blocks: [block(300), block(1400, { name: 'A Very Long Paragraph', kind: 'p' }), block(300)],
      ...SHEET,
    });

    expect(plan.sheets).toEqual([[0], [1], [2]]);
    // Both sides of it: the break before it and the break after, because an
    // author who puts a rule at either one removes that split.
    expect(plan.splits).toEqual([
      { block: 1, name: 'A Very Long Paragraph', kind: 'p' },
      { block: 2, name: 'block 300', kind: 'p' },
    ]);
    // 1400 of 900 in each of two columns fits on a sheet, so nothing is wrong
    // with the book here and nothing is reported as wrong.
    expect(plan.oversized).toEqual([]);
  });

  // The content is not clipped and it is not moved either: a block taller than
  // the whole sheet takes a sheet of its own and is reported, because the only
  // honest answers to a paragraph too long for a page are "it spans two pages"
  // and "the author splits it", and this is the first of those with the second
  // recorded.
  it('gives a block taller than a sheet a sheet of its own and reports it', () => {
    const plan = planSheets({
      blocks: [block(300), block(2600, { name: 'A Very Long Paragraph', kind: 'p' }), block(300)],
      ...SHEET,
    });

    expect(plan.sheets).toEqual([[0], [1], [2]]);
    expect(plan.oversized).toEqual([{ block: 1, name: 'A Very Long Paragraph', kind: 'p' }]);
    // Not a split: nothing was broken. The block is whole, and it is reported
    // because it is the one thing in the book a sheet cannot hold.
    expect(plan.splits).toEqual([{ block: 2, name: 'block 300', kind: 'p' }]);
  });

  it('never packs anything onto a sheet with a block taller than a column on it', () => {
    const plan = planSheets({ blocks: [block(1000), block(100)], ...SHEET });

    expect(plan.sheets).toEqual([[0], [1]]);
  });

  // An element that spans both columns is a band, and a band gets one column's
  // worth of sheet whatever its height: a full-width table of 1500px has no
  // second column to continue in.
  it('reports a full-width band that is taller than the sheet, however wide it is', () => {
    const plan = planSheets({
      blocks: [block(1500, { columns: 2, name: 'Weapon Mastery', kind: 'table' })],
      ...SHEET,
    });

    expect(plan.oversized).toEqual([{ block: 0, name: 'Weapon Mastery', kind: 'table' }]);
  });

  // This is the convergence the whole ticket is for: a horizontal rule the author
  // wrote is a break, and it is not a split the generator has to report.
  it('breaks where the author asked, and does not call it a split', () => {
    const plan = planSheets({
      blocks: [
        block(300),
        block(2, { authored: true, name: 'rule', kind: 'hr' }),
        block(300, { name: 'Dash', kind: 'h2' }),
        block(300),
      ],
      ...SHEET,
    });

    expect(plan.sheets).toEqual([[0, 1], [2, 3]]);
    expect(plan.splits).toEqual([]);
  });

  // An authored break at the very end must not open an empty sheet, or the book
  // gains a blank page every time a source page ends with a rule.
  it('does not open a sheet for an authored break that ends the content', () => {
    const plan = planSheets({ blocks: [block(300), block(2, { authored: true, name: 'rule', kind: 'hr' })], ...SHEET });

    expect(plan.sheets).toEqual([[0, 1]]);
  });

  // A sheet holding exactly its capacity is closed, rather than waiting for a
  // block that will never come: otherwise the last two blocks of a source page
  // sit on a sheet of their own.
  it('closes a sheet that is full rather than waiting for the next block', () => {
    const plan = planSheets({ blocks: [block(900), block(900), block(900)], ...SHEET });

    expect(plan.sheets).toEqual([[0, 1], [2]]);
  });

  it('refuses to plan a sheet with no capacity rather than dividing by it', () => {
    expect(() => planSheets({ blocks: [block(10)], blockCapacity: 0, columns: 2 })).toThrow(/capacity/i);
    expect(() => planSheets({ blocks: [block(10)], blockCapacity: 900, columns: 0 })).toThrow(/columns/i);
  });

  it('plans a source page with no content as no sheets at all', () => {
    expect(planSheets({ blocks: [], ...SHEET }).sheets).toEqual([]);
  });
});

describe('how a split is named', () => {
  // A split named "div" is a split nobody can act on: the reader of the report
  // needs to know which rule now starts a new page.
  it('names the heading the break falls at', () => {
    expect(splitName({ tag: 'div', heading: 'Dash', text: 'You must have the spell prepared' })).toBe(
      'div at h2 "Dash"'
    );
  });

  it('names the text it breaks before when there is no heading', () => {
    expect(splitName({ tag: 'table', heading: '', text: 'Weapon Group | Weapons in Group' })).toBe(
      'table at "Weapon Group | Weapons in Group"'
    );
  });

  // A thirty-kilobyte page has blocks with a great deal of text in them, and a
  // report line that runs to a paragraph is a report nobody reads.
  it('cuts the text at a fixed length rather than printing all of it', () => {
    const label = splitName({ tag: 'p', heading: '', text: 'x'.repeat(400) });

    expect(label.length).toBeLessThan(90);
    expect(label).toMatch(/^p at "x+…?"$/);
  });

  // Collapsed, because the rendered text of a block carries the newlines and
  // indentation of the markdown it was written from, none of which is where the
  // break falls.
  it('collapses the whitespace of the text it quotes', () => {
    expect(splitName({ tag: 'p', heading: '', text: '  one\n\n  two  ' })).toBe('p at "one two"');
  });

  // Better than an empty label, which is a split nobody can find in the document.
  it('names the element itself when it has neither a heading nor any text', () => {
    expect(splitName({ tag: 'hr', heading: '', text: '' })).toBe('hr');
  });
});
