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
  let depth = 0;
  let closeStart = -1;
  const tag = /<(\/?)template\b[^>]*>/g;
  tag.lastIndex = start;
  for (let m = tag.exec(markup); m; m = tag.exec(markup)) {
    depth += m[1] === '' ? 1 : -1;
    if (depth === 0) {
      closeStart = m.index;
      break;
    }
  }
  expect(closeStart, 'unterminated ability x-for template').toBeGreaterThan(-1);

  // Inner content only. Keeping the outer tags would make the depth walk below
  // start from this template's own open tag.
  const body = markup
    .slice(markup.indexOf('>', start) + 1, closeStart)
    .replace(/<!--[\s\S]*?-->/g, '');

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
  // look for buttons that did not exist.
  it('gives the ability x-for exactly one root element', () => {
    expect(topLevelChildrenOfAbilityXFor(source)).toEqual(['div']);
  });

  it('keeps the swap confirm/cancel panel inside that single root', () => {
    const start = source.indexOf('<template x-for="(ability, index) in abilities"');
    const root = topLevelChildrenOfAbilityXFor(source);
    expect(root).toHaveLength(1);
    // The panel is nested, so it must appear after the root opens and before the
    // x-for closes rather than as a second top-level sibling.
    const panelAt = source.indexOf('<template x-if="stagedSwap');
    const confirmAt = source.indexOf('aria-label="Confirm swap"');
    expect(panelAt).toBeGreaterThan(start);
    expect(confirmAt).toBeGreaterThan(panelAt);
  });

  it('makes the ability tile a real button with a pressed state', () => {
    const tileAt = source.indexOf('@click="selectAbility(index)"');
    expect(tileAt).toBeGreaterThan(-1);
    const openTag = source.slice(tileAt - 400, tileAt + 200);
    expect(openTag).toContain('<button');
    expect(openTag).toContain('type="button"');
    expect(openTag).toContain(':aria-pressed=');
  });

  it('does not paint the swap confirm button with the live accent token', () => {
    // `--sl-color-accent` resolves to sap #f7860f in dark, and white on that is
    // 2.51:1 - worse than the green-600 this replaced. The round buttons use
    // explicit gold/bark values instead.
    const confirmAt = source.indexOf('aria-label="Confirm swap"');
    const button = source.slice(confirmAt - 300, confirmAt);
    expect(button).toContain('dice-round-btn--confirm');
    expect(button).not.toContain('--sl-color-accent');
  });

  it('announces state changes through a polite live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('x-text="announcement"');
  });
});
