/**
 * Pure helpers for the rendered-verification command.
 *
 * Everything here is a function of its arguments: no browser, no filesystem, no
 * clock. That split is the whole design. The arithmetic that decides whether a
 * page scrolls sideways and whether a chip is readable is the part that has to
 * be trusted, and it is the part that can be proved without a browser. The
 * browser-backed half in `measure.mjs` only has to hand these functions honest
 * numbers, and every place where it could hand over a dishonest one is either
 * refused or reported.
 *
 * Two of these functions exist because of a failure this repo has already
 * shipped. A test that asserts on a source string pins whatever class list
 * someone happened to write, so it passes on broken markup; here, the invariant
 * is the *rendered* geometry and the *rendered* colour, which is the thing the
 * bug was about.
 *
 * See `measure.mjs` for the CDP driver and `measure-helpers.test.mjs` for the
 * proofs that need no browser.
 */

/* -------------------------------------------------------------------------
 * Colour
 * ---------------------------------------------------------------------- */

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i;
const RGB_PATTERN = /^rgba?\(\s*([^)]+)\)$/i;
// Chrome serialises a `color-mix()` result as `color(srgb 0.9 0.9 0.9 / 1)`, with
// components in 0..1 rather than 0..255. The role chip's resting fill is exactly
// that, so a parser that does not read it cannot tell a resting chip from a
// tinted one.
const COLOR_PATTERN = /^color\(\s*srgb\s+([^)]+)\)$/i;

/**
 * Read a CSS colour string into channels, or null when it cannot be read.
 *
 * The forms are the ones a browser's `getComputedStyle` returns: `rgb(0, 0, 0)`,
 * `rgba(0, 0, 0, 0.08)`, and the modern space-separated `rgb(0 0 0 / 0.08)`.
 * Hex is read too, because a fallback declaration in a stylesheet is still
 * something a person has to reason about.
 *
 * Returning null for `transparent`, `currentColor` and `color-mix(...)` is the
 * important part. Guessing a colour for a value that is not one produces a
 * confident, wrong number, and a wrong contrast ratio is worse than no ratio:
 * it reads as a measurement.
 */
export function parseColor(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const hex = HEX_PATTERN.exec(raw);
  if (hex) return parseHex(hex[1]);

  const rgb = RGB_PATTERN.exec(raw);
  if (rgb) return parseRgb(rgb[1]);

  const color = COLOR_PATTERN.exec(raw);
  if (color) {
    const [channels, alphaText] = color[1].split('/');
    const parts = channels.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const scaled = parts.slice(0, 3).map((part) => Math.round(Number.parseFloat(part) * 255));
    if (scaled.some((channel) => !Number.isFinite(channel))) return null;
    const alpha = Number.parseFloat(alphaText ?? '1');
    return { r: scaled[0], g: scaled[1], b: scaled[2], a: Number.isFinite(alpha) ? alpha : 1 };
  }

  return null;
}

function parseHex(digits) {
  if (digits.length === 3 || digits.length === 4) {
    const [r, g, b, a] = [...digits].map((d) => Number.parseInt(d + d, 16));
    return { r, g, b, a: a === undefined ? 1 : a / 255 };
  }

  if (digits.length === 6 || digits.length === 8) {
    const r = Number.parseInt(digits.slice(0, 2), 16);
    const g = Number.parseInt(digits.slice(2, 4), 16);
    const b = Number.parseInt(digits.slice(4, 6), 16);
    const a = digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null;
}

function parseRgb(body) {
  const [channels, alphaText] = body.split('/');
  const parts = channels.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const [r, g, b] = parts.slice(0, 3).map((part) =>
    part.endsWith('%') ? Math.round((Number.parseFloat(part) / 100) * 255) : Number.parseFloat(part),
  );

  if ([r, g, b].some((channel) => !Number.isFinite(channel))) return null;

  const alpha = alphaText !== undefined ? Number.parseFloat(alphaText) : Number.parseFloat(parts[3]);
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;

  return { r, g, b, a };
}

/** Paint `over` on top of `under` with `over.a` alpha. `under` is assumed opaque. */
export function composite(over, under) {
  const a = over.a ?? 1;
  const blend = (top, bottom) => Math.round(top * a + bottom * (1 - a));
  return { r: blend(over.r, under.r), g: blend(over.g, under.g), b: blend(over.b, under.b), a: 1 };
}

const WHITE = Object.freeze({ r: 255, g: 255, b: 255, a: 1 });

/**
 * Relative luminance per WCAG 2.x.
 *
 * The coefficients are the spec's, and they are spelled out here rather than
 * summed in a loop so that a reader can check the formula against the spec
 * without running anything.
 */
export function relativeLuminance({ r, g, b }) {
  const linear = (value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The WCAG contrast ratio between two colours, from 1 to 21.
 *
 * Either colour may carry alpha; it is composited over the other first. That
 * order is the only one that means anything, because a translucent colour has
 * no contrast until it is on something.
 *
 * Throws on an unreadable colour rather than returning a number. A ratio for a
 * colour nobody could parse is a fabrication.
 */
export function contrastRatio(foreground, background) {
  const fore = parseColor(foreground);
  const back = parseColor(background);

  if (!fore || !back) {
    throw new Error(
      `Cannot compute contrast: ${!fore ? foreground : background} is not a colour this command can read.`,
    );
  }

  // Composite a translucent foreground onto its background. A translucent
  // background is resolved by the caller (`resolveEffectiveBackground`), which
  // knows the ancestors; here it is treated as the surface it sits on.
  const surface = back.a === 1 ? back : composite(back, WHITE);
  const solid = fore.a === 1 ? fore : composite(fore, surface);

  const one = relativeLuminance(solid);
  const two = relativeLuminance(surface);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

/**
 * Resolve the colour actually painted behind an element, by walking ancestors.
 *
 * `layers` is the computed background of the element itself first, then its
 * ancestors outward to the root - the order a walk up the tree produces. The
 * first opaque layer is the surface everything above it is painted on: it hides
 * every ancestor beyond it, and the translucent layers between the element and
 * that surface still have to be composited onto it.
 *
 * Two deliberate choices:
 *
 *   - An unparseable layer is skipped, not treated as opaque. `currentColor` is
 *     unresolvable here, and reading it as black would invent a surface.
 *   - A fully transparent chain resolves to white, which is what a browser
 *     composites a transparent root against.
 */
export function resolveEffectiveBackground(layers) {
  const parsed = (Array.isArray(layers) ? layers : [])
    .map(parseColor)
    .filter((colour) => colour !== null);

  if (parsed.length === 0) return { ...WHITE };

  const firstOpaque = parsed.findIndex((colour) => colour.a >= 1);
  const above = firstOpaque === -1 ? parsed : parsed.slice(0, firstOpaque);
  const base = firstOpaque === -1 ? { ...WHITE } : parsed[firstOpaque];

  // Paint the layers above the surface back down onto it, outermost first, which
  // is the reverse of the order they were walked in.
  let result = { r: base.r, g: base.g, b: base.b, a: 1 };
  for (const colour of [...above].reverse()) {
    result = composite(colour, result);
  }
  return result;
}

const LARGE_TEXT_PX = 24;
const LARGE_BOLD_PX = 18.66;

/**
 * Grade a ratio against WCAG 1.4.3 and 1.4.6.
 *
 * Large text is `>= 24px`, or `>= 18.66px` at weight 700 or above. The
 * requirement string is returned alongside the verdict because "fails" without
 * saying which floor it failed is not actionable.
 */
export function gradeRatio(ratio, { fontSizePx = 16, fontWeight = 400 } = {}) {
  const isLarge = fontSizePx >= LARGE_TEXT_PX || (fontSizePx >= LARGE_BOLD_PX && fontWeight >= 700);

  if (ratio >= 7) {
    return { verdict: 'aaa', required: 4.5, requirement: 'AAA (7:1)' };
  }

  if (isLarge) {
    return {
      verdict: ratio >= 3 ? 'aa' : 'fail',
      required: 3,
      requirement: 'AA large text (>=24px, or >=18.66px bold)',
    };
  }

  return {
    verdict: ratio >= 4.5 ? 'aa' : 'fail',
    required: 4.5,
    requirement: 'AA body text (4.5:1)',
  };
}

/* -------------------------------------------------------------------------
 * Selector paths
 * ---------------------------------------------------------------------- */

/** How many levels of a selector path are printed before it is elided. */
const MAX_PATH_DEPTH = 5;

/** Elements named by their tag alone; a position index on them is noise. */
const ROOTS = new Set(['html', 'body']);

/**
 * Astro's build-scoped class, e.g. `astro-wehpl5se`.
 *
 * It is on almost every element in a built page and it changes with the build, so
 * a selector that includes it is both unreadable and unreproducible: the reader
 * pastes it into devtools on a different build and it matches nothing. Every
 * other class is kept, because on this site the class is usually the only handle
 * that names the element.
 */
const SCOPED_CLASS = /^astro-[0-9a-z]+$/;

/**
 * Build a readable CSS selector path from a node descriptor.
 *
 * The descriptor is what the in-page script can serialise: tag, optional id,
 * class list, optional index among its siblings, and the same for its parent.
 * Building the path on this side keeps the *naming rule* - prefer an id, then
 * classes, then `:nth-child`, and elide a deep chain - testable without a DOM.
 *
 * Elision keeps the top of the path, because the top is what says where in the
 * page the offender lives; the middle is the part that goes on forever.
 */
export function buildSelectorPath(descriptor) {
  const steps = [];

  for (let node = descriptor; node && node.tag; node = node.parent) {
    steps.unshift(stepFor(node));
  }

  if (steps.length <= MAX_PATH_DEPTH) return steps.join(' > ');

  const kept = [steps[0], '…', ...steps.slice(steps.length - (MAX_PATH_DEPTH - 1))];
  return kept.join(' > ');
}

function stepFor(node) {
  let step = node.tag;

  if (node.id) return `${step}#${node.id}`;

  const classes = (node.classes ?? []).filter(
    (name) => name && !name.startsWith('[') && !SCOPED_CLASS.test(name),
  );
  if (classes.length > 0) {
    step += classes.map((name) => `.${name}`).join('');
  } else if (ROOTS.has(node.tag)) {
    // `body:nth-child(2)` is true of every page in existence and tells a reader
    // nothing. The two roots are named by their tag.
  } else if (Number.isInteger(node.index) && node.index > 1) {
    // Nothing unique to name it with, so position is the only handle a reader
    // has. `:nth-child(1)` is noise, so it is left off.
    step += `:nth-child(${node.index})`;
  }

  return step;
}

/* -------------------------------------------------------------------------
 * Overflow
 * ---------------------------------------------------------------------- */

/** Sub-pixel layout rounding; a fraction of a pixel is not a scrollbar. */
export const DEFAULT_OVERFLOW_TOLERANCE = 1;

/**
 * Decide whether a page scrolls sideways, and name what is too wide.
 *
 * Two independent answers, because they answer different questions:
 *
 *   - `overflows` is about the page. If the document scroll width exceeds the
 *     viewport, the reader loses the row they were on - ADR-0009's worst
 *     failure mode.
 *   - `offenders` is about the elements. An element can be wider than the
 *     viewport and hidden by a clipping ancestor, so the page not scrolling is
 *     not evidence that nothing is too wide. Reporting them separately is what
 *     keeps a clipped overflow from being read as a clean run.
 */
export function findOverflowOffenders({
  width = null,
  viewportWidth,
  scrollWidth,
  boxes = [],
  tolerance = DEFAULT_OVERFLOW_TOLERANCE,
}) {
  const limit = viewportWidth + tolerance;
  const offenders = boxes
    .filter((box) => box && Number.isFinite(box.right) && box.right > limit)
    .map((box) => ({
      path: box.path,
      right: box.right,
      width: box.width,
      overflowPx: Math.round((box.right - viewportWidth) * 10) / 10,
    }))
    .sort((a, b) => b.overflowPx - a.overflowPx);

  const pageOverflow = Number.isFinite(scrollWidth) && scrollWidth > viewportWidth + tolerance;

  return {
    width: width ?? viewportWidth,
    viewportWidth,
    scrollWidth,
    overflows: pageOverflow,
    scrollOverflowPx: pageOverflow ? Math.round((scrollWidth - viewportWidth) * 10) / 10 : 0,
    offenders,
  };
}

/* -------------------------------------------------------------------------
 * Pointer gating
 * ---------------------------------------------------------------------- */

/**
 * Judge ADR-0009's decision 4 against what the page actually rendered.
 *
 * The decision splits pointer feedback by question rather than by device: hover
 * tints live inside `@media (hover: hover)`, press feedback is ungated, and the
 * chip spacing follows `@media (any-pointer: coarse)`. The reasoning for that is
 * a fact about how the media features are defined; what the stylesheet *does*
 * with it is a fact about this page, and only a rendered probe can tell.
 *
 * Each phase supplies an emulated device, whether that device could be emulated
 * at all, what the browser reported for the media queries, and the colours it
 * painted at rest, under a hover, and under a press. The verdicts are read off
 * those observations rather than off the stylesheet, so a re-gated rule fails
 * here the same way it fails the ADR's own mutation check.
 *
 * A check that cannot be emulated is returned with `ok: null` rather than
 * dropped. It is the difference between "this passed" and "this was not
 * measured", and a report that cannot express the second will eventually be read
 * as the first.
 */
export function judgePointerGating(phases) {
  const emulable = phases.filter((phase) => phase.emulable !== false);
  const undeclared = phases.filter((phase) => phase.emulable === false);
  const byName = (name) => emulable.find((phase) => phase.name === name);

  const mouse = byName('mouse only');
  const phone = byName('phone');
  const hybrid = byName('touchscreen laptop');

  const checks = [];

  checks.push({
    id: 'device-profiles-applied',
    question: 'the browser reports the pointer features each emulated device is supposed to report',
    expected: emulable
      .map((phase) => `${phase.name}: hover ${phase.expected.hover}, pointer ${phase.expected.pointer}, any-pointer coarse ${phase.expected.anyPointerCoarse}`)
      .join('; '),
    actual: emulable
      .map((phase) => `${phase.name}: hover ${phase.queries.hover}, pointer ${phase.queries.pointer}, any-pointer coarse ${phase.queries.anyPointerCoarse}`)
      .join('; '),
    // A profile that did not apply makes every other reading in the run a
    // statement about the wrong device, so this is checked first and loudly.
    // `any-pointer: coarse` is compared as a yes/no on both sides: the page
    // answers with a matchMedia boolean and the profile states a boolean, and
    // comparing a boolean to the string 'coarse' would fail on every run.
    ok: emulable.every(
      (phase) =>
        phase.queries.hover === phase.expected.hover &&
        phase.queries.pointer === phase.expected.pointer &&
        Boolean(phase.queries.anyPointerCoarse) === Boolean(phase.expected.anyPointerCoarse),
    ),
  });

  if (mouse && phone) {
    checks.push({
      id: 'hover-gated',
      question: 'the hover tint applies under hover: hover and not under hover: none',
      expected: `tint on the ${mouse.name}, no tint on the ${phone.name}`,
      actual: `${tint(mouse)} / ${tint(phone)}`,
      ok: tint(mouse) === 'tinted' && tint(phone) === 'untinted',
    });

    checks.push({
      id: 'press-ungated',
      question: 'a press tints the chip wherever a press can be observed, gated or not',
      expected: `press tint on the ${emulable.map((phase) => phase.name).join(' and the ')}`,
      actual: emulable.map((phase) => `${phase.name} ${press(phase)}`).join('; '),
      ok: emulable.every((phase) => press(phase) === 'tinted'),
    });

    // A held touch is the input a finger actually makes, and this browser does
    // not put the element into `:active` for one. That is a limit of what can be
    // observed here, not a property of the page, so it is reported as open.
    const touchBlind = emulable.filter((phase) => phase.touchPressActiveMatched === false);
    if (touchBlind.length > 0) {
      checks.push({
        id: 'press-under-held-touch',
        question: 'a held touch puts the chip into :active, so the press tint shows to a finger',
        expected: ':active matched while the touch is held',
        actual: `${touchBlind.map((phase) => phase.name).join(', ')}: :active not matched while a touch was held`,
        ok: null,
      });
    }

    checks.push({
      id: 'spacing-follows-coarse',
      question: 'the chip spacing follows a coarse pointer rather than staying at the mouse value',
      expected: `wider on the ${phone.name} than on the ${mouse.name}`,
      actual: `${phone.gap} / ${mouse.gap}`,
      ok: parseFloat(phone.gap) > parseFloat(mouse.gap),
    });
  }

  if (hybrid) {
    checks.push({
      id: 'hybrid-press-and-spacing',
      question: 'a hybrid - hover: hover with any-pointer: coarse - keeps its press tint and its wider spacing',
      expected: 'the touchscreen laptop profile, emulated',
      actual: hybrid.reason ?? 'emulated',
      ok: null,
    });
  }

  for (const phase of undeclared) {
    checks.push({
      id: `unemulated-${phase.name.replace(/\s+/g, '-')}`,
      question: `the ${phase.name} profile can be emulated at all`,
      expected: 'emulated',
      actual: phase.reason ?? 'not emulated',
      ok: null,
    });
  }

  return {
    checks,
    ok: checks.filter((check) => check.ok !== null).every((check) => check.ok),
    settled: checks.filter((check) => check.ok === true).length,
    unsettled: checks.filter((check) => check.ok === null).length,
  };
}

const tint = (phase) => (phase?.hoverBackground === phase?.restingBackground ? 'untinted' : 'tinted');
const press = (phase) => (phase?.pressBackground === phase?.restingBackground ? 'untinted' : 'tinted');

export function formatPointerReport({ selector, group, verdict }) {
  const lines = [`Pointer and press feedback, as rendered (${selector})`, ''];

  for (const check of verdict.checks) {
    // `ok: null` is a check this tooling cannot make, and it is printed as its
    // own state rather than folded into the pass line.
    const status = check.ok === null ? 'open' : check.ok ? 'ok  ' : 'FAIL';
    lines.push(`  ${status} ${check.question}`);
    lines.push(`          expected  ${check.expected}`);
    lines.push(`          actual    ${check.actual}`);
  }

  lines.push('');
  lines.push(
    `${verdict.settled} check(s) settled by measurement, ${verdict.unsettled} not settled by it` +
      (verdict.ok ? ', and every settled one passed' : ', and at least one settled one failed'),
  );
  lines.push(
    'Emulated media features are not hardware. What this establishes is that the page branches',
    'the way ADR-0009 decided under the profiles a browser can be made to report; what it does',
    'not establish is how a real device reports them. See the report in docs/audits/.',
  );

  if (group) lines.push(`  (chip group measured: ${group})`);

  return lines.join('\n');
}

/* -------------------------------------------------------------------------
 * Parsing
 * ---------------------------------------------------------------------- */

const MAX_WIDTH = 10000;

/** Parse a comma-separated list of widths, e.g. ADR-0009's `320,360,390,640`. */
export function parseWidthList(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('No widths given. Expected a comma-separated list such as 320,360,390,640.');

  return raw.split(',').map((entry) => {
    const trimmed = entry.trim();
    const width = Number(trimmed);

    if (!/^\d+$/.test(trimmed) || !Number.isInteger(width) || width < 1 || width > MAX_WIDTH) {
      throw new Error(
        `Width ${trimmed || '(blank)'} is not a viewport width between 1 and ${MAX_WIDTH}. ` +
          'A width this command cannot set is a measurement it will not report.',
      );
    }

    return width;
  });
}

/** Parse a comma-separated selector list, dropping blanks. */
export function parseSelectorList(value) {
  const selectors = String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (selectors.length === 0) {
    throw new Error('No selectors given. A contrast run with no selector measures nothing.');
  }

  return selectors;
}

/* -------------------------------------------------------------------------
 * Tap
 * ---------------------------------------------------------------------- */

/**
 * Decide what a tap actually proved.
 *
 * Four outcomes, and the difference between the last two is the whole reason
 * this is not a boolean:
 *
 *   - `opened`: the tap changed the target's rendered state. The check passed.
 *   - `already-open`: the control is not rendered at this width *and* the target
 *     is already visible. That is the `sm+` layout doing its job - the
 *     disclosure does not exist above the breakpoint - so a run at 640 that
 *     reports this has measured the design working, not a dead toggle.
 *   - `unreachable`: the control is not rendered at this width and the target is
 *     hidden too. Nothing on the page can open the panel, which on a phone
 *     width is exactly the bug ADR-0009 warned about.
 *   - `no-effect`: the control was there and the tap changed nothing.
 */
export function classifyTap({ controlFound, controlHasBox, targetFound, before, after }) {
  if (!controlFound) {
    return { verdict: 'no-effect', failure: true, detail: 'the control is not in the DOM at all' };
  }

  if (!targetFound) {
    return { verdict: 'no-effect', failure: true, detail: 'the element the control controls is not in the DOM' };
  }

  const opened =
    after.display !== before.display ||
    after.visibility !== before.visibility ||
    after.expanded !== before.expanded;

  if (opened) {
    return { verdict: 'opened', failure: false, detail: 'the tap opened the panel' };
  }

  if (!controlHasBox) {
    return before.display === 'none' || before.visibility === 'hidden'
      ? {
          verdict: 'unreachable',
          failure: true,
          detail:
            'the control has no box at this width and the panel is closed, so nothing on the page can open it',
        }
      : {
          verdict: 'already-open',
          failure: false,
          detail: 'no toggle is rendered at this width and the panel is already shown, which is the wider layout',
        };
  }

  return { verdict: 'no-effect', failure: true, detail: 'the tap changed nothing: the panel stayed as it was' };
}

/* -------------------------------------------------------------------------
 * Reporting
 * ---------------------------------------------------------------------- */

const ratio = (value) => `${(Math.round(value * 100) / 100).toFixed(2)}:1`;

/**
 * The horizontal-overflow report, per width.
 *
 * A clean width is printed as a pass and not merely omitted, because a report
 * that only names failures cannot be told apart from a run that measured
 * nothing.
 */
export function formatOverflowReport(results) {
  const lines = ['Horizontal overflow at the tool-layer widths', ''];

  for (const result of results) {
    const { width } = result;
    if (result.overflows) {
      lines.push(
        `  ${width}px  SCROLLS  (scroll width ${result.scrollWidth}, viewport ${result.viewportWidth}, ` +
          `${result.scrollOverflowPx}px past the edge)`,
      );
    } else {
      lines.push(`  ${width}px  clean    no horizontal scroll (viewport ${result.viewportWidth})`);
    }

    for (const offender of result.offenders) {
      const size = Number.isFinite(offender.width) ? `, ${offender.width}px wide` : '';
      lines.push(
        `          offender ${offender.path} - right edge ${offender.right}${size}, ` +
          `${offender.overflowPx}px past the ${result.viewportWidth}px viewport`,
      );
    }

    if (!result.overflows && result.offenders.length > 0) {
      lines.push(
        '          (the page does not scroll, but these are wider than the viewport; ' +
          'something is clipping them)',
      );
    }
  }

  const scrolling = results.filter((result) => result.overflows);
  lines.push('');
  lines.push(
    scrolling.length === 0
      ? `No page scrolls horizontally at any of the ${results.length} widths measured.`
      : `${scrolling.length} of ${results.length} widths scroll horizontally: ` +
        scrolling.map((result) => `${result.width}px`).join(', '),
  );

  return lines.join('\n');
}

/**
 * The contrast report: one row per selector, both themes on the row.
 *
 * An element that is not rendered in a theme is reported as missing in that
 * theme rather than dropped, because "not found" and "found, and it fails" are
 * different facts and a reader needs to know which one they are looking at.
 */
export function formatContrastReport(findings) {
  const lines = ['Measured contrast, sampled from rendered computed colours', ''];

  for (const finding of findings) {
    if (finding.missing && finding.missing.length > 0) {
      const found = finding.missing.length === 2 ? 'either theme' : finding.missing.join(' theme');
      lines.push(`  ${finding.selector}  not rendered in ${found} - not found in the DOM, so no ratio is reported`);
      continue;
    }

    const size = `${finding.fontSizePx}px${Number(finding.fontWeight) >= 700 ? ' bold' : ''}`;
    lines.push(`  ${finding.selector}  (${size})`);

    for (const [theme, result] of Object.entries(finding.themes)) {
      // The colours are printed per theme, not once for the selector: the two
      // themes genuinely paint different pairs, and one set of colours above
      // two sets of ratios would be a number attached to the wrong paint.
      lines.push(
        `      ${theme.padEnd(10)} ${ratio(result.ratio).padStart(8)}  ${result.grade.verdict} ` +
          `(${result.grade.requirement})`,
      );
      lines.push(`                  ${result.color} on ${result.background}`);
    }
  }

  return lines.join('\n');
}

/**
 * The tap report: what the element was, what the tap did to it.
 *
 * The class delta is printed even when nothing else moved, because on these two
 * disclosures the panel is revealed by removing Alpine's inline `display` and
 * the class list is how a reviewer sees the toggle actually engaged.
 */
export function formatTapReport(results) {
  const lines = ['Synthesized touch taps', ''];

  for (const result of results) {
    lines.push(`  ${result.selector}`);
    lines.push(`      page        ${result.url} at ${result.width}px, via ${result.touch}`);
    lines.push(`      watched     ${result.target}`);

    const before = result.before ?? {};
    const after = result.after ?? {};

    lines.push(
      `      before      display ${before.display}, visibility ${before.visibility}, ` +
        `aria-expanded ${before.expanded}`,
    );
    lines.push(
      `      after       display ${after.display}, visibility ${after.visibility}, ` +
        `aria-expanded ${after.expanded}`,
    );

    const added = (after.classes ?? []).filter((name) => !(before.classes ?? []).includes(name));
    const removed = (before.classes ?? []).filter((name) => !(after.classes ?? []).includes(name));
    if (added.length > 0 || removed.length > 0) {
      const changes = [
        added.length > 0 ? `+${added.join(' ')}` : null,
        removed.length > 0 ? `-${removed.join(' ')}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      lines.push(`      classes     ${changes}`);
    } else {
      lines.push('      classes     unchanged');
    }

    // The control's own aria-expanded is the contract a screen reader is given,
    // so a tap that opens the paint without flipping it is a different defect
    // from one that does both, and the report has to be able to say which.
    const control = result.control;
    if (control?.before && control?.after) {
      lines.push(
        `      control     aria-expanded ${control.before.expanded} -> ${control.after.expanded}, ` +
          `display ${control.before.display} -> ${control.after.display}`,
      );
    }

    lines.push(
      result.classification
        ? `      result      ${result.classification.detail}` +
            (result.classification.failure ? ' [fails]' : ' [passes]')
        : result.opened
          ? '      result      the tap opened the panel'
          : '      result      the tap produced no change: the panel stayed closed',
    );
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
