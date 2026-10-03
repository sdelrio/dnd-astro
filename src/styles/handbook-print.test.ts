import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The page geometry of the Handbook, asserted against the one stylesheet that
 * states it.
 *
 * ADR-0020 makes the sheet box the central mechanism: a page boundary is a
 * property of the DOM, so "where does this page end" has an answer a diff can
 * review. That only holds if the box is exactly the printable area, which is a
 * claim about four millimetre values and two pixel values agreeing - so it is
 * derived here rather than restated, because a test that repeats the number it
 * is checking cannot fail.
 */

const css = readFileSync(new URL('./handbook-print.css', import.meta.url), 'utf8');

/** Comments explain the numbers; they do not declare them, so they are stripped. */
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** CSS reference pixels per millimetre: 1in is 96px and 1in is 25.4mm. */
const PX_PER_MM = 96 / 25.4;

/**
 * The printable area in whole CSS pixels, rounded up.
 *
 * Up, not to nearest: a sheet one pixel short of the printable area clips the
 * last line of a rule, which is the failure this whole mechanism exists to
 * avoid. A sheet fractionally larger costs nothing, because the page margin
 * still trims it.
 */
function printablePx(millimetres: number): number {
  return Math.ceil(millimetres * PX_PER_MM);
}

function declaration(property: string): string {
  return declarations.match(new RegExp(`${property}:\\s*([^;]+);`))?.[1].trim() ?? '';
}

function millimetres(value: string): number {
  return Number(/^([\d.]+)mm$/.exec(value)?.[1]);
}

describe('handbook print stylesheet', () => {
  it('prints A4 portrait', () => {
    expect(declaration('size')).toBe('A4 portrait');
  });

  // 25mm top and left, 15mm right and bottom: the wider margin is the one a
  // reader turns past, so it is the top and the spine side.
  it('margins 25mm top and left and 15mm right and bottom', () => {
    expect(declaration('margin')).toBe('25mm 15mm 15mm 25mm');
  });

  it('makes the sheet box the exact size of the printable area', () => {
    // 210mm and 297mm are A4's long and short edges; the margins above are what
    // is left of them once the page is trimmed.
    const printableWidthMm = 210 - 25 - 15;
    const printableHeightMm = 297 - 25 - 15;

    expect({
      width: declaration('--handbook-sheet-width'),
      height: declaration('--handbook-sheet-height'),
    }).toEqual({
      width: `${printablePx(printableWidthMm)}px`,
      height: `${printablePx(printableHeightMm)}px`,
    });
  });

  it('keeps the sheet box at the size ADR-0020 states', () => {
    // The ADR is the document a later ticket inherits the numbers from, so the
    // stylesheet and the ADR are asserted to agree rather than left to drift.
    expect({
      width: declaration('--handbook-sheet-width'),
      height: declaration('--handbook-sheet-height'),
    }).toEqual({ width: '643px', height: '972px' });
  });

  it('gives every sheet the printable height and a break after it', () => {
    const sheet = declarations.match(/\[data-handbook-sheet\]\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(sheet).toContain('min-height: var(--handbook-sheet-height);');
    expect(sheet).toContain('break-after: page;');
  });

  // The measured reason for `min-height`, asserted so the rule cannot drift
  // back: a fixed height does not paginate its own overflow, so the next sheet's
  // box is placed at the end of this one's border box and prints inside this
  // one's spill. A two-sheet fixture printed sheet two's heading between sheet
  // one's paragraph 43 and its paragraph 44.
  it('does not fix the sheet height, which corrupts the sheet after an overflow', () => {
    const sheet = declarations.match(/\[data-handbook-sheet\]\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(sheet).not.toMatch(/(^|[;\s])height:/);
  });

  // A forced break after the last sheet paginates to a blank page at the end of
  // the document, and a Handbook with a blank final page is a defect a reader
  // finds before a reviewer does.
  it('does not break after the last sheet', () => {
    expect(declarations).toMatch(/\[data-handbook-sheet\]:last-of-type\s*\{[^}]*break-after:\s*auto;/);
  });

  // The document is printed under emulated screen media, which is the whole of
  // ADR-0020's decision, and it is also what stops the dev toolbar's own
  // `@media print` rule from applying.
  it('hides the dev toolbar, whose own print rule does not apply here', () => {
    expect(declarations).toMatch(/astro-dev-toolbar\s*\{[^}]*display:\s*none\s*!important;/);
  });

  it('hides the heading anchor links, which paper cannot reach', () => {
    // Starlight hides them until hover on the website. There is no hover on a
    // sheet, so an anchor that is only invisible until touched would print as a
    // chain icon after every heading in the book.
    expect(declarations).toMatch(/\.sl-anchor-link\s*\{[^}]*display:\s*none;/);
  });

  it('lays the sheets out in one column at the sheet width', () => {
    // The sheet box is the measure. A body wider than the printable area would
    // paginate at a width the page does not have.
    const body = declarations.match(/\bbody\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(body).toContain('width: var(--handbook-sheet-width);');
  });
});

describe('the geometry is stated once', () => {
  it('declares the sheet box only as the two custom properties', () => {
    // A second copy of the sheet size anywhere else in the stylesheet is two
    // numbers that can disagree, which is the same class of lie as a capture at
    // the wrong width.
    const withoutTheBox = declarations.replace(
      /--handbook-sheet-(width|height):\s*[^;]+;/g,
      'declared-elsewhere'
    );

    expect([...withoutTheBox.matchAll(/(\d+(?:\.\d+)?(?:px|em|rem))/g)].map(([, value]) => value)).toEqual(
      []
    );
  });

  it('states the page geometry in millimetres only once', () => {
    expect([...declarations.matchAll(/(\d+)mm/g)].map(([, value]) => value)).toEqual(['25', '15', '15', '25']);
  });
});

describe('the printable area really is what the millimetres say', () => {
  it('is 643 by 972 CSS px at the CSS reference resolution', () => {
    // Written out longhand rather than through the declarations above, so the
    // helper that reads the stylesheet is not what proves the arithmetic.
    expect([printablePx(170), printablePx(257)]).toEqual([643, 972]);
  });

  it('agrees with the margin declaration the stylesheet actually carries', () => {
    const [top, right, bottom, left] = declaration('margin').split(/\s+/).map(millimetres);

    expect({
      width: printablePx(210 - left - right),
      height: printablePx(297 - top - bottom),
    }).toEqual({ width: 643, height: 972 });
  });
});