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
      top: `${insetPx(15)}px`,
      right: `${insetPx(15)}px`,
      bottom: `${insetPx(15)}px`,
      left: `${insetPx(15)}px`,
    });

    // The content box is the page box less the four margins, exactly. All four are
    // 15mm, so the text block is symmetric.
    expect(contentWidth()).toBe(round2(pageBoxPx(210) - insetPx(15) - insetPx(15)));
    expect(contentHeight()).toBe(round2(pageBoxPx(297) - insetPx(15) - insetPx(15)));

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

  // 306 x 2 + 30 is 642, and at a 15mm inset the text block is 680.32px. The
  // columns are deliberately not widened to fill it: the flow is pinned to 642 and
  // centred, so the 38.32px of slack is equal either side rather than a 325px
  // column. That is also why the columns are declared as a width: Chrome's own
  // column arithmetic on the full text block hands back 325.16 and the wide-element
  // threshold the assignment reads is 306.
  it('holds the flow to the declared columns rather than widening them to fill', () => {
    const columns = Number(declaration('--handbook-columns'));
    const filled = pixels('--handbook-column-width') * columns + pixels('--handbook-column-gap');

    expect(filled).toBeLessThan(contentWidth());
    // The flow's width is the columns' own total, from the same declarations.
    expect(rule('[data-handbook-flow]')).toContain(
      'width: calc(var(--handbook-column-width) * var(--handbook-columns) + var(--handbook-column-gap));'
    );
    expect(rule('[data-handbook-flow]')).toContain('margin-inline: auto;');
  });

  it('lets a single-column page use the whole text block', () => {
    // The opt-out goes back to the full text block, because a page that chose one
    // column chose it to get the wider measure.
    expect(rule('[data-handbook-columns="1"] [data-handbook-flow]')).toContain('width: auto;');
  });

  it('keeps every block whole inside a column', () => {
    const blocks = css.slice(css.indexOf('[data-handbook-flow] p,'), css.indexOf('[data-handbook-columns="1"]'));

    expect(blocks).toContain('break-inside: avoid;');
    expect(blocks).toContain('-webkit-column-break-inside: avoid;');

    // Paragraphs, list items, whole lists and headings, which is the ticket's floor.
    for (const selector of ['p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4']) {
      expect(blocks).toContain(`[data-handbook-flow] ${selector}`);
    }
  });

  // The heading's flow child is its wrapper, not the `h3` inside it, so the rule
  // that keeps a heading with the block it introduces has to name the wrapper too.
  it('keeps a heading with the block it introduces', () => {
    const blocks = css.slice(css.indexOf('[data-handbook-flow] p,'), css.indexOf('[data-handbook-columns="1"]'));

    expect(blocks).toContain('break-after: avoid;');
    expect(blocks).toContain('[data-handbook-flow] .sl-heading-wrapper');
    expect(blocks).toContain('[data-handbook-flow] h3');
  });

  // An aside or a table straddling the gutter is the same defect as a paragraph
  // straddling it: half the box at the foot of one column and half at the head of
  // the next. They are blocks too, so they move whole rather than split.
  it('keeps an aside and a table whole inside a column', () => {
    const blocks = css.slice(css.indexOf('[data-handbook-flow] p,'), css.indexOf('[data-handbook-columns="1"]'));

    for (const selector of ['.starlight-aside', 'table', 'tr', 'td', 'th']) {
      expect(blocks).toContain(`[data-handbook-flow] ${selector}`);
    }
  });

  // Chrome balances the content of a row that ends at a `column-span: all`
  // element, which dealt a heading and the rule before it one per column and put
  // the heading on the right of a full-width table. The avoid is scoped to a
  // heading that introduces a spanning block, so a heading introducing an
  // ordinary column-width table is still free to start column two.
  it('keeps a heading that introduces a full-width table with the block before it', () => {
    const blocks = css.slice(css.indexOf('[data-handbook-flow] p,'), css.indexOf('[data-handbook-columns="1"]'));

    expect(blocks).toContain('[data-handbook-flow] .sl-heading-wrapper:has(+ [data-handbook-wide])');
    expect(blocks).toContain('break-before: avoid;');
  });

  it('fills the flow box with the declared columns', () => {
    expect(rule('[data-handbook-flow]')).toContain('column-count: var(--handbook-columns);');
    expect(rule('[data-handbook-flow]')).toContain('column-gap: var(--handbook-column-gap);');
  });

  // The owner's reading order: the first column fills to the foot of the sheet
  // before the second begins, which is what the planner already models and what
  // `balance` used to spread into two half-empty columns.
  it('fills the first column before it starts the second', () => {
    expect(rule('[data-handbook-flow]')).toContain('column-fill: auto;');
    expect(rule('[data-handbook-flow]')).not.toContain('column-fill: balance;');
  });

  // A single 680.32px measure at 13px body text is a very long line for a page
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

describe('the horizontal rule in a house-rule page', () => {
  // The rule used to mean "start a new sheet", and fifty-six of them turned a
  // book that fits twenty-four content sheets into sixty-six. The generator owns
  // the breaks now (ADR-0024), so the rule is a divider and nothing else.
  it('no longer forces a new sheet', () => {
    expect(rule('[data-handbook-sheet] hr')).not.toContain('break-after');
  });

  it('draws the rule in the gold the site draws its rules in', () => {
    // The website styles the same element the same way (tailwind.css), so a
    // divider never means something in one medium and nothing in the other.
    expect(rule('[data-handbook-sheet] hr')).toContain('border-top: var(--handbook-rule-weight) solid var(--color-gold-rule);');
  });
});

describe('the print type scale', () => {
  // The site's typography is rem-based under a 16px browser default. The print
  // route moves its root to 13px so every rem step follows it, and body text
  // lands on the 22.75px leading a printed rulebook reads at.
  it('sets the root the whole document measures its type from to 13px', () => {
    expect(declaration('--handbook-root-size')).toBe('13px');
    expect(rule(':root')).toContain('font-size: var(--handbook-root-size);');
  });

  it('sets body text at 1rem on a 1.75 leading, which is 13px on 22.75px', () => {
    expect(declaration('--handbook-body-size')).toBe('1rem');
    expect(declaration('--handbook-body-leading')).toBe('1.75');
    expect(rule('body')).toContain('font-size: var(--handbook-body-size);');
    expect(rule('body')).toContain('line-height: var(--handbook-body-leading);');

    // At 13px root, 1rem is 13px and 1.75 x 13 is 22.75.
    expect(13 * Number(declaration('--handbook-body-leading'))).toBe(22.75);
  });

  it('restates the three heading pixels as rem at the site root, so they follow the print root', () => {
    // The site states 28px, 24px and 20px on a 16px design root. As 1.75, 1.5
    // and 1.25rem they are those sizes at 16px and follow the print root down to
    // 22.75px, 19.5px and 16.25px at 13px.
    const site = (name: string) => Number.parseFloat(declaration(name)) * 16;
    const print = (name: string) => Number.parseFloat(declaration(name)) * 13;

    expect(site('--handbook-heading-2')).toBeCloseTo(28, 2);
    expect(site('--handbook-heading-3')).toBeCloseTo(24, 2);
    expect(site('--handbook-heading-4')).toBeCloseTo(20, 2);

    expect(print('--handbook-heading-2')).toBeCloseTo(22.75, 2);
    expect(print('--handbook-heading-3')).toBeCloseTo(19.5, 2);
    expect(print('--handbook-heading-4')).toBeCloseTo(16.25, 2);
  });

  it('applies each heading step to the site headings on a sheet', () => {
    expect(rule(':root .sl-markdown-content h2:not(:where(.not-content *))')).toContain(
      'font-size: var(--handbook-heading-2);'
    );
    expect(rule(':root .sl-markdown-content h3:not(:where(.not-content *))')).toContain(
      'font-size: var(--handbook-heading-3);'
    );
    expect(rule(':root .sl-markdown-content h4:not(:where(.not-content *))')).toContain(
      'font-size: var(--handbook-heading-4);'
    );
  });

  // A cover and a contents title must read from across a table, so they stay in
  // pixels while rem means "the print body scale".
  it('declares the cover and contents titles in px, larger than the body type', () => {
    const cover = pixels('--handbook-cover-title');
    const contents = pixels('--handbook-contents-title');

    expect(cover).toBeGreaterThan(pixels('--handbook-root-size'));
    expect(contents).toBeGreaterThan(pixels('--handbook-root-size'));
    expect(rule("[data-handbook-front='contents'] h1")).toContain(
      'font-size: var(--handbook-contents-title);'
    );
  });
});

describe('the aside on a sheet', () => {
  // The screen lifts an aside with a drop shadow, which is ink that says nothing
  // on paper. The print routes suppress it and the screen value is untouched.
  it('prints with no drop shadow', () => {
    expect(rule('[data-handbook-source] .starlight-aside')).toContain('box-shadow: none;');
  });
});

describe('the interactive tools, which the book does not carry', () => {
  const components = {
    pointBuy: readFileSync(new URL('../components/point-buy/PointBuy.astro', import.meta.url), 'utf8'),
    diceRoller: readFileSync(new URL('../components/dice-roller/DiceRoller.astro', import.meta.url), 'utf8'),
  };
  const website = readFileSync(new URL('./tailwind.css', import.meta.url), 'utf8');

  it('hides the Point Buy and Dice Roller roots from the flow', () => {
    // The two roots share one rule, so the selector and its declaration are
    // asserted over the stylesheet text rather than through the exact-selector
    // helper, which needs the `{` to follow the selector directly.
    expect(declarations).toMatch(/\[data-handbook-flow\]\s+\.point-buy-needs-js[\s\S]*?display:\s*none;/);
    expect(declarations).toMatch(/\[data-handbook-flow\]\s+\.dice-roller-needs-js[\s\S]*?display:\s*none;/);
  });

  it('scopes the hiding to the flow, so it is print-only', () => {
    // A bare `.point-buy-needs-js { display: none }` would hide the tool on the
    // website too; the hidden rule must carry the print marker.
    expect(declarations).not.toMatch(/(?<!\[data-handbook-flow\] )\.point-buy-needs-js\s*\{[^}]*display:\s*none/);
    expect(declarations).not.toMatch(/(?<!\[data-handbook-flow\] )\.dice-roller-needs-js\s*\{[^}]*display:\s*none/);
    expect(website).not.toMatch(/\.point-buy-needs-js\s*\{[^}]*display:\s*none/);
    expect(website).not.toMatch(/\.dice-roller-needs-js\s*\{[^}]*display:\s*none/);
  });

  it('leaves the components and their own styling untouched', () => {
    // The removal is a print-stylesheet rule and nothing else: the roots still
    // carry their classes and the components still style themselves, so the screen
    // is exactly what it was.
    expect(components.pointBuy).toContain('class="point-buy-needs-js pb not-content"');
    expect(components.diceRoller).toContain('class="dice-roller-needs-js dr not-content"');
    expect(components.pointBuy).toContain('--pb-rule:');
    expect(components.diceRoller).toContain('--dr-rule:');
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
  it('is 680.32 by 1009.13 CSS px at the CSS reference resolution', () => {
    // Written out longhand rather than through the declarations above, so the
    // helper that reads the stylesheet is not what proves the arithmetic.
    expect([
      round2(pageBoxPx(210) - insetPx(15) - insetPx(15)),
      round2(pageBoxPx(297) - insetPx(15) - insetPx(15)),
    ]).toEqual([680.32, 1009.13]);
  });

  it('agrees with the margin declarations the stylesheet actually carries', () => {
    expect({ width: contentWidth(), height: contentHeight() }).toEqual({
      width: round2(pageBoxPx(210) - insetPx(15) - insetPx(15)),
      height: round2(pageBoxPx(297) - insetPx(15) - insetPx(15)),
    });
  });
});
