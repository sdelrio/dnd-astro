/**
 * Pure helpers for the design-review capture command.
 *
 * Everything here is a function of its arguments: no filesystem, no browser, no
 * process. That is deliberate, because these are the parts that decide whether a
 * capture is believable. A capture command that cannot be tested without a
 * browser will be believed on trust, and a capture that is believed on trust is
 * the failure mode this command exists to prevent.
 *
 * See `capture.mjs` for the CDP client and `capture.test.mjs` for the command.
 */

/** The 8-byte PNG file signature, as it appears at offset 0 of every PNG. */
export const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Below this, a file is a header and nothing else. Not a capture. */
export const MIN_CAPTURE_BYTES = 1024;

/** Refuse viewports beyond this, so a typo cannot ask the browser for nonsense. */
const MAX_VIEWPORT_EDGE = 10000;

const CAPTURE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The environment variable that names a browser explicitly. Duplicated as a
 * literal from `browser-paths.mjs` so this module stays free of the filesystem,
 * and pinned by a test so the two cannot drift apart quietly.
 */
export const OVERRIDE_ENV = 'DESIGN_REVIEW_CHROME';

/**
 * Parse a `<width>x<height>` viewport, e.g. `1440x900`.
 *
 * Throws with the offending value in the message: a viewport string is written
 * by a person in a shell, and the string is the only useful thing to echo back.
 */
export function parseViewport(value) {
  const raw = String(value ?? '').trim();
  const match = /^(\d+)x(\d+)$/i.exec(raw);

  if (!match) {
    throw new Error(`Not a viewport: ${raw}. Expected <width>x<height>, for example 1440x900.`);
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (width < 1 || height < 1) {
    throw new Error(`Viewport ${raw} has a zero edge; nothing would be captured.`);
  }

  if (width > MAX_VIEWPORT_EDGE || height > MAX_VIEWPORT_EDGE) {
    throw new Error(
      `Viewport ${raw} is implausible; no edge may exceed ${MAX_VIEWPORT_EDGE}px.`,
    );
  }

  return { width, height };
}

/**
 * Parse a comma-separated capture set, e.g. `desktop=1440x900,mobile=390x844`.
 *
 * The name is a file stem, so it is constrained to one: a name that could climb
 * out of the review directory is rejected rather than sanitised, because a
 * silently-rewritten path is how a capture ends up somewhere nobody looks.
 */
export function parseCaptureSet(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    throw new Error('No captures requested. Expected name=widthxheight entries.');
  }

  const seen = new Set();

  return raw.split(',').map((entry) => {
    const trimmed = entry.trim();
    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      throw new Error(`Capture entry ${trimmed} is missing its =. Expected name=widthxheight.`);
    }

    const name = trimmed.slice(0, separator).trim();
    const viewport = trimmed.slice(separator + 1).trim();

    if (!CAPTURE_NAME_PATTERN.test(name)) {
      throw new Error(
        `Capture name ${name} is not a plain file stem (lowercase letters, digits, hyphens).`,
      );
    }

    if (seen.has(name)) {
      // Two captures at the same name is a typo, and the second silently
      // overwrites the first, which loses a width without saying so.
      throw new Error(`Capture name ${name} is requested twice; each viewport needs its own name.`);
    }
    seen.add(name);

    return { name, ...parseViewport(viewport) };
  });
}

/**
 * Read width and height from a PNG's IHDR chunk, or null if these bytes are not
 * a PNG with a readable header.
 *
 * The IHDR is always the first chunk of a PNG, so the 33 bytes this reads are
 * the same 33 bytes in every valid file. A shorter read means a truncated write.
 */
export function readPngDimensions(bytes) {
  if (!bytes || bytes.length < 33) return null;

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) return null;
  }

  // Bytes 12..15 spell 'IHDR' only if this really is a PNG and not something
  // else wearing the signature.
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * Decide whether bytes on disk are a believable capture.
 *
 * The point is to refuse three specific lies: a file that was never written, a
 * file that was cut short, and a file at the wrong width. A capture at 500px
 * when 390 was requested looks identical to a correct one in a directory
 * listing, which is exactly why it has to be measured rather than assumed.
 *
 * Every problem is reported, not just the first, so one run tells the whole
 * story.
 */
export function validateCapture({ label, bytes, expectedWidth, minBytes = MIN_CAPTURE_BYTES }) {
  const problems = [];
  const size = bytes ? bytes.length : 0;
  const dimensions = readPngDimensions(bytes);

  if (!bytes || size === 0) {
    problems.push(`${label} was not written (the file is empty or absent).`);
  } else if (size < minBytes) {
    problems.push(`${label} is truncated: ${size} bytes, under the ${minBytes} byte floor.`);
  }

  if (bytes && size > 0 && !dimensions) {
    problems.push(`${label} is truncated or not a PNG: no readable IHDR header.`);
  }

  if (dimensions && dimensions.width !== expectedWidth) {
    problems.push(
      `${label} is ${dimensions.width} wide, but ${expectedWidth} was requested. ` +
        'The width is a property of the capture request, not of the page.',
    );
  }

  return {
    ok: problems.length === 0,
    label,
    bytes: size,
    width: dimensions ? dimensions.width : null,
    height: dimensions ? dimensions.height : null,
    expectedWidth,
    problems,
  };
}

/**
 * Remove a capture left behind by an earlier run at a path this run could not
 * fill honestly.
 *
 * A stale file is the quietest way for this command to lie. The reviewer looks
 * for `desktop.png`; if this run refused to produce one and the previous run's
 * file is still sitting there, the refusal accomplished nothing. So a run that
 * cannot write a valid capture makes sure there is nothing to find.
 */
export function clearStaleCapture(path, remove, { exists = assumePresent } = {}) {
  if (!exists(path)) return false;
  remove(path);
  return true;
}

/** Removing something that is not there is a no-op, so the check is optional. */
function assumePresent() {
  return true;
}

/**
 * Every browser this command is willing to launch, in resolution order.
 *
 * Resolution order, and the order `formatBrowserNotFound` reports:
 *   1. `override`            - the DESIGN_REVIEW_CHROME environment variable
 *   2. `cached`              - Chrome for Testing builds in a Puppeteer cache
 *   3. `installed`           - a browser installed in the usual places or on PATH
 *
 * Nothing is ever downloaded.
 *
 * The list is a list rather than a single answer because a binary that exists
 * is not the same as a binary that will open a debugging port. The cached tier
 * therefore contributes several candidates and the caller tries them in turn.
 * That leniency is not extended to the override: someone who named a binary
 * meant it, and quietly capturing with a different browser than the one they
 * asked for is the same class of lie as a capture at the wrong width.
 */
export function browserCandidates({ override, cached = [], installed = [], isExecutable }) {
  if (override) {
    if (!isExecutable(override)) {
      throw new Error(
        `DESIGN_REVIEW_CHROME is set to ${override}, which is not an executable file. ` +
          'Fix the variable or unset it; the command will not silently use a different browser.',
      );
    }
    return [{ path: override, source: 'override' }];
  }

  const candidates = [];

  for (const path of cached) {
    if (isExecutable(path)) candidates.push({ path, source: 'chrome-for-testing' });
  }

  for (const path of installed) {
    if (isExecutable(path)) candidates.push({ path, source: 'installed' });
  }

  if (candidates.length === 0) {
    throw new Error(formatBrowserNotFound({ override, cached, installed }));
  }

  return candidates;
}

/**
 * The message when every candidate was found but none would open a debugging
 * port. Both halves matter: which binaries were tried, and why each was skipped.
 */
export function formatNoUsableBrowser(candidates, failures) {
  const lines = [
    'Every browser this command resolved exists but would not open a DevTools port.',
    '',
  ];

  for (const failure of failures) {
    lines.push(`  ${failure.path}`, `    ${failure.reason}`, '');
  }

  lines.push(
    'Set DESIGN_REVIEW_CHROME to a browser that does open one.',
    '',
    'Tried, in order:',
    ...candidates.map((candidate, index) => `  ${index + 1}. ${candidate.path} (${candidate.source})`),
  );

  return lines.join('\n');
}

/** The no-browser-found message, listing every tier in resolution order. */
export function formatBrowserNotFound({ override, cached = [], installed = [] }) {
  const lines = [
    'No browser found. This command resolves a browser already on this machine and',
    'never downloads one. Resolution order:',
    `  1. ${OVERRIDE_ENV.padEnd(20)} ${override ?? '(unset)'}`,
    `  2. ${'cached Chrome for Testing'.padEnd(20)} ${formatTier(cached)}`,
    `  3. ${'installed browser'.padEnd(20)} ${formatTier(installed)}`,
    '',
    'Install a browser, or point DESIGN_REVIEW_CHROME at one that is already here.',
  ];
  return lines.join('\n');
}

function formatTier(paths) {
  if (paths.length === 0) return '(none found)';
  return paths.join(`\n${' '.repeat(23)}`);
}

/**
 * Decide whether a display font is genuinely present and in effect.
 *
 * Three independent signals, because one is not enough:
 *   - `faces`  - a `FontFace` for the family exists with status `loaded`.
 *     Catches the swap-pause state, where the @font-face is registered but its
 *     bytes never arrived.
 *   - `check`  - `document.fonts.check()` says the family is usable. Catches a
 *     face that loaded but whose unicode range does not cover the headings.
 *   - `probe`  - the family measurably changes rendering. Catches everything
 *     else, including the case the ticket is really about: a page that quietly
 *     fell back to a self-hosted face while the browser reports no error at all.
 *
 * All three must pass. `detail` names which one failed, because "the font is not
 * loaded" is a much weaker statement than "Cinzel renders at the same width as
 * the fallback, so the fallback is what is on screen".
 */
export function assessFontReadiness({ family, faces = [], check, probe }) {
  const normalised = family.replace(/["']/g, '').trim().toLowerCase();
  const mine = faces.filter((face) => String(face.family).replace(/["']/g, '').trim().toLowerCase() === normalised);

  if (mine.length === 0) {
    return {
      ok: false,
      detail: `no loaded FontFace for ${family}; the CSS @font-face never registered`,
    };
  }

  const loaded = mine.filter((face) => face.status === 'loaded');

  if (loaded.length === 0) {
    return {
      ok: false,
      detail: `the ${family} FontFace is ${mine.map((f) => f.status).join(', ')}, not loaded (font-display: swap pause)`,
    };
  }

  if (check !== true) {
    return {
      ok: false,
      detail: `document.fonts.check("1em ${family}") was false`,
    };
  }

  if (!probe || typeof probe.candidateWidth !== 'number' || typeof probe.fallbackWidth !== 'number') {
    return { ok: false, detail: `could not measure ${family} against its fallback` };
  }

  if (probe.candidateWidth === probe.fallbackWidth) {
    return {
      ok: false,
      detail:
        `${family} renders at the same width as the fallback (${probe.fallbackWidth}px), ` +
        'so the fallback is what is painted',
    };
  }

  return {
    ok: true,
    detail:
      `${family} loaded (${loaded.length}/${mine.length} face(s)); renders ${probe.candidateWidth}px ` +
      `against a ${probe.fallbackWidth}px fallback`,
  };
}

/**
 * The font-gate failure message.
 *
 * This is the highest-value output in the command. The site's display face is
 * fetched from a third-party CDN at runtime with a `swap` display policy, so when
 * that fetch fails the page renders in its fallback face, correctly, silently,
 * and with no console warning. A screenshot of that state is not a bad capture,
 * it is a capture of a page nobody is going to ship. So the message names the
 * font, names where it comes from, names the check that failed, and says plainly
 * that nothing was written.
 */
export function formatFontGateFailure({ family, url, detail }) {
  return [
    `Display font ${family} is not loaded, so any capture of this page would show the`,
    `fallback face instead - wrong heading metrics, wrong line lengths, no error logged.`,
    '',
    `  Font:   ${family}`,
    `  Source: ${url}`,
    `  Check:  ${detail}`,
    '',
    `A capture taken now would be a plausible-looking lie, so no capture was written.`,
    `Make ${family} reachable (or serve it locally) and re-run.`,
  ].join('\n');
}

/** The dev-server hint, printed when the target URL is unreachable. */
export function formatDevServerHint(url) {
  return [
    `No dev server answered at ${url}.`,
    '',
    'This repo documents one server lifecycle. Start it in the background, then re-run:',
    '',
    '  astro dev --background',
    '',
    'To let this command start and stop the server itself, pass --start-dev-server,',
    'which shells out to the same documented command rather than a second one.',
  ].join('\n');
}
