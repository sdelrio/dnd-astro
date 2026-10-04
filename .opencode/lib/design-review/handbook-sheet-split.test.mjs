import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { LAYOUT_GLOBAL, SHEET_ATTRIBUTE, sheetAssignmentScript } from './handbook-sheet.mjs';

/**
 * Splitting a source page that does not fit a sheet.
 *
 * happy-dom does no layout, so these tests bring one: a model where the blocks of
 * a flow stack, which is the model the splitting decision is made in. That is a
 * deliberate limit and not a claim about the browser. What is verified here is
 * *which sheet a block lands on* and *what the run reports about it*, and a
 * browser that lays the blocks out differently is caught by the re-measure pass
 * inside the assignment itself rather than by anything in this file.
 *
 * The declaration of a block is its occupied height: margins included, because
 * that is the space it takes in a column and the number the planner adds up.
 */

/** The page geometry the print stylesheet declares, and the text block it leaves. */
const PAGE = {
  width: 793.7,
  height: 1122.51,
  marginTop: 94.49,
  marginRight: 56.69,
  marginBottom: 56.69,
  marginLeft: 94.49,
};
const SHEET = {
  width: PAGE.width - PAGE.marginLeft - PAGE.marginRight,
  height: PAGE.height - PAGE.marginTop - PAGE.marginBottom,
};

/** Stack the blocks of a flow, the way a layout would, and report every box. */
function layoutEngine(window, declared) {
  const sheets = [...window.document.querySelectorAll('[data-handbook-source]')];

  const isFurniture = (element) => element.hasAttribute('data-handbook-footer');

  const occupied = (element) => {
    const children = [...element.children].filter((child) => !isFurniture(child));
    if (children.length === 0) return declared.get(element) ?? 20;

    const stack = children.reduce((total, child) => total + occupied(child), 0);
    // The footer prints in the bottom margin band rather than in the flow, so the
    // flow reserves no space for it.
    return stack;
  };

  const topOf = (element) => {
    const parent = element.parentElement;
    if (!parent || !sheets.includes(parent.closest('[data-handbook-source]'))) return 0;

    const before = [...parent.children].filter((child) => !isFurniture(child) && child !== element);
    const stack = before.reduce((total, child) => total + occupied(child), 0);

    return topOf(parent) + stack;
  };

  const box = (element) => {
    const height = occupied(element);
    const top = topOf(element);
    const width = declared.get(`${element}:width`) ?? (element.hasAttribute('data-handbook-wide') ? 643 : 306);

    // A declared `rectHeight` is the browser misreporting a block's height as
    // the column's, which is the defect the measurement tests are about.
    const rectHeight = declared.get(`${element}:rectHeight`) ?? height;

    return { top, bottom: top + rectHeight, height: rectHeight, width, left: 0, right: width };
  };

  for (const element of window.document.querySelectorAll('*')) {
    Object.defineProperty(element, 'getBoundingClientRect', { value: () => box(element), configurable: true });
    Object.defineProperty(element, 'scrollWidth', {
      get: () => declared.get(`${element}:scrollWidth`) ?? box(element).width,
      configurable: true,
    });
    // The browser's own content height, which is what a block's height is read
    // from: Chrome reports the column's height rather than the block's own for
    // some blocks laid out inside a multicolumn, and the client height does not,
    // so it is modelled separately and a test can declare the two disagreeing.
    Object.defineProperty(element, 'clientHeight', {
      get: () => declared.get(`${element}:clientHeight`) ?? box(element).height,
      configurable: true,
    });
    Object.defineProperty(element, 'clientWidth', {
      get: () => declared.get(`${element}:clientWidth`) ?? box(element).width,
      configurable: true,
    });
  }
}

/**
 * Build a document of source pages and lay them out.
 *
 * A block is `{ tag, h, text, wide, kids }`: `h` is its occupied height, `wide`
 * marks it as wider than its column, and `kids` makes it a container whose height
 * is the sum of theirs.
 */
async function run(pages) {
  const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
  const { document } = window;
  const declared = new Map();

  document.documentElement.style.setProperty('--handbook-page-width', `${PAGE.width}px`);
  document.documentElement.style.setProperty('--handbook-page-height', `${PAGE.height}px`);
  document.documentElement.style.setProperty('--handbook-page-margin-top', `${PAGE.marginTop}px`);
  document.documentElement.style.setProperty('--handbook-page-margin-right', `${PAGE.marginRight}px`);
  document.documentElement.style.setProperty('--handbook-page-margin-bottom', `${PAGE.marginBottom}px`);
  document.documentElement.style.setProperty('--handbook-page-margin-left', `${PAGE.marginLeft}px`);
  document.documentElement.style.setProperty('--handbook-column-width', '306px');
  document.documentElement.style.setProperty('--handbook-ornament', 'url("/handbook/ornament.svg")');

  const build = (block) => {
    const element = document.createElement(block.tag);
    element.textContent = block.text ?? '';
    declared.set(element, block.h);
    if (block.wide) declared.set(`${element}:width`, 640);
    if (block.rectHeight !== undefined) declared.set(`${element}:rectHeight`, block.rectHeight);
    if (block.clientHeight !== undefined) declared.set(`${element}:clientHeight`, block.clientHeight);

    for (const child of block.kids ?? []) element.appendChild(build(child));

    return element;
  };

  for (const page of pages) {
    const section = document.createElement('section');
    section.setAttribute('data-handbook-source', page.slug);
    section.setAttribute('data-handbook-title', `Title of ${page.slug}`);
    if (page.columns !== undefined) section.setAttribute('data-handbook-columns', String(page.columns));

    const heading = document.createElement('h1');
    heading.textContent = `Title of ${page.slug}`;
    declared.set(heading, 42);
    section.appendChild(heading);

    const flow = document.createElement('div');
    flow.setAttribute('data-handbook-flow', '');
    for (const block of page.blocks) flow.appendChild(build(block));
    section.appendChild(flow);

    document.body.appendChild(section);
  }

  // The layout is installed after the DOM is built and re-read on every query, so
  // a sheet the assignment splits is measured again as the split document.
  layoutEngine(window, declared);

  await window.eval(sheetAssignmentScript());

  return window;
}

const layoutOf = (window) => window[LAYOUT_GLOBAL];
const sheetsOf = (window) => layoutOf(window).sheets;
const textOf = (window) => window.document.body.textContent;

/** The text of every sheet in order, which is what the artifact prints. */
function sheetTexts(window) {
  return [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}] [data-handbook-flow]`)].map((flow) =>
    flow.textContent.trim()
  );
}

describe('a source page that fits', () => {
  it('stays one sheet, with no split to report', async () => {
    const window = await run([{ slug: 'dnd/magic', blocks: [{ tag: 'p', h: 300 }, { tag: 'p', h: 300 }] }]);

    expect(sheetsOf(window)).toHaveLength(1);
    expect(sheetsOf(window)[0]).toMatchObject({ source: 'dnd/magic', part: 1, parts: 1, pages: 1 });
    expect(sheetsOf(window).flatMap((sheet) => sheet.splits ?? [])).toEqual([]);
  });
});

describe('a source page that does not fit', () => {
  // Three 400px blocks in two 900px columns: two fit, the third cannot, and the
  // break falls at the nearest block boundary rather than through one.
  const tall = () => [{ slug: 'dnd/skills', blocks: [{ tag: 'p', h: 400 }, { tag: 'p', h: 400 }, { tag: 'p', h: 400 }] }];

  it('is split into sheets that each fit one page', async () => {
    const window = await run(tall());

    expect(sheetsOf(window).map((sheet) => sheet.pages)).toEqual([1, 1]);
    expect(sheetsOf(window).map((sheet) => sheet.number)).toEqual([1, 2]);
  });

  it('names every split it made, by the block the new sheet starts with', async () => {
    const window = await run([
      { slug: 'dnd/skills', blocks: [{ tag: 'h2', h: 400, text: 'Dash' }, { tag: 'p', h: 400 }, { tag: 'p', h: 400 }] },
    ]);

    expect(layoutOf(window).splits).toEqual([
      { source: 'dnd/skills', sheet: 2, kind: 'p', label: 'p' },
    ]);
  });

  // The content is moved, not copied and not dropped. A split that lost a rule
  // would be a shorter book with nothing saying so.
  it('keeps every block, once, in the order the author wrote it', async () => {
    const window = await run([
      {
        slug: 'dnd/skills',
        blocks: [
          { tag: 'h2', h: 400, text: 'one' },
          { tag: 'p', h: 400, text: 'two' },
          { tag: 'h2', h: 400, text: 'three' },
          { tag: 'p', h: 400, text: 'four' },
        ],
      },
    ]);

    expect(sheetTexts(window).map((text) => text.replace(/\s+/g, ''))).toEqual(['onetwo', 'threefour']);
    expect(textOf(window)).toContain('Title of dnd/skills');
  });

  it('numbers the parts of one source page, so a reader can tell them apart', async () => {
    const window = await run(tall());

    expect(sheetsOf(window).map((sheet) => [sheet.part, sheet.parts])).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  // The title is page furniture for the chapter, not for the continuation: a
  // repeated `h1` on every sheet of a chapter would put it in the artifact's
  // outline once per page.
  it('heads only the first sheet of a source page with its title', async () => {
    const window = await run(tall());

    expect(sheetsOf(window).map((sheet) => sheet.number)).toEqual([1, 2]);
    expect(window.document.querySelectorAll('[data-handbook-source="dnd/skills"] h1')).toHaveLength(1);
  });

  // The footer names the section a sheet starts in, which for a continuation is
  // the section the split fell at. That is what a reader turning to the page needs.
  it('names the section each sheet starts in', async () => {
    const window = await run([
      {
        slug: 'dnd/skills',
        blocks: [
          { tag: 'h2', h: 400, text: 'Dash' },
          { tag: 'p', h: 400, text: 'body' },
          { tag: 'h2', h: 400, text: 'Long Rest' },
          { tag: 'p', h: 400, text: 'more' },
        ],
      },
    ]);

    expect(sheetsOf(window).map((sheet) => sheet.section)).toEqual(['Dash', 'Long Rest']);
  });

  it('counts every sheet in the page numbers the footers print', async () => {
    const window = await run(tall());

    const numbers = [...window.document.querySelectorAll('[data-handbook-footer-page]')].map(
      (element) => element.textContent
    );

    expect(numbers).toEqual(['1 of 2', '2 of 2']);
  });

  it('splits until every sheet fits, rather than once and hoping', async () => {
    // Six 300px blocks over two sheets of three: the text block is 971.33px, so
    // three blocks fill a column and a single pass that split at one boundary
    // would leave the last sheet too tall.
    const window = await run([
      { slug: 'dnd/skills', blocks: Array.from({ length: 6 }, (_, index) => ({ tag: 'p', h: 300, text: `b${index}` })) },
    ]);

    expect(sheetsOf(window).map((sheet) => sheet.pages)).toEqual([1, 1]);
    expect(sheetTexts(window).map((text) => text.replace(/\s+/g, ''))).toEqual(['b0b1b2', 'b3b4b5']);
  });

  it('keeps two source pages apart, and starts the second on a fresh sheet', async () => {
    const window = await run([
      { slug: 'dnd/magic', blocks: [{ tag: 'p', h: 300 }] },
      { slug: 'dnd/skills', blocks: [{ tag: 'p', h: 300 }, { tag: 'p', h: 300 }, { tag: 'p', h: 400 }] },
    ]);

    expect(sheetsOf(window).map((sheet) => sheet.source)).toEqual(['dnd/magic', 'dnd/skills', 'dnd/skills']);
    expect(sheetsOf(window).map((sheet) => sheet.number)).toEqual([1, 2, 3]);
  });
});

describe('a block too tall for any sheet', () => {
  // A paragraph with no block boundary inside it. There is nowhere to break it
  // without cutting a sentence in half, so it spans its pages and is reported.
  const paragraph = () => [
    { slug: 'dnd/skills', blocks: [{ tag: 'p', h: 300, text: 'before' }, { tag: 'p', h: 1400, text: 'long' }] },
  ];

  it('is never clipped, and never silently broken', async () => {
    const window = await run(paragraph());

    expect(textOf(window)).toContain('long');
    expect(sheetTexts(window).map((text) => text.replace(/\s+/g, ''))).toEqual(['before', 'long']);
  });

  it('is reported by name, so the author can fix it', async () => {
    const window = await run(paragraph());

    expect(layoutOf(window).splits).toEqual([
      { source: 'dnd/skills', sheet: 2, kind: 'p', label: 'p at "long"', oversized: true, height: 1400 },
    ]);
  });

  it('gets a sheet of its own, with nothing packed beside it', async () => {
    const window = await run(paragraph());

    expect(sheetsOf(window).map((sheet) => sheet.number)).toEqual([1, 2]);
    expect(sheetsOf(window).map((sheet) => sheet.pages)).toEqual([1, 2]);
  });
});

describe('a wide table that does not fit', () => {
  // The weapon-properties shape: one wide table of rows, taller than a sheet,
  // with no block boundary above the rows.
  const table = (rows) => ({
    slug: 'dnd/weapon-properties',
    blocks: [
      {
        tag: 'table',
        wide: true,
        kids: [
          { tag: 'thead', kids: [{ tag: 'tr', h: 40, text: 'Weapon' }] },
          { tag: 'tbody', kids: rows.map((h, index) => ({ tag: 'tr', h, text: `row ${index + 1}` })) },
        ],
      },
    ],
  });

  it('is split at a row rather than at a page', async () => {
    const window = await run([table([300, 300, 300, 300])]);

    const sheets = sheetsOf(window);
    expect(sheets.length).toBeGreaterThan(1);
    expect(sheets.every((sheet) => sheet.pages === 1)).toBe(true);
  });

  // A continuation of a table with no header row is a table of numbers, and the
  // header is repeated precisely so that it is not.
  it('repeats the header row on the sheet it continues onto', async () => {
    const window = await run([table([300, 300, 300, 300])]);
    const flows = [...window.document.querySelectorAll('[data-handbook-flow]')];

    expect(flows.length).toBeGreaterThan(1);
    for (const flow of flows) {
      expect(flow.querySelectorAll('thead tr').length).toBe(1);
    }
  });

  it('loses no row', async () => {
    const window = await run([table([300, 300, 300, 300])]);

    expect([...window.document.querySelectorAll('tbody tr')].map((row) => row.textContent)).toEqual([
      'row 1',
      'row 2',
      'row 3',
      'row 4',
    ]);
  });
});

describe('a break the author wrote', () => {
  it('starts a new sheet and is not reported as a split', async () => {
    const window = await run([
      { slug: 'dnd/injuries', blocks: [{ tag: 'p', h: 300 }, { tag: 'hr', h: 20 }, { tag: 'p', h: 300 }] },
    ]);

    expect(sheetsOf(window).map((sheet) => sheet.part)).toEqual([1, 2]);
    expect(layoutOf(window).splits).toEqual([]);
  });

  // This is the convergence the ticket is for: the authored break at the point the
  // generator would have broken means there is nothing left to report.
  it('replaces the automatic break it was placed at', async () => {
    const window = await run([
      {
        slug: 'dnd/skills',
        blocks: [
          { tag: 'p', h: 400 },
          { tag: 'p', h: 400 },
          { tag: 'hr', h: 20 },
          { tag: 'p', h: 400 },
          { tag: 'p', h: 400 },
        ],
      },
    ]);

    expect(layoutOf(window).splits).toEqual([]);
  });
});

describe('measuring a block inside a two-column sheet', () => {
  // Chrome reports a block's border-box rect as the height of the column it is
  // laid out in for some in-column blocks, not the block's own height. Measured
  // in the book: a 56px paragraph in `dnd/skills` measured 1557px, which is
  // taller than a sheet, so the run broke a sheet that had room for it and
  // reported a boundary no author had written and no reader could find.
  //
  // `clientHeight` is the block's own padding box and stays the block's own
  // height in that position, so it is what the assignment reads.
  const columns = (rectHeight, clientHeight, blocks) => [
    {
      slug: 'dnd/skills',
      blocks: blocks.map((block) => ({ ...block, rectHeight, clientHeight })),
    },
  ];

  it('measures a block by its own height, not by the column it sits in', async () => {
    const window = await run(columns(1557, 56, [{ tag: 'p', text: 'short' }]));

    expect(sheetsOf(window).map((sheet) => sheet.pages)).toEqual([1]);
    expect(layoutOf(window).splits).toEqual([]);
  });

  // The same page measured honestly: two 400px paragraphs and a rule fit one
  // sheet, so a measurement that reports the column height splits it.
  it('keeps content on one sheet when the column is taller than the content', async () => {
    const window = await run(columns(1557, 400, [{ tag: 'p', text: 'a' }, { tag: 'p', text: 'b' }]));

    expect(sheetsOf(window)).toHaveLength(1);
    expect(layoutOf(window).splits).toEqual([]);
  });

  // And a block that really is taller than a sheet is still reported, so the fix
  // is not a way to stop hearing about the content that does not fit.
  it('still reports a block taller than a sheet when its own height says so', async () => {
    const window = await run(columns(1557, 1400, [{ tag: 'p', text: 'long' }]));

    expect(layoutOf(window).splits).toEqual([
      { source: 'dnd/skills', sheet: 1, kind: 'p', label: 'p at "long"', oversized: true, height: 1400 },
    ]);
  });
});

describe('what the assignment publishes', () => {
  it('gives every sheet the text it prints, for the manifest to hash', async () => {
    const window = await run([{ slug: 'dnd/magic', blocks: [{ tag: 'p', h: 300, text: 'a spell' }] }]);

    expect(sheetsOf(window)[0].text).toContain('a spell');
  });

  it('numbers the sheets in document order', async () => {
    const window = await run([
      { slug: 'dnd/magic', blocks: [{ tag: 'p', h: 300 }, { tag: 'p', h: 400 }, { tag: 'p', h: 300 }] },
    ]);

    const marked = [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}]`)].map((element) =>
      element.getAttribute(SHEET_ATTRIBUTE)
    );

    expect(marked).toEqual(['1', '2']);
    expect(sheetsOf(window).map((sheet) => sheet.number)).toEqual([1, 2]);
  });

  // The command clips each capture to a page box and reads the size back out of
  // the PNG, so a sheet that still spans two pages is a sheet whose second page is
  // not in the evidence at all.
  it('leaves no sheet spanning more than one page unless a block could not fit', async () => {
    const window = await run([
      {
        slug: 'dnd/skills',
        blocks: [{ tag: 'p', h: 400 }, { tag: 'p', h: 400 }, { tag: 'p', h: 400 }, { tag: 'p', h: 400 }],
      },
    ]);

    expect(sheetsOf(window).map((sheet) => sheet.pages)).toEqual([1, 1]);
  });
});
