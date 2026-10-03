import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../styles/contrast';
import { ABILITY_LABELS } from './dice-utils';

const source = readFileSync(new URL('./DiceRoller.astro', import.meta.url), 'utf8');
/** The behaviour lives here now, so the guards read this rather than the markup. */
const component = readFileSync(new URL('./dice-roller-component.ts', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../../alpine.ts', import.meta.url), 'utf8');

describe('DiceRoller theme colors', () => {
  it('does not use hardcoded blue utility classes', () => {
    expect(source).not.toMatch(/\bblue-\d+/);
  });

  it('uses the Starlight accent color variables for interactive and highlight elements', () => {
    // Matched on a word boundary. `toContain('--sl-color-accent')` is satisfied
    // by `--sl-color-accent-contrast` on its own, so the loose form passed
    // whatever the tool actually referenced.
    //
    // `--sl-color-text-invert` is load-bearing and must stay. The roll button's
    // fill is a different colour in each theme - #3f4a3a in light, #f7860f in
    // dark - so the one legible ink is not the same in both, and the invert
    // token is what tracks it: 9.33:1 and 5.28:1 respectively. Bark Black, the
    // obvious literal to reach for, is 7.09:1 in dark and 1.91:1 in light.
    for (const variable of [
      '--sl-color-accent',
      '--sl-color-accent-contrast',
      '--sl-color-accent-high',
      '--sl-color-text-invert',
    ]) {
      expect(source, `${variable} is unreferenced`).toMatch(
        new RegExp(`${variable}(?![\\w-])`)
      );
    }
  });
});

/**
 * Every HTML void element, which is a closed set rather than a preference.
 * A void element the walker does not know about opens a level that never
 * closes, so every later sibling is read as a child and a real second root goes
 * unreported - the guard would pass on exactly the markup it exists to reject.
 */
/**
 * One declaration out of the component's own stylesheet, read from source.
 *
 * The contrast guard above has its own resolver because it needs the cascade;
 * a single declaration does not, and going through it anyway means a renamed
 * class fails the assertion that depends on it rather than quietly matching
 * nothing.
 *
 * The anchor is `^`, `{` or `;`. `{` is load-bearing: the capture starts at the
 * selector, so a rule's *first* declaration is preceded by the brace and a
 * `^`-or-`;` anchor silently could not read it. That is invisible for every
 * declaration except the first, so a rule written `border-style` then
 * `background` resolved its background and reported no border at all.
 *
 * Comments inside the captured rule are blanked to spaces before the property is
 * read, for the same reason: this stylesheet explains its tokens in place, and a
 * comment above the first declaration would otherwise hide it. Blanking rather
 * than deleting keeps every offset in the capture valid.
 */
const decl = (selector: string, property: string): string => {
  const rule = source.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`));
  expect(rule, `${selector} has no rule`).not.toBeNull();
  const body = rule![0].replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const found = body.match(new RegExp(`(?:^|[;{])\\s*${property}\\s*:\\s*([^;]+)`));
  expect(found, `${selector} declares no ${property}`).not.toBeNull();
  return found![1].trim();
};

/**
 * The rem value as pixels. The root is 16px and the document does not change it.
 *
 * A `calc()` of rem lengths is summed rather than rejected, because the handle's
 * floor is computed from the mark's own tokens on purpose and the row-floor
 * arithmetic has to see through it. A `calc()` mixing in anything else throws
 * rather than being silently read as zero.
 */
const rem = (value: string): number => {
  const calc = value.match(/^calc\((.*)\)$/);
  if (calc) {
    // Split on an operator surrounded by whitespace, never on the hyphen inside a
    // custom property's name: `var(--dr-name-floor)` is one term, not two.
    const terms = calc[1].split(/\s+([+-])\s+/);
    return terms.reduce((total, term) => {
      const px = term === '+' || term === '-' ? 0 : rem(term.trim());
      return total + (term === '-' ? -px : px);
    }, 0);
  }
  // A `var()` term resolves against the panel's own block, so a floor computed
  // from tokens reads as the number it computes to rather than as text.
  const reference = value.match(/^var\(--dr-([\w-]+)\)$/);
  if (reference) {
    return rem(decl('.dr', `--dr-${reference[1]}`));
  }
  const m = value.match(/^([\d.]+)rem$/);
  expect(m, `${value} is not a rem length`).not.toBeNull();
  return Number(m![1]) * 16;
};

/**
 * The trade handle's own floor, read from the stylesheet rather than written into
 * the assertions that depend on it.
 *
 * Both the row-layout guards and the mark's read this, because the mark lives
 * inside the handle: what the narrowest row has to fit is the handle's floor, and
 * a floor that forgot the mark would let every one of those guards pass on a row
 * wider than the number it checked.
 */
const tradeMin = () => rem(decl('.dr-trade', 'min-width'));

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

/** The style block that carries the whole surface, swap panel and round buttons included. */
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
      const found = applicable[i].body.match(new RegExp(`(?:^|[;{])\\s*${property}\\s*:\\s*([^;]+)`));
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

/**
 * The same resolution, but through the panel's own custom properties.
 *
 * `painted` needs a hex and this stylesheet paints almost nothing in one: the
 * surface is `--dr-surface`, the ink is `--dr-ink`, and both are declared in the
 * `.dr` blocks as `var(--color-…)` references into `tailwind.css`. Reading them
 * as literals would mean pasting the palette into the assertion, which is the
 * hole the whole resolver above was written to close. So the chain is followed
 * out to the hex: theme block, then the palette.
 *
 * A token that resolves to anything but a hex throws, so a themed surface
 * repainted with a `color-mix` or a named colour fails here rather than
 * silently comparing nothing.
 */
const palette = readFileSync(new URL('../../styles/tailwind.css', import.meta.url), 'utf8');

/** A `--color-*` value out of the theme palette, which is where the chain ends. */
function paletteValue(name: string, what: string): string {
  const found = palette.match(new RegExp(`${name}:\\s*(#[0-9a-f]{3,8})\\s*;`, 'i'));
  if (!found) {
    throw new Error(`${what} resolves to ${name}, which is not a hex in tailwind.css`);
  }
  return found[1].toLowerCase();
}

/** A `--dr-*` token's hex in one theme, following the reference chain to the palette. */
function token(theme: 'light' | 'dark', name: string, what: string): string {
  const block =
    theme === 'dark'
      ? source.match(/:global\(:root\[data-theme='dark'\]\) \.dr \{([\s\S]*?)\n {2}\}/)?.[1] ?? ''
      : source.match(/\n {2}\.dr \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
  const raw = block.match(new RegExp(`--dr-${name}:\\s*([^;]+);`))?.[1].trim();
  if (!raw) {
    throw new Error(`--dr-${name} is not declared for the ${theme} theme`);
  }
  const referenced = raw.match(/^var\((--[\w-]+)\)$/);
  if (!referenced) {
    throw new Error(`${what} is "${raw}", which is not a reference this resolver can follow`);
  }
  return paletteValue(referenced[1], `${what} (--dr-${name})`);
}

/**
 * The colour an element paints with in one theme, resolving its own custom
 * properties through the panel's blocks.
 *
 * Falls back to the cascade for anything that is already a literal, so one
 * helper serves both the rules that use a hex directly and the ones that name a
 * token.
 */
function themedPaint(
  theme: 'light' | 'dark',
  el: PaintTarget,
  properties: string[],
  what: string
): string {
  const raw = valueOf(theme, el, ...properties);
  const tokenName = raw.match(/^var\(--dr-([\w-]+)\)$/);
  if (tokenName) return token(theme, tokenName[1], what);
  return paintToken(raw, what);
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

    const panelAt = source.indexOf('class="dr-swap"');
    expect(panelAt).toBeGreaterThan(-1);
    // Scope to the panel's own tag - the label inside it legitimately uses the
    // panel's own ink for its text.
    const panelTag = source.slice(panelAt, source.indexOf('>', panelAt));
    expect(panelTag).toContain('dr-swap');
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
    painted(theme, { classes: ['dr-swap'], pseudos: [] }, ['background'], 'the swap panel');

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

describe('DiceRoller Alpine wiring', () => {
  it('roots the component in the registered diceRoller data provider', () => {
    // `x-data="diceRoller"` names an `Alpine.data` registration rather than
    // calling a global, so the card works with no `window` at all.
    expect(source).toContain('x-data="diceRoller"');
    expect(registration).toContain("Alpine.data('diceRoller', diceRollerComponent)");
  });

  // Every helper used to be a `window` global so an inline `x-data` string could
  // reach it: eight of them plus the factory. They collide with anything else on
  // the page and no call site is type checked.
  it('publishes no window globals', () => {
    // Comments are stripped first: the prose above explains what the globals
    // were, and an assertion that trips on its own explanation is one nobody
    // trusts.
    const code = (file: string) =>
      file.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const file of [source, component, registration]) {
      expect(code(file), 'a window global').not.toMatch(/window\s*\./);
      expect(file).not.toContain('declare global');
    }
  });

  it('exposes formatModifier, the one helper the template calls, on the component', () => {
    expect(component).toContain('formatModifier: dice.formatModifier');
    expect(source).toContain('formatModifier(ability.modifier)');
  });
});

describe('DiceRoller hardening', () => {
  it('caps the log and the stats sample so a long session cannot grow unbounded', () => {
    expect(component).toContain('const LOG_LIMIT = 20;');
    expect(component).toContain('const SESSION_ROLL_LIMIT = 50;');
    // The log is newest-first, so it is trimmed at the tail; the sample keeps
    // the most recent rolls for the same reason.
    expect(component).toContain('this.resultLog.length = LOG_LIMIT');
    expect(component).toContain('this.sessionRolls.splice(0, this.sessionRolls.length - SESSION_ROLL_LIMIT)');
  });

  it('invalidates a pending per-ability roll when a full roll starts', () => {
    // Without the epoch guard, a re-roll scheduled 300ms earlier landed in the
    // middle of "Roll All Abilities" and overwrote one of its six tiles.
    expect(component).toContain('this.rollEpoch++');
    expect(component).toContain('const epoch = this.rollEpoch;');
  });

  it('releases the rolling flag on the bail path, not just on success', () => {
    // The bail returns before `updateAbilityWithRoll`, which is the only thing
    // that normally forces `rolling: false`. `rollAll` sweeping all six tiles
    // masks a stranded flag today, so this asserts the invariant rather than
    // relying on that coincidence to hold.
    const bail = component.match(/if \(this\.rollEpoch !== epoch\) \{[\s\S]*?\}/);
    expect(bail).not.toBeNull();
    expect(bail![0]).toContain('this.abilities[index].rolling = false;');
  });

  it('announces a refused tap instead of ignoring it', () => {
    // The tile stays clickable through a roll and after the session's one swap;
    // a silent return left a control that looked live and did nothing.
    const select = component.slice(
      component.indexOf('selectAbility(index: number) {'),
      component.indexOf('confirmSwap() {')
    );
    expect(select).toMatch(/if \(this\.isRolling\) \{[\s\S]*?announce\(/);
    expect(select).toMatch(/if \(this\.swapUsed\) \{[\s\S]*?announce\(/);
  });

  it('cancels a staged swap on Escape and stays quiet when nothing is staged', () => {
    expect(source).toContain('@keydown.escape.window="cancelSwap()"');
    expect(component).toContain('if (!this.stagedSwap && this.selectedIndex === null) return;');
  });

  it('does not invent a log line when a swap is staged before the first roll', () => {
    expect(component).toContain('if (this.resultLog.length > 0) {');
  });

  it('wraps long log lines', () => {
    // The log is ScalySans in a full-width well now, not monospace in a
    // 200px box, so the wrap is a property of the class rather than of a
    // utility on the element.
    const rule = source.match(/\.dr-log-line\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/overflow-wrap:\s*break-word/);
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
    expect(source).toContain('class="dice-roller-needs-js dr not-content"');
    // The panel and the ability rows inside it. The result log is already
    // `x-cloak`, which never lifts without Alpine, so it needs no marker.
    const marked = source.match(/class="js-only[^"]*"/g) ?? [];
    expect(marked).toHaveLength(2);
  });
});

describe('DiceRoller stats window', () => {
  it('says the sample is a rolling window, since the session is now capped', () => {
    // Capping `sessionRolls` quietly changed what "Stats" means. A table
    // comparing tonight's average to an earlier one needs the window stated.
    expect(source).toContain('last 50 rolls');
    expect(component).toContain('const SESSION_ROLL_LIMIT = 50;');
  });
});

/**
 * The mark beside each ability's name.
 *
 * Point Buy draws its mark with `IconifyIcon` on each row, which works there
 * because its rows are rendered at build time. The roller's rows are cloned by
 * an `x-for`, so the template cannot know which ability it is cloning for: one
 * inline mark in the template would draw the same mark six times.
 *
 * So the six marks are drawn once at build time into a sprite of `<symbol>`
 * elements, and each row draws its own with `<use>` whose href is bound to that
 * row's name. Binding by name is what makes the mark travel with the name: a
 * swap exchanges two rolls between two rows and leaves every name where it was,
 * so a mark bound to the name cannot end up beside the wrong ability.
 */
describe('DiceRoller ability marks', () => {
  /** The sprite, where the six marks are drawn once at build time. */
  const sprite = (): string =>
    source.slice(
      source.indexOf('<svg class="dr-mark-sprite"'),
      source.indexOf('</svg>', source.indexOf('<svg class="dr-mark-sprite"'))
    );

  /** The trade handle and everything inside it. */
  const handle = (): string => {
    const click = source.indexOf('@click="selectAbility(index)"');
    expect(click, 'the trade handle has no click binding').toBeGreaterThan(-1);
    const open = source.lastIndexOf('<button', click);
    return source.slice(open, source.indexOf('</button>', open));
  };

  it('draws one mark per ability into a sprite, from the shared table', () => {
    // The sprite is one map over the vocabulary's own six, and each symbol is
    // named for the ability it stands for rather than for its position, which is
    // what lets a row find its mark by name. The count is asserted on the rendered
    // sprite rather than here, because this is a single map in the source and six
    // of anything would mean the map was unrolled.
    expect(source).toContain('icon={ABILITY_MARKS[code]}');
    expect(sprite()).toContain('ABILITY_NAMES.map');
    expect(sprite()).toContain('symbolId={`dr-mark-${ABILITY_LABELS[code]}`}');
    for (const name of Object.values(ABILITY_LABELS)) {
      expect(sprite(), `no symbol named for ${name}`).toContain('ABILITY_LABELS[code]');
      expect(source, `the sprite is not named after ${name}`).toContain('dr-mark-');
    }
  });

  it('binds each row to the mark for its own name, so a swap cannot move a mark', () => {
    // The href is the row's name and nothing else. Index would look equivalent
    // today - the rows never reorder - but it is the property that actually
    // identifies the ability, and an index binding would go quietly wrong the
    // first time the state order stopped matching the sheet's.
    expect(handle()).toContain(":href=\"'#dr-mark-' + ability.name\"");
    expect(handle()).not.toMatch(/:href="[^"]*index/);
  });

  it('puts the mark inside the handle, before the name, on its baseline', () => {
    const mark = handle().indexOf('<use');
    const name = handle().indexOf('class="dr-name"');
    expect(mark, 'the handle draws no mark').toBeGreaterThan(-1);
    expect(name, 'the handle has no name').toBeGreaterThan(-1);
    expect(mark, 'the mark does not precede the name').toBeLessThan(name);
    // Same baseline, not just adjacent: a mark sitting on its own line above the
    // name turns six rows into twelve lines and the sheet into a list.
    expect(decl('.dr-mark-line', 'align-items')).toBe('baseline');
  });

  it('hides the mark from assistive technology and leaves the row label alone', () => {
    // The mark is a picture of the ability the name already spells out, so it is
    // decoration. `IconifyIcon` gives an icon `aria-hidden` unless it is given a
    // `label`, so the guard is that the sprite is drawn without one - a label
    // here would announce six pictures and say nothing the row label has not.
    expect(sprite()).toContain('aria-hidden="true"');
    expect(sprite()).not.toContain('label=');
    // The row's own accessible name is unchanged: still the handle's label,
    // naming the ability and the action, and still the only name on the button.
    expect(handle()).toContain(":aria-label=\"'Select ' + ability.name + ' for swap'\"");
  });

  it('keeps the mark a fixed, unshrinkable box beside a name that wraps nowhere', () => {
    // The six rows have to stay on one column whether a row is rolled or not, so
    // the mark cannot be sized by its content or allowed to give ground to a long
    // name. `flex-shrink: 0` is what stops the mark being the thing that
    // collapses on the longest name.
    expect(decl('.dr-ability-mark', 'width')).toBe(decl('.dr-ability-mark', 'height'));
    expect(decl('.dr-ability-mark', 'flex-shrink')).toBe('0');
    expect(decl('.dr-name', 'white-space')).toBe('nowrap');
  });

  it('holds the mark to the graphic contrast bar on the panel in both themes', () => {
    // The mark carries no information the name does not, so it is not text and
    // the bar is WCAG 1.4.11's 3:1 rather than 4.5:1. Soft ink rather than the
    // name's own: six full-strength marks beside six names would be six times
    // the ink for one extra reading of the same word.
    for (const theme of ['light', 'dark'] as const) {
      const mark = themedPaint(
        theme,
        { classes: ['dr-ability-mark'], pseudos: [] },
        ['color'],
        'the ability mark'
      );
      const panel = themedPaint(
        theme,
        { classes: ['dr-panel'], pseudos: [] },
        ['background'],
        'the panel'
      );
      expect(contrast(mark, panel), `the mark on the panel in ${theme}`).toBeGreaterThanOrEqual(3);
    }
  });

it('accounts for the mark in the handle floor the narrowest row reads', () => {
    // The mark is inside the trade handle, so the handle's `min-width` is the
    // floor the narrowest-row assertion reads - and that floor is what keeps the
    // name on the row at 320px. A mark wider than the floor leaves would push the
    // longest name off the row, and the dice tray beside it is wider, so the row
    // would still fit and nothing else on the surface would notice.
    //
    // Asserted against the tokens rather than against the mark's own rule, so the
    // floor is tied to the thing it has to cover: widen the mark token and the
    // floor follows it, because both are the same value.
    const nameFloor = rem(decl('.dr', '--dr-name-floor'));
    const markSize = rem(decl('.dr', '--dr-mark-size'));
    const markGap = rem(decl('.dr', '--dr-mark-gap'));
    expect(decl('.dr-ability-mark', 'width')).toBe('var(--dr-mark-size)');
    expect(decl('.dr-mark-line', 'gap')).toBe('var(--dr-mark-gap)');
    // The floor is the names, plus the mark and the gap between them.
    expect(tradeMin(), 'the handle floor does not cover the mark and its gap').toBe(
      nameFloor + markSize + markGap
    );
    // And it is a computed floor rather than a written-out number: a literal
    // would pass this once and go stale the next time the mark changed.
    expect(decl('.dr-trade', 'min-width')).toContain('calc(');
    expect(tradeMin()).toBeGreaterThan(markSize + markGap);
  });
});

/**
 * The modifier total, the one figure that answers "how strong is this sheet".
 *
 * It sits in the foot but outside the Stats block, which is a window over the
 * whole session and only exists once a full roll has happened: a total that
 * appeared with the first session figure would be blank for the six rolls before
 * it, and a total that was missing until then would be exactly the number a
 * player wants after re-rolling one ability.
 */
describe('DiceRoller modifier total', () => {
  /** The foot's total line, from its opening element to the figure's own close. */
  const totalLine = (): string => {
    const open = source.indexOf('<p class="dr-total-line"');
    expect(open, 'no total line in the foot').toBeGreaterThan(-1);
    return source.slice(open, source.indexOf('</p>', open));
  };

  it('labels the figure as the sheet\'s own, not as a session figure', () => {
    // The label is the only place the scope can be stated, because the number is
    // identical either way. The Stats block below it says "last 50 rolls" on its
    // own head, so a bare "Modifier total" here would be read as another sample.
    expect(totalLine()).toContain('Modifier total');
    expect(totalLine()).toContain('this sheet');
  });

  it('pairs the label and the figure the way Point Buy does', () => {
    // The same micro-label over the same figure step, so the two tools' feet
    // read as one object: a label and a number, nothing between them.
    expect(totalLine()).toMatch(/class="dr-soft micro-label"[^>]*>\s*Modifier total/);
    expect(totalLine()).toMatch(/class="dr-total"/);
    expect(decl('.dr-total', 'font-variant-numeric')).toBe('tabular-nums');
    expect(decl('.dr-total', 'font-size')).toBe(decl('.dr-stat-fig', 'font-size'));
  });

  it('sits in the foot, above the Stats block and outside its gate', () => {
    const total = source.indexOf('class="dr-total"');
    const foot = source.indexOf('class="dr-foot"');
    const gate = source.indexOf('sessionRolls.length === 0');
    expect(total, 'no total figure in the markup').toBeGreaterThan(-1);
    expect(total, 'the total is not in the foot').toBeGreaterThan(foot);
    // The Stats block is gated on a session sample having been taken; the total
    // is not gated at all, so it precedes that template rather than sitting
    // inside it.
    expect(total, 'the total is inside the session gate').toBeLessThan(gate);
    // Not in the head either: a governing number set in a title band reads as a
    // headline rather than as the state of the sheet, which is why Point Buy's
    // own totals sit in its foot beside the figures they are the remainder of.
    expect(total).toBeGreaterThan(source.indexOf('@click="rollAll()"'));
  });

  it('reads a plain 0 before anything is rolled', () => {
    // The server-rendered figure, which is what a reader sees before Alpine
    // boots and what the page falls back to. Zero is a true statement about an
    // unrolled sheet rather than a result pretending to be one, and it is plain
    // because `+0` is not a thing a modifier does.
    expect(source).toMatch(/class="dr-total"[^>]*x-text="modifierTotal\(\)"\s*>\s*0\s*</);
    expect(source).not.toMatch(/class="dr-total"[^>]*>\s*\+0\s*</);
  });

  it('takes the figure from the shared sum and the shared signing rule', () => {
    // Not a second sum and a second sign rule: the roller and Point Buy print the
    // same figure about the same sheet, and two copies of either is a copy that
    // will disagree with the other one.
    expect(component).toContain('dice.totalModifier(this.abilities)');
    expect(component).toContain('dice.formatModifierTotal(');
  });

  it('has the figure clear its background in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      const figure = themedPaint(
        theme,
        { classes: ['dr-total'], pseudos: [] },
        ['color'],
        'the total'
      );
      const panel = themedPaint(
        theme,
        { classes: ['dr-panel'], pseudos: [] },
        ['background'],
        'the panel'
      );
      expect(contrast(figure, panel), `the total on the panel in ${theme}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('DiceRoller responsive layout', () => {
  /**
   * The row replaced a 2/3-column tile grid, so none of the geometry the old
   * guards described exists any more: there is no column count to read, no die
   * row to shrink below `sm`, and no absolutely-anchored re-roll for a centred
   * ability name to collide with. What replaced them is a single-column list
   * whose narrowest content can be measured, so that is what is asserted.
   *
   * Every value is read out of the stylesheet rather than written into the
   * assertion, for the reason the contrast guard above gives: a pinned number
   * can only confirm the number someone already checked.
   */
  /** The one die size on the surface. It is a token because it is measured. */
  const dieSize = () => rem(decl('.dr', '--dr-die-size'));
  const dieGap = () => rem(decl('.dr-dice', 'gap'));
  const trayPad = () => rem(decl('.dr-dice', 'padding'));
  const plate = () => rem(decl('.dr-plate', 'width'));
  const reroll = () => rem(decl('.dr-reroll', 'width'));
  const rowGap = () => rem(decl('.dr-row', 'gap'));
  const panelPad = () => rem(decl('.dr-panel', 'padding'));

  /** Four dice, the three gaps between them, and the tray's own padding and rule. */
  const diceRow = () => 4 * dieSize() + 3 * dieGap() + 2 * trayPad() + 2;

  it('lays out one ability per row at every width', () => {
    // One flexible column and two fixed ones. There is no `grid-cols-` utility
    // left in the markup, so a phone-width screen cannot put two rows side by
    // side - which was the original defect (#331), and is now true by structure
    // rather than by a breakpoint that has to be kept in step.
    expect(decl('.dr-row', 'grid-template-columns')).toBe('minmax(0, 1fr) 5rem 2.75rem');
    expect(source).not.toMatch(/grid-cols-\d/);
  });

  /**
   * The tray's own box is part of the row's floor, and it was missing from this
   * arithmetic for as long as the dice sat directly on the panel. The dice grew
   * from 1.5rem to 1.75rem, the tray took 0.3125rem of padding and a 1px rule
   * around them, and the plate went to 5rem, so every number this describe
   * block reads moved at once.
   *
   * The assertion is that the floor is strictly wider than the four bare dice,
   * NOT that it equals the formula - comparing `diceRow()` to its own definition
   * cannot fail, and would have sat here looking like a guard on the very thing
   * it restated. This form fails for the regression that actually happened:
   * someone deleting the tray's terms from `diceRow` and quietly checking a row
   * narrower than the one that ships.
   */
  /**
   * Every `--dr-*` property declared for the light theme is re-declared for the
   * dark one, and the check is structural rather than a value comparison: a
   * property added to one block and forgotten in the other fails here without
   * anyone having to remember the rule.
   *
   * This is the invariant DESIGN.md states for the Ledger Panel and
   * `point-buy.test.ts` enforces with the same shape, and it exists because the
   * bug it catches is invisible in one theme: a token left at its light value
   * renders correctly on the theme you are looking at.
   *
   * `die-size`, the mark's `mark-size`, `mark-gap` and `name-floor`, and
   * `accent` are exempt, and legitimately so. Each of the four is a measured
   * box on the surface rather than a themed one - they are read by the row-floor
   * arithmetic, and a dark-theme override would silently invalidate every number
   * that block computes, which is the worse failure of the two. `accent` is the
   * live Starlight token, which already carries both themes.
   */
  it('re-declares every themed property for the dark theme', () => {
    const light = source.match(/\n {2}\.dr \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
    const dark =
      source.match(/:global\(:root\[data-theme='dark'\]\) \.dr \{([\s\S]*?)\n {2}\}/)?.[1] ??
      '';
    const THEME_OWNS = new Set(['accent', 'die-size', 'mark-size', 'mark-gap', 'name-floor']);
    const props = [...light.matchAll(/--dr-([a-z-]+):/g)].map((m) => m[1]);
    expect(props.length, 'no --dr-* properties found in the light block').toBeGreaterThan(6);
    for (const prop of props.filter((p) => !THEME_OWNS.has(p))) {
      expect(
        dark.includes(`--dr-${prop}:`),
        `--dr-${prop} is never re-declared for the dark theme`
      ).toBe(true);
    }
  });

  it('counts the tray, not just the dice, in the row floor', () => {
    const bareDice = 4 * dieSize() + 3 * dieGap();
    // The tray has to declare its padding at all, or `trayPad()` throws rather
    // than reading a zero and letting the row look like it fits.
    expect(trayPad()).toBeGreaterThan(0);
    expect(diceRow(), 'the row floor ignores the tray around the dice').toBeGreaterThan(
      bareDice
    );
  });

  it('declares the re-roll fill and border so it cannot paint the default form control', () => {
    // #331. Preflight is deliberately off (see src/styles/tailwind.css), so a
    // button that declares neither a background nor a border keeps the browser's
    // own: measured as rgb(239,239,239) on rgb(107,107,107) here, in a rounded
    // grey box that swallowed the accent glyph. The load-bearing declaration is
    // the fill; the border is what makes the ring visible as a control at rest.
    expect(decl('.dr-reroll', 'background')).toBe('transparent');
    expect(decl('.dr-reroll', 'border')).toMatch(/^1px solid/);
  });

  it('keeps a 44px hit area on the per-ability re-roll', () => {
    // WCAG 2.5.8. The plate and the swap pair are 44px by construction and the
    // trade handle takes the row's own height, so the re-roll is the one control
    // whose visual is smaller than its target and the one worth asserting.
    expect(reroll()).toBeGreaterThanOrEqual(44);
    expect(rem(decl('.dr-reroll', 'height'))).toBeGreaterThanOrEqual(44);
    // The outline/icon button vocabulary: round, so it reads as an icon control
    // rather than as a seventh number on the row.
    expect(decl('.dr-reroll', 'border-radius')).toBe('999px');
  });

  it('fits its narrowest row inside a 320px viewport', () => {
    // Below 40rem the identity block stacks, so a row's floor is its two fixed
    // tracks plus the wider of the block's two stacked lines - not the sum of
    // them. Asserted against the number the tool is actually read at.
    const fixed = plate() + reroll() + rowGap() + 2 * panelPad() + 2;
    const stacked = fixed + Math.max(tradeMin(), diceRow());
    expect(stacked, `a row needs ${stacked}px of the 320px viewport`).toBeLessThanOrEqual(320);
  });

  it('keeps the side-by-side row inside the content measure above its own breakpoint', () => {
    // Above 40rem the identity block is one line, so the row's floor is the
    // fixed tracks plus the name, the gap and the dice together. The breakpoint
    // is 640px and Starlight's content column is well over the row's floor by
    // then; the assertion is that the two numbers cannot cross.
    const row = plate() + reroll() + rowGap() + 2 * panelPad() + 2 + tradeMin() + rowGap() + diceRow();
    expect(row).toBeLessThan(40 * 16);
  });

  it('sizes the dice from one token, so no breakpoint can drift them apart', () => {
    expect(source).toContain('--dr-die-size: 1.75rem;');
    // The die reads its box and its pips from the same token, which is what
    // keeps a 4.5rem die from carrying 12px pips.
    const die = source.match(/\.dr-die\s*\{[^}]*\}/)![0];
    expect(die).toMatch(/width:\s*var\(--dr-die-size\)/);
    expect(die).toMatch(/height:\s*var\(--dr-die-size\)/);
    const pip = source.match(/\.dr-pip\s*\{[^}]*\}/)![0];
    expect(pip).toMatch(/width:\s*calc\(var\(--dr-die-size\) \* 0\.18\)/);
  });
});

describe('DiceRoller dice are dice', () => {
  /**
   * The die is drawn as a d6 - nine pip slots on a 3x3 grid, lit by the face -
   * rather than as its numeral, for two reasons the numerals could not serve.
   *
   * The dropped die has to stay readable. A numeral plus a strikethrough cannot
   * distinguish two identical faces and is invisible to anyone who cannot
   * resolve a 1px rule at 12px, so the die that did not count was a pale gap
   * with a hairline through it. Here the face survives at 55% and the dashed
   * edge is the boundary, so the "this one was discarded" signal is carried by
   * three things rather than one.
   *
   * And the value has to reach assistive technology. The pips are decoration, so
   * the die is a labelled image and its label says whether it counted.
   */
  it('renders a face as pips rather than as a numeral', () => {
    const die = source.match(/<span\s+class="dr-die"[\s\S]*?<\/span>\s*<\/template>/);
    expect(die, 'the die element not found').not.toBeNull();
    expect(die![0]).not.toMatch(/x-text=/);
    expect(die![0]).toContain('<template x-for="p in 9"><i class="dr-pip"></i></template>');
    expect(source).toContain("grid-template-columns: repeat(3, 1fr)");
  });

  it('lights every face from one rule block, so no face can be left dark', () => {
    const faces = [...source.matchAll(/\.dr-die\[data-face='(\d)'\]/g)].map((m) => m[1]);
    expect([...new Set(faces)].sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    // Six pips is the densest face, and it has to place all six.
    const six = source.match(/\.dr-die\[data-face='6'\][\s\S]*?\{/)![0];
    expect(six.match(/nth-of-type/g)).toHaveLength(6);
  });

  /**
   * The real faces, in reading order across the 3x3 grid.
   *
   * This asserts the pip indices themselves, not that a rule block exists. The
   * block was always there and always looked right; the dice were drawn wrong
   * because the nine pips are cloned out of an `x-for` `<template>`, and that
   * template is the die's own first element child - Alpine inserts the clones as
   * its siblings. `nth-child` therefore counted the template, so every face was
   * one pip early and one short: a 3 rendered as pips 4 and 8 of the grid, a 4
   * lost two corners, and 1 and 6 lost pips entirely. Nothing caught it,
   * including `lights every face`, because the rules were all present.
   */
  const FACES: Record<string, number[]> = {
    '1': [5],
    '2': [1, 9],
    '3': [1, 5, 9],
    '4': [1, 3, 7, 9],
    '5': [1, 3, 5, 7, 9],
    '6': [1, 3, 4, 6, 7, 9],
  };

  it.each(Object.entries(FACES))(
    'places the %s pips on a real d6',
    (face, pips) => {
      const selectors = [...source.matchAll(
        new RegExp(`\\.dr-die\\[data-face='${face}'\\]\\s+i:nth-of-type\\((\\d)\\)`, 'g')
      )].map((m) => Number(m[1]));
      expect(selectors.sort((a, b) => a - b), `face ${face}`).toEqual(pips);
    }
  );

  it('selects pips by type, never by child position', () => {
    // `nth-child` is the whole regression, so the ban is on the selector rather
    // than on the indices: any future face added with `nth-child` lights the
    // wrong pip and every assertion above still passes, because they read
    // `nth-of-type` and would simply not see it. Matched against the
    // comment-stripped stylesheet, so the note explaining the ban does not trip
    // its own assertion.
    expect(styleText).not.toMatch(/nth-child/);
  });

  /**
   * A die's lit and unlit pips are told apart by the `[data-face]` block alone.
   *
   * A state that set a blanket alpha on `.dr-pip` outranked the base
   * `opacity: 0` and made every pip faintly visible, so a dropped 3 rendered as
   * three bright pips on a field of six faint ones - a full grid of dots rather
   * than a d6, at any size. States de-emphasise by paint instead, so the guard
   * is that none of them touches pip opacity at all.
   *
   * `is-socket` is the one exemption and it is a real one: a socket carries face
   * `0`, no face rule applies to it, and engraving all nine pips at a low alpha
   * is the design. It cannot paint a phantom face because there is no face to
   * paint - which the socket case below asserts.
   */
  it('lets only the face block decide which pips are lit on a real die', () => {
    for (const state of ['is-kept', 'is-dropped']) {
      // `is-kept` is the default state and correctly has no pip rule at all;
      // `is-dropped` has one, to dim the pip colour. Neither may set opacity.
      const rule = source.match(new RegExp(`\\.dr-die\\.${state} \\.dr-pip\\s*\\{[^}]*\\}`));
      expect(rule?.[0] ?? '', `${state} must not set pip opacity`).not.toMatch(/opacity/);
    }
  });

  it('engraves a socket rather than lighting a face on it', () => {
    const pip = source.match(/\.dr-die\.is-socket \.dr-pip\s*\{[^}]*\}/)![0];
    expect(pip).toMatch(/opacity:\s*0\.22/);
    // Face 0 must light nothing anywhere in the stylesheet, or a socket would
    // show a face the moment one was added by accident.
    expect(styleText).not.toMatch(/\[data-face='0'\]/);
  });

  it('gives the dropped die an edge and a dimmed face, not only a strike', () => {
    expect(decl('.dr-die.is-dropped', 'border-style')).toBe('dashed');
    // No longer `transparent`: inside the tray that resolved to the tray's own
    // fill, and a dashed hairline one ramp step off it measured roughly 1.1:1 -
    // the discarded die was invisible rather than de-emphasised.
    expect(decl('.dr-die.is-dropped', 'background')).toMatch(/color-mix/);
    const pip = source.match(/\.dr-die\.is-dropped \.dr-pip\s*\{[^}]*\}/)![0];
    expect(pip).toMatch(/color-mix/);
  });

  it('never renders an unrolled row without its four sockets', () => {
    // The tray used to be `x-show`-gated on a roll, so six unrolled rows arrived
    // as a wide empty band with a middot in a box - the tool looked broken
    // before it was used. `emptyFaces` is what fills it, and the die's width is
    // the same in both states, so no score column moves when a roll lands.
    expect(source).toContain('ability.dice.length ? ability.dice : emptyFaces');
    expect(source).not.toMatch(/class="dr-dice"[^>]*x-show/);
    expect(component).toContain('emptyFaces: [0, 0, 0, 0]');
    // Face 0 is not a d6, so it must light nothing.
    expect(source).not.toMatch(/\[data-face='0'\]/);
  });

  it('names every die for assistive technology, dropped ones included', () => {
    expect(source).toContain('role="img"');
    expect(source).toContain(":aria-label=\"'Die ' + die + (ability.topThreeIndices.includes(i) ? '' : ', dropped')\"");
  });
});
