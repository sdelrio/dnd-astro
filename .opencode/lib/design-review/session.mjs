/**
 * The browser and server session that the design-review commands share.
 *
 * ADR-0012's capture command and issue #341's measurement commands both need
 * the same four things: a browser resolved without downloading anything, a
 * dev server that is only started when asked for, a page target with the right
 * emulation set before any content loads, and a way to run a script in it. That
 * is what lives here, so the two commands cannot drift on any of it - a second
 * copy of the font gate or the dev-server boundary would be a second thing to
 * get wrong, and the whole point of the shared client is that there is one.
 *
 * Zero dependencies, like `cdp.mjs`: Node's built-in `WebSocket` and `fetch` are
 * all this needs, so `package.json`, `pnpm-lock.yaml` and the `allowBuilds` map
 * in `pnpm-workspace.yaml` stay byte-identical (ADR-0007, ADR-0011).
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { launchBrowser } from './cdp.mjs';
import { browserCandidates, formatDevServerHint, formatNoUsableBrowser } from './capture-helpers.mjs';
import {
  BROWSER_OVERRIDE_ENV,
  cachedBrowserPaths,
  installedBrowserPaths,
  isExecutable,
} from './browser-paths.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const log = {
  info: (message) => process.stdout.write(`${message}\n`),
  warn: (message) => process.stderr.write(`${message}\n`),
  error: (message) => process.stderr.write(`${message}\n`),
};

export function firstLine(message) {
  return String(message).split('\n')[0];
}

/* -------------------------------------------------------------------------
 * Dev server
 * ---------------------------------------------------------------------- */

export async function urlResponds(url, timeoutMs = 1500) {
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

/**
 * Reach the URL, or explain how.
 *
 * The default is refusal, not a second server. `astro dev --background` is the
 * lifecycle this repo documents and the one its docs tell an agent to use; the
 * opt-in path shells out to that same command rather than inventing one.
 */
export async function ensureServer(options) {
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

/* -------------------------------------------------------------------------
 * Browser
 * ---------------------------------------------------------------------- */

/**
 * Resolve every browser this command is willing to launch, in ADR-0012's order.
 *
 * Resolution order, and the order the failure message reports:
 *   1. `override`  - the DESIGN_REVIEW_CHROME environment variable
 *   2. `cached`    - Chrome for Testing builds in a Puppeteer cache directory
 *   3. `installed` - a browser installed in the usual places or on PATH
 *
 * Nothing is ever downloaded.
 */
export function resolveBrowserCandidates(env = process.env) {
  return browserCandidates({
    override: env[BROWSER_OVERRIDE_ENV],
    cached: cachedBrowserPaths(),
    installed: installedBrowserPaths(),
    isExecutable,
  });
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
export async function launchFirstUsableBrowser(candidates) {
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

export function describeSource(source) {
  switch (source) {
    case 'override':
      return `${BROWSER_OVERRIDE_ENV} environment override`;
    case 'chrome-for-testing':
      return 'a cached Chrome for Testing build in a Puppeteer cache directory';
    default:
      return 'an installed browser';
  }
}

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */

/**
 * Open one page target, ready to navigate.
 *
 * The emulations are set before any content loads, because setting them after
 * is a race:
 *   - `prefers-reduced-motion: reduce` so a site that honours it never starts
 *     motion a measurement then has to race.
 *   - `prefers-color-scheme` so a light run is light and a dark run is dark.
 *   - the cache off, so a run measures this run and not a stale stylesheet.
 */
export async function openPageSession(client, { colorScheme = 'light' } = {}) {
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
        { name: 'prefers-color-scheme', value: colorScheme },
      ],
    },
    sessionId,
  );

  return { targetId, sessionId };
}

export async function setViewport(client, sessionId, { width, height, touch = false, mobile }) {
  await client.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width,
      height,
      deviceScaleFactor: 1,
      // Chrome derives the `hover` and `pointer` media features from this flag
      // rather than from a setEmulatedMedia feature, so it is the switch between
      // "a phone" and "a laptop" for anything that queries them.
      mobile: mobile ?? width < 768,
      screenWidth: width,
      screenHeight: height,
    },
    sessionId,
  );
  await client.send(
    'Emulation.setTouchEmulationEnabled',
    { enabled: touch, ...(touch ? { maxTouchPoints: 5 } : {}) },
    sessionId,
  );
}

export async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', { sessionId, timeoutMs: 60_000 });
  await client.send('Page.navigate', { url }, sessionId);
  await loaded;
  // The load event fires before webfonts settle; give the font machinery a turn.
  await delay(250);
}

export async function evaluate(client, sessionId, expression) {
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

export async function closePageSession(client, { targetId }) {
  await client.send('Target.closeTarget', { targetId }).catch(() => {
    // The browser is on its way out; a target that will not close is not a
    // reason to fail a run whose results are already collected.
  });
}

/* -------------------------------------------------------------------------
 * In-page scripts
 * ---------------------------------------------------------------------- */

/**
 * Neutralise entrance animation, then walk the page.
 *
 * Two halves, and both are needed. The stylesheet kills animation and
 * transition timing outright; the walk fires every `IntersectionObserver` so
 * anything gated on entering the viewport is already revealed. Measuring a
 * full-page layout does not scroll it, so without the walk everything below the
 * fold is measured in its pre-reveal state - which reads as a missing element,
 * or as an element that is not there to be measured.
 *
 * The stylesheet is `!important` throughout because utility classes re-declare
 * `animation` and `transition` on the same elements at the same specificity.
 */
export const WARM_UP_SCRIPT = `(() => {
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
 * Report whether the page's own JavaScript has actually started.
 *
 * This exists because of a specific and very quiet failure. Under the dev
 * server, Vite externalises `node:fs` for the browser, `src/alpine.ts` pulls in
 * a module that imports it, the page's module throws on evaluation, and Alpine
 * never boots. Nothing logs an error a reader would see, `x-cloak` is never
 * removed, and every `x-show` element stays `display: none`.
 *
 * A measurement taken in that state is not wrong-looking, it is wrong: an
 * element hidden by a cloak reads as an element that is not there, and a tap on
 * a control whose Alpine never initialised reads as a dead toggle. So the
 * commands ask, and refuse rather than report.
 *
 * `needsApp` is false on a page with no `x-data` at all, where there is nothing
 * to wait for.
 */
export function appReadyScript() {
  return `(() => {
  const needsApp = document.querySelectorAll('[x-data]').length > 0;
  return (async () => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (!needsApp || (window.Alpine && window.Alpine.version)) {
        return { needsApp, booted: true, alpine: window.Alpine ? window.Alpine.version : null,
                 cloakRemaining: document.querySelectorAll('[x-cloak]').length };
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return { needsApp, booted: false, alpine: null,
             cloakRemaining: document.querySelectorAll('[x-cloak]').length };
  })();
})()`;
}

export const APP_NOT_BOOTED = [
  "The page's JavaScript never started, so nothing on this page can be measured truthfully.",
  '',
  '  Elements carrying x-data: present',
  '  window.Alpine:      undefined',
  '  x-cloak remaining:  the count the page settled at',
  '',
  'A control hidden by an unremoved x-cloak reads as a control that is not there, and a',
  'tap on a component Alpine never initialised reads as a dead one. Both are artefacts of',
  'this state, so this run reports nothing rather than reporting that.',
  '',
  'One known cause: under the dev server, Vite externalises node:fs for the browser and',
  'src/alpine.ts pulls in a module that imports it, so the page module throws on evaluation',
  'and Alpine never boots. Measure the built site instead:',
  '',
  '  pnpm build && astro preview',
  '',
  'Then point --url at the preview server.',
].join('\n');

/**
 * Measure whether a display font is genuinely in effect.
 *
 * Built per run so the gated family is the one the caller asked for. The three
 * signals and the reasoning behind them are in `capture-helpers.mjs`
 * (`assessFontReadiness`); this is only the in-page half.
 */
export function fontProbeScript(family) {
  return `(() => {
  const family = ${JSON.stringify(family)};

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

  return (async () => {
    // The probe spans go in *before* the faces are read, and stay long enough for
    // the browser to act on them. A face is only fetched when something on the
    // page asks for it, so reading the face list first reports 'unloaded' on any
    // page that happens not to use the display face - which is a statement about
    // the page, not about whether the CDN is reachable.
    const pending = document.fonts ? document.fonts.load('1em ' + family) : null;

    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        pending ?? Promise.resolve(),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
    }

    const faces = document.fonts
      ? Array.from(document.fonts).map((face) => ({ family: face.family, status: face.status }))
      : [];

    return {
      status: document.fonts ? document.fonts.status : 'unsupported',
      faces,
      check: document.fonts ? document.fonts.check('1em ' + family) : false,
      probe: { candidateWidth: measure(family), fallbackWidth: measure('__no_such_face__') },
    };
  })();
})()`;
}
