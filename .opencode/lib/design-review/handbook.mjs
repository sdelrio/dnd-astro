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

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CdpClient, fetchDebuggerUrl } from './cdp.mjs';
import { assessFontReadiness, clearStaleCapture } from './capture-helpers.mjs';
import {
  FONT_CDN_PATTERNS,
  HELP,
  describeSheets,
  formatPdfFontGateFailure,
  pageCountBounds,
  parseArgs,
  validatePdf,
} from './handbook-helpers.mjs';
import { LAYOUT_GLOBAL, sheetAssignmentScript } from './handbook-sheet.mjs';
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

      log.info(
        `Source pages: ${layout.sheets.length}, sheets: ${layout.sheets.length}, ` +
          `pages: ${pageBounds.min} to ${pageBounds.max}`
      );
      for (const line of describeSheets(layout.sheets)) log.info(line);

      const overlong = layout.sheets.filter((sheet) => sheet.pages > 1);
      if (overlong.length > 0) {
        log.warn(
          `${overlong.length} of ${layout.sheets.length} source pages do not fit one sheet and are not` +
            ' split yet, so their overflow lands on the pages after it.'
        );
      }

      const printed = await client.send(
        'Page.printToPDF',
        // `preferCSSPageSize` is what makes the geometry the stylesheet's to
        // choose: the `@page` size and margins in the print stylesheet are the
        // only place the page size is written down. `printBackground` because a
        // sheet is not a sheet without its ink.
        { printBackground: true, preferCSSPageSize: true },
        sessionId,
      );

      const bytes = Buffer.from(printed.data, 'base64');
      const verdict = validatePdf({ label, bytes, pageBounds });

      if (!verdict.ok) {
        log.error(`${label} was not written because it did not read back as the document it should be:`);
        for (const problem of verdict.problems) log.error(`  ${problem}`);
        clearStaleArtifact(outPath, label);
        return 1;
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
        log.error(`Removed ${label}; nothing was left behind.`);
        return 1;
      }

      log.info('');
      log.info(
        `  ok   ${options.out} - ${readBack.pages} pages (expected ${pageBounds.min} to ` +
          `${pageBounds.max}), A4, ${readBack.bytes} bytes, ${layout.sheets.length} sheets, ` +
          'selectable text with embedded fonts'
      );

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