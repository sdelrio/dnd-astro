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
  return element;
}

/** A window with the print stylesheet's custom properties set, and no layout. */
function windowWithSources(sources) {
  const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
  const { document } = window;

  document.documentElement.style.setProperty('--handbook-sheet-width', '643px');
  document.documentElement.style.setProperty('--handbook-sheet-height', '972px');
  document.documentElement.style.setProperty('--handbook-page-width', '794px');
  document.documentElement.style.setProperty('--handbook-page-height', '1123px');
  document.documentElement.style.setProperty('--handbook-page-margin-top', '94.49px');
  document.documentElement.style.setProperty('--handbook-page-margin-right', '56.69px');
  document.documentElement.style.setProperty('--handbook-page-margin-bottom', '56.69px');
  document.documentElement.style.setProperty('--handbook-page-margin-left', '94.49px');
  document.documentElement.style.setProperty('--handbook-column-width', '306px');
  document.documentElement.style.setProperty('--handbook-ornament', 'url("/handbook/ornament.svg")');

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

async function run(sources) {
  const window = windowWithSources(sources);
  await window.eval(sheetAssignmentScript());
  return window;
}

describe('the injected sheet assignment', () => {
  it('marks every source page as a sheet, numbered in document order', async () => {
    const window = await run([
      { slug: 'dnd/character-creation', height: 700 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    const marked = [...window.document.querySelectorAll(`[${SHEET_ATTRIBUTE}]`)].map((element) =>
      element.getAttribute(SHEET_ATTRIBUTE)
    );

    // The number in the DOM is the answer to "where does this page end", and a
    // diff can review it.
    expect(marked).toEqual(['1', '2']);
  });

  it('publishes the sheet geometry it read from the print stylesheet', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(window.__handbookLayout).toMatchObject({ sheet: { width: 643, height: 972 } });
  });

  // The page box is a different pair of numbers from the sheet box, and it is
  // what a capture is taken at: a reader holds a page, margins and all. The
  // margins travel with it because the capture has to know where the page box
  // places the sheet inside the page.
  it('publishes the page box and the margins the captures are taken at', async () => {
    const window = await run([{ slug: 'dnd/magic', height: 900 }]);

    expect(window.__handbookLayout).toMatchObject({
      page: { width: 794, height: 1123, marginLeft: 94.49, marginTop: 94.49, marginRight: 56.69 },
    });
  });

  it('publishes each source page by name with the height it measured', async () => {
    const window = await run([
      { slug: 'dnd/character-creation', height: 700 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    expect(window.__handbookLayout).toMatchObject({
      sheets: [
        { slug: 'dnd/character-creation', title: 'Title of dnd/character-creation', contentHeight: 700, pages: 1 },
        { slug: 'dnd/skills', title: 'Title of dnd/skills', contentHeight: 2400, pages: 3 },
      ],
    });
  });

  it('publishes under one global the command reads back', async () => {
    expect(LAYOUT_GLOBAL).toBe('__handbookLayout');
    expect(sheetAssignmentScript()).toContain(LAYOUT_GLOBAL);
  });

  // A missing sheet box is not a smaller sheet, it is no pagination at all, so
  // the script refuses rather than defaulting to a number it invented.
  it('refuses to assign sheets when the stylesheet declares no sheet box', async () => {
    const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
    window.document.body.appendChild(window.document.createElement('section'));

    await expect(window.eval(sheetAssignmentScript())).rejects.toThrow(/handbook-sheet-height/);
  });

  // The same argument for the page box, and a different failure: without it every
  // capture is written at the wrong size, which the read-back would catch and
  // which would otherwise cost a full run to discover.
  it('refuses to assign sheets when the stylesheet declares no page box', async () => {
    const window = windowWithSources([{ slug: 'dnd/magic', height: 900 }]);
    window.document.documentElement.style.removeProperty('--handbook-page-width');

    await expect(window.eval(sheetAssignmentScript())).rejects.toThrow(/handbook-page-width/);
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
  const footerOf = (window, index = 0) =>
    window.document.querySelectorAll('[data-handbook-footer]')[index];

  it('gives every sheet one', async () => {
    const window = await run([
      { slug: 'dnd/magic', height: 900 },
      { slug: 'dnd/skills', height: 2400 },
    ]);

    expect(window.document.querySelectorAll('[data-handbook-footer]')).toHaveLength(2);
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

    const numbers = [...window.document.querySelectorAll('[data-handbook-footer-page]')].map(
      (element) => element.textContent
    );

    // The total is the sheet count, which is known the moment every source page
    // has been counted - the thing the format needs is free once the run knows
    // how many sheets it printed.
    expect(numbers).toEqual(['1 of 2', '2 of 2']);
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
