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
  out: 'tmp/handbook/handbook.pdf',
  font: 'Cinzel',
  fontUrl: '/fonts/Cinzel.woff2',
};

/** Below this a file is a header and nothing else. Not a Handbook. */
export const MIN_PDF_BYTES = 1024;

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
and refuses to write a file it cannot read back.

Options:
  --url <url>              page to print          (default ${DEFAULTS.url})
  --out <file>             PDF to write           (default ${DEFAULTS.out})
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
      case '--out': options.out = next(); break;
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
 * assumed. The print fragmentainer holds 972 CSS px of document per page plus a
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
 * The run report: every source page by name, its measured height, and the pages
 * it took.
 *
 * The tracer bullet does not split a source page that does not fit, so the
 * overflow is a fact the run states rather than a detail to find in the
 * artifact. Step 4 replaces the arithmetic with splits that are named.
 */
export function describeSheets(sheets) {
  const lines = sheets.map(
    (sheet) =>
      `  ${sheet.slug} - ${sheet.title} - ${sheet.contentHeight}px - ${sheet.pages} ` +
      `${sheet.pages === 1 ? 'page' : 'pages'}` +
      (sheet.pages > 1 ? ' (more than one sheet)' : '')
  );

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