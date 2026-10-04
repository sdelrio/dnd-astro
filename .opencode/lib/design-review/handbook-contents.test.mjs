import { describe, expect, it } from 'vitest';

import { contentsEntries } from './handbook-contents.mjs';

/**
 * The contents sheet: the eight source pages and the page each one starts on.
 *
 * A pure function of the sheets the assignment measured, which is the seam worth
 * testing: the rows are what a reader turns the contents for, and they cannot be
 * read off a PDF without a browser.
 */

/** The sheets of a small book: a cover, a contents, and two source pages. */
const sheets = [
  { kind: 'cover', source: '', title: 'Cover', page: 1, parts: 1 },
  { kind: 'contents', source: '', title: 'Contents', page: 2, parts: 1 },
  { kind: 'source', source: 'dnd/character-creation', title: 'Character Creation', page: 3, parts: 2 },
  { kind: 'source', source: 'dnd/character-creation', title: 'Character Creation', page: 4, parts: 2 },
  { kind: 'source', source: 'dnd/magic', title: 'Magic', page: 5, parts: 1 },
];

describe('the contents rows', () => {
  it('lists the source pages and nothing else', () => {
    expect(contentsEntries(sheets).map((row) => row.title)).toEqual(['Character Creation', 'Magic']);
  });

  // The number the row carries is the page the source page *starts* on, which is
  // the page a reader turns to for the chapter rather than for its continuation.
  it('points each row at the page its source page starts on', () => {
    expect(contentsEntries(sheets).map((row) => row.page)).toEqual([3, 5]);
  });

  // Forty sub-entries on one two-column sheet is a wall, and the page number per
  // source page is what sends a reader to a page.
  it('does not list a source page once per sheet it was split into', () => {
    expect(contentsEntries(sheets)).toHaveLength(2);
  });

  it('does not list the cover or the contents itself', () => {
    const rows = contentsEntries(sheets);

    expect(rows.map((row) => row.title)).not.toContain('Cover');
    expect(rows.map((row) => row.title)).not.toContain('Contents');
  });

  it('carries how many sheets a source page became, for a row that spans several', () => {
    expect(contentsEntries(sheets)[0]).toEqual({
      slug: 'dnd/character-creation',
      title: 'Character Creation',
      page: 3,
      parts: 2,
    });
  });

  it('reads an empty book as no rows rather than throwing', () => {
    expect(contentsEntries([])).toEqual([]);
    expect(contentsEntries(undefined)).toEqual([]);
  });

  // The order is the order of the sheets, which is sidebar order, so the
  // contents cannot disagree with the sidebar about what comes first.
  it('keeps the order the sheets are in', () => {
    const reversed = [
      { kind: 'source', source: 'dnd/magic', title: 'Magic', page: 3, parts: 1 },
      { kind: 'source', source: 'dnd/character-creation', title: 'Character Creation', page: 5, parts: 1 },
    ];

    expect(contentsEntries(reversed).map((row) => row.slug)).toEqual(['dnd/magic', 'dnd/character-creation']);
  });
});