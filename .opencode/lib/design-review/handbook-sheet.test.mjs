import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { LAYOUT_GLOBAL, SHEET_ATTRIBUTE, sheetAssignmentScript } from './handbook-sheet.mjs';

/**
 * The sheet assignment the command injects at document start.
 *
 * The print routes are inert HTML by design, so this is the only thing that
 * turns source pages into sheets. It runs against a real DOM here rather than
 * being read as a string, because a script that never marks a sheet produces a
 * document that prints as one very long page, and nothing about that failure is
 * visible in the source.
 */

/**
 * A box for one element.
 *
 * happy-dom does no layout, so every measurement the script makes is stated here
 * rather than arrived at by rendering. That is a deliberate limit of this test
 * and not a claim about the script: what is verified is the decision each
 * measurement drives, not the browser's arithmetic.
 */
function box(element, { top = 0, width = 306, height = 20, scrollWidth = width } = {}) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ top, bottom: top + height, height, width, left: 0, right: width }),
  });
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { value: width });
  // The browser's own content height, which is what a block's height is read
  // from: the print sheet measures a block by its client height rather than its
  // rect, because Chrome reports the column's height rather than the block's own
  // for some blocks inside a multicolumn.
  Object.defineProperty(element, 'clientHeight', { value: height });
  return element;
}

/**
 * The front matter of the book: a cover and a contents, before the source pages.
 *
 * A cover with nothing on it and a contents with no rows in it, because those are
 * what the route can author: the title, the version and the edition date are
 * known at build time and the page numbers are not.
 */
function appendFrontMatter(document, { withContents = true } = {}) {
  const cover = document.createElement('section');
  cover.setAttribute('data-handbook-front', 'cover');
  cover.setAttribute('data-handbook-title', 'Cover');
  cover.appendChild(box(document.createElement('h1'), { width: 643, height: 60 }));
  box(cover, { width: 643, height: 400 });
  document.body.appendChild(cover);

  if (!withContents) return;

  const contents = document.createElement('section');
  contents.setAttribute('data-handbook-front', 'contents');
  contents.setAttribute('data-handbook-title', 'Contents');
  contents.appendChild(box(document.createElement('h1'), { width: 643, height: 40 }));
  const list = document.createElement('ol');
  list.setAttribute('data-handbook-contents-list', '');
  contents.appendChild(list);
  box(contents, { width: 643, height: 400 });
  document.body.appendChild(contents);
}

/** A window with the print stylesheet's custom properties set, and no layout. */
function windowWithSources(sources, front = {}) {
  const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
  const { document } = window;

  document.documentElement.style.setProperty('--handbook-page-width', '793.7px');
  document.documentElement.style.setProperty('--handbook-page-height', '1122.51px');
  document.documentElement.style.setProperty('--handbook-page-margin-top', '94.49px');
  document.documentElement.style.setProperty('--handbook-page-margin-right', '56.69px');
  document.documentElement.style.setProperty('--handbook-page-margin-bottom', '56.69px');
  document.documentElement.style.setProperty('--handbook-page-margin-left', '94.49px');
  document.documentElement.style.setProperty('--handbook-column-width', '306px');
  document.documentElement.style.setProperty('--handbook-ornament', 'url("/handbook/ornament.svg")');

  appendFrontMatter(document, front);

  for (const source of sources) {
    const sheet = document.createElement('section');
    sheet.setAttribute('data-handbook-source', source.slug);
    sheet.setAttribute('data-handbook-title', `Title of ${source.slug}`);
    if (source.columns !== undefined) sheet.setAttribute('data-handbook-columns', String(source.columns));

    sheet.appendChild(box(document.createElement('h1'), { width: 643, height: 40 }));

    // The measure the columns fill. Its children carry the widths the script
    // decides span both columns from.
    const flow = document.createElement('div');
    flow.setAttribute('data-handbook-flow', '');
    box(flow, { width: 643, height: source.height });

    for (const child of source.blocks ?? []) {
      const element = document.createElement(child.tag);
      element.textContent = child.text ?? '';
      flow.appendChild(box(element, { width: child.width, scrollWidth: child.scrollWidth ?? child.width }));
    }

    sheet.appendChild(flow);
    box(sheet, { width: 643, height: source.height });
    document.body.appendChild(sheet);
  }

  return window;
}

/** The sheets printed from a source page, which is not every sheet of the book. */
const sourceSheetsOf = (window) => [
  ...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}][data-handbook-source]`),
];

/** The footer of each source sheet, in page order. */
const sourceFootersOf = (window) =>
  sourceSheetsOf(window)
    .map((sheet) => sheet.querySelector('[data-handbook-footer]'))
    .filter((footer) => footer !== null);

async function run(sources, front) {
  const window = windowWithSources(sources, front);
  await window.eval(sheetAssignmentScript());
  return window;
}

describe('the injected sheet assignment', () => {
  it('marks every source page as a sheet, numbered in document order', async () => {
    const window = await run([
      { slug: 'dnd/character-creation', height: 700 },
      { slug: 'dnd/magic', height: 700 },
    ]);

    const marked = [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}]`)].map((element) =>
      element.getAttribute(SHEET_ATTRIBUTE)
    );

    // The number in the DOM is the answer to "where does this page end", and a
    // diff can review it. The two front sheets are sheets of the book too, so the
    // first source page is page 3 rather than page 1 - which is what lets the
    // contents quote 3 and be right.
    expect(marked).toEqual(['1', '2', '3', '4']);
  });

  // The cover and the contents are sheets of the book: they are numbered with the
  // rest, they count towards the page numbers in every footer, and the contents
  // can therefore quote a page number that is true rather than one it guessed.
  it('numbers the front matter with the rest of the book', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 700 }]);

    const numbers = [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}]`)].map((element) => ({
      number: element.getAttribute(SHEET_ATTRIBUTE),
      front: element.getAttribute('data-handbook-front'),
      source: element.getAttribute('data-handbook-source'),
    }));

    expect(numbers).toEqual([
      { number: '1', front: 'cover', source: null },
      { number: '2', front: 'contents', source: null },
      { number: '3', front: null, source: 'dnd/magic' },
    ]);
  });

  // Page numbers do not exist until layout has run, so the same pass that assigns
  // sheets fills the contents. A second render would be a second build of the
  // site, and two builds is two chances for the two to disagree.
  it('fills the contents with a row per source page and the page it starts on', async () => {
    const window = await run([
      { slug: 'dnd/character-creation', height: 700 },
      { slug: 'dnd/skills', height: 2400, blocks: [{ tag: 'p', text: 'a', width: 306 }, { tag: 'p', text: 'b', width: 306 }] },
    ]);

    const rows = [...window.document.querySelectorAll('[data-handbook-contents-list] li')].map((row) => [
      row.querySelector('span')?.textContent,
      row.querySelector('[data-handbook-contents-page]')?.textContent,
    ]);

    // Skills is two sheets, so it is one row at the page it starts on, and
    // 'Title of dnd/character-creation' is page 3 because two front sheets come
    // before it.
    expect(rows).toEqual([
      ['Title of dnd/character-creation', '3'],
      ['Title of dnd/skills', '4'],
    ]);
  });

  it('publishes the contents rows, so the command can report what the book lists', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 700 }]);

    expect(window[LAYOUT_GLOBAL].contents).toEqual([
      { slug: 'dnd/magic', title: 'Title of dnd/magic', page: 3, parts: 1 },
    ]);
  });

  // A cover with a page number on it is a page of the book that has nothing to
  // point back to; every other sheet carries its chapter, its section and its
  // number so a reader can say where they are.
  it('gives the cover no footer, and the contents one', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 700 }]);

    const footers = [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}]`)].map(
      (element) => element.querySelectorAll('[data-handbook-footer]').length
    );

    expect(footers).toEqual([0, 1, 1]);
  });

  // The contents is a list of the book, not a chapter of it: an entry that named
  // itself would be a book that cannot be opened.
  it('does not list the cover or the contents in the contents', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 700 }]);

    const titles = [...window.document.querySelectorAll('[data-handbook-contents-list] li span')].map(
      (element) => element.textContent
    );

    expect(titles).not.toContain('Cover');
    expect(titles).not.toContain('Contents');
  });

  it('publishes the sheet geometry it read from the print stylesheet', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(window.__handbookLayout).toMatchObject({ sheet: { width: 793.7, height: 1122.51 } });
  });

  // The page box is the sheet: paper to its edge, with the four margins as the
  // sheet's own padding rather than a page margin. The margins travel with it
  // because the text block and the capture footer are measured against them.
  it('publishes the page box and the margins the captures are taken at', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(window.__handbookLayout).toMatchObject({
      page: { width: 793.7, height: 1122.51, marginLeft: 94.49, marginTop: 94.49, marginRight: 56.69 },
    });
  });

  // The text block is the page box less the margins, which are the sheet
  // padding. It is what content is packed into; the page box is what a capture
  // is taken at, and the command reads this to size the viewport the screen
  // layout is measured at.
  it('publishes the text block the pages are packed into', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(window.__handbookLayout.text.width).toBeCloseTo(642.52, 2);
    expect(window.__handbookLayout.text.height).toBeCloseTo(971.33, 2);
  });

  it('publishes each source page by name with the height it measured', async () => {
    const window = await run([
      { slug: 'dnd/character-creation', height: 700 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    expect(
      window.__handbookLayout.sheets.filter((sheet) => sheet.kind === 'source')
    ).toMatchObject([
      { slug: 'dnd/character-creation', title: 'Title of dnd/character-creation', contentHeight: 700, pages: 1 },
      { slug: 'dnd/skills', title: 'Title of dnd/skills', contentHeight: 2400, pages: 3 },
    ]);
  });

  it('publishes under one global the command reads back', async () => {
    expect(LAYOUT_GLOBAL).toBe('__handbookLayout');
    expect(sheetAssignmentScript()).toContain(LAYOUT_GLOBAL);
  });

  // A missing page box is not a smaller sheet, it is no pagination at all, so
  // the script refuses rather than defaulting to a number it invented.
  it('refuses to assign sheets when the stylesheet declares no page box', async () => {
    const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
    window.document.body.appendChild(window.document.createElement('section'));

    await expect(window.eval(sheetAssignmentScript())).rejects.toThrow(/handbook-page-width/);
  });

  // The margins are the sheet's padding and the text block is the page box less
  // them, so without them there is no measure to pack content into.
  it('refuses to assign sheets when the stylesheet declares no page margin', async () => {
    const window = windowWithSources([{ slug: 'dnd/magic', height: 900 }]);
    window.document.documentElement.style.removeProperty('--handbook-page-margin-top');

    await expect(window.eval(sheetAssignmentScript())).rejects.toThrow(/handbook-page-margin/);
  });
});

describe('what spans both columns', () => {
  it('marks an element wider than the column', async () => {
    const window = await run([
      {
        slug: 'dnd/master-armor-table',
        height: 900,
        blocks: [
          { tag: 'p', width: 306 },
          { tag: 'table', width: 306, scrollWidth: 640 },
        ],
      },
    ]);

    const wide = [...window.document.querySelectorAll('[data-handbook-wide]')].map(
      (element) => element.tagName.toLowerCase()
    );

    expect(wide).toEqual(['table']);
  });

  // The house-rule pages contain two shapes of wide thing and this repository has
  // never had to classify either, so the decision is measured rather than matched
  // against a tag name.
  it('marks a scroll container whose own box fits and whose table does not', async () => {
    const window = await run([
      {
        slug: 'dnd/weapon-properties',
        height: 900,
        blocks: [{ tag: 'div', width: 306, scrollWidth: 812 }],
      },
    ]);

    expect(window.document.querySelectorAll('[data-handbook-wide]')).toHaveLength(1);
  });

  it('leaves everything that fits its column alone', async () => {
    const window = await run([
      {
        slug: 'dnd/magic',
        height: 900,
        blocks: [
          { tag: 'p', width: 306 },
          { tag: 'p', width: 306.5 },
          { tag: 'table', width: 300 },
        ],
      },
    ]);

    expect(window.document.querySelectorAll('[data-handbook-wide]')).toHaveLength(0);
  });

  it('measures against the column width the stylesheet declares, not its own', async () => {
    const window = windowWithSources([
      { slug: 'dnd/magic', height: 900, blocks: [{ tag: 'table', width: 500 }] },
    ]);
    window.document.documentElement.style.setProperty('--handbook-column-width', '600px');
    await window.eval(sheetAssignmentScript());

    // A second copy of the column width inside the script would be two numbers
    // that can disagree, and the disagreement would be a table clipped on a sheet
    // the run reported as correct.
    expect(window.document.querySelectorAll('[data-handbook-wide]')).toHaveLength(0);
  });
});

describe('the sheet footer', () => {
  // The cover is the outside of the book rather than a page of it, so the sheets
  // this file is about are the ones printed from a source page.
  const footerOf = (window, index = 0) => sourceFootersOf(window)[index];

  it('gives every sheet printed from a source page one', async () => {
    const window = await run([
      { slug: 'dnd/magic', height: 900 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    expect(sourceFootersOf(window)).toHaveLength(sourceSheetsOf(window).length);
    expect(sourceFootersOf(window).length).toBe(2);
  });

  it('names the source page on the left', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(footerOf(window).querySelector('[data-handbook-footer-source]').textContent).toBe(
      'Title of dnd/magic'
    );
  });

  // "Turn to twenty-two" needs the chapter and the part of the chapter, because
  // most of the eight source pages are several sections long.
  it('names the section the sheet starts in, beside the source page', async () => {
    const window = await run([
      {
        slug: 'dnd/skills',
        height: 900,
        blocks: [
          { tag: 'h2', width: 306, text: 'General Magic Rules' },
          { tag: 'h3', width: 306, text: 'Automatic Miss Limitations' },
        ],
      },
    ]);

    expect(footerOf(window).querySelector('[data-handbook-footer-section]').textContent).toBe(
      'General Magic Rules'
    );
  });

  it('says nothing about a section when the sheet has no headings of its own', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900, blocks: [{ tag: 'p', width: 306 }] }]);

    expect(footerOf(window).querySelector('[data-handbook-footer-section]').textContent).toBe('');
  });

  it('reads as a number of the whole book rather than a bare number', async () => {
    const window = await run([
      { slug: 'dnd/magic', height: 900 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    const numbers = sourceFootersOf(window).map((footer) =>
      footer.querySelector('[data-handbook-footer-page]').textContent
    );
    const total = window[LAYOUT_GLOBAL].sheets.length;

    // The total is the sheet count of the whole book, front matter included,
    // because the page number on a sheet of Skills has to agree with the page
    // number the contents quotes for it - and the contents quotes a page of the
    // book, not a page of the chapters.
    expect(numbers).toEqual(['3 of 4', '4 of 4']);
    expect(total).toBe(4);
  });

  // The footer is printed content, so its layout has to come from the stylesheet
  // rather than from inline styles the PDF would honour and the stylesheet could
  // not explain.
  it('is laid out by the stylesheet, not by inline styles', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(footerOf(window).getAttribute('style')).toBeNull();
  });

  it('takes the ornament from the one file the stylesheet names', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    const ornament = footerOf(window).querySelector('[data-handbook-footer-ornament]');

    expect(ornament.getAttribute('src')).toBe('/handbook/ornament.svg');
    // Decorative, and saying so is what keeps it out of the artifact's text.
    expect(ornament.getAttribute('alt')).toBe('');
  });

  it('refuses rather than print a footer with no ornament file behind it', async () => {
    const window = windowWithSources([{ slug: 'dnd/magic', height: 900 }]);
    window.document.documentElement.style.removeProperty('--handbook-ornament');

    await expect(window.eval(sheetAssignmentScript())).rejects.toThrow(/handbook-ornament/);
  });

  it('appends the footer after the content, so it is not inside the two-column measure', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(footerOf(window).parentElement.hasAttribute('data-handbook-flow')).toBe(false);
  });
});
