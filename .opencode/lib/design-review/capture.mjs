#!/usr/bin/env node
/**
 * One command produces the two screenshots the impeccable design review contract
 * requires, and refuses to produce a misleading one.
 *
 *   node .opencode/lib/design-review/capture.mjs
 *
 * The vendored skill's contract (`skill/reference/new-work.md`) is exact: a
 * full-page `desktop.png` at 1440 wide and a `mobile.png` at 390, both in
 * `.impeccable/review/`. Nothing in this repo could produce them before.
 *
 * Three properties matter more than the screenshot itself:
 *
 *   1. The exact widths are *owned* here. The MCP server from ADR-0011 was
 *      observed returning a 500px-wide image for a 390px request, and nothing
 *      in the reply says so. So the width is requested through
 *      `Emulation.setDeviceMetricsOverride`, set as an explicit capture clip,
 *      and then read back out of the PNG that landed on disk.
 *   2. The capture is gated on the display font actually being loaded. The
 *      heading face is fetched from a third-party CDN at runtime with a `swap`
 *      display policy and a silent fallback to a self-hosted face. Captured
 *      after that fallback, the image has the wrong heading metrics and the
 *      wrong line lengths and no error is logged anywhere. This command exits
 *      non-zero naming the font instead.
 *   3. The dev server is not started unless asked for. The repo documents one
 *      lifecycle (`astro dev --background`); inventing a second one beside it is
 *      how two servers end up fighting over port 4321.
 *
 * Nothing here enters the build: no manifest entry, no lockfile change, no
 * allow-list change. Verify with `git diff -- package.json pnpm-lock.yaml
 * pnpm-workspace.yaml`, which must come back empty (ADR-0007, ADR-0011).
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { CdpClient, fetchDebuggerUrl, launchBrowser } from './cdp.mjs';
import {
  MIN_CAPTURE_BYTES,
  assessFontReadiness,
  formatDevServerHint,
  browserCandidates,
  clearStaleCapture,
  formatFontGateFailure,
  formatNoUsableBrowser,
  parseCaptureSet,
  validateCapture,
} from './capture-helpers.mjs';
import {
  BROWSER_OVERRIDE_ENV,
  cachedBrowserPaths,
  installedBrowserPaths,
  isExecutable,
} from './browser-paths.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const DEFAULTS = {
  url: 'http://localhost:4321/',
  outDir: '.impeccable/review',
  captures: 'desktop=1440x900,mobile=390x844',
  font: 'Cinzel',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
};

/** Third-party font endpoints, for the CDN-outage self-test. */
const FONT_CDN_PATTERNS = ['*fonts.googleapis.com*', '*fonts.gstatic.com*'];

/** Chrome refuses very large single captures; past this, report rather than lie. */
const MAX_CAPTURE_HEIGHT = 30000;

const HELP = `
Usage: node .opencode/lib/design-review/capture.mjs [options]

Writes the design review contract captures: a full-page desktop capture and a
mobile capture, into the review directory under the filenames the vendored
impeccable skill's reviewer looks for.

Options:
  --url <url>              page to capture        (default ${DEFAULTS.url})
  --out-dir <dir>          review directory       (default ${DEFAULTS.outDir})
  --captures <set>         name=WxH,...           (default ${DEFAULTS.captures})
  --font <family>          display face to gate on (default ${DEFAULTS.font})
  --font-url <url>         where that face comes from, named on failure
  --start-dev-server       opt in to running \`astro dev --background\` and stopping it
  --simulate-font-cdn-outage
                           block the font CDN before loading, to prove the gate fails
  --help                   this text

Browser resolution (never downloads one):
  1. ${BROWSER_OVERRIDE_ENV}
  2. cached Chrome for Testing builds in a Puppeteer cache directory
  3. an installed browser
`.trimStart();

export function parseArgs(argv) {
  const options = { ...DEFAULTS, startDevServer: false, simulateFontCdnOutage: false, help: false };

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
      case '--out-dir': options.outDir = next(); break;
      case '--captures': options.captures = next(); break;
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

/* -------------------------------------------------------------------------
 * In-page scripts
 * ---------------------------------------------------------------------- */

/**
 * Neutralise entrance animation, then walk the page.
 *
 * Two halves, and both are needed. The stylesheet kills animation and
 * transition timing outright; the walk fires every `IntersectionObserver` so
 * anything gated on entering the viewport is already revealed. Capturing a
 * full page does not scroll it, so without the walk everything below the fold
 * is painted in its pre-reveal state - which reads to a reviewer as a missing
 * element, and gets "fixed" into a regression. That is the design skill's own
 * capture-validity rule.
 *
 * The stylesheet is `!important` throughout because utility classes re-declare
 * `animation` and `transition` on the same elements at the same specificity.
 */
const WARM_UP_SCRIPT = `(() => {
  const style = document.createElement('style');
  style.setAttribute('data-design-review-capture', '');
  style.textContent = [
    '*,*::before,*::after{animation-delay:0s!important;animation-duration:0s!important;',
    'animation-iteration-count:1!important;animation-fill-mode:both!important;',
    'transition-delay:0s!important;transition-duration:0s!important;',
    'scroll-behavior:auto!important;}',
    '[x-cloak]{display:none!important;}',
  ].join('');
  document.head.appendChild(style);

  const settle = () => new Promise((done) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50))));

  return (async () => {
    const root = document.scrollingElement || document.documentElement;
    const total = root.scrollHeight;
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let offset = 0; offset <= total; offset += step) {
      window.scrollTo(0, offset);
      await settle();
    }
    window.scrollTo(0, 0);
    await settle();

    return {
      scrolledTo: total,
      cloakedRemaining: document.querySelectorAll('[x-cloak]').length,
      hiddenBelowFold: Array.from(document.querySelectorAll('main *')).filter((el) => {
        const style = getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      }).length,
    };
  })();
})()`;

/**
 * Measure whether the display font is genuinely in effect.
 *
 * Three signals, because the failure mode this exists for produces no error:
 * a registered `FontFace` that has actually loaded, `document.fonts.check`, and
 * a width probe. The probe is the decisive one - it renders the same string in
 * the display family and in a family that does not exist, and compares. If the
 * two widths match, the fallback is what is on screen no matter what the font
 * tables say.
 */
/** Built per run so the gated family is the one the caller asked for. */
function fontProbeScript(family) {
  return `(() => {
  const family = ${JSON.stringify(family)};
  return (async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]);
    }

    const faces = document.fonts
      ? Array.from(document.fonts).map((face) => ({ family: face.family, status: face.status }))
      : [];

    const measure = (fontFamily) => {
      const probe = document.createElement('span');
      probe.textContent = 'Handgloves 0123456789 The quick brown fox';
      probe.style.cssText =
        'position:absolute;left:-9999px;top:0;white-space:nowrap;font-size:48px;' +
        'font-family:' + fontFamily + ';';
      document.body.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    };

    return {
      status: document.fonts ? document.fonts.status : 'unsupported',
      faces,
      check: document.fonts ? document.fonts.check('1em ' + family) : false,
      probe: { candidateWidth: measure(family), fallbackWidth: measure('__no_such_face__') },
    };
  })();
})()`;
}

/* -------------------------------------------------------------------------
 * Steps
 * ---------------------------------------------------------------------- */

async function urlResponds(url, timeoutMs = 1500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Reach the URL, or explain how.
 *
 * The default is refusal, not a second server. `astro dev --background` is the
 * lifecycle this repo documents and the one its docs tell an agent to use; the
 * opt-in path shells out to that same command rather than inventing one.
 */
/**
 * The documented dev server command, as an executable this process can spawn.
 *
 * AGENTS.md documents `astro dev --background`, which works in a devbox shell
 * where the bin directory is on PATH. Spawned from a bare Node process it often
 * is not, so the repo's own binary is preferred when it exists. The arguments
 * are unchanged either way - this is the same lifecycle, not a second one.
 */
function devServerCommand(args) {
  const local = join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');
  return existsSync(local) ? { command: local, args } : { command: 'astro', args };
}

function runDevServer(args) {
  const { command, args: fullArgs } = devServerCommand(args);
  return new Promise((done) => {
    const child = spawn(command, fullArgs, {
      cwd: REPO_ROOT,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.once('error', (error) => done(`\`${command} ${fullArgs.join(' ')}\` could not be run: ${error.message}`));
    child.once('exit', (code) => done(code === 0 ? null : `\`${command} ${fullArgs.join(' ')}\` exited with ${code}.`));
  });
}

async function ensureServer(options) {
  if (await urlResponds(options.url)) return null;

  if (!options.startDevServer) {
    log.error(formatDevServerHint(options.url));
    return false;
  }

  log.warn(`${options.url} did not answer; starting the documented background server.`);

  const failure = await runDevServer(['dev', '--background']);

  if (failure) {
    log.error(failure);
    log.error('Start the server yourself and re-run.');
    return false;
  }

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await urlResponds(options.url)) {
      return () => {
        runDevServer(['dev', 'stop']);
      };
    }
    await delay(500);
  }

  log.error(`\`astro dev --background\` started but ${options.url} never answered.`);
  return false;
}

/**
 * Open one page target, ready to navigate.
 *
 * Three emulations are set before any content loads, because setting them after
 * is a race:
 *   - `prefers-reduced-motion: reduce` so a site that honours it never starts
 *     the motion the warm-up would then have to race.
 *   - `prefers-color-scheme: light` so both captures are the same theme. A
 *     review comparing a dark desktop against a light mobile is comparing two
 *     different things.
 *   - the cache off, so a capture cannot be served a stale stylesheet or a
 *     stale font, and so a run measures this run.
 */
async function openPageSession(client) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });

  await client.send('Page.enable', {}, sessionId);
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Network.enable', {}, sessionId);
  await client.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await client.send(
    'Emulation.setEmulatedMedia',
    {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
        { name: 'prefers-color-scheme', value: 'light' },
      ],
    },
    sessionId,
  );

  return { targetId, sessionId };
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', { sessionId, timeoutMs: 60_000 });
  await client.send('Page.navigate', { url }, sessionId);
  await loaded;
  // The load event fires before webfonts settle; give the font machinery a turn.
  await delay(250);
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Page script threw.');
  }
  return result.result.value;
}

function fontGate(options, probe) {
  return assessFontReadiness({
    family: options.font,
    faces: probe.faces,
    check: probe.check,
    probe: probe.probe,
  });
}

/**
 * Open a page for one capture, take it, and close it again.
 *
 * One target per capture rather than one for the run. That is isolation worth
 * having on its own - a stylesheet injected for the desktop capture cannot
 * survive into the mobile one, and neither viewport can inherit the other's
 * scroll position - and it also dodges a real hang: a second navigation on the
 * same target never delivers its load event under a full installed Chrome, so
 * the mobile capture would wait forever on a page that has in fact loaded.
 */
async function captureOne(client, capture, { options, outDir }) {
  const { name, width, height } = capture;
  const { targetId, sessionId } = await openPageSession(client);

  if (options.simulateFontCdnOutage) {
    // Set on this session, before any content loads, or the CDN answers first
    // and the gate is never actually exercised.
    await client.send('Network.setBlockedURLs', { urls: FONT_CDN_PATTERNS }, sessionId);
  }

  try {
    // The width is set twice on purpose: the device metrics decide the layout,
    // and the clip decides the image. A page that renders its own scrollbar or
    // ignores the metrics cannot change the width of the file that lands.
    await client.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
        screenWidth: width,
        screenHeight: height,
      },
      sessionId,
    );
    await client.send(
      'Emulation.setTouchEmulationEnabled',
      { enabled: width < 768, ...(width < 768 ? { maxTouchPoints: 5 } : {}) },
      sessionId,
    );

    await navigate(client, sessionId, options.url);

    // The font gate runs before any capture in the run, on the first page
    // loaded, so a font failure costs nothing and writes nothing.
    if (capture.gateFirst) {
      const probe = await evaluate(client, sessionId, fontProbeScript(options.font));
      const gate = fontGate(options, probe);
      if (!gate.ok) {
        log.error(formatFontGateFailure({ family: options.font, url: options.fontUrl, detail: gate.detail }));
        return { ok: false, label: `${name}.png`, gated: true, problems: [gate.detail] };
      }
      log.info(`Font gate: ${gate.detail}`);
    }

    const warm = await evaluate(client, sessionId, WARM_UP_SCRIPT);
    log.info(
      `  ${name}: warmed to ${warm.scrolledTo}px, ${warm.cloakedRemaining} x-cloak remaining, ` +
        `${warm.hiddenBelowFold} hidden elements under main`,
    );

    const contentHeight = await evaluate(
      client,
      sessionId,
      'Math.ceil(Math.max(document.scrollingElement.scrollHeight, document.body.scrollHeight))',
    );

    if (contentHeight > MAX_CAPTURE_HEIGHT) {
      log.error(
        `${name}: page is ${contentHeight}px tall, over the ${MAX_CAPTURE_HEIGHT}px single-capture ` +
          'ceiling. Capturing anyway would silently truncate; split the page instead.',
      );
      return { ok: false, label: `${name}.png`, problems: ['page too tall to capture in one image'] };
    }

    const shot = await client.send(
      'Page.captureScreenshot',
      {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: contentHeight, scale: 1 },
      },
      sessionId,
    );

    const bytes = Buffer.from(shot.data, 'base64');
    const label = `${name}.png`;
    const verdict = validateCapture({ label, bytes, expectedWidth: width, minBytes: MIN_CAPTURE_BYTES });

    if (verdict.ok) {
      // Write to a sibling temp file and rename, so a crash mid-write cannot leave
      // a half-written PNG sitting at the path the reviewer will look at.
      const target = join(outDir, label);
      const staging = `${target}.part`;
      writeFileSync(staging, bytes);
      renameSync(staging, target);
    } else {
      log.error(`${label}: ${verdict.problems.join('; ')}`);
      clearStaleCapture(join(outDir, label), (path) => rmSync(path, { force: true }), { exists: existsSync });
      log.error(`  removed any leftover ${label} from an earlier run.`);
    }

    return { ...verdict, path: join(outDir, label), contentHeight };
  } finally {
    await client.send('Target.closeTarget', { targetId }).catch(() => {
      // The browser is on its way out; a target that will not close is not a
      // reason to fail a run whose captures are already written.
    });
  }
}

/**
 * Remove every contract capture this run was going to write.
 *
 * Used when the run refuses before capturing anything. A refusal that leaves the
 * previous run's files in place is not a refusal: the reviewer looks for
 * `desktop.png`, finds it, and has no way to know it is from a run whose font
 * gate failed.
 */
function clearCaptures(captures, outDir, options) {
  for (const capture of captures) {
    const path = join(outDir, `${capture.name}.png`);
    if (clearStaleCapture(path, (target) => rmSync(target, { force: true }), { exists: existsSync })) {
      log.warn(`Removed a leftover ${capture.name}.png from an earlier run.`);
    }
  }
  log.error(`Nothing was written to ${options.outDir}.`);
}

/**
 * Launch the first candidate that will actually serve, and say which one it was.
 *
 * Resolution picks an order; launching decides. A binary can exist, be
 * executable, and still never open a DevTools port - the full cached Chrome for
 * Testing bundle on this machine does exactly that. So each candidate is tried
 * in turn and a failure is reported rather than swallowed. With an explicit
 * override there is only one candidate, which makes that failure loud.
 */
async function launchFirstUsableBrowser(candidates) {
  const failures = [];

  for (const candidate of candidates) {
    try {
      const launched = await launchBrowser({ binary: candidate.path });
      log.info(`Browser: ${candidate.path}`);
      log.info(`  resolved from: ${describeSource(candidate.source)}`);
      return { ...launched, candidate };
    } catch (error) {
      failures.push({ path: candidate.path, reason: firstLine(error.message) });
      log.warn(`Skipped ${candidate.path}: ${firstLine(error.message)}`);
    }
  }

  throw new Error(formatNoUsableBrowser(candidates, failures));
}

function firstLine(message) {
  return String(message).split('\n')[0];
}

/* -------------------------------------------------------------------------
 * Entry point
 * ---------------------------------------------------------------------- */

const log = {
  info: (message) => process.stdout.write(`${message}\n`),
  warn: (message) => process.stderr.write(`${message}\n`),
  error: (message) => process.stderr.write(`${message}\n`),
};

export async function run(argv) {
  let options;
  let captures;

  try {
    options = parseArgs(argv);
    if (options.help) {
      log.info(HELP);
      return 0;
    }
    captures = parseCaptureSet(options.captures);
  } catch (error) {
    log.error(error.message);
    return 1;
  }

  // The server is checked before the browser: a missing dev server is the common
  // case, and reporting it before spending a filesystem walk and a launch on
  // browser resolution is both faster and clearer. Which also means everything
  // after this point is responsible for stopping the server again.
  const server = await ensureServer(options);
  if (server === false) return 1;

  let candidates;
  try {
    candidates = browserCandidates({
      override: process.env[BROWSER_OVERRIDE_ENV],
      cached: cachedBrowserPaths(),
      installed: installedBrowserPaths(),
      isExecutable,
    });
  } catch (error) {
    if (typeof server === 'function') server();
    throw error;
  }

  const outDir = resolve(REPO_ROOT, options.outDir);
  mkdirSync(outDir, { recursive: true });

  const launched = await launchFirstUsableBrowser(candidates);
  let client;

  try {
    const debuggerUrl = await fetchDebuggerUrl(launched.port);
    client = await CdpClient.connect(debuggerUrl);

    if (options.simulateFontCdnOutage) {
      // Blocking the CDN is how the font gate is tested for real rather than
      // argued about: the request genuinely fails, the page genuinely falls
      // back, and the gate has to notice.
      log.warn(`Blocked the font CDN (${FONT_CDN_PATTERNS.join(', ')}) to test the gate.`);
    }

    const results = [];
    for (const [index, capture] of captures.entries()) {
      const result = await captureOne(client, { ...capture, gateFirst: index === 0 }, { options, outDir });
      results.push(result);

      if (result.gated) {
        // The gate refused. Nothing valid can be produced, so the contract paths
        // are cleared rather than left holding the previous run's files.
        clearCaptures(captures, outDir, options);
        return 1;
      }
    }

    const failures = results.filter((result) => !result.ok);

    log.info('');
    for (const result of results) {
      const status = result.ok ? 'ok  ' : 'FAIL';
      const where = result.path ? result.path.replace(`${REPO_ROOT}/`, '') : result.label;
      const size = result.width ? `${result.width}x${result.height}, ${result.bytes} bytes` : 'not written';
      log.info(`  ${status} ${where} - ${size}`);
    }

    if (failures.length > 0) {
      log.error('');
      log.error(`${failures.length} of ${results.length} captures failed validation.`);
      return 1;
    }

    return 0;
  } finally {
    client?.close();
    await launched.cleanup();
    if (typeof server === 'function') server();
  }
}

function describeSource(source) {
  switch (source) {
    case 'override':
      return `${BROWSER_OVERRIDE_ENV} environment override`;
    case 'chrome-for-testing':
      return 'a cached Chrome for Testing build in a Puppeteer cache directory';
    default:
      return 'an installed browser';
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      log.error(error.stack ?? String(error));
      process.exitCode = 1;
    });
}
