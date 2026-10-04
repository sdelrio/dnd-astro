import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The page geometry of the Handbook, asserted against the one stylesheet that
 * states it.
 *
 * A sheet is the page box: paper to its edge, with the insets as the sheet's own
 * padding and no `@page` margin. That only holds if the box is exactly A4 at the
 * CSS reference resolution and the text block is exactly the page box less the
 * four margins - so both are derived here rather than restated, because a test
 * that repeats the number it is checking cannot fail.
 */

const css = readFileSync(new URL('./handbook-print.css', import.meta.url), 'utf8');

/** Comments explain the numbers; they do not declare them, so they are stripped. */
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** CSS reference pixels per millimetre: 1in is 96px and 1in is 25.4mm. */
const PX_PER_MM = 96 / 25.4;

/**
 * A4 at the CSS reference resolution, truncated to two decimals so the page box
 * is genuinely *under* A4 rather than rounded up.
 *
 * Truncated rather than rounded, which is the rule this file reverses: a page box
 * a fraction over A4 paginates a second, near-empty page, while one a fraction
 * under it costs nothing. 210mm is 793.7008px and 297mm is 1122.5197px, so two
 * decimals gives 793.70 and 1122.51.
 */
function pageBoxPx(millimetres: number): number {
  return Math.floor(millimetres * PX_PER_MM * 100) / 100;
}

/** An inset, rounded to two decimals the way the stylesheet declares it. */
function insetPx(millimetres: number): number {
  return Number((millimetres * PX_PER_MM).toFixed(2));
}

function declaration(property: string): string {
  // The boundary matters: an unanchored `size` also matches `background-size`,
  // and `height` also matches `--handbook-page-height`.
  return declarations.match(new RegExp(`(?<![-\\w])${property}:\\s*([^;]+);`))?.[1].trim() ?? '';
}

/** A declared length in pixels, as a number. */
function pixels(property: string): number {
  return Number(/^([\d.]+)px$/.exec(declaration(property))?.[1]);
}

/** The text block width: the page box less the left and right margins. */
function contentWidth(): number {
  return round2(
    pixels('--handbook-page-width') -
      pixels('--handbook-page-margin-left') -
      pixels('--handbook-page-margin-right')
  );
}

/** The text block height: the page box less the top and bottom margins. */
function contentHeight(): number {
  return round2(
    pixels('--handbook-page-height') -
      pixels('--handbook-page-margin-top') -
      pixels('--handbook-page-margin-bottom')
  );
}

function round2(value: number): number {
  return Number(value.toFixed(2));
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

describe('the page box, which is the sheet', () => {
  it('is A4 at the CSS reference resolution, to two decimals of a pixel', () => {
    expect({
      width: declaration('--handbook-page-width'),
      height: declaration('--handbook-page-height'),
    }).toEqual({ width: `${pageBoxPx(210)}px`, height: `${pageBoxPx(297)}px` });
  });

  // The rule this file used to carry rounded up, and its reason is reversed: a
  // sheet a fraction over the page box paginates a second, near-empty page, while
  // one a fraction under it costs nothing. The comparison is against the exact
  // millimetre value, not its ceiling, so a rounded-up declaration cannot pass.
  it('is declared a hair under A4 rather than rounded up', () => {
    expect(pixels('--handbook-page-width')).toBeLessThan(210 * PX_PER_MM);
    expect(pixels('--handbook-page-height')).toBeLessThan(297 * PX_PER_MM);
  });

  // There is no `--handbook-sheet-width` any more: the sheet is the page box, so
  // a second pair of numbers would be two numbers that can disagree.
  it('is the only box, so a sheet is a page and nothing else', () => {
    expect(declarations).not.toContain('--handbook-sheet-width');
    expect(declarations).not.toContain('--handbook-sheet-height');

    expect(rule('[data-handbook-sheet]')).toContain('width: var(--handbook-page-width);');
    expect(rule('[data-handbook-sheet]')).toContain('min-height: var(--handbook-page-height);');
  });

  it('is the text block plus exactly the four margins, which are the sheet padding', () => {
    // Derived from the reference resolution rather than restated.
    expect({
      top: declaration('--handbook-page-margin-top'),
      right: declaration('--handbook-page-margin-right'),
      bottom: declaration('--handbook-page-margin-bottom'),
      left: declaration('--handbook-page-margin-left'),
    }).toEqual({
      top: `${insetPx(25)}px`,
      right: `${insetPx(15)}px`,
      bottom: `${insetPx(15)}px`,
      left: `${insetPx(25)}px`,
    });

    // The content box is the page box less the four margins, exactly.
    expect(contentWidth()).toBe(round2(pageBoxPx(210) - insetPx(25) - insetPx(15)));
    expect(contentHeight()).toBe(round2(pageBoxPx(297) - insetPx(25) - insetPx(15)));

    // And the sheet is padded by exactly those margins, so its content box is
    // that text block.
    expect(rule('[data-handbook-sheet]')).toContain(
      'padding: var(--handbook-page-margin-top) var(--handbook-page-margin-right) var(--handbook-page-margin-bottom) var(--handbook-page-margin-left);'
    );
    expect(rule('[data-handbook-sheet]')).toContain('box-sizing: border-box;');
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

  // 306 x 2 + 30 is 642, half a pixel inside the 642.52px text block. That spare
  // half pixel is why the columns are declared as a width rather than derived:
  // Chrome's own column arithmetic hands back 306.5, and the tolerance the
  // overflow check allows exists to absorb exactly that.
  it('fills the text block without exceeding it', () => {
    const columns = Number(declaration('--handbook-columns'));
    const filled = pixels('--handbook-column-width') * columns + pixels('--handbook-column-gap');

    expect(filled).toBeLessThanOrEqual(contentWidth());
    expect(contentWidth() - filled).toBeLessThanOrEqual(2);
  });

  it('fills the flow box with the declared columns', () => {
    expect(rule('[data-handbook-flow]')).toContain('column-count: var(--handbook-columns);');
    expect(rule('[data-handbook-flow]')).toContain('column-gap: var(--handbook-column-gap);');
  });

  // A single 642.52px measure at 16px body text is a very long line for a page
  // read at a table, which is the whole reason for the columns. The opt-out
  // exists for the page where the long line is the lesser problem.
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

  // The footer prints inside the bottom margin band - the sheet's bottom padding -
  // and is inset by the same margins as the text, so it lines up with the measure.
  it('prints inside the bottom margin band, inset by the page margins', () => {
    expect(rule('[data-handbook-footer]')).toContain('left: var(--handbook-page-margin-left);');
    expect(rule('[data-handbook-footer]')).toContain('right: var(--handbook-page-margin-right);');
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

  // The footer is in the bottom margin band now, so the flow must reserve no
  // space for it. That is the 34px every sheet got back.
  it('reserves no space in the flow for the footer', () => {
    expect(rule('[data-handbook-flow]')).not.toContain('padding-bottom');
    expect(declarations).not.toContain('--handbook-footer-reserve');
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
    // The root element's background propagates across the page, which is what a
    // sheet of paper is. On the body it would stop at the sheet's own measure and
    // leave white down both sides of every page.
    expect(rule(':root')).toContain('background-image: var(--handbook-paper-image);');
  });

  it('leaves the sheet itself unpainted, so the paper is what a sheet is printed on', () => {
    // Starlight's reset paints the documentation background behind the body.
    // On the website that is right; on a sheet it is a white rectangle in the
    // middle of the paper, so the committed parchment underneath would show only
    // as a border.
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
  // A4 is the geometry's origin, named once by the `@page` size. The margins are
  // pixel values derived from it, not a second millimetre declaration that can
  // disagree with the page box.
  it('names A4 as the page size and derives every length in pixels', () => {
    expect(declaration('size')).toBe('A4 portrait');
    expect([...declarations.matchAll(/\d+mm/g)]).toEqual([]);
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

  // No page margin: with none, there is nothing outside the content box to leave
  // white, and the paper reaches every edge.
  it('declares no page margin, so the paper reaches every edge', () => {
    expect(declaration('margin')).toBe('0');
  });

  it('gives every sheet the page box height and a break after it', () => {
    const sheet = declarations.match(/\[data-handbook-sheet\]\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(sheet).toContain('min-height: var(--handbook-page-height);');
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

  it('gives the body the page width, so the screen layout is the print layout', () => {
    // The sheet is the page box. A body narrower than it would paginate at a
    // width the page does not have.
    const body = declarations.match(/\bbody\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(body).toContain('width: var(--handbook-page-width);');
  });
});

describe('the text block really is what the millimetres say', () => {
  it('is 642.52 by 971.33 CSS px at the CSS reference resolution', () => {
    // Written out longhand rather than through the declarations above, so the
    // helper that reads the stylesheet is not what proves the arithmetic.
    expect([
      round2(pageBoxPx(210) - insetPx(25) - insetPx(15)),
      round2(pageBoxPx(297) - insetPx(25) - insetPx(15)),
    ]).toEqual([642.52, 971.33]);
  });

  it('agrees with the margin declarations the stylesheet actually carries', () => {
    expect({ width: contentWidth(), height: contentHeight() }).toEqual({
      width: round2(pageBoxPx(210) - insetPx(25) - insetPx(15)),
      height: round2(pageBoxPx(297) - insetPx(25) - insetPx(15)),
    });
  });
});
