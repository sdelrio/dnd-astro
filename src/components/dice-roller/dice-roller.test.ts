import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../styles/contrast';

const source = readFileSync(new URL('./DiceRoller.astro', import.meta.url), 'utf8');

describe('DiceRoller theme colors', () => {
  it('does not use hardcoded blue utility classes', () => {
    expect(source).not.toMatch(/\bblue-\d+/);
  });

  it('uses the Starlight accent color variables for interactive and highlight elements', () => {
    for (const variable of ['--sl-color-accent', '--sl-color-accent-low', '--sl-color-accent-high']) {
      expect(source).toContain(variable);
    }
  });
});

/**
 * Every HTML void element, which is a closed set rather than a preference.
 * A void element the walker does not know about opens a level that never
 * closes, so every later sibling is read as a child and a real second root goes
 * unreported - the guard would pass on exactly the markup it exists to reject.
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * A fresh HTML tag matcher, with attribute values matched as units.
 *
 * The obvious `<(\/?)([\w-]+)\b[^>]*?>` stops at the first `>`, which an
 * attribute value may contain before the tag's own `>` (`:class="a/"`). That
 * truncation can also turn the value's trailing `/` into a self-closing marker,
 * desynchronising the level counter for the rest of the body.
 *
 * A new instance per caller, because a shared `/g` regex carries `lastIndex`
 * between walks.
 */
const htmlTag = (name: string) =>
  new RegExp(`<(\\/?)(${name})\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, 'g');

/**
 * Isolates the inner content of the `x-for` over the ability tiles and returns
 * the tag names of its top-level element children.
 *
 * Nested `<template>` elements are counted by depth rather than stripped: a
 * `template` is itself an element, so a second top-level `<template>` is a
 * second root as far as Alpine is concerned. That is precisely the bug this
 * guards - Alpine clones only `content.firstElementChild` and silently drops
 * everything after it.
 */
function topLevelChildrenOfAbilityXFor(markup: string): string[] {
  const open = '<template x-for="(ability, index) in abilities"';
  const start = markup.indexOf(open);
  expect(start, 'ability x-for template not found').toBeGreaterThan(-1);

  // Blank comments to equal-length whitespace rather than deleting them. A
  // comment containing `</template>` would otherwise close the walk early, and
  // deleting shifts every later index so offsets taken from `markup` no longer
  // address the same spot in the working string.
  const stripped = markup.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

  // Walk forward tracking template nesting to find the matching close tag.
  let depth = 0;
  let closeStart = -1;
  const tag = htmlTag('template');
  tag.lastIndex = start;
  for (let m = tag.exec(stripped); m; m = tag.exec(stripped)) {
    depth += m[1] === '' ? 1 : -1;
    if (depth === 0) {
      closeStart = m.index;
      break;
    }
  }
  expect(closeStart, 'unterminated ability x-for template').toBeGreaterThan(-1);

  // Inner content only. Keeping the outer tags would make the depth walk above
  // start from this template's own open tag.
  const body = stripped.slice(markup.indexOf('>', start) + 1, closeStart);

  const names: string[] = [];
  let level = 0;
  const element = htmlTag('[a-zA-Z][\\w:-]*');
  for (let m = element.exec(body); m; m = element.exec(body)) {
    const [, closing, name, attributes] = m;
    if (VOID_ELEMENTS.has(name.toLowerCase())) continue;
    if (attributes.trimEnd().endsWith('/')) {
      if (level === 0) names.push(name);
      continue;
    }
    if (closing) {
      level -= 1;
      continue;
    }
    if (level === 0) names.push(name);
    level += 1;
  }
  return names;
}

// ---------------------------------------------------------------------------
// A minimal CSS resolver over the component's own <style> block.
//
// The contrast guard used to hardcode the colours it was checking, which meant
// it only ever verified the numbers someone had written next to the assertion.
// Reading the values back out of the stylesheet is what makes a bad fill
// visible. Resolution follows the real cascade - a dark-theme rule beats a light
// one of equal specificity, and a later rule beats an earlier one - so adding a
// dark override is picked up without touching the test.
// ---------------------------------------------------------------------------

/** The style block that carries the swap panel and round buttons. */
const styleBlock =
  [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .find((block) => block.includes('.dice-round-btn')) ?? '';

/**
 * Comments are stripped before any selector is parsed. The block opens with a
 * block comment that documents the contrast table, so without this a selector
 * capture can swallow prose that mentions a class name.
 */
const styleText = styleBlock.replace(/\/\*[\s\S]*?\*\//g, '');

interface StyleRule {
  classes: string[];
  pseudos: string[];
  /** A `[data-theme='dark']` rule applies in the dark theme only. */
  dark: boolean;
  body: string;
  specificity: [number, number, number];
  order: number;
}

/** Splits a selector list on top-level commas, ignoring commas inside `()`. */
function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of selector) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Reads the class names, pseudo-classes and theme scope out of a selector.
 *
 * Only the final compound carries the element's own classes and pseudos; an
 * ancestor is a scope condition, and `:global(...)` is Astro's escape hatch
 * rather than a pseudo-class.
 */
function parseSelector(selector: string): Pick<StyleRule, 'classes' | 'pseudos' | 'dark'> {
  const unwrapped = selector.replace(/:global\(([^()]*)\)/g, '$1');
  const compounds = unwrapped.split(/\s+/).filter(Boolean);
  const last = compounds[compounds.length - 1] ?? '';
  return {
    classes: [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]),
    pseudos: [...last.matchAll(/:(?!:)([\w-]+)/g)].map((m) => m[1]),
    dark: compounds.some((c) => c.includes("data-theme='dark'")),
  };
}

/** CSS specificity as [ids, classes + pseudo-classes + attrs, elements]. */
function specificityOf(selector: string): [number, number, number] {
  const sel = selector.trim();
  return [
    (sel.match(/#[\w-]+/g) ?? []).length,
    (sel.match(/\.[\w-]+/g) ?? []).length +
      (sel.match(/(?<!:):(?!:)[a-z-]+/g) ?? []).length +
      (sel.match(/\[[^\]]+\]/g) ?? []).length,
    (sel.match(/(?:^|[\s>+~])([a-z][\w-]*)/g) ?? []).length,
  ];
}

const RULES: StyleRule[] = [];
for (const m of styleText.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  // Only the text after the previous block's `}` is this rule's selector, so a
  // `}` inside a nested construct cannot leave prose in the capture.
  const selector = m[1].trim().split('}').pop()!.trim();
  for (const one of splitSelectorList(selector)) {
    RULES.push({
      ...parseSelector(one),
      body: m[2],
      specificity: specificityOf(one),
      order: RULES.length,
    });
  }
}

/** A description of the element whose resolved paint is being asked for. */
interface PaintTarget {
  classes: string[];
  pseudos: string[];
}

const describeTarget = (el: PaintTarget) =>
  `.${el.classes.join('.')}${el.pseudos.length ? `:${el.pseudos.join(':')}` : ''}`;

/**
 * Every rule that applies to `el` in `theme`, weakest first.
 *
 * A non-dark rule applies in both themes, because nothing wraps this block in a
 * light-theme media query - the dark rules win by specificity, not by being
 * later. Getting that backwards would silently report the light values for a
 * dark button.
 */
function cascadeFor(theme: 'light' | 'dark', el: PaintTarget): StyleRule[] {
  return RULES.filter(
    (rule) =>
      (!rule.dark || theme === 'dark') &&
      rule.classes.every((c) => el.classes.includes(c)) &&
      rule.pseudos.every((p) => el.pseudos.includes(p))
  ).sort(
    (a, b) =>
      a.specificity[0] - b.specificity[0] ||
      a.specificity[1] - b.specificity[1] ||
      a.specificity[2] - b.specificity[2] ||
      a.order - b.order
  );
}

/**
 * The last declaration of `properties` that wins the cascade for `el`.
 *
 * Several property names may be passed so a shorthand and its longhand resolve
 * together: `border: 1px solid transparent` on the base class and
 * `border-color` on the modifier is one value, not two. A shorthand earlier in
 * the cascade is skipped in favour of a longhand later, which is what the
 * browser does.
 */
function valueOf(theme: 'light' | 'dark', el: PaintTarget, ...properties: string[]): string {
  const applicable = cascadeFor(theme, el);
  for (let i = applicable.length - 1; i >= 0; i--) {
    for (const property of properties) {
      const found = applicable[i].body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`));
      if (found) return found[1].trim();
    }
  }
  throw new Error(`no ${properties.join('/')} declared for ${describeTarget(el)} in ${theme}`);
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Colour keywords a shorthand can end in. `transparent` is the load-bearing one
 * here: it is how the cancel button says "no fill" and "no border", and a value
 * that is neither a hex nor one of these cannot be measured from the stylesheet.
 */
const COLOUR_KEYWORDS = new Set(['transparent', 'currentcolor', 'white', 'black']);

/**
 * The colour a declaration paints with, out of a hex or a shorthand.
 *
 * A shorthand carries its colour last - `border: 1px solid transparent`,
 * `outline: 2px solid #1b1716` - so the trailing token is taken when the whole
 * value is not already a hex. Reading `1px solid transparent` as the colour
 * would leave every border unmeasurable.
 */
function paintToken(raw: string, what: string): string {
  const trimmed = raw.trim();
  const candidate = HEX.test(trimmed) ? trimmed : (trimmed.split(/\s+/).pop() ?? '');
  if (HEX.test(candidate)) return candidate.toLowerCase();
  if (COLOUR_KEYWORDS.has(candidate.toLowerCase())) return candidate.toLowerCase();
  throw new Error(
    `${what} is "${raw}", neither a hex nor a colour keyword, so its contrast cannot be read`
  );
}

/** As `paintToken`, but a fill that paints nothing is not a valid ring. */
function hexValue(raw: string, what: string): string {
  const token = paintToken(raw, what);
  if (token === 'transparent') {
    throw new Error(`${what} is transparent, which is not a perceivable focus ring`);
  }
  return token;
}

function painted(theme: 'light' | 'dark', el: PaintTarget, properties: string[], what: string): string {
  return hexValue(valueOf(theme, el, ...properties), what);
}

/** The class list of a round button, read from the markup rather than assumed. */
function roundButtonClasses(ariaLabel: string): string[] {
  const at = source.indexOf(`aria-label="${ariaLabel}"`);
  expect(at, `${ariaLabel} button not found`).toBeGreaterThan(-1);
  const tag = source.slice(source.lastIndexOf('<button', at), source.indexOf('>', at));
  return [...tag.matchAll(/\bclass="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter(Boolean);
}

describe('ability x-for root walker', () => {
  const wrap = (body: string) =>
    `<template x-for="(ability, index) in abilities" :key="ability.name">${body}</template>`;

  it('counts a void element outside the pinned list as a sibling, not a nesting level', () => {
    // A void element the walker does not know about opens a level that never
    // closes, so every later sibling is miscounted as a child and a real second
    // root goes unreported. `wbr` is the cheapest of the seven; the walker has
    // to carry the whole HTML void set, not a hand-picked subset.
    expect(topLevelChildrenOfAbilityXFor(wrap('<div>a<wbr>b</div><div>c</div>'))).toEqual([
      'div',
      'div',
    ]);
  });

  it.each(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])(
    'treats <%s> as void',
    (tag) => {
      expect(topLevelChildrenOfAbilityXFor(wrap(`<div>a<${tag}>b</div><div>c</div>`))).toEqual([
        'div',
        'div',
      ]);
    }
  );

  it('does not let a > inside an attribute value end the tag early', () => {
    // `:class="a/"` truncates to `<div :class="a/>`, whose trailing slash reads
    // as a self-closing tag. The real div is not self-closing, so the following
    // `</div>` drives the level to -1 and every later sibling is swallowed - a
    // real second root goes unreported.
    expect(
      topLevelChildrenOfAbilityXFor(wrap('<div :class="a/">x</div><div>e</div>'))
    ).toEqual(['div', 'div']);
  });

  it('keeps a > and a < inside an attribute value from splitting the tag', () => {
    expect(
      topLevelChildrenOfAbilityXFor(wrap('<div :title="a > b < c">x</div><div>e</div>'))
    ).toEqual(['div', 'div']);
  });

  it('still reports the real second root the regression produced', () => {
    expect(topLevelChildrenOfAbilityXFor(source)).toEqual(['div']);
  });
});

describe('DiceRoller ability tile markup', () => {
  // Regression: moving the swap `x-if` panel out to a sibling of the tile gave
  // the x-for two root children. Alpine warns and clones only
  // `content.firstElementChild`, so the confirm/cancel panel never rendered and
  // a staged swap could not be confirmed - while the live region told users to
  // look for buttons that did not exist. The suite passed throughout because it
  // covers `dice-utils`, not markup.
  it('gives the ability x-for exactly one root element', () => {
    expect(topLevelChildrenOfAbilityXFor(source)).toEqual(['div']);
  });

  it('makes the ability tile a real button with a pressed state', () => {
    const tileAt = source.indexOf('@click="selectAbility(index)"');
    expect(tileAt).toBeGreaterThan(-1);
    const openTag = source.slice(tileAt - 400, tileAt + 200);
    expect(openTag).toContain('<button');
    expect(openTag).toContain('type="button"');
    expect(openTag).toContain(':aria-pressed=');
  });

  it('does not paint the swap panel or confirm button with the live accent tokens', () => {
    // `--sl-color-text-invert` is `--sl-color-accent-low`, not white, so the
    // pairing is 5.28:1 in dark but only 2.74:1 in light (#329). An accent-filled
    // panel is worse: in light it is #b9c0b6, leaving the gold confirm button at
    // 1.74:1 and cancel at 1.59:1 - neither keeps a perceivable boundary.
    const confirmAt = source.indexOf('aria-label="Confirm swap"');
    const button = source.slice(confirmAt - 300, confirmAt);
    expect(button).toContain('dice-round-btn--confirm');
    expect(button).not.toContain('--sl-color-accent');

    const panelAt = source.indexOf('class="dice-swap-panel');
    expect(panelAt).toBeGreaterThan(-1);
    // Scope to the panel's own tag - the label inside it legitimately uses
    // --sl-color-accent-high for its text.
    const panelTag = source.slice(panelAt, source.indexOf('>', panelAt));
    expect(panelTag).toContain('dice-swap-panel');
    expect(panelTag).not.toContain('--sl-color-accent');
  });

  it('announces state changes through a polite live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('x-text="announcement"');
  });
});

/**
 * The swap pair's contrast, measured from the stylesheet.
 *
 * Every value below is read out of the `.dice-round-btn--*` rules rather than
 * written into the test. The previous version of this guard pasted the fill and
 * glyph hexes into the assertion, so it could only confirm the numbers someone
 * had already checked by hand: move the confirm fill onto the panel and it
 * stayed green. Six of the eighteen regressions tried against it slipped
 * through, including every cancel-button one, because the cancel button had no
 * assertions at all.
 *
 * The matrix is fill-vs-panel, glyph-vs-fill, border-vs-panel and ring-vs-fill,
 * across both themes and both the rest and hover states - eight pairings per
 * button. WCAG 1.4.11 wants 3:1 for the shape, the glyph and the focus ring;
 * 2.4.11 wants the ring not to be lost against what it outlines.
 */
describe('DiceRoller round button contrast', () => {
  const THEMES = ['light', 'dark'] as const;
  const STATES = [
    { id: 'rest', pseudos: [] },
    { id: 'hover', pseudos: ['hover'] },
  ] as const;
  const BUTTONS = [
    { id: 'confirm', ariaLabel: 'Confirm swap' },
    { id: 'cancel', ariaLabel: 'Cancel swap' },
  ] as const;
  const CONFIRM = BUTTONS[0];
  const CANCEL = BUTTONS[1];
  const REST = STATES[0];

  const CASES = THEMES.flatMap((theme) =>
    BUTTONS.flatMap((button) =>
      STATES.map((state) => ({ theme, button, state }))
    )
  );

  /** The panel the pair sits on, which is what a transparent fill reveals. */
  const panelOf = (theme: 'light' | 'dark') =>
    painted(theme, { classes: ['dice-swap-panel'], pseudos: [] }, ['background'], 'the swap panel');

  /**
   * The four paints of one button in one theme and state.
   *
   * `transparent` resolves to the panel rather than to a sentinel: a fill that
   * paints nothing shows the panel through, so every pairing below it is the
   * same pairing the panel itself has. A sentinel would let a transparent fill
   * pass any check.
   */
  function paints(theme: 'light' | 'dark', button: (typeof BUTTONS)[number], state: (typeof STATES)[number]) {
    const panel = panelOf(theme);
    const el: PaintTarget = {
      classes: roundButtonClasses(button.ariaLabel),
      pseudos: [...state.pseudos],
    };
    const label = `${button.id} ${state.id} in ${theme}`;
    const resolve = (properties: string[], what: string) => {
      const token = paintToken(valueOf(theme, el, ...properties), `${label} ${what}`);
      return token === 'transparent' ? panel : token;
    };
    // The ring is on a pseudo-class of the same button, so a hover fill is what
    // it has to stay distinct from, not the rest fill.
    const ring = hexValue(
      valueOf(theme, { ...el, pseudos: [...state.pseudos, 'focus-visible'] }, 'outline-color', 'outline'),
      `${label} focus ring`
    );
    return {
      panel,
      fill: resolve(['background-color', 'background'], 'fill'),
      glyph: resolve(['color'], 'glyph'),
      border: resolve(['border-color', 'border'], 'border'),
      ring,
    };
  }

  it('resolves the values it asserts, so a renamed class fails loudly', () => {
    // Every value has to come from the cascade. If the classes stop resolving,
    // the pairings below would silently compare nothing.
    for (const { theme, button, state } of CASES) {
      expect(() => paints(theme, button, state), `${button.id} ${state.id} ${theme}`).not.toThrow();
    }
  });

  // A resolver that ignored the theme would report the light paints for every
  // case, and the dark half of the matrix would then be re-checking the light
  // half - a guard that looks like two themes and is one. The cancel button is
  // the proof, because the stylesheet overrides its glyph and border in dark and
  // the confirm button deliberately does not.
  it('reaches the dark overrides rather than reporting the light paints', () => {
    const light = paints('light', CANCEL, REST);
    const dark = paints('dark', CANCEL, REST);
    expect(dark.panel).not.toBe(light.panel);
    expect(dark.glyph).not.toBe(light.glyph);
    expect(dark.border).not.toBe(light.border);
    expect(dark.ring).not.toBe(light.ring);
    // The confirm pair has no dark override, so its fill and glyph are the same
    // value in both themes. Asserted so the previous test cannot pass by
    // discarding dark rules wholesale.
    expect(paints('dark', CONFIRM, REST).fill).toBe(paints('light', CONFIRM, REST).fill);
  });

  it.each(CASES)(
    'keeps $button.id $state.id in $theme legible against the panel',
    ({ theme, button, state }) => {
      const { panel, fill, glyph, border } = paints(theme, button, state);
      // Fill-vs-panel and border-vs-panel are two edges of one shape, and only
      // the strongest of them is the boundary a user perceives, so this is the
      // stronger of the two rather than two independent 3:1 bars. Asserting
      // both separately would be wrong for the shipped values: the cancel hover
      // fill is a deliberate 1.09:1 tint whose edge is carried entirely by the
      // border, and requiring the tint itself to clear 3:1 would forbid it. The
      // max still catches each regression on its own - wash the border out and
      // the cancel fill, which is transparent, leaves no edge at all.
      const boundary = Math.max(contrast(fill, panel), contrast(border, panel));
      expect(boundary, `${button.id} ${state.id} ${theme} shape against ${panel}`).toBeGreaterThanOrEqual(3);
      // The glyph is an SVG graphic (1.4.11, 3:1), not text - the accessible
      // name comes from aria-label, so 4.5:1 does not apply.
      expect(contrast(glyph, fill), `${button.id} ${state.id} ${theme} glyph on ${fill}`).toBeGreaterThanOrEqual(3);
    }
  );

  it.each(CASES)(
    'keeps the $button.id focus ring in $theme off its own fill',
    ({ theme, button, state }) => {
      const { panel, fill, ring } = paints(theme, button, state);
      expect(contrast(ring, fill), `${button.id} ${state.id} ${theme} ring on ${fill}`).toBeGreaterThanOrEqual(3);
      // The ring's only outside neighbour is the panel: `outline-offset: 2px`
      // leaves a gap of panel between it and the button's border, so a ring that
      // clears the fill and vanishes into the panel behind it is the same
      // failure as no ring at all. The border is deliberately not asserted here
      // - it is not adjacent, and holding it to 3:1 would fail correct values.
      expect(contrast(ring, panel), `${button.id} ${state.id} ${theme} ring on ${panel}`).toBeGreaterThanOrEqual(3);
    }
  );

  // The guard above is only as strong as its ability to read a value. A token
  // or a named colour is not a hex, and silently skipping it would restore the
  // exact hole this file was rewritten to close: the cancel button repainted
  // with `--sl-color-accent` passed every pairing when nothing could measure it.
  it.each(CASES)(
    'paints $button.id $state.id in $theme with hex literals only',
    ({ theme, button, state }) => {
      for (const [what, value] of Object.entries(paints(theme, button, state))) {
        expect(value, `${button.id} ${state.id} ${theme} ${what}`).toMatch(HEX);
      }
    }
  );
});

describe('DiceRoller hardening', () => {
  it('caps the log and the stats sample so a long session cannot grow unbounded', () => {
    expect(source).toContain('const LOG_LIMIT = 20;');
    expect(source).toContain('const SESSION_ROLL_LIMIT = 50;');
    // The log is newest-first, so it is trimmed at the tail; the sample keeps
    // the most recent rolls for the same reason.
    expect(source).toContain('this.resultLog.length = LOG_LIMIT');
    expect(source).toContain('this.sessionRolls.splice(0, this.sessionRolls.length - SESSION_ROLL_LIMIT)');
  });

  it('invalidates a pending per-ability roll when a full roll starts', () => {
    // Without the epoch guard, a re-roll scheduled 300ms earlier landed in the
    // middle of "Roll All Abilities" and overwrote one of its six tiles.
    expect(source).toContain('this.rollEpoch++');
    expect(source).toContain('const epoch = this.rollEpoch;');
  });

  it('releases the rolling flag on the bail path, not just on success', () => {
    // The bail returns before `updateAbilityWithRoll`, which is the only thing
    // that normally forces `rolling: false`. `rollAll` sweeping all six tiles
    // masks a stranded flag today, so this asserts the invariant rather than
    // relying on that coincidence to hold.
    const bail = source.match(/if \(this\.rollEpoch !== epoch\) \{[\s\S]*?\}/);
    expect(bail).not.toBeNull();
    expect(bail![0]).toContain('this.abilities[index].rolling = false;');
  });

  it('announces a refused tap instead of ignoring it', () => {
    // The tile stays clickable through a roll and after the session's one swap;
    // a silent return left a control that looked live and did nothing.
    const select = source.slice(
      source.indexOf('selectAbility(index: number) {'),
      source.indexOf('confirmSwap() {')
    );
    expect(select).toMatch(/if \(this\.isRolling\) \{[\s\S]*?announce\(/);
    expect(select).toMatch(/if \(this\.swapUsed\) \{[\s\S]*?announce\(/);
  });

  it('cancels a staged swap on Escape and stays quiet when nothing is staged', () => {
    expect(source).toContain('@keydown.escape.window="cancelSwap()"');
    expect(source).toContain('if (!this.stagedSwap && this.selectedIndex === null) return;');
  });

  it('does not invent a log line when a swap is staged before the first roll', () => {
    expect(source).toContain('if (this.resultLog.length > 0) {');
  });

  it('wraps long log lines', () => {
    expect(source).toMatch(/font-mono break-words/);
  });
});

describe('DiceRoller without JavaScript', () => {
  it('leads with a note instead of a live-looking dead button', () => {
    // A `<noscript>` block cannot remove the controls, so the note has to come
    // first and hide them. Leaving the inert button on screen is the exact
    // failure this is here to prevent.
    const noscript = source.slice(
      source.indexOf('<noscript>'),
      source.indexOf('</noscript>')
    );
    expect(noscript).toContain('needs JavaScript');
    expect(noscript).toContain('display: none !important');
    expect(source.indexOf('<noscript>')).toBeLessThan(source.indexOf('rollAll()'));
  });

  // If Astro hoists this stylesheet out of `<noscript>` into the head, the rule
  // applies to everyone and every control vanishes on a working page. That is a
  // silent total failure, so the modifier is pinned.
  it('keeps the hiding rule inside noscript with is:inline', () => {
    expect(source).toMatch(/<noscript>[\s\S]*?<style is:inline>/);
  });

  it('marks every inert region and gives the rule a root to hang off', () => {
    expect(source).toContain('class="dice-roller-needs-js not-content space-y-6"');
    // The button, the tile grid, and the stats card. The result log is already
    // `x-cloak`, which never lifts without Alpine, so it needs no marker.
    const marked = source.match(/class="js-only[^"]*"/g) ?? [];
    expect(marked).toHaveLength(3);
  });
});

describe('DiceRoller stats window', () => {
  it('says the sample is a rolling window, since the session is now capped', () => {
    // Capping `sessionRolls` quietly changed what "Stats" means. A table
    // comparing tonight's average to an earlier one needs the window stated.
    expect(source).toContain('last 50 rolls');
    expect(source).toContain('const SESSION_ROLL_LIMIT = 50;');
  });
});

describe('DiceRoller responsive layout', () => {
  // A phone is the context this is read in. Three columns left each tile about
  // 106px on a 360px viewport, but a tile's floor is its four-die row (4*28 +
  // 3*4 = 124px) plus p-3 either side, so the grid forced the page to scroll
  // sideways mid-session. Two columns plus the smaller base die is the fit.
  it('never puts three ability tiles on a phone-width screen', () => {
    expect(source).toContain('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6');
  });

  it('shrinks the die row and tile padding below sm so two columns clear 320px', () => {
    expect(source).toContain('w-7 h-7 sm:w-8 sm:h-8');
    expect(source).toContain('class="p-3 sm:p-4"');
  });

  // WCAG 2.5.8. The ability tile and the swap pair are sized by CSS
  // (.dice-round-btn) or fill their column, so only the per-ability re-roll -
  // the one control whose visual is smaller than its hit area - is asserted.
  it('keeps a 44px hit area on the per-ability re-roll', () => {
    const reroll = source.match(/@click="rollIndividual\(index\)"[\s\S]*?>/);
    expect(reroll![0]).toContain('w-11 h-11');
  });
});
