#!/usr/bin/env node
/**
 * One command prints the Handbook, and refuses to print a misleading one.
 *
 *   node .opencode/lib/design-review/handbook.mjs
 *
 * It renders a print route - the eight `dnd/` house-rule pages in sidebar order,
 * as one inert document - through the shared browser stack, and writes a single
 * A4 vector PDF with one fixed-size sheet per page.
 *
 * Five properties matter more than the PDF itself:
 *
 *   1. **The written file is read back.** PDF magic, the end-of-file trailer,
 *      the real page count and the page box are checked against the bytes that
 *      landed on disk, not against the fact that the command exited zero. A
 *      truncated or wrong-paged PDF looks exactly like a correct one in a
 *      directory listing.
 *   2. **The page count is predicted before it is read.** The sheet assignment
 *      reports how tall each source page turned out to be, so the number of
 *      pages the layout should have produced is arithmetic rather than a hope.
 *      A file that paginated differently is a failure, not a warning.
 *   3. **The font gate is a refusal, not a warning.** The same gate the capture
 *      command runs, reused rather than copied: if the display face is not
 *      genuinely loaded, this exits non-zero naming the font and writes
 *      nothing.
 *   4. **The route ships no JavaScript.** The sheet assignment is injected at
 *      document start through the same mechanism the capture command uses to
 *      seed the theme, so the committed route is inert HTML.
 *   5. **The screen cascade, not the print one.** The page is emulated as screen
 *      media and still fragments into sheets. That is ADR-0020's decision, and
 *      it is what keeps Starlight's print stylesheet - which re-declares the
 *      colour ramp to a cool blue at hue 224 - out of the artifact entirely.
 *
 * Nothing here enters the build: no manifest entry, no lockfile change, no
 * allow-list change. Verify with `git diff -- package.json pnpm-lock.yaml
 * pnpm-workspace.yaml`, which must come back empty (ADR-0007, ADR-0011).
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CdpClient, fetchDebuggerUrl } from './cdp.mjs';
import { assessFontReadiness, clearStaleCapture } from './capture-helpers.mjs';
import {
  FONT_CDN_PATTERNS,
  HELP,
  describeSheets,
  describeSplits,
  formatPdfFontGateFailure,
  pageCountBounds,
  parseArgs,
  pngFileName,
  rasterSize,
  validatePdf,
  validatePng,
} from './handbook-helpers.mjs';
import { compareCaptures, describeComparison } from './handbook-captures.mjs';
import { buildManifest, manifestText, sourceEntries, validateManifest } from './handbook-manifest.mjs';
import { LAYOUT_GLOBAL, SHEET_ATTRIBUTE, sheetAssignmentScript } from './handbook-sheet.mjs';
import {
  REPO_ROOT,
  closePageSession,
  ensureServer,
  evaluate,
  fontProbeScript,
  launchFirstUsableBrowser,
  log,
  navigate,
  openPageSession,
  resolveBrowserCandidates,
  setViewport,
} from './session.mjs';

/**
 * The emulated media the Handbook is printed under.
 *
 * `screen`, deliberately and visibly. ADR-0020's decision is that the artifact
 * is laid out through the screen cascade and paginated by explicit sheet boxes,
 * because Starlight's print stylesheet re-declares the site's colour ramp to a
 * cool blue at hue 224 and the warm bark ramp survives today only because the
 * site's stylesheet loads later. Naming the choice here is how a reader of this
 * file can see that print media was not needed.
 */
const PRINT_MEDIA = Object.freeze({ media: 'screen' });

/**
 * Remove a PDF an earlier run left at the path this one is about to write.
 *
 * A refusal that leaves the previous run's file in place is not a refusal: a
 * reader looking for the Handbook finds one, with no way to know it came from a
 * run whose font gate failed.
 */
function clearStaleArtifact(path, label) {
  const removed = clearStaleCapture(path, (target) => rmSync(target, { force: true }), {
    exists: existsSync,
  });
  if (removed) log.warn(`Removed a leftover ${label} from an earlier run.`);
  return removed;
}

export async function run(argv) {
  let options;

  try {
    options = parseArgs(argv);
    if (options.help) {
      log.info(HELP);
      return 0;
    }
  } catch (error) {
    log.error(error.message);
    return 1;
  }

  // The server is checked before the browser, as in the capture command: a
  // missing dev server is the common case, and reporting it before spending a
  // filesystem walk and a launch on browser resolution is faster and clearer.
  const server = await ensureServer(options);
  if (server === false) return 1;

  let candidates;
  try {
    candidates = resolveBrowserCandidates();
  } catch (error) {
    if (typeof server === 'function') server();
    throw error;
  }

  const outPath = resolve(REPO_ROOT, options.out);
  const label = outPath.split('/').pop();
  mkdirSync(dirname(outPath), { recursive: true });

  const launched = await launchFirstUsableBrowser(candidates);
  let client;

  try {
    client = await CdpClient.connect(await fetchDebuggerUrl(launched.port));

    // Two page targets rather than two navigations on one target. The first
    // loads the route once to learn the sheet box, because the viewport has to
    // be the sheet box *before* the measurement that decides pagination - and
    // re-navigating a single target is the hang the capture command documents.
    // It runs the same injected assignment rather than a second read of the same
    // two custom properties, so the geometry this command uses is the geometry
    // the assignment measured.
    const probeTarget = await openPageSession(client, PRINT_MEDIA);
    let sheetBox;

    try {
      await client.send(
        'Page.addScriptToEvaluateOnNewDocument',
        { source: sheetAssignmentScript() },
        probeTarget.sessionId,
      );
      await navigate(client, probeTarget.sessionId, options.url);
      sheetBox = (await readLayout(client, probeTarget.sessionId, options.url)).sheet;
      log.info(`Sheet box: ${sheetBox.width}x${sheetBox.height} (read from the rendered page)`);
    } finally {
      await closePageSession(client, probeTarget);
    }

    const { targetId, sessionId } = await openPageSession(client, PRINT_MEDIA);

    try {
      if (options.simulateFontCdnOutage) {
        // Set on this session, before any content loads, or the CDN answers
        // first and the gate is never actually exercised.
        await client.send('Network.setBlockedURLs', { urls: FONT_CDN_PATTERNS }, sessionId);
      }

      // The sheet assignment, at document start, before the first paint. The
      // route is inert HTML; this is the whole of its behaviour.
      await client.send(
        'Page.addScriptToEvaluateOnNewDocument',
        { source: sheetAssignmentScript() },
        sessionId,
      );

      // The viewport is the sheet box, so the screen layout the sheet
      // assignment measures is the print layout the PDF is made from. Starlight
      // steps its heading scale at 50em, so a wider viewport would measure a
      // larger document than the one that gets printed.
      await setViewport(client, sessionId, {
        width: sheetBox.width,
        height: sheetBox.height,
        // Desktop emulation, deliberately: the capture command's helper infers
        // a phone from a sub-768px width, and mobile emulation makes Chrome lay
        // the page out against a default layout viewport of 980px when there is
        // no viewport meta - which moves every media-query breakpoint and
        // measures a document that is not the one that gets printed.
        mobile: false,
      });
      await navigate(client, sessionId, options.url);

      const gate = await fontGate(client, sessionId, options);
      if (!gate.ok) {
        log.error(
          formatPdfFontGateFailure({ family: options.font, url: options.fontUrl, detail: gate.detail })
        );
        clearStaleArtifact(outPath, label);
        clearStaleManifest(options);
        log.error(`Nothing was written to ${options.out}.`);
        return 1;
      }
      log.info(`Font gate: ${gate.detail}`);

      const layout = await readLayout(client, sessionId, options.url);

      const pageBounds = pageCountBounds(layout.sheets, layout.sheet.height);
      const widths = [...new Set(layout.sheets.map((sheet) => sheet.box.width))];

      // The box height is legitimately larger than the sheet when a source page
      // does not fit, so only the width is an invariant: every sheet is as wide
      // as the printable area, or the pagination below is counting the wrong
      // document.
      if (widths.length > 1 || widths[0] !== layout.sheet.width) {
        log.warn(
          `The sheets laid out at ${widths.join(' and ')}px wide, not the ${layout.sheet.width}px the ` +
            'print stylesheet declares, so the page count below is bounded against the wrong measure.'
        );
      }

      // Front matter is a sheet of the book but not a sheet printed from a source
      // page, so it is not counted as one: this is the number of pages the book
      // is made from.
      const sources = new Set(
        layout.sheets.filter((sheet) => sheet.kind === 'source').map((sheet) => sheet.source)
      ).size;

      log.info(
        `Source pages: ${sources}, sheets: ${layout.sheets.length}, ` +
          `pages: ${pageBounds.min} to ${pageBounds.max}`
      );
      for (const line of describeSheets(layout.sheets)) log.info(line);

      // The split report, in full and by name. A boundary this run chose and did
      // not say so is a boundary that can change with nothing to show for it, so
      // every one of them is printed here and recorded in the manifest beside it.
      const splitLines = describeSplits(layout.splits);
      if (layout.splits.length > 0) log.warn(`${layout.splits.length} automatic splits:`);
      for (const line of splitLines) log.info(line);

      const spanning = layout.sheets.filter((sheet) => sheet.pages > 1);
      if (spanning.length > 0) {
        log.warn(
          `${spanning.length} of ${layout.sheets.length} sheets still span more than one printed page: ` +
            `${spanning.map((sheet) => `sheet ${sheet.number}`).join(', ')}. Nothing was clipped, but a ` +
            'sheet that spans pages has no capture of its later pages.'
        );
      }

      const printed = await client.send(
        'Page.printToPDF',
        // `preferCSSPageSize` is what makes the geometry the stylesheet's to
        // choose: the `@page` size and margins in the print stylesheet are the
        // only place the page size is written down. `printBackground` because a
        // sheet is not a sheet without its ink, and the parchment is ink.
        { printBackground: true, preferCSSPageSize: true },
        sessionId
      );

      const bytes = Buffer.from(printed.data, 'base64');
      const verdict = validatePdf({ label, bytes, pageBounds });

      if (!verdict.ok) {
        log.error(`${label} was not written because it did not read back as the document it should be:`);
        for (const problem of verdict.problems) log.error(`  ${problem}`);
        clearStaleArtifact(outPath, label);
        clearStaleManifest(options);
        return 1;
      }

      const captures = await captureSheets({ client, sessionId, layout, options });

      if (captures.problems.length > 0) {
        log.error('The per-sheet captures were not written because they did not read back as sheets:');
        for (const problem of captures.problems) log.error(`  ${problem}`);
        for (const name of captures.expected) clearStaleArtifact(join(captures.dir, name), name);
        clearStaleArtifact(outPath, label);
        clearStaleManifest(options);
        return 1;
      }

      for (const name of captures.expectedNames) {
        if (!captures.written.includes(name)) clearStaleArtifact(join(captures.dir, name), name);
      }


      // Written to a staging sibling and renamed, so a crash mid-write cannot
      // leave a half-written PDF at the path a reader looks at.
      const staging = `${outPath}.part`;
      writeFileSync(staging, bytes);
      renameSync(staging, outPath);

      // Read back from disk, not from the buffer that was written: the file is
      // what a reader downloads, so the file is what gets validated.
      const onDisk = readFileSync(outPath);
      const readBack = validatePdf({ label, bytes: onDisk, pageBounds });

      if (!readBack.ok) {
        log.error(`${label} was written but does not read back as the document it should be:`);
        for (const problem of readBack.problems) log.error(`  ${problem}`);
        rmSync(outPath, { force: true });
        clearStaleManifest(options);
        log.error(`Removed ${label}; nothing was left behind.`);
        return 1;
      }

      // Written last, because the manifest is a record of the artifact rather than
      // a step towards it: a run whose PDF did not land has no book to record, and
      // a record of a book that does not exist is worse than no record.
      const manifest = writeManifest({ layout, options });

      if (!manifest.ok) {
        log.error(`${options.manifest} was not written because it did not read back as the record it is:`);
        for (const problem of manifest.problems) log.error(`  ${problem}`);
        clearStaleArtifact(manifestPath(options), options.manifest);
        rmSync(outPath, { force: true });
        return 1;
      }

      reportCaptures({ captures, options });

      log.info('');
      log.info(
        `  ok   ${options.out} - ${readBack.pages} pages (expected ${pageBounds.min} to ` +
          `${pageBounds.max}), A4, ${readBack.bytes} bytes, ${layout.sheets.length} sheets, ` +
          'selectable text with embedded fonts'
      );
      if (manifest.skipped) {
        log.info('  --   no manifest: this run printed something other than the book, so it recorded nothing');
      } else {
        log.info(`  ok   ${options.manifest} - ${manifest.bytes} bytes, ${layout.sheets.length} sheets, ${layout.splits.length} splits`);
      }

      return 0;
    } finally {
      await closePageSession(client, { targetId });
    }
  } finally {
    client?.close();
    await launched.cleanup();
    if (typeof server === 'function') server();
  }
}

/**
 * Where the committed manifest for this run goes.
 *
 * `null` when the run was told to record nothing, which is what a spike-fixture
 * run wants: it is two made-up sheets, and a record of them would be a record of
 * the book that says the book is two pages long.
 */
function manifestPath(options) {
  return options.manifest === null ? null : resolve(REPO_ROOT, options.manifest);
}

/**
 * Remove a manifest an earlier run left at the path this one is about to write.
 *
 * The same reasoning as the PDF: a refusal that leaves the previous run's record
 * in place is a record of a book nobody has, and the next thing a reader does with
 * it is believe it.
 */
function clearStaleManifest(options) {
  const target = manifestPath(options);
  if (target === null) return false;

  return clearStaleArtifact(target, options.manifest);
}

/**
 * Write the manifest, and read it back before believing it.
 *
 * Staged and renamed like the PDF, so a crash mid-write cannot leave half a
 * record where the gate looks for one - and validated twice, because the thing a
 * test reads is the file on disk rather than the string this process assembled.
 * A record that does not say what it is, or whose combined hash disagrees with
 * the sources beside it, is a failure rather than a file.
 */
function writeManifest({ layout, options }) {
  const target = manifestPath(options);
  if (target === null) return { ok: true, skipped: true, problems: [], bytes: 0 };

  const manifest = buildManifest({
    sources: sourceEntries(REPO_ROOT),
    sheets: layout.sheets,
    splits: layout.splits,
  });
  const text = manifestText(manifest);

  const verdict = validateManifest({ label: options.manifest, text });
  if (!verdict.ok) return { ok: false, skipped: false, problems: verdict.problems, bytes: 0 };

  mkdirSync(dirname(target), { recursive: true });
  const staging = `${target}.part`;
  writeFileSync(staging, text);
  renameSync(staging, target);

  const readBack = validateManifest({ label: options.manifest, text: readFileSync(target, 'utf8') });

  return { ok: readBack.ok, skipped: false, problems: readBack.problems, bytes: Buffer.byteLength(text, 'utf8') };
}

/**
 * The optional local image comparison.
 *
 * Two modes and both are off by default, because the captures are hundreds of
 * kilobytes a sheet and are not in version control: `--baseline` records this
 * run's, `--compare` reports which sheets differ from a recorded set. Neither one
 * can fail the run. A changed sheet is a reason to look at that page; the gate is
 * the manifest, and a gate that fires on a font hinting change teaches people to
 * ignore it.
 */
function reportCaptures({ captures, options }) {
  if (options.baseline !== null) {
    const dir = resolve(REPO_ROOT, options.baseline);
    mkdirSync(dir, { recursive: true });

    for (const name of readdirSync(dir)) {
      if (/^sheet-\d+\.png$/.test(name)) rmSync(join(dir, name), { force: true });
    }
    for (const name of captures.written) copyFileSync(join(captures.dir, name), join(dir, name));

    log.info(`Baseline: ${captures.written.length} captures recorded at ${options.baseline} (outside version control)`);
  }

  if (options.compare !== null) {
    const comparison = compareCaptures({
      runDir: captures.dir,
      baselineDir: resolve(REPO_ROOT, options.compare),
      // The path as the run was asked for it, which is what the output quotes.
      label: options.compare,
    });

    // A baseline nobody has made is a mistake worth a warning; a difference is a
    // fact worth a line. Neither fails the run, which is the whole point of it.
    const report = describeComparison(comparison);
    if (comparison.hasBaseline) log.info(report);
    else log.warn(report);
  }
}

/**
 * A failure that is a refusal rather than a bug, so the exit prints its message
 * and not a stack trace.
 */
class RouteError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RouteError';
  }
}

/**
 * One line per sheet: where it is in the document and how tall it turned out to
 * be.
 *
 * Read from `offsetTop` and `offsetHeight` rather than from a bounding box,
 * because the captures move the page and a bounding box reports the move. These
 * are the layout positions, so a capture that shifted a sheet shows up as no
 * change here - which is the claim being made - while a capture that actually
 * relaid a sheet out would not.
 */
const LAYOUT_FINGERPRINT_SCRIPT = `(() => [...document.querySelectorAll('[${SHEET_ATTRIBUTE}]')]
  .map((element) =>
    \`\${element.getAttribute('${SHEET_ATTRIBUTE}')}@\${element.offsetTop}+\${element.offsetHeight}\`
  )
  .join('|'))()`;

/**
 * Where a sheet's printed page starts, in document coordinates, for the capture.
 *
 * Every capture is the first page box of the document, and each sheet is moved
 * onto it in turn while the others are hidden.
 *
 * The page box is the sheet's content area plus the margins the `@page` rule
 * declares, and ADR-0020 aligns the sheet with the *content*: the margins exist
 * in the page box and nowhere in the document. So the document has to be put
 * where the page box puts the content before a capture can show the page.
 *
 * Built by construction rather than inferred, and that is the whole point. Laying
 * the sheets out on a page grid would have to know how many pages the sheets
 * before each one took, and ADR-0020 records that the page count is a floor and a
 * ceiling rather than an exact total - measured, this document bounds between 8
 * and 39 pages and prints 37. A grid the run lays out itself has no such
 * uncertainty, and hiding the other sheets is what keeps a four-page sheet's
 * second page out of the next sheet's capture.
 *
 * The move is a transform rather than margins, for two reasons. Margins between
 * adjacent sheets collapse, so the sheet before this one's bottom margin and this
 * one's top margin would become one number and the arithmetic would be wrong by
 * however much the larger was. And a transform lays nothing out, so the document
 * the capture is taken from is the document the PDF was printed from - which is
 * checked rather than assumed, by comparing the layout either side of it.
 *
 * The capture is the sheet's *first* printed page. A sheet that spans three pages
 * has three, and only the first is capturable: the page boxes of pages two and
 * three exist only in the fragmentainer, and the run says which sheets those are.
 */
function pageGridOffset(sheet, page) {
  return page.marginTop - sheet.top;
}

/** The first page box, which is where every capture is taken. */
export const PAGE_CAPTURE_TOP = 0;

/**
 * Write one capture per sheet, at an exact raster size, from the same DOM the PDF
 * is printed from.
 *
 * Three things make a capture evidence about the artifact rather than a second
 * opinion about it, and all three are here:
 *
 *   - **The page box, not the sheet box.** A reader holds a page with margins on
 *     it. At the page box and a vertical raster scale of 2 that is 1588 x 2246,
 *     and the size is read back out of the PNG header rather than trusted from
 *     the capture call.
 *   - **The margins the `@page` rule adds.** ADR-0020 aligns the sheet with the
 *     page's *content* and leaves the margins to the page box, so the rendered
 *     document is the printable area with no page around it. The body is offset
 *     by the declared left margin and each sheet is moved down by the declared
 *     top margin, one sheet at a time with the others hidden - a translation of
 *     the same layout and not a second layout, because it is applied by a
 *     transform and undone afterwards. The layout either side of it is compared
 *     and the run refuses if it differs, which is what makes "the same DOM" a
 *     checked claim rather than an asserted one.
 *   - **One file per sheet.** A sheet that spills onto a second page has no
 *     second capture, because the top margin of page two exists only in the page
 *     box and there is nowhere on screen for it to be captured from. The run
 *     says which sheets those are rather than writing a picture of the wrong page.
 */
async function captureSheets({ client, sessionId, layout, options }) {
  const dir = resolve(REPO_ROOT, options.pngDir);
  const expected = rasterSize({ page: layout.page, rasterScale: options.rasterScale });
  const problems = [];
  const written = [];
  const expectedNames = layout.sheets.map((sheet) => pngFileName(sheet.number));

  mkdirSync(dir, { recursive: true });

  // Cleared first, so a run that produced fewer sheets than the last one did not
  // leave that run's captures behind: a stale `sheet-09.png` in a book of eight
  // is a page that is not in the book.
  for (const name of readdirSync(dir)) {
    if (/^sheet-\d+\.png$/.test(name)) rmSync(join(dir, name), { force: true });
  }

  // The page box, not the sheet box: a reader holds a page with margins on it,
  // and the sheet box is only that page's content area. Each sheet is moved onto
  // the first page box in turn, with the others hidden, and all of it is put back
  // afterwards.
  const before = await evaluate(client, sessionId, LAYOUT_FINGERPRINT_SCRIPT);
  const extent = Math.max(
    ...layout.sheets.map((sheet) => layout.page.marginTop + sheet.box.height + layout.page.marginBottom)
  );
  const apply = `(() => {
     const style = document.createElement('style');
     style.setAttribute('data-handbook-capture-inset', '');
     style.textContent = [
       'body { margin-left: ${layout.page.marginLeft}px; }',
       ':root { min-height: ${extent}px; }',
       '[data-handbook-sheet] { visibility: hidden; }',
     ].join('\\n');
     document.head.appendChild(style);
     return true;
   })()`;
  const restore = `(() => {
     for (const node of document.querySelectorAll('[data-handbook-capture-inset]')) node.remove();
     for (const sheet of document.querySelectorAll('[${SHEET_ATTRIBUTE}]')) sheet.removeAttribute('style');
     return true;
   })()`;
  // One sheet at a time, shown by inline style over a stylesheet that hides them
  // all. Hiding every sheet with a rule and then showing one with a second rule
  // would leave all of them visible, because each sheet carries both.
  //
  // Every sheet, keyed by the sheet attribute rather than by data-handbook-source:
  // the front matter is a sheet of the book too, and a reset that only cleared the
  // inline style off the source pages left the cover visible on every capture
  // taken after its own.
  const showOnly = (offset, number) => `(() => {
     for (const sheet of document.querySelectorAll('[${SHEET_ATTRIBUTE}]')) sheet.removeAttribute('style');
     const sheet = document.querySelector('[data-handbook-sheet="${number}"]');
     sheet.style.visibility = 'visible';
     sheet.style.transform = 'translateY(${offset}px)';
     return true;
   })()`;

  await evaluate(client, sessionId, apply);

  try {
    for (const sheet of layout.sheets) {
      await evaluate(client, sessionId, showOnly(pageGridOffset(sheet, layout.page), sheet.number));
      const name = pngFileName(sheet.number);
      const shot = await client.send(
        'Page.captureScreenshot',
        {
          format: 'png',
          captureBeyondViewport: true,
          clip: {
            x: 0,
            y: PAGE_CAPTURE_TOP,
            width: layout.page.width,
            height: layout.page.height,
            scale: options.rasterScale,
          },
        },
        sessionId
      );

      const bytes = Buffer.from(shot.data, 'base64');
      const verdict = validatePng({ label: name, bytes, expected });

      if (!verdict.ok) {
        problems.push(...verdict.problems);
        continue;
      }

      const target = join(dir, name);
      const staging = `${target}.part`;
      writeFileSync(staging, bytes);
      renameSync(staging, target);

      const readBack = validatePng({ label: name, bytes: readFileSync(target), expected });

      if (!readBack.ok) {
        problems.push(...readBack.problems.map((problem) => `${name} on disk: ${problem}`));
        rmSync(target, { force: true });
        continue;
      }

      written.push(name);
    }
  } finally {
    await evaluate(client, sessionId, restore);
  }

  const after = await evaluate(client, sessionId, LAYOUT_FINGERPRINT_SCRIPT);
  if (after !== before) {
    problems.push(
      'Moving the page for the captures changed the sheets, so the PNGs would be a picture of a ' +
        'different document from the PDF. Nothing about that is acceptable in an artifact meant to be ' +
        'evidence about it.'
    );
  }

  // Every sheet is one page unless a block in it was too tall for any sheet to
  // hold, and the split report above names those by name. What is left here is the
  // consequence: the top margin of a second page exists only in the page box, so a
  // sheet that spans two pages has a capture of its first page and none of the
  // other. Said here rather than left to be found by counting files.
  const spanning = layout.sheets.filter((sheet) => sheet.pages > 1);
  if (spanning.length > 0) {
    log.warn(
      `${spanning.length} of ${layout.sheets.length} sheets span more than one printed page and are ` +
        `captured at their first page only: ${spanning.map((sheet) => `sheet ${sheet.number}`).join(', ')}. ` +
        'The blocks that no sheet could hold are named in the split report above; shortening or breaking ' +
        'them is what closes that gap.'
    );
  }

  log.info(
    `Captures: ${written.length} of ${expectedNames.length} sheets at ` +
      `${expected.width} x ${expected.height}px (raster scale ${options.rasterScale}), in ${options.pngDir}`
  );

  return { dir, expected, problems, written, expectedNames };
}

/**
 * What the injected sheet assignment published, once it has.
 *
 * Polled rather than read once, because the assignment waits for the display
 * faces before it measures and the command needs the measurement rather than a
 * race with it. The refusal names the reason, because the two reasons are very
 * different and both are silent otherwise: a page that assigned nothing is not
 * the print route, and a print stylesheet that stopped declaring the sheet box
 * would otherwise print the whole document as one very long page.
 */
async function readLayout(client, sessionId, url) {
  const layout = await evaluate(
    client,
    sessionId,
    `(async () => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && !window.${LAYOUT_GLOBAL}) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return window.${LAYOUT_GLOBAL} ?? null;
    })()`
  );

  if (!layout || !layout.sheet?.width || !layout.sheet?.height) {
    throw new RouteError(
      `${url} assigned no sheets, so there is nothing to print and no page geometry to print it on. ` +
        'Either it is not the print route, or its print stylesheet declares no sheet box.'
    );
  }

  if (layout.sheets.length === 0) {
    throw new RouteError(`${url} carries no source pages, so there is nothing to print.`);
  }

  return layout;
}

/**
 * The shared font gate, asked the question the capture command asks.
 *
 * The decision is `assessFontReadiness`, which is the capture command's, and the
 * probe is `fontProbeScript`, which is too. Only the message afterwards is this
 * command's, because the thing that would have been written is a PDF.
 */
async function fontGate(client, sessionId, options) {
  const probe = await evaluate(client, sessionId, fontProbeScript(options.font));

  return assessFontReadiness({
    family: options.font,
    faces: probe.faces,
    check: probe.check,
    probe: probe.probe,
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      // A route that is not the print route is an expected refusal with a
      // message worth reading; anything else is a bug and wants its stack.
      log.error(error instanceof RouteError ? error.message : (error.stack ?? String(error)));
      process.exitCode = 1;
    });
}