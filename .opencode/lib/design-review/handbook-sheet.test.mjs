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

/** A window with the print stylesheet's two custom properties set, and no layout. */
function windowWithSources(sources) {
  const window = new Window({ url: 'http://localhost:4321/handbook/print/' });
  const { document } = window;

  document.documentElement.style.setProperty('--handbook-sheet-width', '643px');
  document.documentElement.style.setProperty('--handbook-sheet-height', '972px');

  for (const source of sources) {
    const element = document.createElement('section');
    element.setAttribute('data-handbook-source', source.slug);
    element.setAttribute('data-handbook-title', `Title of ${source.slug}`);
    // happy-dom does no layout, so the box the script measures is stated here
    // rather than arrived at by rendering.
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: source.height, height: source.height, width: 643 }),
    });
    document.body.appendChild(element);
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
});