#!/usr/bin/env node
/**
 * Three questions this repo has recorded as unanswered, answered from a real
 * rendered page.
 *
 *   node .opencode/lib/design-review/measure.mjs overflow  [--url ...]
 *   node .opencode/lib/design-review/measure.mjs contrast  [--url ...]
 *   node .opencode/lib/design-review/measure.mjs tap       --selector ... --target ...
 *
 * Each of the three was named as an open gap in the project's own records:
 *
 *   1. `overflow` - ADR-0009's layout arithmetic was static reasoning, and a
 *      three-column grid once overflowed at 360 and shipped because a test
 *      asserted on a source string. This reports, per width, whether the page
 *      scrolls sideways and which element is too wide.
 *   2. `contrast` - the 2026-09-26 design audit computed its ratios from
 *      declared token values and flagged the role-chip and HP-label findings as
 *      provisional for exactly that reason. This samples the colours the
 *      browser actually painted, in both themes.
 *   3. `tap` - a resized viewport verifies layout, never a gesture. This
 *      dispatches a real touch tap and reports what changed.
 *
 * What this command is *not*: it does not fix anything. It answers a question
 * that a source-string assertion cannot, so a defect that it finds is still a
 * defect that has to be fixed in the component, and a clean run is not the same
 * as a real phone.
 *
 * Nothing here enters the build: no manifest entry, no lockfile change, no
 * allow-list change. The CDP client, the browser resolution, the dev-server
 * boundary and the font gate are all shared with ADR-0012's capture command via
 * `session.mjs`, so there is one browser stack in this repo rather than two.
 * Verify with `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml`,
 * which must come back empty (ADR-0007, ADR-0011).
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { CdpClient, fetchDebuggerUrl } from './cdp.mjs';
import { BROWSER_OVERRIDE_ENV } from './browser-paths.mjs';
import { assessFontReadiness, formatFontGateFailure } from './capture-helpers.mjs';
import {
  buildSelectorPath,
  classifyTap,
  contrastRatio,
  findOverflowOffenders,
  formatContrastReport,
  formatOverflowReport,
  formatPointerReport,
  formatTapReport,
  gradeRatio,
  judgePointerGating,
  parseSelectorList,
  parseWidthList,
  resolveEffectiveBackground,
} from './measure-helpers.mjs';
import {
  APP_NOT_BOOTED,
  WARM_UP_SCRIPT,
  appReadyScript,
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
 * The widths ADR-0009 committed to, and the height to use for each.
 *
 * 320 is the narrowest phone width anyone commits to supporting; 640 is the
 * `sm` breakpoint itself, where the mobile disclosures stop being disclosures,
 * so a regression that only shows up at the boundary lands on a width in this
 * list rather than between two runs nobody made.
 */
export const DEFAULT_WIDTHS = '320,360,390,640';

const DEFAULT_HEIGHT = 844;

/**
 * The selectors the contrast run measures by default.
 *
 * Two groups, and the split matters. The first is what the design documentation
 * names as a finding: the role chip and the HP micro-label, both flagged
 * provisional in the last audit. The second is the interactive affordances the
 * tool layer actually uses - the touch targets, the search field, the filter
 * toggle, the focus ring - because a tool that is readable but not operable has
 * not been checked.
 *
 * Overridden with `--selectors`.
 */
export const DEFAULT_CONTRAST_SELECTORS = [
  // The two provisional findings from docs/audits/2026-09-26-design-audit.md.
  '.r3-chip',
  '.char-hp-label',
  // The card's own meta line and the name, which is the largest text on the
  // page and the one a player reads first.
  '.char-name',
  '.sl-markdown-content p',
  // Tool-layer affordances: the tap targets and the search field.
  'input[type="search"]',
  'input[type="text"]',
  'select',
  'button[aria-controls$="-filter-panel"]',
  'button[aria-label="Clear filters"]',
];

const HELP = `
Usage: node .opencode/lib/design-review/measure.mjs <command> [options]

Commands:
  overflow   Does the page scroll horizontally, and which element is too wide?
  contrast   What WCAG ratio does each selector actually render, in both themes?
  tap        Does a synthesized touch tap open the thing it is supposed to open?
  pointer    Do the hover, press and spacing rules branch as ADR-0009 decided?

Common options:
  --url <url>          page to measure       (default http://localhost:4321/)
  --width <px>         viewport width        (default 390)
  --start-dev-server   opt in to running \`astro dev --background\` and stopping it
  --no-fail            report findings but always exit 0
  --json               print the findings as JSON instead of a report
  --help               this text

overflow options:
  --widths <list>      comma-separated       (default ${DEFAULT_WIDTHS}, from ADR-0009)
  --tolerance <px>     sub-pixel slack       (default 1)

contrast options:
  --selectors <list>   comma-separated CSS selectors
                       (default the documented role chip, HP label, and the tool
                        layer's interactive affordances)
  --font <family>      display face          (default Cinzel)

tap options:
  --selector <css>     the control to tap
  --target <css>       the panel or element whose state change is reported
                       (default: the element the control's aria-controls names)

Exit status is 1 when a finding is a defect (a width that scrolls, a ratio below
AA, a tap that changes nothing), so a run can be a gate. --no-fail turns that
off for a report-only read.

Browser resolution (never downloads one):
  1. ${BROWSER_OVERRIDE_ENV}
  2. cached Chrome for Testing builds in a Puppeteer cache directory
  3. an installed browser
`.trimStart();

/* -------------------------------------------------------------------------
 * Arguments
 * ---------------------------------------------------------------------- */

const KNOWN_FLAGS = new Set([
  '--url',
  '--width',
  '--widths',
  '--tolerance',
  '--selectors',
  '--selector',
  '--target',
  '--group',
  '--font',
  '--font-url',
  '--height',
  '--help',
  '-h',
]);

export const COMMANDS = ['overflow', 'contrast', 'tap', 'pointer'];

export function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (command === undefined || command === '--help' || command === '-h') {
    return { command: 'help' };
  }

  if (!COMMANDS.includes(command)) {
    throw new Error(`Unknown command ${command}. Expected one of ${COMMANDS.join(', ')}. Run with --help.`);
  }

  const options = {
    command,
    url: 'http://localhost:4321/',
    width: 390,
    height: DEFAULT_HEIGHT,
    widths: DEFAULT_WIDTHS,
    tolerance: 1,
    font: 'Cinzel',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
    startDevServer: false,
    fail: true,
    json: false,
    help: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    switch (arg) {
      case '--start-dev-server': options.startDevServer = true; break;
      case '--no-fail': options.fail = false; break;
      case '--json': options.json = true; break;
      case '--help': case '-h': options.help = true; break;
      default: {
        if (!KNOWN_FLAGS.has(arg)) throw new Error(`Unknown option ${arg}. Run with --help.`);
        const value = rest[index + 1];
        if (value === undefined) throw new Error(`${arg} needs a value.`);
        index += 1;

        const key = arg.replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

        if (key === 'width' || key === 'height' || key === 'tolerance') {
          const numeric = Number(value);
          if (!Number.isFinite(numeric) || numeric < 0) {
            throw new Error(`${arg} needs a number; got ${value}.`);
          }
          // A viewport width is rounded because CDP wants whole pixels; a
          // tolerance is not, because a half-pixel of slack is a real thing.
          options[key] = key === 'tolerance' ? numeric : Math.round(numeric);
        } else {
          options[key] = value;
        }
      }
    }
  }

  // Per-command validation, so a typo in a flag is reported before a browser is
  // launched and a dev server is talked into starting.
  if (options.command === 'overflow') parseWidthList(options.widths);
  if (options.command === 'contrast') {
    parseSelectorList(options.selectors ?? DEFAULT_CONTRAST_SELECTORS.join(','));
  }
  if (options.command === 'tap' && !options.selector) {
    throw new Error('tap needs --selector: the control to tap.');
  }
  if (options.command !== 'overflow' && options.width < 1) {
    throw new Error(`--width must be at least 1; got ${options.width}.`);
  }

  return options;
}

/* -------------------------------------------------------------------------
 * In-page scripts
 * ---------------------------------------------------------------------- */

/**
 * Describe an element well enough to name it later.
 *
 * Serialised as a plain descriptor rather than returned as a live node, because
 * the naming rule - prefer an id, then classes, then a position index - lives in
 * `buildSelectorPath`, on this side, where it is unit tested without a DOM.
 */
const DESCRIBE_ELEMENT = `
  const describe = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const parent = el.parentElement;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: Array.from(el.classList),
      index: parent ? Array.from(parent.children).indexOf(el) + 1 : 1,
      parent: parent && parent !== document.documentElement ? describe(parent) : null,
    };
  };
`;

/**
 * Measure horizontal overflow, and name what is too wide.
 *
 * Three decisions worth stating:
 *
 *   - `clientWidth` of the root element is the viewport, not `innerWidth`. They
 *     differ when a classic scrollbar takes space, and the smaller one is what
 *     the reader can actually see.
 *   - The outermost offender is reported, not every descendant. A wide table
 *     inside a wide cell inside a wide grid produces three nested boxes, and
 *     naming the grid is the one a person can act on.
 *   - `display: none` and zero-size elements are skipped, because a hidden panel
 *     is not overflowing anything. This matters here: the mobile filter
 *     disclosures are `display: none` at these widths by design.
 */
const OVERFLOW_SCRIPT = `(() => {
  ${DESCRIBE_ELEMENT}
  const root = document.scrollingElement || document.documentElement;
  const viewportWidth = document.documentElement.clientWidth;
  const scrollWidth = Math.max(root.scrollWidth, document.body ? document.body.scrollWidth : 0);

  const all = Array.from(document.querySelectorAll('body *'));
  const offenders = [];

  for (const el of all) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right <= viewportWidth + 1) continue;

    // Skip anything whose ancestor is already reported: the outermost box is
    // the one worth naming.
    if (offenders.some((entry) => entry.element.contains(el))) continue;

    offenders.push({ element: el, right: rect.right, width: rect.width, node: describe(el) });
  }

  return {
    viewportWidth,
    scrollWidth,
    theme: document.documentElement.dataset.theme || null,
    offenders: offenders.map(({ element, right, width, node }) => ({
      right,
      width,
      node,
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || '').trim().slice(0, 40),
    })),
  };
})()`;

/**
 * Sample one selector's rendered colours.
 *
 * The background is reported as a *chain*, not a colour, because a contrast
 * ratio is only meaningful against what is really behind the text. The chain
 * comes from walking ancestors until something opaque turns up, and the
 * arithmetic that composites it is in `resolveEffectiveBackground`, where it is
 * unit tested.
 */
const CONTRAST_SCRIPT = (selectors) => `(() => {
  const selectors = ${JSON.stringify(selectors)};
  ${DESCRIBE_ELEMENT}

  const backgroundChain = (el) => {
    const chain = [];
    for (let node = el; node; node = node.parentElement) {
      chain.push(getComputedStyle(node).backgroundColor);
    }
    return chain;
  };

  return selectors.map((selector) => {
    let matches;
    try {
      matches = Array.from(document.querySelectorAll(selector));
    } catch (error) {
      return { selector, error: String(error && error.message ? error.message : error) };
    }

    // Only a rendered element has a colour to measure. An x-cloaked or
    // display:none element reports transparent, which is not a finding.
    const rendered = matches.find((el) => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    if (!rendered) return { selector, matched: matches.length, rendered: false };

    const style = getComputedStyle(rendered);
    return {
      selector,
      matched: matches.length,
      rendered: true,
      color: style.color,
      backgroundChain: backgroundChain(rendered),
      fontSizePx: Number.parseFloat(style.fontSize),
      fontWeight: style.fontWeight,
      text: (rendered.textContent || '').trim().slice(0, 40),
      node: describe(rendered),
    };
  });
})()`;

/**
 * Apply a theme the way the site's own provider does.
 *
 * `ThemeProvider.astro` reads `localStorage['starlight-theme']` and writes
 * `documentElement.dataset.theme`, and every dark override in the stylesheet
 * keys off that attribute. So the measurement sets both: the stored preference,
 * so a reload agrees, and the attribute, so the repaint is immediate.
 */
const APPLY_THEME_SCRIPT = (theme) => `(() => {
  try {
    localStorage.setItem('starlight-theme', ${JSON.stringify(theme)});
  } catch (error) {
    // A blocked storage is not a reason to refuse the measurement; the
    // attribute below is what the stylesheet reads.
  }
  document.documentElement.dataset.theme = ${JSON.stringify(theme)};
  return document.documentElement.dataset.theme;
})()`;

/**
 * Read everything worth knowing about an element's state, before or after a tap.
 *
 * `display` and `visibility` are the computed values, so an Alpine `x-show` that
 * reveals by *removing* its inline `display: none` is visible here as the
 * display it actually has. `aria-expanded` is read as a string because the
 * attribute is the contract a screen reader is given, and a tap that changes the
 * paint without changing it is a different defect from one that changes both.
 */
const STATE_SCRIPT = (selector) => `(() => {
  const selector = ${JSON.stringify(selector)};
  const el = document.querySelector(selector);
  if (!el) return { found: false };

  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  return {
    found: true,
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    expanded: el.getAttribute('aria-expanded'),
    hidden: el.hasAttribute('hidden'),
    classes: Array.from(el.classList),
    inlineStyle: el.getAttribute('style'),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  };
})()`;

/* -------------------------------------------------------------------------
 * Shared plumbing
 * ---------------------------------------------------------------------- */

/**
 * Gate on the display font, and say plainly why when it is not there.
 *
 * Applied to the runs whose numbers depend on the face being the one the design
 * documentation describes. The heading face is fetched from a third-party CDN
 * with a `swap` policy and a silent fallback, and the fallback has different
 * metrics: measuring a layout in it produces a number that is real, and about a
 * page nobody is going to ship.
 *
 * The contrast run does not use this gate, and says so when it runs. A contrast
 * ratio is a relationship between two colours; the face that draws the glyphs
 * has no bearing on it, and refusing to measure contrast because a font CDN is
 * slow would be theatre rather than rigour.
 */
async function fontGate(client, sessionId, options) {
  const probe = await evaluate(client, sessionId, fontProbeScript(options.font));
  const gate = assessFontReadiness({
    family: options.font,
    faces: probe.faces,
    check: probe.check,
    probe: probe.probe,
  });

  if (!gate.ok) {
    log.error(formatFontGateFailure({ family: options.font, url: options.fontUrl, detail: gate.detail }));
    return false;
  }

  log.info(`Font gate: ${gate.detail}`);
  return true;
}

/**
 * Refuse to measure a page whose own JavaScript never started.
 *
 * Every command here reads rendered state, and rendered state on this site is
 * partly written by Alpine: `x-cloak` decides whether an element is painted at
 * all, and `x-show` decides whether a disclosure is open. If Alpine never boots,
 * both readings are artefacts of that and nothing else, so a measurement taken
 * then is worse than no measurement - it looks like a finding.
 */
async function appIsReady(client, sessionId) {
  const ready = await evaluate(client, sessionId, appReadyScript());

  if (ready.booted) {
    log.info(
      `App ready: ${ready.alpine ? `Alpine ${ready.alpine}` : 'no Alpine components on this page'}, ` +
        `${ready.cloakRemaining} x-cloak remaining`,
    );
    return true;
  }

  log.error(APP_NOT_BOOTED.replace('the count the page settled at', String(ready.cloakRemaining)));
  return false;
}
function toRgbString({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function report({ options, headline, findings, failures }) {
  if (options.json) {
    log.info(JSON.stringify({ command: options.command, headline, findings }, null, 2));
  } else {
    log.info('');
    log.info(headline);
  }

  return failures.length > 0 && options.fail ? 1 : 0;
}

/* -------------------------------------------------------------------------
 * overflow
 * ---------------------------------------------------------------------- */

async function measureOverflow(client, options) {
  const widths = parseWidthList(options.widths);
  const results = [];

  for (const [index, width] of widths.entries()) {
    const { targetId, sessionId } = await openPageSession(client);

    try {
      await setViewport(client, sessionId, { width, height: options.height, touch: width < 768 });
      await navigate(client, sessionId, options.url);

      // Gate once, on the first page loaded, so a font failure costs nothing and
      // reports nothing: every width after it would be measuring the same
      // fallback face.
      if (index === 0 && !(await fontGate(client, sessionId, options))) {
        return 1;
      }

      if (!(await appIsReady(client, sessionId))) return 1;
      await evaluate(client, sessionId, WARM_UP_SCRIPT);

      const measured = await evaluate(client, sessionId, OVERFLOW_SCRIPT);

      results.push(
        findOverflowOffenders({
          width,
          viewportWidth: measured.viewportWidth,
          scrollWidth: measured.scrollWidth,
          tolerance: options.tolerance,
          boxes: measured.offenders.map((offender) => ({
            path: buildSelectorPath(offender.node),
            right: offender.right,
            width: offender.width,
          })),
        }),
      );
    } finally {
      await closePageSession(client, { targetId });
    }
  }

  const failures = results.filter((result) => result.overflows);
  const exit = report({ options, headline: formatOverflowReport(results), findings: results, failures });

  if (failures.length > 0) {
    log.error('');
    log.error(
      `${failures.length} width(s) scroll horizontally. That is a rendered defect at ` +
        `${failures.map((result) => `${result.width}px`).join(', ')}; the measurement is the finding, not the fix.`,
    );
  }

  return exit;
}

/* -------------------------------------------------------------------------
 * contrast
 * ---------------------------------------------------------------------- */

async function measureContrast(client, options) {
  const selectors = parseSelectorList(options.selectors ?? DEFAULT_CONTRAST_SELECTORS.join(','));
  const themes = ['light', 'dark'];
  const findings = [];

  for (const theme of themes) {
    const { targetId, sessionId } = await openPageSession(client, { colorScheme: theme });

    try {
      await setViewport(client, sessionId, { width: options.width, height: options.height, touch: true });
      await navigate(client, sessionId, options.url);
      await evaluate(client, sessionId, APPLY_THEME_SCRIPT(theme));
      if (!(await appIsReady(client, sessionId))) return 1;
      await evaluate(client, sessionId, WARM_UP_SCRIPT);

      const measured = await evaluate(client, sessionId, CONTRAST_SCRIPT(selectors));

      for (const sample of measured) {
        const existing = findings.find((finding) => finding.selector === sample.selector);

        if (sample.error) {
          log.error(`  ${sample.selector}: ${sample.error}`);
          continue;
        }

        if (!sample.rendered) {
          existing?.missing.push(theme);
          if (!existing) {
            findings.push({ selector: sample.selector, missing: [theme], matched: sample.matched });
          }
          continue;
        }

        const background = resolveEffectiveBackground(sample.backgroundChain);
        const ratio = contrastRatio(sample.color, toRgbString(background));
        const grade = gradeRatio(ratio, { fontSizePx: sample.fontSizePx, fontWeight: sample.fontWeight });

        const result = {
          ratio: Math.round(ratio * 100) / 100,
          grade,
          color: sample.color,
          background: toRgbString(background),
          fontSizePx: sample.fontSizePx,
          fontWeight: sample.fontWeight,
          matched: sample.matched,
        };

        if (existing) {
          Object.assign(existing, {
            color: existing.color ?? sample.color,
            background: existing.background ?? result.background,
            fontSizePx: existing.fontSizePx ?? sample.fontSizePx,
            fontWeight: existing.fontWeight ?? sample.fontWeight,
            themes: { ...existing.themes, [theme]: result },
          });
        } else {
          findings.push({
            selector: sample.selector,
            color: sample.color,
            background: result.background,
            fontSizePx: sample.fontSizePx,
            fontWeight: sample.fontWeight,
            missing: [],
            themes: { [theme]: result },
          });
        }
      }
    } finally {
      await closePageSession(client, { targetId });
    }
  }

  const failures = findings.filter(
    (finding) => !finding.missing?.length && Object.values(finding.themes ?? {}).some((t) => t.grade.verdict === 'fail'),
  );

  const exit = report({
    options,
    headline:
      formatContrastReport(findings) +
      `\n\n  (no font gate: a contrast ratio is a relationship between two colours, and the face that\n` +
      `   draws the glyphs does not change it)`,
    findings,
    failures,
  });

  if (failures.length > 0) {
    log.error('');
    log.error(`${failures.length} selector(s) render below AA in at least one theme.`);
  }

  return exit;
}

/* -------------------------------------------------------------------------
 * tap
 * ---------------------------------------------------------------------- */

/**
 * Dispatch a real touch tap through CDP's input pipeline.
 *
 * `Input.dispatchTouchEvent` is not a synthetic DOM event: it enters the browser
 * the way a finger does, so touch handlers, the compatibility mouse events the
 * browser derives from a tap, and click listeners all run. That is the whole
 * reason this is not `element.click()`. Alpine's `@click` is what these two
 * disclosures are wired to, and a tap is the input a phone actually delivers.
 *
 * The two events are sent with a gap, because a tap that arrives as one
 * zero-duration press is not what a finger produces, and touch code that
 * debounces on duration should see a real one.
 */
async function dispatchTouchTap(client, sessionId, point) {
  const touchPoint = { x: Math.round(point.x), y: Math.round(point.y), radiusX: 12, radiusY: 12, force: 1 };

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] }, sessionId);
  await delay(60);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
  await delay(250);
}

async function measureTap(client, options) {
  const results = [];

  for (const control of parseSelectorList(options.selector)) {
    const { targetId, sessionId } = await openPageSession(client, { colorScheme: 'light' });

    try {
      await setViewport(client, sessionId, { width: options.width, height: options.height, touch: true });
      await navigate(client, sessionId, options.url);

      if (!(await fontGate(client, sessionId, options))) {
        return 1;
      }

      if (!(await appIsReady(client, sessionId))) return 1;
      await evaluate(client, sessionId, WARM_UP_SCRIPT);

      const before = await evaluate(client, sessionId, STATE_SCRIPT(control));

      if (!before.found) {
        log.error(`  ${control}: not found in the DOM at ${options.url}; nothing to tap.`);
        results.push({ selector: control, url: options.url, width: options.width, missing: true });
        continue;
      }

      const target = options.target ?? control;
      const beforeTarget = await evaluate(client, sessionId, STATE_SCRIPT(target));

      // The tap lands on the centre of the control, clamped into the viewport:
      // a point outside it would be a miss, and a miss reports "no change",
      // which is indistinguishable from a dead toggle.
      const point = {
        x: Math.min(Math.max(before.rect.x + before.rect.width / 2, 1), options.width - 1),
        y: Math.min(Math.max(before.rect.y + before.rect.height / 2, 1), options.height - 1),
      };

      const hasBox = before.rect.width > 0 && before.rect.height > 0;
      let after = beforeTarget;

      if (hasBox) {
        await dispatchTouchTap(client, sessionId, point);
        after = await evaluate(client, sessionId, STATE_SCRIPT(target));
      } else {
        // No box means there is no point to touch. That is itself a result, and
        // which result it is depends on the panel: above the breakpoint the
        // toggle is hidden on purpose and the panel is already shown, while
        // below it a boxless toggle is a dead disclosure.
        log.info(
          `  ${control}: no box at ${options.width}px (${before.display}), so no tap was delivered.`,
        );
      }

      const afterControl = hasBox ? await evaluate(client, sessionId, STATE_SCRIPT(control)) : before;

      const classification = classifyTap({
        controlFound: before.found,
        controlHasBox: hasBox,
        targetFound: beforeTarget.found,
        before: beforeTarget,
        after,
      });

      results.push({
        selector: control,
        url: options.url,
        width: options.width,
        target,
        touch: 'Input.dispatchTouchEvent',
        point,
        before: beforeTarget,
        after,
        control: { before, after: afterControl },
        classification,
        opened: classification.verdict === 'opened',
      });
    } finally {
      await closePageSession(client, { targetId });
    }
  }

  const failures = results.filter((result) => result.missing || result.classification?.failure);
  const exit = report({ options, headline: formatTapReport(results), findings: results, failures });

  if (failures.length > 0) {
    log.error('');
    log.error(
      `${failures.length} tap(s) changed nothing. A synthesized tap is not a device: see the report in\n` +
        'docs/audits/ for what this does and does not establish.',
    );
  }

  return exit;
}

/* -------------------------------------------------------------------------
 * pointer
 * ---------------------------------------------------------------------- */

/**
 * The devices ADR-0009's decision 4 is about, and which of them a browser can
 * be made to report.
 *
 * `hover` and `pointer` describe the *primary* pointing device, and a
 * touchscreen laptop reports `hover: hover` and `pointer: fine` because its
 * trackpad is primary. Chrome derives those media features from the emulated
 * device rather than from a `setEmulatedMedia` feature - it accepts `hover` and
 * `pointer` there and ignores them - so a device profile here is a viewport
 * mode plus touch emulation, and that gives two of the three:
 *
 *   - a phone is a mobile viewport with touch: hover: none, pointer: coarse;
 *   - a mouse-only machine is a desktop viewport with touch off: hover: hover,
 *     pointer: fine, any-pointer: fine;
 *   - a touchscreen laptop needs both at once, and enabling touch in Chrome
 *     *replaces* the primary pointer rather than adding to it, so the hybrid
 *     falls back to the phone profile. There is no flag combination that
 *     produces `hover: hover` together with `any-pointer: coarse`.
 *
 * The hybrid is therefore declared and reported as a check this tooling cannot
 * make. That is the honest answer, and it is also the exact gap ADR-0009's own
 * reasoning was written to cover.
 */
const POINTER_PHASES = [
  {
    name: 'mouse only',
    mobile: false,
    touch: false,
    expected: { hover: true, pointer: 'fine', anyPointerCoarse: false },
  },
  {
    name: 'phone',
    mobile: true,
    touch: true,
    expected: { hover: false, pointer: 'coarse', anyPointerCoarse: true },
  },
  {
    name: 'touchscreen laptop',
    emulable: false,
    reason:
      'Chrome replaces the primary pointer when touch emulation is enabled, so no flag ' +
      'combination reports hover: hover together with any-pointer: coarse',
    expected: { hover: true, pointer: 'fine', anyPointerCoarse: true },
  },
];

/**
 * Read what the page reports and paints, for one emulated device.
 *
 * Four reads, in the order they have to happen:
 *   1. the media queries, straight from the browser, so the emulation itself is
 *      part of the record rather than an assumption;
 *   2. the resting paint, with the cursor parked in a corner;
 *   3. the paint under a hover, driven by a real mouse move through CDP's input
 *      pipeline;
 *   4. the paint under a held press, once as a mouse press and once as a touch.
 *
 * A `:hover` or `:active` rule cannot be read any other way. There is no
 * computed-style property for "is this selector matching", and forcing a
 * synthetic class would be testing the stylesheet's intent rather than its
 * behaviour.
 */
async function probePointerPhase(client, sessionId, phase, { selector, group, width, height }) {
  if (phase.emulable === false) {
    log.info(`  ${phase.name}: not emulable, reported as an open check rather than a measurement.`);
    return { name: phase.name, emulable: false, reason: phase.reason, expected: phase.expected };
  }

  // Applied before the phase is read, not once for the run: the whole point is
  // that the same page answers differently under the two device profiles a
  // browser can be made to report.
  await setViewport(client, sessionId, { width, height, touch: phase.touch, mobile: phase.mobile });

  const read = async (expression) => evaluate(client, sessionId, expression);
  const background = (target) =>
    read(`(() => { const el = document.querySelector(${JSON.stringify(target)});` +
      ` return el ? getComputedStyle(el).backgroundColor : null; })()`);

  const queries = await read(`(() => {
    const mq = (query) => window.matchMedia(query).matches;
    return {
      hover: mq('(hover: hover)'),
      hoverNone: mq('(hover: none)'),
      pointer: mq('(pointer: fine)') ? 'fine' : (mq('(pointer: coarse)') ? 'coarse' : 'none'),
      anyPointerCoarse: mq('(any-pointer: coarse)'),
      anyHover: mq('(any-hover: hover)'),
    };
  })()`);

  const box = await read(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    // Scrolled into view first, because a point outside the viewport is a miss:
    // a miss leaves the chip in its resting paint, which reads exactly like a
    // hover rule that does not exist.
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, classes: Array.from(el.classList) };
  })()`);

  if (!box) return { name: phase.name, emulable: true, expected: phase.expected, queries, missing: true };

  const point = {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + box.height / 2),
  };

  // The cursor starts in a corner, so "resting" means resting rather than
  // "resting except for the hover the tap that got us here left behind". A tap
  // does leave the pointer on the element it touched, which is the sticky hover
  // ADR-0009's finding is about, and reading that as the resting paint would
  // hide the very thing being measured.
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }, sessionId);
  await delay(80);

  const restingBackground = await background(selector);
  const gap = group
    ? await read(`(() => { const el = document.querySelector(${JSON.stringify(group)});` +
        ` return el ? getComputedStyle(el).gap : null; })()`)
    : null;

  // A mouse move over the control. On a device emulated with hover: none the
  // browser still moves the cursor, and a hover tint that is not gated shows up
  // anyway - which is the defect this measures.
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }, sessionId);
  await delay(80);
  const hoverBackground = await background(selector);

  // A press that is still held: pressed without released, read in between. A
  // held *mouse* press is the path this browser puts into `:active`; the touch
  // half is measured separately below.
  await client.send(
    'Input.dispatchMouseEvent',
    { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 },
    sessionId,
  );
  await delay(80);
  const pressBackground = await background(selector);
  const pressActiveMatched = await read(
    `document.querySelector(${JSON.stringify(selector)}).matches(':active')`,
  );
  await client.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 },
    sessionId,
  );
  await delay(120);

  // The same press as a held touch. Recorded on its own, because a browser that
  // does not put the element into `:active` for a held touch makes this
  // unobservable - and reporting it as "no tint" would be a measurement of the
  // tooling rather than of the page.
  const touchPoint = { ...point, radiusX: 12, radiusY: 12, force: 1 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] }, sessionId);
  await delay(80);
  const touchPressBackground = await background(selector);
  const touchPressActiveMatched = await read(
    `document.querySelector(${JSON.stringify(selector)}).matches(':active')`,
  );
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
  await delay(120);

  return {
    name: phase.name,
    emulable: true,
    expected: phase.expected,
    queries,
    element: { classes: box.classes },
    restingBackground,
    hoverBackground,
    pressBackground,
    pressActiveMatched,
    touchPressBackground,
    touchPressActiveMatched,
    gap,
  };
}

/**
 * Put the chips in their resting state, by pressing the "All" chip once.
 *
 * The party view loads with every role selected, and a selected chip paints its
 * own background from a later rule at the same specificity - so the hover tint
 * and the press tint are both invisible on it. Measuring that state would report
 * a missing press tint on a chip that is not resting, which is exactly the kind
 * of confident wrong answer this command exists to avoid.
 *
 * Pressing "All" once clears the selection through the same synthesized touch
 * input the rest of the run uses, and the count of selected chips afterwards is
 * reported rather than assumed.
 */
async function putChipsAtRest(client, sessionId, { width, height }) {
  const box = await evaluate(
    client,
    sessionId,
    `(() => {
      const el = document.querySelector('.r3-chip-all');
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`,
  );

  if (!box) {
    log.warn('  no "All" chip on this page; measuring the chips exactly as they render.');
    return;
  }

  await dispatchTouchTap(client, sessionId, { x: box.x, y: box.y });

  const stillSelected = await evaluate(
    client,
    sessionId,
    "document.querySelectorAll('.r3-chip.is-active').length",
  );

  log.info(
    `  pressed the "All" chip to reach the resting state: ${stillSelected} chip(s) still selected`,
  );
}

async function measurePointer(client, options) {
  // A role chip, not the "All" chip the run presses to reach the resting state:
  // a tap leaves the pointer on the element it touched, and measuring the
  // resting paint on that element would read its own sticky hover.
  const selector = options.selector ?? '.r3-chip:not(.r3-chip-all)';
  const group = options.group ?? '.r3-group';
  const phases = [];

  const { targetId, sessionId } = await openPageSession(client, { colorScheme: 'light' });

  try {
    await setViewport(client, sessionId, { width: options.width, height: options.height, touch: true });
    await navigate(client, sessionId, options.url);

    if (!(await fontGate(client, sessionId, options))) return 1;
    if (!(await appIsReady(client, sessionId))) return 1;
    await evaluate(client, sessionId, WARM_UP_SCRIPT);

    if (!options.selector) {
      await putChipsAtRest(client, sessionId, { width: options.width, height: options.height });
    }


    for (const phase of POINTER_PHASES) {
      phases.push(
        await probePointerPhase(client, sessionId, phase, {
          selector,
          group,
          width: options.width,
          height: options.height,
        }),
      );
    }
  } finally {
    await closePageSession(client, { targetId });
  }

  const missing = phases.filter((phase) => phase.missing);
  if (missing.length > 0) {
    log.error(`${selector} is not rendered at ${options.url}; the pointer rules cannot be measured.`);
    return 1;
  }

  const verdict = judgePointerGating(phases);

  return report({
    options,
    headline: formatPointerReport({ selector, group, verdict }),
    findings: { phases, verdict },
    failures: verdict.ok ? [] : [verdict],
  });
}

/* -------------------------------------------------------------------------
 * Entry point
 * ---------------------------------------------------------------------- */

export async function run(argv) {
  let options;

  try {
    options = parseArgs(argv);
  } catch (error) {
    log.error(error.message);
    return 1;
  }

  if (options.command === 'help' || options.help) {
    log.info(HELP);
    return 0;
  }

  // The server is checked before the browser: a missing dev server is the common
  // case, and reporting it before spending a filesystem walk and a launch on
  // browser resolution is both faster and clearer. Which also means everything
  // after this point is responsible for stopping the server again.
  const server = await ensureServer(options);
  if (server === false) return 1;

  let candidates;
  try {
    candidates = resolveBrowserCandidates();
  } catch (error) {
    if (typeof server === 'function') server();
    throw error;
  }

  const launched = await launchFirstUsableBrowser(candidates);
  let client;

  try {
    const debuggerUrl = await fetchDebuggerUrl(launched.port);
    client = await CdpClient.connect(debuggerUrl);

    if (options.command === 'overflow') return await measureOverflow(client, options);
    if (options.command === 'contrast') return await measureContrast(client, options);
    if (options.command === 'pointer') return await measurePointer(client, options);
    return await measureTap(client, options);
  } finally {
    client?.close();
    await launched.cleanup();
    if (typeof server === 'function') server();
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
