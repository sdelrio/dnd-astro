import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

  // Walk forward tracking template nesting to find the matching close tag.
  // Comments are stripped first: a comment containing `</template>` would
  // otherwise close the walk early and hide any extra roots.
  const stripped = markup.replace(/<!--[\s\S]*?-->/g, '');
  let depth = 0;
  let closeStart = -1;
  const tag = /<(\/?)template\b[^>]*>/g;
  tag.lastIndex = start;
  for (let m = tag.exec(stripped); m; m = tag.exec(stripped)) {
    depth += m[1] === '' ? 1 : -1;
    if (depth === 0) {
      closeStart = m.index;
      break;
    }
  }
  expect(closeStart, 'unterminated ability x-for template').toBeGreaterThan(-1);

  // Inner content only. Keeping the outer tags would make the depth walk below
  // start from this template's own open tag.
  const body = stripped.slice(markup.indexOf('>', start) + 1, closeStart);

  const names: string[] = [];
  let level = 0;
  const element = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  for (let m = element.exec(body); m; m = element.exec(body)) {
    const [, closing, name, selfClosing] = m;
    if (['br', 'hr', 'img', 'input', 'meta', 'link', 'source'].includes(name)) continue;
    if (selfClosing) {
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

  it('never rings a round button in its own fill colour', () => {
    // WCAG 2.4.11 / 1.4.11. Asserted as measured contrast rather than a
    // specific hex, because the failure mode is "ring too close to the fill" -
    // gold-rule on gold is 1.49:1 and accent on accent 1.00:1, and neither is
    // the fill hex itself.
    const relativeLuminance = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };

    const style = source.slice(source.indexOf('.dice-round-btn:focus-visible'));
    const darkAt = style.indexOf(":global([data-theme='dark'])");
    const light = style.slice(0, darkAt);
    const dark = style.slice(darkAt);

    const confirmFill = '#c68000';
    const lightRing = light.match(/outline:\s*2px solid (#[0-9a-f]{6})/)?.[1];
    const darkRing = dark.match(/outline-color:\s*(#[0-9a-f]{6})/)?.[1];
    expect(lightRing, 'no light focus ring found').toBeTruthy();
    expect(darkRing, 'no dark focus ring found').toBeTruthy();

    expect(contrast(lightRing!, confirmFill)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkRing!, confirmFill)).toBeGreaterThanOrEqual(3);
  });

  it('announces state changes through a polite live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('x-text="announcement"');
  });
});
