/**
 * The contents rows the printed Handbook carries.
 *
 * The eight source pages and the page each one starts on. Not their section
 * headings: forty sub-entries on one two-column sheet is a wall, and the page
 * number per source page is the thing that actually sends a reader to a page.
 *
 * A pure function of the sheets the assignment measured, and embedded as its own
 * source inside that assignment rather than retyped into it, so the contents a
 * reader holds and the rows a test asserts are one implementation rather than two
 * that agree today. That means every function here is a function of its arguments
 * alone - no module scope, no imports - which is a real constraint on this file
 * rather than a style preference.
 *
 * See `handbook-sheet.mjs`, the Contents entry in CONTEXT.md and ADR-0020.
 */

/**
 * One row per source page: the first sheet of that source page, and its page
 * number.
 *
 * `page` rather than `sheet` because the reader turns to a page: the two are the
 * same number in this artifact, and the footer's wording is what a reader sees.
 *
 * A source page split across sheets contributes one row, at the page it *starts*
 * on. Its later sheets are reached by turning a page, which is what the footer
 * and the sheet's own section name are for; listing "Character Creation" on four
 * consecutive rows would be a wall that says nothing the first row did not.
 *
 * Front matter - the cover, the contents itself - is not a source page and gets
 * no row: a contents that listed itself is a book that cannot be opened.
 */
export function contentsEntries(sheets) {
  const seen = new Set();
  const rows = [];

  for (const sheet of sheets ?? []) {
    const source = String(sheet?.source ?? '');
    if (sheet?.kind !== 'source' || source === '' || seen.has(source)) continue;

    seen.add(source);
    rows.push({
      slug: source,
      title: String(sheet?.title ?? ''),
      page: sheet?.page,
      parts: sheet?.parts ?? 1,
    });
  }

  return rows;
}