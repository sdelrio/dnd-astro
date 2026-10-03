import { describe, expect, it } from 'vitest';

import {
  A4_POINTS,
  DEFAULTS,
  MIN_PDF_BYTES,
  describeSheets,
  formatPdfFontGateFailure,
  pageCountBounds,
  parseArgs,
  readPdfMediaBox,
  readPdfPageCount,
  validatePdf,
} from './handbook-helpers.mjs';

/**
 * The parts of the Handbook command that decide whether the artifact is
 * believable, tested without a browser.
 *
 * A command that can only be checked by running it against a real browser and
 * reading the file afterwards will be believed on trust between runs, and a
 * PDF that is believed on trust is the failure mode ADR-0020 exists to prevent:
 * a truncated or wrong-paged file looks exactly like a correct one in a
 * directory listing. So the seams here are the written file's own bytes.
 */

/**
 * A minimal PDF with the given number of A4 pages.
 *
 * Built rather than recorded because the properties under test are structural -
 * the magic, the trailer, the page tree - and a real Chrome output would test
 * Chrome's PDF writer rather than the validator.
 */
function pdfBytes({ pages = 1, mediaBox = '0 0 595.28 841.89', trailer = true, padding = 'x' } = {}) {
  const pageObjects = Array.from(
    { length: pages },
    (_, index) => `${index + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [${mediaBox}] >>\nendobj\n`
  ).join('');

  return Buffer.from(
    [
      '%PDF-1.7',
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
      `2 0 obj\n<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${i + 1} 0 R`).join(' ')}] /Count ${pages} >>\nendobj\n`,
      pageObjects,
      `${padding.repeat(MIN_PDF_BYTES)}`,
      trailer ? 'trailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n' : 'trailer\n<< /Size 4 /Root 1 0 R >>\n',
    ].join('')
  );
}

describe('parseArgs', () => {
  it('defaults to the print route, a dev-time output path and the local display face', () => {
    const options = parseArgs([]);

    expect(options.url).toBe('http://localhost:4321/handbook/print/');
    expect(options.out).toBe('tmp/handbook/handbook.pdf');
    expect(options.font).toBe('Cinzel');
    expect(options.fontUrl).toBe('/fonts/Cinzel.woff2');
  });

  it('does not start a dev server unless asked', () => {
    expect(parseArgs([]).startDevServer).toBe(false);
  });

  it('starts the documented server only behind the explicit opt-in', () => {
    expect(parseArgs(['--start-dev-server']).startDevServer).toBe(true);
  });

  it('reads the font CDN outage self-test flag', () => {
    expect(parseArgs(['--simulate-font-cdn-outage']).simulateFontCdnOutage).toBe(true);
  });

  it('rejects an unknown option rather than ignoring it', () => {
    // An unknown flag does not fail the command; it prints the help and exits
    // zero, which is the same quiet wrong thing a mistyped width would be.
    expect(() => parseArgs(['--print'])).toThrow(/--print/);
  });

  it('rejects an option with no value instead of printing nothing', () => {
    expect(() => parseArgs(['--out'])).toThrow(/--out needs a value/);
  });

  it('keeps both the route and the output path overridable', () => {
    const options = parseArgs([
      '--url',
      'http://localhost:4322/handbook/spike-fixture/',
      '--out',
      'tmp/spike.pdf',
    ]);

    expect(options.url).toBe('http://localhost:4322/handbook/spike-fixture/');
    expect(options.out).toBe('tmp/spike.pdf');
    expect(DEFAULTS.out).toBe('tmp/handbook/handbook.pdf');
  });
});

describe('the page count the layout accounts for', () => {
  const sheetHeight = 972;

  it('never puts two source pages on one page', () => {
    // The bound that matters: a source page that lost its page is the failure
    // this check exists for, and it is below the floor rather than beside it.
    expect(
      pageCountBounds(
        [
          { contentHeight: 400 },
          { contentHeight: 972 },
        ],
        sheetHeight
      ).min
    ).toBe(2);
  });

  it('counts the pages a source page that does not fit needs', () => {
    // The tracer bullet does not split a source page, so it spans the pages it
    // needs, and the upper bound has to say so rather than quietly reporting one
    // page for content that needs three.
    expect(pageCountBounds([{ contentHeight: 2500 }], sheetHeight).max).toBe(3);
  });

  it('accounts for every source page, so eight source pages are at most 8 x 18 pages', () => {
    const sheets = Array.from({ length: 8 }, () => ({ contentHeight: 16756 }));

    expect(pageCountBounds(sheets, sheetHeight)).toEqual({ min: 8, max: 144 });
  });

  it('refuses to bound anything against a sheet height that is not a length', () => {
    expect(() => pageCountBounds([{ contentHeight: 400 }], 0)).toThrow(/not a length/);
  });
});

describe('reading a written PDF back', () => {
  it('reads the page count out of the page tree', () => {
    expect(readPdfPageCount(pdfBytes({ pages: 8 }))).toBe(8);
  });

  it('reads the page geometry out of the page objects', () => {
    expect(readPdfMediaBox(pdfBytes())).toEqual({ width: 595.28, height: 841.89 });
  });

  it('cannot read a page count out of bytes that are not a PDF', () => {
    expect(readPdfPageCount(Buffer.from('not a pdf at all'))).toBeNull();
  });

  it('reports no page count rather than guessing one', () => {
    // A PDF whose page objects live in compressed object streams has no
    // readable `/Type /Page`, and a validator that invented a number there would
    // be validating itself.
    const bytes = Buffer.from('%PDF-1.7\ntrailer\n<< >>\nstartxref\n0\n%%EOF\n');

    expect(readPdfPageCount(bytes)).toBeNull();
  });
});

describe('validatePdf', () => {
  // Eight source pages, and content that accounts for up to forty of them: the
  // bounds a real run works inside.
  const pageBounds = { min: 8, max: 40 };
  const validate = (bytes, bounds = pageBounds) =>
    validatePdf({ label: 'handbook.pdf', bytes, pageBounds: bounds });

  it('accepts a PDF whose bytes say what they should', () => {
    const verdict = validate(pdfBytes({ pages: 8 }));

    expect(verdict).toMatchObject({ ok: true, pages: 8, bytes: expect.any(Number) });
    expect(verdict.problems).toEqual([]);
  });

  it('accepts the page box Chrome actually writes for A4', () => {
    // Measured, not nominal: Chrome writes 594.96 x 841.92pt for `@page { size:
    // A4 }`, which is 0.32pt off 210 x 297mm. A validator that compared against
    // the exact point value would refuse every correct file.
    expect(validate(pdfBytes({ pages: 8, mediaBox: '0 0 594.95996 841.91998' })).ok).toBe(true);
  });

  it('accepts a page box within a rounding error of A4', () => {
    expect(validate(pdfBytes({ pages: 8, mediaBox: '0 0 595.276 841.89' })).ok).toBe(true);
  });

  it('refuses a file that is not a PDF', () => {
    const verdict = validate(Buffer.from('<html><body>Not a PDF</body></html>'));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/PDF magic/);
  });

  it('refuses an empty or absent file', () => {
    const verdict = validatePdf({ label: 'handbook.pdf', bytes: undefined, pageBounds });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/not written/);
  });

  it('refuses a truncated file rather than filing it', () => {
    const verdict = validate(Buffer.from('%PDF-1.7\ntrailer\n%%EOF\n'));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/truncated/);
  });

  it('refuses a file with no end-of-file trailer', () => {
    // A write cut short after the last object is still a readable-looking file
    // that no PDF reader will open.
    const verdict = validate(pdfBytes({ pages: 8, trailer: false }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/%%EOF/);
  });

  // Measured bounds, not an exact total: the print fragmentainer's capacity is
  // fractional and a print layout can be a little shorter than the screen
  // measurement, so the checks are a floor and a ceiling rather than equality.
  it('refuses a document with fewer pages than source pages', () => {
    const verdict = validate(pdfBytes({ pages: 7 }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/7 pages for 8 source pages/);
  });

  it('refuses a document with more pages than its content accounts for', () => {
    const verdict = validate(pdfBytes({ pages: 41 }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/41 pages, more than the 40/);
  });

  it('accepts a page count anywhere inside the bounds', () => {
    for (const pages of [8, 20, 35, 40]) {
      expect({ pages, ok: validate(pdfBytes({ pages })).ok }).toEqual({ pages, ok: true });
    }
  });

  it('refuses a page that is not A4', () => {
    const verdict = validate(pdfBytes({ pages: 8, mediaBox: '0 0 612 792' }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/612/);
  });

  it('refuses a file whose page count cannot be read at all', () => {
    const bytes = Buffer.concat([
      Buffer.from('%PDF-1.7\ntrailer\n<< >>\n'),
      Buffer.alloc(MIN_PDF_BYTES, 'x'),
      Buffer.from('\n%%EOF\n'),
    ]);

    expect(validate(bytes).problems.join(' ')).toMatch(/page count/);
  });

  it('states the page size it expects, so a wrong sheet is caught in the file', () => {
    expect(A4_POINTS).toEqual({ width: 595.28, height: 841.89, tolerance: 1 });
  });
});

describe('the run report', () => {
  const sheets = [
    { slug: 'dnd/character-creation', title: 'Character Creation', contentHeight: 700, pages: 1 },
    { slug: 'dnd/skills', title: 'Skills', contentHeight: 2400, pages: 3 },
  ];

  it('names every source page and the pages it took', () => {
    const report = describeSheets(sheets).join('\n');

    expect(report).toMatch(/dnd\/character-creation.*700px.*1 page/);
    expect(report).toMatch(/dnd\/skills.*2400px.*3 pages/);
  });

  it('says which source pages did not fit one sheet', () => {
    // The tracer bullet does not split a source page, so the overflow is a fact
    // the run has to state rather than a detail to discover in the artifact.
    expect(describeSheets(sheets).join('\n')).toMatch(/dnd\/skills.*more than one sheet/);
  });

  it('says nothing is overlong when every source page fits', () => {
    expect(describeSheets([{ slug: 'dnd/magic', title: 'Magic', contentHeight: 900, pages: 1 }]).join('\n')).not.toMatch(
      /more than one sheet/
    );
  });
});

describe('the font gate message', () => {
  it('names the font, where it comes from, what failed, and that nothing was written', () => {
    const message = formatPdfFontGateFailure({
      family: 'Cinzel',
      url: '/fonts/Cinzel.woff2',
      detail: 'no loaded FontFace for Cinzel',
    });

    expect(message).toMatch(/Cinzel/);
    expect(message).toMatch(/\/fonts\/Cinzel\.woff2/);
    expect(message).toMatch(/no loaded FontFace/);
    expect(message).toMatch(/no PDF was written/);
  });
});