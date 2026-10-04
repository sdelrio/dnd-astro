import { MANIFEST_PATH } from './handbook-manifest.mjs';

/**
 * Pure helpers for the Handbook command.
 *
 * Everything here is a function of its arguments: no filesystem, no browser, no
 * process. These are the parts that decide whether the artifact is believable,
 * and a command whose checks can only be made by running it end to end gets
 * believed on trust in between runs. The seams are the written PDF's own bytes,
 * because a truncated or wrong-paged file looks exactly like a correct one in a
 * directory listing.
 *
 * The browser, the font gate, the browser-resolution order and the dev-server
 * boundary are shared with the capture command and are not restated here. See
 * `handbook.mjs` and ADR-0020.
 */

export const DEFAULTS = {
  url: 'http://localhost:4321/handbook/print/',
  // Under `tmp/`, because the book is not published yet: the publisher page
  // states that plainly and links no file, so there is nothing for a `public/`
  // path to resolve to. A generated PDF is scratch until the design settles and
  // an ADR says otherwise; writing it under `tmp/` is what keeps it out of every
  // commit and out of the built site.
  out: 'tmp/handbook/handbook.pdf',
  // The per-sheet captures stay under `tmp/` whatever `--out` says: they are
  // several hundred kilobytes a sheet and the book is dozens of sheets, so they
  // are never committed, and deriving their directory from the artifact's own
  // would put tens of megabytes of PNG wherever the artifact happens to be
  // written, including beside the one file a published site would serve.
  pngDir: 'tmp/handbook/sheets',
  font: 'Cinzel',
  fontUrl: '/fonts/Cinzel.woff2',
  rasterScale: 2,
};

/**
 * Where the committed manifest goes, re-exported so the command's defaults and
 * its help text name one value rather than two.
 *
 * The manifest is a few kilobytes and is committed, because it is the gate that
 * makes a stale artifact fail. A capture baseline is the opposite: hundreds of
 * kilobytes a sheet across dozens of sheets, held under `tmp/` and out of version
 * control, because a picture a reviewer cannot read in a diff is not review
 * evidence. See `handbook-captures.mjs`.
 */
export { MANIFEST_PATH };

/**
 * A raster scale is how many pixels one CSS pixel becomes, and a capture finer
 * than the pixel grid is a capture that has thrown information away rather than
 * resolved more of it. The floor of 1 is therefore a real constraint and not a
 * taste: below it the read-back check passes on an image that shows less than the
 * page it is evidence about.
 */
export const MIN_RASTER_SCALE = 1;

function parseRasterScale(raw) {
  const scale = Number(raw);

  if (!Number.isFinite(scale) || scale < MIN_RASTER_SCALE) {
    throw new Error(
      `--raster-scale ${raw} is not a raster scale of at least ${MIN_RASTER_SCALE}, so a capture taken at it ` +
        'would be smaller than the page it is evidence about.'
    );
  }

  return scale;
}

/** Below this a file is a header and nothing else. Not a Handbook. */
export const MIN_PDF_BYTES = 1024;

/** The same floor for a capture, which is smaller than a PDF and still not one. */
export const MIN_PNG_BYTES = 1024;

/**
 * What a page number reads when the sheet count is not known.
 *
 * It exists so the footer can never print "12 of " - a page number with an
 * unbound total looks like a page number, and a reader would believe it. The
 * label is deliberately not a number, and a run that has not counted the sheets
 * fails rather than printing it.
 */
export const PAGE_NUMBER_TOTAL = Object.freeze({ unknown: 'of an uncounted book' });

/**
 * A4 in PostScript points, which is what a PDF page box is written in.
 *
 * The tolerance is one point, because Chrome writes the box to two decimals of
 * a point and an exact comparison would fail a correct file.
 */
export const A4_POINTS = Object.freeze({ width: 595.28, height: 841.89, tolerance: 1 });

/** PDF files start with these five bytes, and end with the trailer below. */
const PDF_MAGIC = '%PDF-';
const PDF_TRAILER = '%%EOF';

/** What the capture command blocks when asked to simulate a font CDN outage. */
export const FONT_CDN_PATTERNS = ['*fonts.googleapis.com*', '*fonts.gstatic.com*'];

export const HELP = `
Usage: node .opencode/lib/design-review/handbook.mjs [options]

Renders the print route into one A4 vector PDF, one fixed-size sheet per page,
plus one capture per sheet page, and refuses to write a file it cannot read back.

Options:
  --url <url>              page to print          (default ${DEFAULTS.url})
  --out <file>             PDF to write           (default ${DEFAULTS.out})
  --png-dir <dir>          where the per-sheet captures go
                           (default ${DEFAULTS.pngDir}, which is never committed)
  --raster-scale <n>       device pixels per CSS pixel for the captures
                           (default ${DEFAULTS.rasterScale}, which writes 1588 x 2246 per sheet)
  --manifest <path>        the committed record of the run  (default ${MANIFEST_PATH})
  --no-manifest            write no record, for a run that is not the book
                           (the spike fixture, say)
  --compare <dir>          compare this run's captures against a baseline at <dir>
  --baseline <dir>         record this run's captures as the baseline at <dir>
                           (both are off by default, and neither directory is in version control)
  --font <family>          display face to gate on (default ${DEFAULTS.font})
  --font-url <url>         where that face comes from, named on failure
  --start-dev-server       opt in to running \`astro dev --background\` and stopping it
  --simulate-font-cdn-outage
                           block the font CDN before loading. Since ADR-0019 the display
                           face is local, so the gate must stay green through this.
  --help                   this text
`.trimStart();

export function parseArgs(argv) {
  const options = {
    ...DEFAULTS,
    manifest: MANIFEST_PATH,
    baseline: null,
    compare: null,
    startDevServer: false,
    simulateFontCdnOutage: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} needs a value.`);
      index += 1;
      return value;
    };

    switch (arg) {
      case '--url': options.url = next(); break;
      // `--out` says nothing about where the captures go: they are evidence, they
      // are never committed, and moving the artifact must not move them into the
      // directory the artifact is written to.
      case '--out':
        options.out = next();
        break;
      case '--png-dir': options.pngDir = next(); break;
      case '--raster-scale': options.rasterScale = parseRasterScale(next()); break;
      case '--manifest': options.manifest = next(); break;
      case '--no-manifest': options.manifest = null; break;
      case '--compare': options.compare = next(); break;
      case '--baseline': options.baseline = next(); break;
      case '--font': options.font = next(); break;
      case '--font-url': options.fontUrl = next(); break;
      case '--start-dev-server': options.startDevServer = true; break;
      case '--simulate-font-cdn-outage': options.simulateFontCdnOutage = true; break;
      case '--help': case '-h': options.help = true; break;
      default: throw new Error(`Unknown option ${arg}. Run with --help.`);
    }
  }

  return options;
}

/**
 * The bounds the page count has to fall inside.
 *
 * `min` is one page per source page, and that is the bound that matters: a
 * source page sharing a page with the one after it, or a sheet lost between the
 * layout and the printer, lands below it. `max` is the arithmetic of the
 * measured extents, so a document that paginated into more pages than its
 * content accounts for lands above it.
 *
 * The count is a bound rather than an equality, and that is measured rather than
 * assumed. The print fragmentainer holds 971.33 CSS px of document per page plus a
 * fraction - a fixture of exactly 1944px printed two pages and the same fixture
 * one pixel taller printed three - and the print layout of a source page can be
 * a little shorter than its screen measurement: Character Creation measured
 * 4038px and printed four pages, Skills measured 16756px and printed seventeen.
 * Asserting an exact total would be asserting a number this run cannot know.
 * The split report replaces both bounds with exact per-sheet counts.
 */
export function pageCountBounds(sheets, sheetHeight) {
  if (!(sheetHeight > 0)) {
    throw new Error(`Sheet height ${sheetHeight} is not a length, so the page count cannot be bounded.`);
  }

  return {
    min: sheets.length,
    max: sheets.reduce((pages, sheet) => pages + Math.max(1, Math.ceil(sheet.contentHeight / sheetHeight)), 0),
  };
}

/**
 * The page count a PDF declares.
 *
 * The page tree's `/Count` is the number to believe, and counting `/Type /Page`
 * objects is the cross-check: a file whose page objects are compressed into an
 * object stream has no readable ones, and a file whose `/Count` disagrees with
 * its own pages is not a file to publish. `null` means "could not be read",
 * which is a failure at the call site and never a zero.
 */
export function readPdfPageCount(bytes) {
  const text = toText(bytes);
  if (!text) return null;

  const declared = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)].map(([, count]) => Number(count));
  const counted = [...text.matchAll(/\/Type\s*\/Page(?![s])/g)].length;

  const fromTree = declared.length > 0 ? Math.max(...declared) : null;
  if (fromTree !== null) return fromTree;
  return counted > 0 ? counted : null;
}

/** The page box of the first page, in points, or null when there is not one. */
export function readPdfMediaBox(bytes) {
  const text = toText(bytes);
  if (!text) return null;

  const box = text.match(/\/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]/);
  if (!box) return null;

  return { width: Number(box[3]) - Number(box[1]), height: Number(box[4]) - Number(box[2]) };
}

/**
 * Decide whether the written bytes are a believable Handbook.
 *
 * The checks are the ones a directory listing cannot make: the file is a PDF, it
 * is finished, it is printed on A4, and it is as long as the content this run
 * measured. Every problem is reported rather than the first, so one run tells
 * the whole story.
 */
export function validatePdf({ label, bytes, pageBounds, expectedMediaBox = A4_POINTS }) {
  const problems = [];
  const size = bytes ? bytes.length : 0;
  const text = toText(bytes);

  if (!bytes || size === 0) {
    problems.push(`${label} was not written (the file is empty or absent).`);
    return { ok: false, label, bytes: size, pages: null, mediaBox: null, pageBounds, problems };
  }

  if (size < MIN_PDF_BYTES) {
    problems.push(`${label} is truncated: ${size} bytes, under the ${MIN_PDF_BYTES} byte floor.`);
  }

  if (!text.startsWith(PDF_MAGIC)) {
    problems.push(`${label} does not begin with the PDF magic (${PDF_MAGIC}); it is not a PDF.`);
  }

  if (!text.trimEnd().endsWith(PDF_TRAILER)) {
    problems.push(`${label} has no ${PDF_TRAILER} trailer, so it was cut short after the last object.`);
  }

  const pages = readPdfPageCount(bytes);
  if (pages === null) {
    problems.push(`${label} declares no readable page count, so its length cannot be checked.`);
  } else if (pages < pageBounds.min) {
    problems.push(
      `${label} is ${pages} pages for ${pageBounds.min} source pages, so at least one of them did ` +
        'not get a page of its own.'
    );
  } else if (pages > pageBounds.max) {
    problems.push(
      `${label} is ${pages} pages, more than the ${pageBounds.max} its measured content accounts for.`
    );
  }

  const mediaBox = readPdfMediaBox(bytes);
  if (!mediaBox) {
    problems.push(`${label} declares no page box, so it was not printed on A4.`);
  } else {
    const { width, height, tolerance } = expectedMediaBox;
    if (Math.abs(mediaBox.width - width) > tolerance || Math.abs(mediaBox.height - height) > tolerance) {
      problems.push(
        `${label} pages are ${round(mediaBox.width)}x${round(mediaBox.height)}pt; ` +
          `A4 is ${width}x${height}pt, so the CSS page size was not honoured.`
      );
    }
  }

  return { ok: problems.length === 0, label, bytes: size, pages, mediaBox, pageBounds, problems };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * The run report: every sheet by name, the height it measured and the page number
 * it prints.
 *
 * A sheet is not a source page. One source page of this book is several sheets,
 * so the report names the part as well as the page: "dnd/skills (3 of 9)" is a
 * thing a reader can find, and "dnd/skills" nine times over is not.
 */
export function describeSheets(sheets) {
  return sheets.map((sheet) => {
    const parts = sheet.parts > 1 ? ` (${sheet.part} of ${sheet.parts})` : '';

    return [
      `  ${sheet.number}`,
      `${sheet.source}${parts}`,
      `- ${sheet.title}`,
      sheet.section ? `- ${sheet.section}` : '',
      `- ${sheet.contentHeight}px`,
      `- ${sheet.pages} ${sheet.pages === 1 ? 'page' : 'pages'}`,
      sheet.pages > 1 ? '(more than one page)' : '',
    ]
      .filter((part) => part !== '')
      .join(' ');
  });
}

/**
 * The split report: every place the generator decided where a source page ends.
 *
 * This is the report the whole ticket is for. A generator that quietly decides
 * where a page ends is a generator that can quietly change which page a rule
 * appears on, and nothing would say so - so every break is printed here by name,
 * recorded in the manifest beside it, and replaced by an authored horizontal rule
 * as the content converges on breaks a person chose.
 *
 * Two kinds of line, and the difference matters: a **split** is a boundary this
 * run invented, and an **oversized block** is content that was not broken at all
 * because there was no block boundary inside it to break at. The second is not a
 * split and is not hidden as one; it is a paragraph that will span two pages until
 * the author gives it somewhere else to break.
 */
export function describeSplits(splits) {
  if (splits.length === 0) {
    return ['  no automatic splits: every break in the book is one the author wrote.'];
  }

  const lines = [
    `  ${splits.length} automatic split${splits.length === 1 ? '' : 's'}, none of them authored. Each one is`,
    '  a page boundary this run chose; an authored horizontal rule at that point replaces it.',
  ];

  splits.forEach((split, index) => {
    const position = `${split.source}  sheet ${split.sheet}`;
    lines.push(
      split.oversized
        ? `  ${index + 1}/${splits.length}  ${position}  ${split.label} is ${split.height}px and no sheet ` +
            'holds it, so it spans its pages. It was not cut: there is no block boundary inside it to cut at.'
        : `  ${index + 1}/${splits.length}  ${position}  begins at ${split.label}`
    );
  });

  return lines;
}

/**
 * The font-gate failure message.
 *
 * The font decision itself is the capture command's, reused rather than copied;
 * only the wording is this command's, because the thing that would have been
 * written is a PDF rather than a screenshot. It names the font, where it comes
 * from, which check failed, and that nothing was written.
 */
export function formatPdfFontGateFailure({ family, url, detail }) {
  return [
    `Display font ${family} is not loaded, so this run would print the fallback face instead -`,
    'wrong heading metrics, wrong line lengths, and no error logged anywhere.',
    '',
    `  Font:   ${family}`,
    `  Source: ${url}`,
    `  Check:  ${detail}`,
    '',
    'A PDF printed now would be a plausible-looking lie, so no PDF was written.',
    `Make ${family} reachable (or serve it locally) and re-run.`,
  ].join('\n');
}

function toText(bytes) {
  if (!bytes || bytes.length === 0) return '';
  return Buffer.isBuffer(bytes) ? bytes.toString('latin1') : String(bytes);
}

/* -------------------------------------------------------------------------
 * The per-sheet captures
 * ---------------------------------------------------------------------- */

/**
 * The raster size a sheet is captured at.
 *
 * The page box rather than the sheet box: a capture of a sheet is a capture of
 * the page it is printed on, margins and all, because that is the thing a reader
 * holds. Both dimensions come from the same page box, so the vertical raster
 * scale is the only knob and it scales the page uniformly - a capture that was
 * scaled on one axis and not the other would be a capture of a stretched page.
 *
 * Rounded up, because Chrome writes whole pixels and 793.7 CSS px at 2x is 1588
 * and not 1587: a capture a pixel short of the page is a capture with the last
 * row of the margin missing, and nothing in the file says so.
 */
export function rasterSize({ page, rasterScale }) {
  if (!(page?.width > 0) || !(page?.height > 0)) {
    throw new Error(
      `The page box ${JSON.stringify(page)} is not a length, so a capture has no raster size to be written at.`
    );
  }
  if (!(rasterScale > 0) || !Number.isFinite(rasterScale)) {
    throw new Error(`A vertical raster scale of ${rasterScale} is not a scale, so no capture can be taken at it.`);
  }

  return {
    width: Math.ceil(page.width * rasterScale),
    height: Math.ceil(page.height * rasterScale),
  };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The raster size a PNG declares in its own header.
 *
 * The eight-byte signature, then the IHDR chunk length and type, then the
 * width and height as big-endian 32-bit integers at offsets 16 and 20. Reading
 * the bytes rather than believing the capture call is ADR-0012's lesson applied
 * to a second file format: a capture at the wrong size and a capture at the
 * right one are indistinguishable in a directory listing.
 *
 * `null` means "could not be read", which is a failure at the call site and
 * never a zero. A truncated file has no dimensions to report, and reporting 0x0
 * for it would let a broken capture pass as an empty one.
 */
export function readPngSize(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24) return null;
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Decide whether the written bytes are a believable capture of a sheet.
 *
 * The same shape as `validatePdf` and for the same reason: the checks a
 * directory listing cannot make are the file's own bytes. Every problem is
 * reported rather than the first, so one run tells the whole story about all the
 * sheets rather than one sheet per run.
 */
export function validatePng({ label, bytes, expected }) {
  const problems = [];
  const size = bytes ? bytes.length : 0;

  if (!bytes || size === 0) {
    problems.push(`${label} was not written (the file is empty or absent).`);
    return { ok: false, label, bytes: size, size: null, expected, problems };
  }

  if (size < MIN_PNG_BYTES) {
    problems.push(`${label} is truncated: ${size} bytes, under the ${MIN_PNG_BYTES} byte floor.`);
  }

  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    problems.push(`${label} does not begin with the PNG signature; it is not a PNG.`);
  }

  const declared = readPngSize(bytes);
  if (!declared) {
    problems.push(`${label} declares no readable raster size, so its dimensions cannot be checked.`);
  } else if (declared.width !== expected.width || declared.height !== expected.height) {
    problems.push(
      `${label} is ${declared.width}x${declared.height}px, not the ${expected.width}x${expected.height}px ` +
        'this run asked for, so it is a capture of something other than a sheet at the raster scale in use.'
    );
  }

  return { ok: problems.length === 0, label, bytes: size, size: declared, expected, problems };
}

/**
 * The page number a sheet's footer prints.
 *
 * `12 of 48` rather than a bare `12`, because a reader holding forty pages of
 * reference tables needs to know whether the book ends at twenty or at sixty.
 * The total is the sheet count, which is known the moment every source page has
 * been measured - the thing the footer needs is free once the run knows how many
 * sheets it printed.
 *
 * Refuses rather than formatting a number it cannot vouch for. A footer that
 * printed "12 of 0", or a page number past the end of the book, would be a
 * confidently wrong artifact of the kind this whole feature exists to avoid.
 */
export function pageNumberLabel(page, total) {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error(
      `A page number needs a sheet count to be "n of m", and ${total} is not one, so nothing was printed.`
    );
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page numbers start at 1 and ${page} is not a page number.`);
  }
  if (page > total) {
    throw new Error(`Page ${page} is past the end of a book of ${total} pages, so the numbering is wrong.`);
  }

  return `${page} of ${total}`;
}

/**
 * The file name a sheet is captured to.
 *
 * Numbered by the sheet's own number, so a directory listing of the captures is
 * the book's page order and a diff over the captures reads as a diff over the
 * book.
 *
 * One file per sheet, not one per printed page, because that is what can be
 * captured faithfully. A capture is a clip of the rendered document, and the
 * rendered document has no page margin between a sheet's first page and its
 * second: in print the 25mm top margin is added by the page box on every page,
 * and there is nowhere on screen for it to appear. So sheet one of two is a
 * capture and sheet two is not, rather than a capture that shows the bottom of
 * one page where the top of the next should be. Splitting a source page into
 * sheets that are one page each is what makes every page capturable, and that is
 * the next ticket's work.
 */
export function pngFileName(sheetNumber) {
  if (!Number.isInteger(sheetNumber) || sheetNumber < 1) {
    throw new Error(`Sheets are numbered from 1 and ${sheetNumber} is not a sheet number.`);
  }

  return `sheet-${String(sheetNumber).padStart(2, '0')}.png`;
}

/* -------------------------------------------------------------------------
 * Columns
 * ---------------------------------------------------------------------- */

/**
 * Sub-pixel slack before an element counts as too wide for its column.
 *
 * 642.52px of text block less a 30px gutter does not divide into two whole columns, so
 * Chrome hands back 306.5 rather than 306 and a paragraph can legitimately be
 * 306.4 wide. Treating that as an overflow would span most paragraphs across
 * both columns and destroy the two-column measure the span exists to protect.
 */
export const COLUMN_TOLERANCE_PX = 1;

/**
 * Which of the measured elements are too wide for their column.
 *
 * The answer is measured rather than declared, because the alternative is a
 * stylesheet rule listing which kinds of element span, and the house-rule pages
 * contain two shapes of wide thing this repository has never had to classify: a
 * weapon-properties table with eight columns of reference text, and a scroll
 * container whose own box fits while its table does not. Reading both `width` and
 * `scrollWidth` is what catches the second one.
 *
 * Indices rather than elements, so the injected assignment - which is the only
 * thing allowed to touch the page - applies the answer without this helper
 * needing a DOM.
 *
 * A box that could not be measured counts as wide. The absence of a measurement
 * is not evidence that the element fits, and assuming it does is exactly how a
 * reference table ends up clipped on a sheet the run reported as correct.
 */
export function elementsWiderThanColumn({ columnWidth, boxes, tolerance = COLUMN_TOLERANCE_PX }) {
  if (!(columnWidth > 0)) {
    throw new Error(`A column width of ${columnWidth} is not a length, so nothing can be measured against it.`);
  }

  return boxes.reduce((wide, box, index) => {
    const width = Number(box?.width);
    const content = Number(box?.scrollWidth);
    const measured = [width, content].filter(Number.isFinite);

    return measured.length === 0 || Math.max(...measured) > columnWidth + tolerance ? [...wide, index] : wide;
  }, []);
}
