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
  // The boundary matters: an unanchored `size` also matches `background-size`,
  // and `height` also matches `--handbook-page-height`.
  return declarations.match(new RegExp(`(?<![-\\w])${property}:\\s*([^;]+);`))?.[1].trim() ?? '';
}

function millimetres(value: string): number {
  return Number(/^([\d.]+)mm$/.exec(value)?.[1]);
}

/** A declared length in pixels, as a number. */
function pixels(property: string): number {
  return Number(/^([\d.]+)px$/.exec(declaration(property))?.[1]);
}

/**
 * Every rule the stylesheet gives a selector, joined.
 *
 * Joined rather than first-match because two rules for the same selector are a
 * normal thing to write - the root carries the geometry in one block and the
 * paper in another - and a helper that read only the first would be asserting
 * against half the stylesheet.
 */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = escaped.replace(/'/g, '["\']');

  return [...declarations.matchAll(new RegExp(`(?:${quoted})\\s*\\{([^}]*)\\}`, 'g'))]
    .map(([, body]) => body)
    .join('\n');
}

describe('the page box a sheet is captured at', () => {
  // A sheet is printed on a page, and the thing a reader holds is the page: its
  // margins are part of it. So the capture is the page box, not the sheet box,
  // and the two are different numbers - 794 x 1123 against 643 x 972 - which is
  // exactly why both have to be stated.
  it('is A4 at the CSS reference resolution, rounded up', () => {
    expect({
      width: declaration('--handbook-page-width'),
      height: declaration('--handbook-page-height'),
    }).toEqual({ width: `${printablePx(210)}px`, height: `${printablePx(297)}px` });
  });

  it('carries the same margins the @page rule declares', () => {
    // Derived from the millimetres rather than restated, because the @page rule
    // is what the printer actually honours and a second copy of the margins in
    // pixels is two numbers that can disagree.
    const [top, right, bottom, left] = declaration('margin').split(/\s+/).map(millimetres);

    expect({
      top: declaration('--handbook-page-margin-top'),
      right: declaration('--handbook-page-margin-right'),
      bottom: declaration('--handbook-page-margin-bottom'),
      left: declaration('--handbook-page-margin-left'),
    }).toEqual({
      top: `${(top * PX_PER_MM).toFixed(2)}px`,
      right: `${(right * PX_PER_MM).toFixed(2)}px`,
      bottom: `${(bottom * PX_PER_MM).toFixed(2)}px`,
      left: `${(left * PX_PER_MM).toFixed(2)}px`,
    });
  });

  // The one relationship that ties the two boxes together: the printable area
  // is the page box less the margins, and it is the sheet box.
  it('is the sheet box plus exactly those margins', () => {
    // The relationship is asserted through the same rounding the boxes are
    // declared with: the margins are stated to two decimals of a pixel and the
    // sheet box is the printable area rounded up, so the page box less the
    // margins has to land inside the sheet box rather than exactly on it.
    const pageWidth =
      pixels('--handbook-page-width') -
      pixels('--handbook-page-margin-left') -
      pixels('--handbook-page-margin-right');
    const pageHeight =
      pixels('--handbook-page-height') -
      pixels('--handbook-page-margin-top') -
      pixels('--handbook-page-margin-bottom');

    expect(Math.ceil(pageWidth)).toBe(pixels('--handbook-sheet-width'));
    expect(Math.ceil(pageHeight)).toBe(pixels('--handbook-sheet-height'));
  });
});

describe('the two-column sheet', () => {
  // Two 306px columns and a 30px gutter, stated by ADR-0020 and inherited here.
  it('is two 306px columns with a 30px gutter, as ADR-0020 states', () => {
    expect({
      columns: declaration('--handbook-columns'),
      width: declaration('--handbook-column-width'),
      gap: declaration('--handbook-column-gap'),
    }).toEqual({ columns: '2', width: '306px', gap: '30px' });
  });

  // 306 x 2 + 30 is 642, one pixel inside the 643px sheet box. That spare pixel
  // is why the columns are declared as a width rather than derived: Chrome's
  // own column arithmetic hands back 306.5, and the tolerance the overflow check
  // allows exists to absorb exactly that.
  it('fills the sheet box without exceeding it', () => {
    const columns = Number(declaration('--handbook-columns'));
    const filled = pixels('--handbook-column-width') * columns + pixels('--handbook-column-gap');

    expect(filled).toBeLessThanOrEqual(pixels('--handbook-sheet-width'));
    expect(pixels('--handbook-sheet-width') - filled).toBeLessThanOrEqual(2);
  });

  it('fills the flow box with the declared columns', () => {
    expect(rule('[data-handbook-flow]')).toContain('column-count: var(--handbook-columns);');
    expect(rule('[data-handbook-flow]')).toContain('column-gap: var(--handbook-column-gap);');
  });

  // A single 643px measure at 16px body text is a very long line for a page read
  // at a table, which is the whole reason for the columns. The opt-out exists for
  // the page where the long line is the lesser problem.
  it('lets a page opt out to a single column', () => {
    expect(rule('[data-handbook-columns="1"] [data-handbook-flow]')).toContain('column-count: 1;');
  });

  it('spans an element that is wider than its column across both columns', () => {
    // Marked by the command from what it measured, not by a rule that guesses
    // which kinds of element need it: the house-rule pages contain two shapes of
    // wide thing, a wide table and a scroll container holding one.
    expect(rule('[data-handbook-wide]')).toContain('column-span: all;');
  });
});

describe('the sheet footer', () => {
  it('is pinned to the foot of the sheet rather than flowing after the content', () => {
    // Absolute, so a sheet whose content fits leaves the footer at the bottom of
    // the page instead of halfway up it, and a sheet that overflows still ends
    // with its own footer rather than with the last rule it printed.
    expect(rule('[data-handbook-sheet]')).toContain('position: relative;');
    expect(rule('[data-handbook-footer]')).toContain('position: absolute;');
    expect(rule('[data-handbook-footer]')).toContain('bottom: 0;');
  });

  it('puts the source page and section on the left and the page number on the right', () => {
    // Three tracks: the left pair, the ornament in the centre, the number on the
    // right. Equal outer tracks are what put the ornament on the centre line
    // rather than wherever the left text happens to end.
    expect(rule('[data-handbook-footer]')).toContain('grid-template-columns: 1fr auto 1fr;');
    expect(rule('[data-handbook-footer-page]')).toContain('text-align: right;');
  });

  it('sets the page number in tabular figures so a column of them lines up', () => {
    expect(rule('[data-handbook-footer-page]')).toContain('font-variant-numeric: tabular-nums;');
  });

  it('leaves room for the footer, so the last rule of a page is not under it', () => {
    expect(rule('[data-handbook-flow]')).toContain(
      `padding-bottom: var(--handbook-footer-reserve);`
    );
  });

  it('takes its ornament from the one committed file, not from a second drawing', () => {
    expect(declaration('--handbook-ornament')).toBe("url('/handbook/ornament.svg')");
  });
});

describe('the parchment the sheet is printed on', () => {
  it('paints one committed file, tiled, rather than a gradient or a colour', () => {
    // Swappable by replacing that one file. A gradient painted in CSS would put
    // the paper's design in the stylesheet, which is the thing the file exists
    // to keep out of it.
    expect(declaration('--handbook-paper-image')).toBe("url('/handbook/parchment.png')");
    expect(rule(':root')).toContain('background-repeat: repeat;');
  });

  it('paints the paper behind the whole page rather than behind the measure', () => {
    // The root element's background covers the page box, margins included, which
    // is what a sheet of paper is. On the body it would stop at the 643px
    // measure and leave white down both sides of every page.
    expect(rule(':root')).toContain('background-image: var(--handbook-paper-image);');
  });

  it('leaves the sheet itself unpainted, so the paper is what a sheet is printed on', () => {
    // Starlight's reset paints the documentation background behind the body.
    // On the website that is right; on a sheet it is a white rectangle in the
    // middle of the paper, and it covers the printable area exactly, so the
    // committed parchment underneath would show only as a border. Measured: the
    // white ran from 94px to 737px across and the full 972px of the sheet down.
    expect(rule('body')).toContain('background-color: transparent;');
  });


  it('names the paper colour beside the image, so the file can be any size', () => {
    // Tiled at its natural size: `auto` rather than a declared length, because a
    // replacement file of different dimensions has to work without a code change.
    expect(rule(':root')).toContain('background-size: auto;');

    // The palette's parchment step *lifted*, the same move `--color-gray-400`
    // records: at #d4c4a8 the muted text step #605552 measures 4.20:1, so paper
    // is a surface and needs a surface's contrast, not a text colour's.
    //
    // Asserted as a literal here rather than imported from the generator, so the
    // stylesheet test does not depend on the artwork tooling. The other direction
    // is asserted where it belongs, in `handbook-art.test.mjs`, which reads this
    // value out of this file and compares it with the generator's own.
    expect(declaration('--handbook-paper')).toBe('#ece2cd');
  });
});

describe('the rule that means "start a new sheet"', () => {
  // In CommonMark a rule on the line immediately after paragraph text is a
  // setext heading, and the weapon-properties table reader treats a lone `---`
  // after a table's last row as a separator and deletes that row. So the rule
  // needs a blank line above it, which is what AGENTS.md documents.
  it('breaks the page after a rule inside a sheet', () => {
    expect(rule('[data-handbook-sheet] hr')).toContain('break-after: page;');
  });

  it('draws the rule in the gold the site draws its rules in', () => {
    // The website styles the same element the same way (tailwind.css), so a
    // divider never means something in one medium and nothing in the other.
    expect(rule('[data-handbook-sheet] hr')).toContain('border-top: var(--handbook-rule-weight) solid var(--color-gold-rule);');
  });
});

describe('the geometry is stated once', () => {
  // The millimetres are the geometry's origin: the @page rule is what the
  // printer actually honours, and every pixel below is derived from it rather than chosen.
  it('states the page geometry in millimetres only once', () => {
    expect([...declarations.matchAll(/(\d+)mm/g)].map(([, value]) => value)).toEqual(['25', '15', '15', '25']);
  });

  // The stronger form of the guard the sheet box first needed. It covered only
  // the box, because the box was the only length there was; columns, a footer, a
  // page box and an ornament add several more, and the invariant that actually
  // holds is that nothing outside `:root` holds a length at all. Every value the
  // geometry is made of is then one declaration a diff can review.
  it('declares every length once, as a custom property on the root', () => {
    const outsideTheRoot = declarations.replace(/:root\s*\{[^}]*\}/g, '');

    expect([...outsideTheRoot.matchAll(/(\d+(?:\.\d+)?(?:px|em|rem))/g)].map(([, value]) => value)).toEqual([]);
  });
});

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

  it('gives the body the printable width, so the screen layout is the print layout', () => {
    // The sheet box is the measure. A body wider than the printable area would
    // paginate at a width the page does not have.
    const body = declarations.match(/\bbody\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(body).toContain('width: var(--handbook-sheet-width);');
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