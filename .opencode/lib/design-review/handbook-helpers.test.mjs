import { describe, expect, it } from 'vitest';

import {
  A4_POINTS,
  DEFAULTS,
  MIN_PDF_BYTES,
  MIN_PNG_BYTES,
  PAGE_NUMBER_TOTAL,
  describeSheets,
  describeSplits,
  elementsWiderThanColumn,
  formatPdfFontGateFailure,
  pageCountBounds,
  pageNumberLabel,
  parseArgs,
  pngFileName,
  rasterSize,
  readPdfMediaBox,
  readPdfPageCount,
  readPngSize,
  validatePdf,
  validatePng,
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

  it('takes the vertical raster scale at two, which is the size the book states', () => {
    // Two is what makes a sheet 1588 x 2246. It is a flag rather than a
    // constant because a run that wants a smaller capture for review should not
    // have to edit the file that says what a capture is.
    expect(parseArgs([]).rasterScale).toBe(2);
  });

  it('reads an explicit vertical raster scale', () => {
    expect(parseArgs(['--raster-scale', '3']).rasterScale).toBe(3);
  });

  it('refuses a raster scale it cannot capture at', () => {
    expect(() => parseArgs(['--raster-scale', '0'])).toThrow(/raster scale/i);
    expect(() => parseArgs(['--raster-scale', 'wide'])).toThrow(/raster scale/i);
  });

  it('refuses a raster scale finer than the pixel it would print on', () => {
    // Below 1 a capture is smaller than the page it is evidence about, and the
    // read-back would pass while showing less than the artifact contains.
    expect(() => parseArgs(['--raster-scale', '0.5'])).toThrow(/raster scale/i);
  });

  it('writes the per-sheet captures beside the PDF unless told otherwise', () => {
    // Derived rather than restated, so moving the PDF moves its evidence with
    // it instead of leaving one run's captures beside another's artifact.
    expect(parseArgs([]).pngDir).toBe('tmp/handbook/sheets');
    expect(parseArgs(['--out', 'tmp/spike.pdf']).pngDir).toBe('tmp/sheets');
  });

  it('takes an explicit capture directory', () => {
    expect(parseArgs(['--png-dir', 'tmp/review']).pngDir).toBe('tmp/review');
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

  it('writes the manifest to the one committed path', () => {
    // Beside the artwork and, once the publisher page exists, beside the artifact
    // itself: the record of the book belongs with the book.
    expect(parseArgs([]).manifest).toBe('public/handbook/manifest.json');
  });

  // The spike fixture is two made-up sheets, and a run that printed it would
  // otherwise overwrite the record of the real book with a record of the fixture.
  it('writes no manifest at all when the run says not to', () => {
    expect(parseArgs(['--no-manifest']).manifest).toBeNull();
  });

  it('compares no captures and writes no baseline unless asked', () => {
    // Golden PNGs are out of version control, so a run that neither compares nor
    // updates a baseline does nothing with them.
    const options = parseArgs([]);

    expect(options.compare).toBeNull();
    expect(options.baseline).toBeNull();
  });

  it('reads the baseline directory to compare a run against', () => {
    expect(parseArgs(['--compare', 'tmp/other']).compare).toBe('tmp/other');
  });

  it('reads the baseline directory to record this run as', () => {
    expect(parseArgs(['--baseline', 'tmp/other']).baseline).toBe('tmp/other');
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
    { number: 1, source: 'dnd/character-creation', title: 'Character Creation', section: '', part: 1, parts: 1, contentHeight: 700, pages: 1 },
    { number: 2, source: 'dnd/skills', title: 'Skills', section: 'Dash', part: 1, parts: 3, contentHeight: 940, pages: 1 },
    { number: 3, source: 'dnd/skills', title: 'Skills', section: 'Long Rest', part: 2, parts: 3, contentHeight: 620, pages: 1 },
  ];

  it('names every sheet, its page number and the height it measured', () => {
    const report = describeSheets(sheets).join('\n');

    expect(report).toMatch(/1\s+dnd\/character-creation.*Character Creation.*700px.*1 page/);
    expect(report).toMatch(/3\s+dnd\/skills.*Long Rest.*620px/);
  });

  // A sheet is not a source page: one source page is three sheets and the reader
  // of this report has to be able to tell the two apart.
  it('says which part of its source page a sheet is', () => {
    const report = describeSheets(sheets).join('\n');

    expect(report).toMatch(/2\s+dnd\/skills \(1 of 3\)/);
    expect(report).toMatch(/3\s+dnd\/skills \(2 of 3\)/);
    // A sheet that is the whole of its source page needs no part marker: the
    // split report is where that is said, and here it would be eight lines of
    // "(1 of 1)" a reader has to look past.
    expect(report).toMatch(/1\s+dnd\/character-creation - Character Creation/);
  });

  it('says nothing is overlong when every sheet fits one page', () => {
    expect(describeSheets(sheets).join('\n')).not.toMatch(/more than one page/);
  });

  // A sheet that still spans two pages is a page the captures cannot reach, so it
  // is stated rather than left to be discovered in a directory listing.
  it('names the sheet that still spans more than one page', () => {
    const overlong = [{ ...sheets[0], pages: 2 }];

    expect(describeSheets(overlong).join('\n')).toMatch(/dnd\/character-creation.*more than one page/);
  });
});

describe('the split report', () => {
  const splits = [
    { source: 'dnd/skills', sheet: 2, kind: 'h2', label: 'h2 at h2 "Dash"' },
    { source: 'dnd/skills', sheet: 5, kind: 'table', label: 'table at "Weapon Group"' },
  ];

  // The whole point of the report: a run that decides where a page ends says so,
  // by name, or the decision could change with nothing to show for it.
  it('names every split it made and where it fell', () => {
    const report = describeSplits(splits).join('\n');

    expect(report).toMatch(/dnd\/skills.*sheet 2.*h2 at h2 "Dash"/);
    expect(report).toMatch(/dnd\/skills.*sheet 5.*table at "Weapon Group"/);
  });

  it('counts them, so a report of thirty is thirty lines rather than a surprise', () => {
    expect(describeSplits(splits)[0]).toMatch(/2/);
  });

  // The destination: an authored horizontal rule at the point the generator would
  // have broken makes the split disappear, and this is what says so while it lasts.
  it('says what a split becomes when the author breaks there instead', () => {
    expect(describeSplits(splits).join('\n')).toMatch(/horizontal rule|hr/);
  });

  // Not a split, and it is not hidden either: nothing was broken, so it is
  // reported as the thing it is - the one thing in the book a sheet cannot hold.
  it('says a block too tall for a sheet spans pages and was not cut', () => {
    const report = describeSplits([
      { source: 'dnd/skills', sheet: 4, kind: 'p', label: 'p at "long"', oversized: true, height: 1453 },
    ]).join('\n');

    expect(report).toMatch(/1453px/);
    expect(report).toMatch(/not cut|spans/i);
  });

  it('says there is nothing to report when every break was authored', () => {
    const report = describeSplits([]).join('\n');

    expect(report).toMatch(/no automatic splits|0/);
    expect(report).not.toMatch(/\d+\/\d+/);
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

/**
 * The per-sheet PNGs, and the raster contract they are checked against.
 *
 * A sheet is captured at an exact raster size because a capture at whatever
 * size the browser happened to produce is evidence about nothing: it cannot be
 * compared, and it cannot be told apart from a capture of the wrong page. The
 * size is therefore arithmetic from the page box the stylesheet declares and
 * the scale the run was asked for, and it is read back out of the PNG's own
 * header rather than trusted from the write.
 */

/**
 * A PNG that declares the given size in its header.
 *
 * The IHDR chunk is the first thing in the file after the signature and carries
 * the dimensions as two big-endian 32-bit integers, which is the only part of a
 * PNG the reader below depends on.
 */
function pngBytes({ width = 1588, height = 2246, bytes = 4096 } = {}) {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8); // IHDR length
  header.write('IHDR', 12, 'latin1');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);

  return Buffer.concat([header, Buffer.alloc(bytes, 0)]);
}

describe('the raster size a sheet is captured at', () => {
  // The page box, not the sheet box: a capture of a sheet is a capture of the
  // page it sits on, margins and all, which is what a reader holds.
  const page = { width: 794, height: 1123 };

  it('is the page box at twice the scale by default', () => {
    // 794 x 1123 CSS px is A4 at the CSS reference resolution, rounded up, and at
    // a vertical raster scale of 2 that is 1588 x 2246. The command asserts
    // this against the bytes it wrote rather than against this sentence.
    expect(rasterSize({ page, rasterScale: 2 })).toEqual({ width: 1588, height: 2246 });
  });

  it('takes the vertical raster scale as a flag rather than a constant', () => {
    expect(rasterSize({ page, rasterScale: 1 })).toEqual({ width: 794, height: 1123 });
    expect(rasterSize({ page, rasterScale: 3 })).toEqual({ width: 2382, height: 3369 });
  });

  it('rounds a fractional capture up, because a clipped pixel row is a defect', () => {
    // Chrome returns whole pixels, so 793.7 CSS px at 2x is 1588 and not 1587.
    expect(rasterSize({ page: { width: 793.7, height: 1122.52 }, rasterScale: 2 })).toEqual({
      width: 1588,
      height: 2246,
    });
  });

  it('refuses a scale that is not a positive number', () => {
    expect(() => rasterSize({ page, rasterScale: 0 })).toThrow(/raster scale/i);
    expect(() => rasterSize({ page, rasterScale: Number.NaN })).toThrow(/raster scale/i);
  });

  it('refuses a page box that is not a length', () => {
    expect(() => rasterSize({ page: { width: 0, height: 1123 }, rasterScale: 2 })).toThrow(/page box/i);
  });
});

describe('reading a written PNG back', () => {
  it('reads the raster size out of the header', () => {
    expect(readPngSize(pngBytes())).toEqual({ width: 1588, height: 2246 });
  });

  it('reads nothing out of bytes that are not a PNG', () => {
    expect(readPngSize(Buffer.from('<html><body>Not a PNG</body></html>'))).toBeNull();
  });

  // A file cut short inside its first chunk is a file whose dimensions are not
  // there to read, and a reader that returned zeros here would validate a
  // truncated capture as a 0x0 one and pass it.
  it('reads nothing out of a truncated header', () => {
    expect(readPngSize(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
  });
});

describe('validatePng', () => {
  const expected = { width: 1588, height: 2246 };
  const validate = (bytes) => validatePng({ label: 'sheet-01.png', bytes, expected });

  it('accepts a capture whose header is the size the run asked for', () => {
    expect(validate(pngBytes())).toMatchObject({ ok: true, size: expected });
  });

  it('refuses a capture at the wrong size rather than filing it', () => {
    // The capture command's own lesson (ADR-0012): a screenshot at the wrong
    // width and a screenshot at the right one look identical in a directory
    // listing, so the width is read back out of the file.
    const verdict = validate(pngBytes({ width: 1440, height: 2246 }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/1440x2246/);
  });

  it('refuses a file that is not a PNG', () => {
    const verdict = validate(Buffer.from('%PDF-1.7 not a png'));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/not a PNG/);
  });

  it('refuses an empty or absent file', () => {
    expect(validate(undefined).problems.join(' ')).toMatch(/not written/);
  });

  it('refuses a truncated file', () => {
    const verdict = validate(pngBytes({ bytes: 32 }));

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/truncated/);
  });
});

describe('the page number in a sheet footer', () => {
  it('reads as a number of the whole book rather than a bare number', () => {
    expect(pageNumberLabel(12, 48)).toBe('12 of 48');
  });

  it('says one page of one on the first sheet', () => {
    expect(pageNumberLabel(1, 1)).toBe('1 of 1');
  });

  it('has an unbound total that reads as unbound rather than as a number', () => {
    // The alternative - printing nothing after the "of" - looks like a page
    // number, and a reader would believe it.
    expect(PAGE_NUMBER_TOTAL.unknown).toMatch(/uncounted/);
  });

  it('numbers from one, because a book does not have a page zero', () => {
    expect(() => pageNumberLabel(0, 48)).toThrow(/start at 1/);
  });

  // An unbound total would print "of ?" on every sheet of the book, which is
  // worse than printing nothing: it looks like a page number.
  it('refuses to label a page number against a total it does not have', () => {
    expect(() => pageNumberLabel(3, 0)).toThrow(/sheet count/i);
    expect(() => pageNumberLabel(3, undefined)).toThrow(/sheet count/i);
  });

  it('refuses to label a page number past the end of the book', () => {
    expect(() => pageNumberLabel(49, 48)).toThrow(/past the end/i);
  });
});

describe('the per-sheet capture file names', () => {
  it('numbers each sheet by its own number so a diff can be read', () => {
    expect(pngFileName(1)).toBe('sheet-01.png');
    expect(pngFileName(12)).toBe('sheet-12.png');
    expect(pngFileName(48)).toBe('sheet-48.png');
  });

  it('pads to two digits so a listing sorts into page order', () => {
    expect(pngFileName(8)).toBe('sheet-08.png');
  });

  it('refuses a sheet number it could not have been written under', () => {
    expect(() => pngFileName(0)).toThrow(/numbered from 1/);
  });
});

describe('which elements span both columns', () => {
  // The house-rule pages are mostly reference tables, and one of them is thirty
  // kilobytes of them. A table wider than its column is the expected case rather
  // than the exception, so the question is never "which elements need spanning"
  // but "which elements can be trusted not to", and the answer is measured.
  const columnWidth = 306;

  it('spans an element that is wider than its column', () => {
    expect(elementsWiderThanColumn({ columnWidth, boxes: [{ width: 288, scrollWidth: 700 }] })).toEqual([0]);
  });

  it('leaves an element that fits its column alone', () => {
    expect(elementsWiderThanColumn({ columnWidth, boxes: [{ width: 306, scrollWidth: 306 }] })).toEqual([]);
  });

  it('leaves an element a fraction over the column alone, because the column is fractional', () => {
    // 643px of sheet less a 30px gutter does not divide into two whole columns,
    // so Chrome hands back 306.5 and a paragraph can be 306.4 wide without
    // anything being wrong with it.
    expect(elementsWiderThanColumn({ columnWidth, boxes: [{ width: 306.5, scrollWidth: 306.5 }] })).toEqual([]);
  });

  // A wide table inside a scroll container is the shape Starlight renders
  // markdown tables in, and reading only the container's own box would find a
  // 306px element and call it fitted.
  it('spans an element whose content overflows it', () => {
    expect(
      elementsWiderThanColumn({
        columnWidth,
        boxes: [
          { width: 306, scrollWidth: 306 },
          { width: 306, scrollWidth: 812 },
        ],
      })
    ).toEqual([1]);
  });

  it('reports every wide element rather than the first', () => {
    // The command marks them all in one pass and then re-measures, so an
    // element left behind would be clipped on a sheet the run reported as
    // correct.
    expect(
      elementsWiderThanColumn({
        columnWidth,
        boxes: [{ width: 400 }, { width: 288 }, { width: 900 }],
      })
    ).toEqual([0, 2]);
  });

  it('treats an element it could not measure as wide rather than as fitted', () => {
    // A missing measurement is not evidence that the element fits. Assuming it
    // does is how a table gets clipped with nothing in the report.
    expect(elementsWiderThanColumn({ columnWidth, boxes: [{}] })).toEqual([0]);
  });

  it('refuses to measure against a column that is not a length', () => {
    expect(() => elementsWiderThanColumn({ columnWidth: 0, boxes: [{ width: 10 }] })).toThrow(/column width/i);
  });
});