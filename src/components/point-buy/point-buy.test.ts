import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ABILITY_NAMES } from './point-buy-utils';

const source = readFileSync(new URL('./PointBuy.astro', import.meta.url), 'utf8');
const component = readFileSync(new URL('./point-buy-component.ts', import.meta.url), 'utf8');

/** The `.pb` block, where the light values are declared. */
const lightBlock = (): string => source.match(/\.pb \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';

/** The same block re-declared under the dark theme selector. */
const darkBlock = (): string =>
  source.match(/:global\(:root\[data-theme='dark'\]\) \.pb \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';

/** The value of a `--pb-*` custom property in the light block. */
const light = (prop: string): string | undefined =>
  lightBlock().match(new RegExp(`--pb-${prop}:\\s*([^;]+);`))?.[1].trim();

/** The same property as re-declared under the dark theme selector. */
const dark = (prop: string): string | undefined =>
  darkBlock().match(new RegExp(`--pb-${prop}:\\s*([^;]+);`))?.[1].trim();

const utils = readFileSync(new URL('./point-buy-utils.ts', import.meta.url), 'utf8');
/**
 * The vocabulary module, which owns the six codes and the names and marks they
 * map to. The mark table has to be declared here for the same reason the names
 * are: one sheet's six abilities are one list, and two copies of the pairing
 * would drift apart while both tools kept printing all six.
 */
const diceUtils = readFileSync(new URL('../dice-roller/dice-utils.ts', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../../alpine.ts', import.meta.url), 'utf8');

describe('PointBuy Alpine wiring', () => {
  it('roots the component in the registered pointBuy data provider', () => {
    // `x-data="pointBuy"` names an `Alpine.data` registration rather than
    // calling a global, so the component works with no `window` at all.
    expect(source).toContain('x-data="pointBuy"');
    expect(source).toContain('not-content');
  });

  it('delegates score transitions and reset to the pure helpers', () => {
    expect(registration).toContain("Alpine.data('pointBuy', pointBuyComponent)");
    expect(component).toContain('pointBuy.increaseScore(this.scores, ability)');
    expect(component).toContain('pointBuy.decreaseScore(this.scores, ability)');
    expect(component).toContain('pointBuy.resetScores(this.scores)');
  });

  // Every helper used to be a `window` global so an inline `x-data` string
  // could reach it. Eleven globals on one page collide with anything else,
  // are invisible to the type checker, and survive a rename of the helper.
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
});

describe('PointBuy ledger rows', () => {
  it('renders one ruled line per ability, from the vocabulary\'s own order', () => {
    // The rows are mapped straight off `ABILITY_NAMES`, with no local row table.
    // There used to be one here pairing each ability with its mark, which was
    // right while the mark lived here - but the mark moved to the vocabulary
    // beside the codes, so a local table is now a third six-item list keeping the
    // same three tables in step, which is the drift this file exists to stop.
    expect(source).toContain('ABILITY_NAMES.map');
    expect(source).not.toMatch(/ABILITY_ROWS/);
    // Six, and no more: a seventh line would mean a seventh ability, which
    // is a rules change and not a styling one. The order is read from the
    // vocabulary rather than written here, because a written copy is a fourth
    // list to keep in step with the three that already exist.
    expect([...diceUtils.matchAll(/"(\w{3})",/g)].map((m) => m[1])).toEqual([
      'STR',
      'DEX',
      'CON',
      'INT',
      'WIS',
      'CHA',
    ]);
    expect(ABILITY_NAMES).toHaveLength(6);
  });

  it('puts the sheet\'s own mark beside each name, not a local copy of it', () => {
    // The mark identifies the ability, so it is looked up by the ability rather
    // than written beside it: a mark typed into the row would be free to drift
    // from the one the dice roller prints for the same six abilities, and the
    // two tools are meant to read as one set.
    expect(source).toContain('icon={ABILITY_MARKS[ability]}');
    expect(source).not.toMatch(/game-icons:/);
    // And it sits inside the trade handle, before the name, so the mark and the
    // name are one object to read and one thing to press.
    const row = source.slice(source.indexOf('ABILITY_NAMES.map'));
    expect(row.indexOf('ABILITY_MARKS[ability]')).toBeGreaterThan(-1);
    expect(row.indexOf('ABILITY_MARKS[ability]')).toBeLessThan(
      row.indexOf('class="pb-name"')
    );
  });

  it('binds steppers to the bounds and pool helpers with per-ability labels', () => {
    expect(source).toContain("!canIncrease(scores, '${ability}')");
    expect(source).toContain("!canDecrease(scores, '${ability}')");
    expect(source).toContain('Increase ${ABILITY_LABELS[ability]}');
    expect(source).toContain('Decrease ${ABILITY_LABELS[ability]}');
  });

  it('spells the six names once, in the vocabulary, not per island', () => {
    // The visible name, the stepper's label, the trade handle's label and every
    // announcement have to agree. The row table used to re-type all six, which
    // is the drift `ABILITY_LABELS` exists to prevent - a screen-reader label
    // saying "STR" where the page says "Strength" is the same defect in another
    // place. So the rows carry no name of their own at all.
    expect(source).toContain('ABILITY_LABELS[ability]');
    expect(source).not.toMatch(/name: '(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)'/);
    // The table is DECLARED in `dice-utils.ts`, beside the codes it maps, and
    // re-exported here. It used to be declared in this module while its own
    // comment claimed all three tools shared it, which is what left the dice
    // roller printing three-letter codes: labelling its own rows would have meant
    // importing a sibling tool's utils, and nothing obliged it to.
    expect(diceUtils).toContain('export const ABILITY_LABELS');
    expect(utils).not.toContain('export const ABILITY_LABELS');
    expect(utils).toMatch(/export \{[^}]*ABILITY_LABELS/);
  });

  /**
   * One declaration site per table for the whole sheet, for both the names and
   * the marks.
   *
   * A second copy is the drift this exists to prevent, and the dependency
   * direction matters as much as the count: the dice roller must not reach into
   * a point-buy module for the vocabulary both of them speak. The marks are held
   * to the same rule as the names because they are the same kind of thing - the
   * sheet's six abilities, spelled once - and a mark table declared here would be
   * a second pairing of ability to picture with nothing keeping it beside the
   * roller's.
   */
  it.each(['ABILITY_LABELS', 'ABILITY_MARKS'])(
    'keeps %s beside the codes, so neither tool owns it',
    (table) => {
      const declarations = [
        diceUtils,
        utils,
        source,
        component,
        readFileSync(new URL('../dice-roller/DiceRoller.astro', import.meta.url), 'utf8'),
        readFileSync(new URL('../dice-roller/dice-roller-component.ts', import.meta.url), 'utf8'),
      ].filter((file) =>
        // Anchored on `export const`, so a *reference* cannot be mistaken for a
        // declaration: `icon={ABILITY_MARKS[ability]}` contains both an `=` and a
        // `{` and would otherwise count as a second table, which is a false
        // failure the day either tool uses the mark in an expression.
        new RegExp(`export const ${table}[^\\n=]*=[^\\n]*\\{`).test(file)
      );
      expect(declarations, `${table} is declared in more than one place`).toHaveLength(1);
    }
  );

  it('shows the score, modifier and cost for every ability', () => {
    expect(source).toContain('formatModifier(calculateModifier(scores.${ability}))');
    expect(source).toContain('formatCostLine(scores.${ability})');
  });

  it('prices the next press on the line, so a dead stepper explains itself', () => {
    // Both facts the cost line has to carry: the score's own cost, and what one
    // more press would add. Without the second, `+` going dead at the cap or on
    // an empty pool is unexplained. The arithmetic lives in the helper, and the
    // same helper decides whether the stepper is allowed, so the price shown
    // and the price charged cannot drift apart.
    expect(utils).toContain('export function formatCostLine');
    expect(utils).toContain('export function nextStepCost');
    expect(component).toContain('formatCostLine: pointBuy.formatCostLine');
  });

  it('runs a leader out from each name to its figure', () => {
    // The device that makes the sheet a ledger rather than a grid of tiles.
    // Losing it turns six ruled lines back into six boxes.
    //
    // Matched against the `.pb-leader` rule rather than the whole file: a bare
    // `toContain('dotted')` passes on the word appearing in a comment, which is
    // the failure mode ADR-0010 names - a test that reads source cannot tell a
    // working rule from a dead one.
    const rule = source.slice(source.indexOf('.pb-leader {'));
    expect(rule.slice(0, 200), 'no .pb-leader rule').toContain('border-bottom');
    expect(rule.slice(0, 200)).toContain('dotted');
    // And the leader is outside the trade handle, so it can run the full width
    // of the name column rather than being clipped to the button.
    const row = source.slice(source.indexOf('ABILITY_NAMES.map'));
    expect(row.indexOf('pb-leader')).toBeGreaterThan(row.indexOf('</button>'));
  });

  it('tells a scripting-off visitor the tool needs JavaScript', () => {
    // Every control is inert without Alpine, and six lines reading as a real
    // unspent spread is worse than a note. The Dice Roller set the pattern.
    expect(source).toContain('point-buy-needs-js');
    expect(source).toContain('js-only');
    expect(source).toContain('Point Buy needs JavaScript.');
  });

  it('uses no heading element for the panel title or a row label', () => {
    // Starlight colours every heading in the content column to the accent:
    // `.sl-markdown-content :is(h1..h6)` is 0-1-1 in light and 0-2-1 in dark.
    // An `h3` title inside a themed surface and an `h4` per ability therefore
    // rendered the theme's heading ink as though the surface had asked for a
    // heading, and the dark-theme row labels measured 2.32:1. Six headings
    // inside one region were also six landmarks' worth of nothing. Both are
    // fixed by using the elements the things actually are: a printed title and
    // a row label are paragraphs.
    // The panel's own title is included, not only the six rows: it is the one
    // printed label most likely to drift back to an `h3`.
    const panel = source.slice(source.indexOf('class="js-only pb-panel"'));
    expect(panel).not.toMatch(/<h[1-6][\s>]/);
    // And the retired heading-specific hooks stay retired.
    expect(source).not.toContain('sheet-title');
    expect(source).not.toContain('sheet-name');
  });

  it('names the region once, with a heading that carries no ink', () => {
    // The one heading the tool keeps is the region's own name, and it is
    // visually hidden: it is for navigation, not for reading.
    expect(source).toContain('class="sr-only" id="point-buy-scores"');
    expect(source).toContain('aria-labelledby="point-buy-scores"');
  });

  it('keeps the noscript notice word for word', () => {    // The copy is the user's: it was written for the old tiles and agreed to
    // survive the redesign unchanged, so a reword is a decision and not a
    // side effect of restyling. Whitespace is collapsed first because the
    // paragraph is wrapped in the markup and rewrapping is not a rewording.
    const flat = source.replace(/\s+/g, ' ');
    expect(flat).toContain(
      'Every other page on this site works without it. With it enabled you spend the ' +
        'standard 27-point pool across all six abilities and see the modifier and cost of ' +
        'each score as you go.'
    );
  });

  it('gives every control a visible focus ring, and the numerals a fixed width', () => {
    // The ring lives in the scoped stylesheet rather than as a utility class,
    // because its colour is one of the themed custom properties. Every control
    // in the component is a `.pb-step`, `.pb-spread` or `.pb-reset`, so the
    // three selectors below cover the whole set.
    expect(source).toContain('outline: 2px solid var(--pb-focus)');
    for (const control of ['.pb-step', '.pb-spread', '.pb-reset']) {
      const block = source.slice(source.indexOf(`${control}:focus-visible`));
      expect(block.slice(0, 120), control).toContain('outline');
    }
    expect(source).toContain('tabular-nums');
  });

  it('uses plus and minus icons for the steppers', () => {
    expect(source).toContain('mdi:plus');
    expect(source).toContain('mdi:minus');
  });
});

describe('PointBuy the purse', () => {
  it('shows the live remaining points', () => {
    expect(source).toContain('pointsRemaining(scores)');
  });

  it('reads the remaining points as a string, not a number', () => {
    // The one value this readout takes is 0 on a finished spread, and happy-dom
    // assigns a numeric 0 to textContent as "".
    expect(source).toContain('String(pointsRemaining(scores))');
  });

  it('sits in the foot, beside the spent figure it is the remainder of', () => {
    // It was in the head, where a governing number set in a title band reads
    // as a headline rather than as the state of the sheet. In the foot it
    // answers "how much is left" next to "how much" and "how strong", which
    // are the only three questions anyone asks of a spread.
    //
    // The original reason for the head is still honoured: this replaced a
    // readout pinned to the bottom of a phone viewport, which put it 1400px
    // below the first press. The panel is six lines rather than six stacked
    // tiles, so the foot is a fixed 700px or so from the top of the tool on a
    // phone - read before the first press is finished, and never pinned.
    const foot = source.slice(source.indexOf('Points left'));
    expect(foot, 'no points-left label in the foot').toContain('pointsRemaining(scores)');
    // It is not also in the head. Both would be two answers to one question.
    const head = source.slice(source.indexOf('class="pb-head"'), source.indexOf('class="pb-body"'));
    expect(head).not.toContain('pointsRemaining(scores)');
    expect(source).not.toContain('sticky bottom-0');
  });

  it('names the remaining figure as a remainder, and says so when there is none', () => {
    expect(source).toContain("'Points left'");
    expect(source).toContain("'Pool spent'");
  });

  it('is a third identical entry, not a specially treated one', () => {
    // Through Revision 4 the purse reached its figure by a dotted leader and
    // sat a step above the other two, which made the remainder the loudest
    // object on a surface whose job is six numbers - and a leader running out
    // to the right only ever means "look here". It is now a third `<p>` in the
    // same row with the same two classes as its neighbours: label, figure, one
    // step. The empty-pool signal is the label alone, which is enough.
    const foot = source.slice(source.indexOf('class="mt-3 flex flex-wrap items-center'));
    const entries = [...foot.matchAll(/<p class="flex items-baseline gap-1\.5">/g)];
    expect(entries, 'the foot should hold three sibling entries').toHaveLength(3);

    // Each entry is a micro-label plus a figure, and every label is the same
    // class - no third treatment creeping back in.
    for (const label of ['Modifier total', 'Spent', 'Points left']) {
      expect(foot).toContain(
        `<span class="pb-soft micro-label"${label === 'Points left' ? '' : `>${label}`}`
      );
    }
    expect([...foot.matchAll(/class="pb-soft micro-label"/g)]).toHaveLength(3);
    expect([...foot.matchAll(/class="pb-total"/g)]).toHaveLength(3);

    // And the retired purse treatment does not come back.
    for (const gone of ['pb-purse', 'pb-purse-leader', 'pb-purse-figure', 'pb-purse-label']) {
      expect(source, gone).not.toContain(gone);
    }
  });
});

describe('PointBuy the foot', () => {
  it('inks the modifier total and the points spent', () => {
    expect(source).toContain('formatTotalModifier(scores)');
    expect(source).toContain('String(pointsSpent(scores))');
    expect(utils).toContain('export function totalModifier');
    expect(utils).toContain('export function formatTotalModifier');
  });

  it('offers each starting spread as a one-press load', () => {
    expect(source).toContain('STARTING_SPREADS.map');
    expect(source).toContain("loadSpread('${spread.id}')");
    expect(component).toContain('pointBuy.applyStartingSpread(this.scores, id)');
  });

  it('offers an accessible reset control', () => {
    expect(source).toContain('@click="reset()"');
    expect(source).toContain('aria-label="Reset all scores to eight"');
    expect(source).toContain('mdi:restore');
  });
});

describe('PointBuy the panel material', () => {
  // The first build gave this tool its own material vocabulary - parchment for
  // the sheet, leather for the desk, brass for the steppers, wax for the seal
  // - on the reasoning that a physical object should not invert with the theme.
  // That decision is reversed here, and these four tests are what hold it
  // reversed. A surface that keeps the same value in both themes is the exact
  // failure the user reported: the tool looked like a different website pasted
  // into the page, identical in light and dark, and heavier than the prose
  // around it.

  it('declares its themed values twice, once per theme', () => {
    // Each custom property is declared on `.pb` and re-declared under the dark
    // selector. A property that only ever gets one value is a fixed set
    // wearing a theme's clothes - which is the failure being pinned here.
    expect(lightBlock(), 'no light block').not.toBe('');
    expect(darkBlock(), 'no dark block').not.toBe('');

    // `accent` is the one exemption, and it is listed rather than skipped
    // silently: `--sl-color-accent` is Starlight's own token and already
    // resolves to Sap Amber in dark and Sage in light, so re-declaring it
    // would pin one theme's value over the other's.
    const THEME_OWNS = new Set(['accent']);
    const props = [...lightBlock().matchAll(/--pb-([a-z-]+):/g)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(4);
    expect(props).toEqual(expect.arrayContaining([...THEME_OWNS]));
    for (const prop of props.filter((p) => !THEME_OWNS.has(p))) {
      expect(
        darkBlock().includes(`--pb-${prop}:`),
        `${prop} is never re-declared for the dark theme`
      ).toBe(true);
    }
  });

  it('takes its surface from the bark ramp, not from a private material', () => {
    // bark-100 in light, bark-800 in dark: the same two steps the Tools panel
    // on the index page is built from, so the page that opens a tool and the
    // page that lists the tools are made of one surface.
    expect(light('surface')).toBe('var(--color-bark-100)');
    expect(dark('surface')).toBe('var(--color-bark-800)');
    expect(light('ink')).toBe('var(--color-ink)');
    expect(dark('ink')).toBe('var(--color-parchment)');
    // The private material vocabulary is gone, not merely unused.
    for (const token of ['--color-sheet', '--color-desk', '--color-brass', '--color-wax']) {
      expect(source, token).not.toContain(token);
    }
  });

  it('shapes the head as the character Card header, rule included', () => {
    // The head is a title over a meta line closed by a 2px gold rule at its
    // lower edge - the character Card header's construction, so the tool and
    // the Cards are recognisably the same objects. The rule is the point, not
    // the decoration: a head banded only by a dotted leader reads as another
    // row of the sheet rather than as a heading over it.
    expect(source).toContain('.pb-head {');
    expect(source).toContain('border-bottom: 2px solid var(--pb-rule-strong)');
    // The Card header's two type steps, by their own values.
    expect(source).toContain('font-size: 1.35rem');
    expect(source).toContain('font-size: 0.8125rem');
    expect(source).toContain('text-transform: uppercase');
    expect(source).toContain('letter-spacing: 0.04em');
  });

  it('closes the panel with the gold rule and caps it with the theme accent', () => {
    // The Tools panel's own construction: a 1px gold rule that steps to its
    // dark value, and the 3px cap that is Oxblood in light and Gold Leaf in
    // dark. The cap is the only accent bar on the surface - it says
    // "instrument" once rather than six times.
    expect(light('rule-strong')).toBe('var(--color-gold-rule)');
    expect(dark('rule-strong')).toBe('var(--color-gold-rule-dark)');
    expect(light('heading')).toBe('var(--color-oxblood)');
    expect(dark('heading')).toBe('var(--color-gold)');
    expect(source).toContain('border-radius: 8px');
    expect(source).toContain('height: 3px');
  });

  it('keeps the surface from outweighing the page', () => {
    // The noise this build removed, each pinned so it cannot creep back: a
    // second surface wrapped around the panel, a filled frame on the points
    // readout, a gradient or a ring on the modifier, and a seal-sized button.
    // One panel, one border, one cap, and no gradient anywhere.
    expect(source).not.toContain('shadow-lg');
    expect(source).not.toContain('linear-gradient');
    // The only *surface* shadow is card-rest on the panel itself, and it is
    // lifted again to `none` in dark - 5% black cannot raise a surface off
    // bark-black, so the border and the cap do the work there. The two 1px/2px
    // entries are the trade handle's selection rings, which draw an edge around
    // one name rather than lifting anything; a shadow that is a border is not a
    // shadow, and it is listed here so a third one cannot arrive unnoticed.
    const shadows = [...source.matchAll(/box-shadow:([^;]+);/g)].map((m) => m[1].trim());
    expect(shadows).toEqual([
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'inset 0 0 0 1px var(--pb-rule)',
      '0 0 0 2px var(--pb-accent)',
      'none',
    ]);
    // One surface, not a surface inside a surface.
    expect([...source.matchAll(/--pb-surface:/g)].length).toBe(2);
  });

  it('keeps every control at ADR-0009\'s 44px floor', () => {
    // The steppers were the one place the floor was ever at risk: the glyph is
    // 18px, so the box has to carry the target rather than the mark.
    expect(source).toContain('width: 2.75rem');
    expect(source).toContain('height: 2.75rem');
    expect(source).toContain('min-height: 2.75rem');
  });

  it('marks the held score with a class the stylesheet can read', () => {
    // `alpine-dom.ts` records that a `:class` binding is not observable in the
    // test harness, so the live behaviour of the pick is asserted at runtime
    // through `aria-pressed` and the binding that paints the target set is
    // asserted here, on the source.
    expect(source).toContain(`:class="{ 'pb-swapping': picked !== null }"`);
    expect(source).toContain(".pb-swapping .pb-trade[aria-pressed='false']");
    // And it is the hairline step, not the full gold rule: at full strength the
    // five targets out-shout the one ring that carries the meaning.
    expect(source).toContain('box-shadow: inset 0 0 0 1px var(--pb-rule);');
  });

  it('leaves the leader outside the trade handle', () => {
    // A leader inside a button can only be as long as the button, and running
    // it out to the figure is the whole device. The handle wraps the mark and
    // the name; the leader is the next sibling.
    const handle = source.slice(
      source.indexOf('<button\n                  type="button"\n                  class="pb-trade"'),
      source.indexOf('<span class="pb-leader" />')
    );
    expect(handle).toContain('class="pb-trade"');
    expect(handle).toContain('class="pb-name"');
    expect(handle).not.toContain('pb-leader');
  });
});

describe('PointBuy responsive layout', () => {
  it('breaks each line after the name below 46rem, not before it', () => {
    // The five-column line cannot hold 44px targets on a phone, so the name
    // takes the full width and the figures run beneath it - still one entry,
    // which is what makes the sheet readable rather than merely narrower.
    expect(source).toContain('max-[46rem]:col-span-full');
    expect(source).toContain('max-[46rem]:grid-cols-[auto_auto_minmax(0,1fr)_auto]');
  });
});

describe('PointBuy theme colors', () => {
  it('does not use hardcoded blue utility classes', () => {
    expect(source).not.toMatch(/\bblue-\d+/);
  });

  it('uses the Starlight accent color variables for interactive and highlight elements', () => {
    expect(source).toContain('--sl-color-accent');
  });

  it('takes its material from the shared tokens, not from literals in the markup', () => {
    // Every value the panel paints is a named token resolved from the theme,
    // so the palette stays changeable in one place. The one hex left in the
    // file is the card-rest shadow, which DESIGN.md specifies as a literal.
    const theme = readFileSync(new URL('../../styles/tailwind.css', import.meta.url), 'utf8');
    for (const token of ['--color-bark-100', '--color-bark-800', '--color-gold-rule']) {
      expect(theme, token).toContain(token);
    }
    // The retired material tokens are gone from the theme too, not left
    // behind as a palette nothing paints.
    for (const token of ['--color-sheet', '--color-desk', '--color-brass', '--color-fitted']) {
      expect(theme, token).not.toContain(token);
    }
  });
});
