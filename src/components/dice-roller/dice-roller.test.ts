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

  // Blank comments to equal-length whitespace rather than deleting them. A
  // comment containing `</template>` would otherwise close the walk early, and
  // deleting shifts every later index so offsets taken from `markup` no longer
  // address the same spot in the working string.
  const stripped = markup.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

  // Walk forward tracking template nesting to find the matching close tag.
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

  // Inner content only. Keeping the outer tags would make the depth walk above
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

    const restFill = '#c68000';
    const hoverFill = light.match(
      /\.dice-round-btn--confirm:hover\s*\{\s*background:\s*(#[0-9a-f]{6})/
    )?.[1];
    expect(hoverFill, 'no confirm hover fill found').toBeTruthy();

    const lightRing = light.match(/outline:\s*2px solid (#[0-9a-f]{6})/)?.[1];
    const darkRing = dark.match(/outline-color:\s*(#[0-9a-f]{6})/)?.[1];
    expect(lightRing, 'no light focus ring found').toBeTruthy();
    expect(darkRing, 'no dark focus ring found').toBeTruthy();

    // Rest and hover, both themes. Checking only the rest state let a hover fill
    // that erased the button's edge through at 2.26:1.
    expect(contrast(lightRing!, restFill)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkRing!, restFill)).toBeGreaterThanOrEqual(3);
    expect(contrast(lightRing!, hoverFill!)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkRing!, hoverFill!)).toBeGreaterThanOrEqual(3);

    // The confirm fill is a shape whose only boundary is fill-vs-panel, so the
    // fill itself must clear 3:1 against the panel in both themes, at rest and
    // on hover. The glyph is an SVG graphic (1.4.11, 3:1) - the accessible name
    // comes from aria-label, not from the icon.
    const lightPanel = '#f8f6f5';
    const darkPanel = '#2e2421';
    expect(contrast(restFill, lightPanel)).toBeGreaterThanOrEqual(3);
    expect(contrast(hoverFill!, lightPanel)).toBeGreaterThanOrEqual(3);
    expect(contrast(restFill, darkPanel)).toBeGreaterThanOrEqual(3);
    expect(contrast(hoverFill!, darkPanel)).toBeGreaterThanOrEqual(3);
    expect(contrast('#1b1716', restFill)).toBeGreaterThanOrEqual(3);
    expect(contrast('#1b1716', hoverFill!)).toBeGreaterThanOrEqual(3);
  });

  it('announces state changes through a polite live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('x-text="announcement"');
  });
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
