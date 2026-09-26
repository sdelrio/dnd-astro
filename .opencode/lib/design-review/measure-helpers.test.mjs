/**
 * Unit tests for the pure half of the rendered-verification command.
 *
 * No browser, no filesystem, no clock: every one of these is a function of its
 * arguments. That is the point of the split. The arithmetic that decides whether
 * a page overflows and whether a chip is readable is the part that has to be
 * right, and it is the part that can be proved right without a browser. The
 * browser-backed half only has to feed it honest numbers.
 *
 * Expected values come from WCAG's own worked examples and from the spec text,
 * never from running this code.
 */

import { describe, expect, it } from 'vitest';

import {
  buildSelectorPath,
  classifyTap,
  contrastRatio,
  findOverflowOffenders,
  formatContrastReport,
  formatOverflowReport,
  formatTapReport,
  formatPointerReport,
  gradeRatio,
  judgePointerGating,
  parseColor,
  parseSelectorList,
  parseWidthList,
  relativeLuminance,
  resolveEffectiveBackground,
} from './measure-helpers.mjs';

describe('parseColor', () => {
  it('reads the rgb() and rgba() forms a browser actually returns', () => {
    expect(parseColor('rgb(96, 85, 82)')).toEqual({ r: 96, g: 85, b: 82, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0.08)')).toEqual({ r: 0, g: 0, b: 0, a: 0.08 });
  });

  it('reads modern space-separated and slash-alpha forms', () => {
    expect(parseColor('rgb(0 0 0 / 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor('rgb(1 2 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it('reads the hex forms a fallback stylesheet declares', () => {
    expect(parseColor('#605552')).toEqual({ r: 96, g: 85, b: 82, a: 1 });
    expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('reads the color(srgb ...) form Chrome serialises a color-mix() result into', () => {
    // The role chip's resting fill is `color-mix(in srgb, var(--role-light) 14%, #fff)`,
    // and Chrome reports it in 0..1 components. A parser that skips this form
    // cannot tell a resting chip from a tinted one.
    expect(parseColor('color(srgb 0.921569 0.905882 0.858824 / 1)')).toEqual({
      r: 235,
      g: 231,
      b: 219,
      a: 1,
    });
  });

  it('returns null for anything it cannot read, rather than guessing black', () => {
    // `transparent` is a real computed value. Treating it as opaque black
    // would silently invent a background and report a confident wrong ratio.
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('currentColor')).toBeNull();
    expect(parseColor('color-mix(in oklab, red, blue)')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('matches WCAG 2.x on its own reference values', () => {
    // From the WCAG relative luminance definition: white is 1, black is 0.
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it('gives 0.2126 red, 0.7152 green and 0.0722 blue their weights', () => {
    expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 5);
    expect(relativeLuminance({ r: 0, g: 255, b: 0 })).toBeCloseTo(0.7152, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 255 })).toBeCloseTo(0.0722, 5);
  });
});

describe('contrastRatio', () => {
  it('spans 1 to 21 as WCAG states', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('is order independent, because a ratio is not a direction', () => {
    expect(contrastRatio('#605552', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#605552'), 10);
  });

  it('composites a translucent foreground over its background first', () => {
    // Black at 50% over white is mid grey, not "black text".
    expect(contrastRatio('rgba(0, 0, 0, 0.5)', '#ffffff')).toBeCloseTo(
      contrastRatio('#808080', '#ffffff'),
      2,
    );
  });

  it('refuses rather than reporting a ratio it cannot compute', () => {
    expect(() => contrastRatio('transparent', '#fff')).toThrow(/contrast/i);
  });
});

describe('gradeRatio', () => {
  it('applies the 4.5:1 AA body-text floor', () => {
    expect(gradeRatio(4.49, { fontSizePx: 14 }).verdict).toBe('fail');
    expect(gradeRatio(4.5, { fontSizePx: 14 }).verdict).toBe('aa');
  });

  it('applies the 3:1 AA floor to large text, and says which rule it used', () => {
    const large = gradeRatio(3.4, { fontSizePx: 24 });
    expect(large.verdict).toBe('aa');
    expect(large.requirement).toBe('AA large text (>=24px, or >=18.66px bold)');
  });

  it('reaches AAA at 7:1', () => {
    expect(gradeRatio(7, { fontSizePx: 14 }).verdict).toBe('aaa');
  });
});

describe('resolveEffectiveBackground', () => {
  it('takes the first opaque layer, because an opaque ancestor hides the rest', () => {
    const background = resolveEffectiveBackground([
      'rgba(0, 0, 0, 0)',
      'rgba(0, 0, 0, 0)',
      'rgb(255, 255, 255)',
      'rgb(0, 0, 0)',
    ]);
    expect(background).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('composites translucent layers downward until something is opaque', () => {
    // 12% black over a white card, which is what the role chip fill actually is.
    // 255 * 0.88 is 224.4, and a browser has 8 bits per channel, so 224 is the
    // colour that is really painted.
    const background = resolveEffectiveBackground(['rgba(0, 0, 0, 0.12)', 'rgb(255, 255, 255)']);
    expect(background.r).toBe(224);
    expect(background.g).toBe(224);
  });

  it('falls back to white when the whole chain is transparent, like a browser does', () => {
    expect(resolveEffectiveBackground(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'])).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
  });

  it('skips layers it cannot parse rather than reading them as opaque', () => {
    // `currentColor` is unresolvable here. Reading it as opaque black would
    // report a confident, wrong ratio; skipping it keeps looking for a surface.
    const background = resolveEffectiveBackground(['currentColor', 'rgb(0, 0, 255)']);
    expect(background).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });
});

describe('buildSelectorPath', () => {
  it('reads a full path as a chain of tag, id and class steps', () => {
    const path = buildSelectorPath({
      tag: 'span',
      classes: ['char-hp-label'],
      parent: { tag: 'div', id: 'hp', classes: [], parent: { tag: 'body', parent: null } },
    });
    expect(path).toBe('body > div#hp > span.char-hp-label');
  });

  it('falls back to :nth-child when there is nothing else to name an element', () => {
    const path = buildSelectorPath({
      tag: 'div',
      parent: {
        tag: 'div',
        classes: [],
        index: 3,
        parent: { tag: 'main', classes: [], parent: { tag: 'body', parent: null } },
      },
    });
    expect(path).toBe('body > main > div:nth-child(3) > div');
  });

  it('prefers an id over classes, since an id is unique and a class is not', () => {
    const path = buildSelectorPath({ tag: 'div', id: 'feat-filter-panel', classes: ['sm:flex!'] });
    expect(path).toBe('div#feat-filter-panel');
  });

  it('does not put a position index on html or body, which are named by their tag', () => {
    const path = buildSelectorPath({
      tag: 'div',
      index: 2,
      classes: ['grid'],
      parent: { tag: 'body', index: 2, parent: { tag: 'html', index: 1, parent: null } },
    });
    expect(path).toBe('html > body > div.grid');
  });

  it('drops the build-scoped class, which is on nearly every element and changes every build', () => {
    const path = buildSelectorPath({
      tag: 'div',
      classes: ['char-hp', 'astro-wehpl5se'],
      parent: { tag: 'header', classes: ['char-header', 'astro-wehpl5se'], parent: { tag: 'body', parent: null } },
    });
    expect(path).toBe('body > header.char-header > div.char-hp');
  });

  it('bounds the path so a deep DOM does not produce an unreadable line', () => {
    const deep = { tag: 'span', classes: ['leaf'] };
    for (let level = 0; level < 40; level += 1) deep.parent = { tag: 'div', parent: deep.parent };
    const path = buildSelectorPath(deep);
    expect(path.split(' > ').length).toBeLessThanOrEqual(6);
    expect(path).toContain('…');
  });
});

describe('findOverflowOffenders', () => {
  const page = { viewportWidth: 360, scrollWidth: 360, boxes: [] };

  it('finds nothing on a page that fits', () => {
    const report = findOverflowOffenders({ ...page, boxes: [{ right: 340, path: 'body > main' }] });
    expect(report.overflows).toBe(false);
    expect(report.offenders).toEqual([]);
  });

  it('flags a page that scrolls and names the element that causes it', () => {
    const report = findOverflowOffenders({
      ...page,
      scrollWidth: 372,
      boxes: [{ right: 372, path: 'body > div > div.grid' }, { right: 300, path: 'body > main' }],
    });
    expect(report.overflows).toBe(true);
    expect(report.scrollWidth - report.viewportWidth).toBe(12);
    expect(report.offenders).toHaveLength(1);
    expect(report.offenders[0]).toMatchObject({ path: 'body > div > div.grid', right: 372 });
    expect(report.offenders[0].overflowPx).toBe(12);
  });

  it('ignores sub-pixel and 1px rounding, which is not a scrollbar', () => {
    const report = findOverflowOffenders({
      ...page,
      scrollWidth: 361,
      boxes: [{ right: 360.5, path: 'body > main' }],
    });
    expect(report.overflows).toBe(false);
  });

  it('reports an element that overflows even when the page itself does not scroll', () => {
    // A clipped or `overflow: hidden` ancestor can hide a wide child. The page
    // not scrolling is not evidence that nothing is too wide.
    const report = findOverflowOffenders({
      ...page,
      boxes: [{ right: 500, path: 'body > main > div.overflow-hidden > table' }],
    });
    expect(report.offenders).toHaveLength(1);
    expect(report.overflows).toBe(false);
  });
});

describe('judgePointerGating', () => {
  const hybrid = {
    name: 'touchscreen laptop',
    emulable: false,
    reason: 'no flag combination reports hover: hover with any-pointer: coarse',
    queries: { hover: true, pointer: 'fine', anyPointerCoarse: true },
    expected: { hover: true, pointer: 'fine', anyPointerCoarse: true },
    restingBackground: 'rgb(255, 255, 255)',
    hoverBackground: 'rgb(241, 236, 235)',
    pressBackground: 'rgb(241, 236, 235)',
    gap: '8px',
  };
  const phone = {
    name: 'phone',
    queries: { hover: false, pointer: 'coarse', anyPointerCoarse: true },
    expected: { hover: false, pointer: 'coarse', anyPointerCoarse: true },
    restingBackground: 'rgb(255, 255, 255)',
    hoverBackground: 'rgb(255, 255, 255)',
    pressBackground: 'rgb(241, 236, 235)',
    gap: '8px',
  };
  const mouse = {
    name: 'mouse only',
    queries: { hover: true, pointer: 'fine', anyPointerCoarse: false },
    expected: { hover: true, pointer: 'fine', anyPointerCoarse: false },
    restingBackground: 'rgb(255, 255, 255)',
    hoverBackground: 'rgb(241, 236, 235)',
    pressBackground: 'rgb(241, 236, 235)',
    gap: '4px',
  };

  it('passes when the page branches exactly as ADR-0009 decided', () => {
    const verdict = judgePointerGating([hybrid, phone, mouse]);
    expect(verdict.ok).toBe(true);
    expect(verdict.checks.map((check) => check.id)).toContain('hover-gated');
  });

  it('fails when an emulated device profile did not apply, because every reading is then about the wrong device', () => {
    const verdict = judgePointerGating([phone, { ...mouse, queries: { ...mouse.queries, pointer: 'coarse' } }]);
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((check) => check.id === 'device-profiles-applied').ok).toBe(false);
  });

  it('reports a held touch the browser will not put into :active as open, not as a pass', () => {
    const verdict = judgePointerGating([
      { ...mouse, touchPressActiveMatched: false },
      { ...phone, touchPressActiveMatched: false },
      hybrid,
    ]);
    expect(verdict.checks.find((check) => check.id === 'press-under-held-touch').ok).toBeNull();
    expect(verdict.ok).toBe(true);
  });

  it('reports an un-emulable device as open, not as a pass', () => {
    const verdict = judgePointerGating([phone, mouse, hybrid]);
    const open = verdict.checks.filter((check) => check.ok === null);
    expect(open.map((check) => check.id)).toContain('unemulated-touchscreen-laptop');
    expect(verdict.unsettled).toBeGreaterThan(0);
    expect(verdict.ok).toBe(true);
  });

  it('fails when the hover tint is ungated, because a tap on a phone would leave a stale tint', () => {
    const verdict = judgePointerGating([{ ...phone, hoverBackground: 'rgb(241, 236, 235)' }, hybrid, mouse]);
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((check) => check.id === 'hover-gated').ok).toBe(false);
  });

  it('fails when a press tint is gated away on a device that can be emulated', () => {
    // A press rule wrapped in hover: none never matches where hover is hover, so
    // the mouse-and-trackpad case loses its feedback too - and that one is emulable.
    const verdict = judgePointerGating([{ ...mouse, pressBackground: 'rgb(255, 255, 255)' }, phone, hybrid]);
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((check) => check.id === 'press-ungated').ok).toBe(false);
  });

  it('fails when the spacing does not widen for a coarse pointer', () => {
    const verdict = judgePointerGating([{ ...phone, gap: '4px' }, mouse, hybrid]);
    expect(verdict.ok).toBe(false);
    expect(verdict.checks.find((check) => check.id === 'spacing-follows-coarse').ok).toBe(false);
  });
});

describe('formatPointerReport', () => {
  it('names the question, the expectation and what was measured', () => {
    const text = formatPointerReport({
      selector: '.r3-chip',
      group: '.r3-group',
      verdict: {
        ok: false,
        checks: [
          {
            id: 'hover-gated',
            question: 'the hover tint applies under hover: hover and not under hover: none',
            expected: 'tint on the touchscreen laptop, no tint on the phone',
            actual: 'tinted / untinted',
            ok: false,
          },
        ],
      },
    });
    expect(text).toMatch(/FAIL/);
    expect(text).toMatch(/expected/);
    expect(text).toMatch(/actual/);
  });
});

describe('formatOverflowReport', () => {
  it('says which widths are clean, so a clean run is readable as a pass', () => {
    const text = formatOverflowReport([
      findOverflowOffenders({ width: 360, viewportWidth: 360, scrollWidth: 360, boxes: [] }),
      findOverflowOffenders({ width: 640, viewportWidth: 640, scrollWidth: 640, boxes: [] }),
    ]);
    expect(text).toMatch(/360/);
    expect(text).toMatch(/no horizontal scroll/);
  });

  it('names the offending selector path and its right edge', () => {
    const text = formatOverflowReport([
      findOverflowOffenders({
        width: 360,
        viewportWidth: 360,
        scrollWidth: 412,
        boxes: [{ right: 412, path: 'body > main > div.grid', width: 388 }],
      }),
    ]);
    expect(text).toContain('body > main > div.grid');
    expect(text).toMatch(/412/);
  });
});

describe('parseWidthList', () => {
  it('reads the widths ADR-0009 committed to', () => {
    expect(parseWidthList('320,360,390,640')).toEqual([320, 360, 390, 640]);
  });

  it('refuses a non-numeric or implausible width instead of measuring nothing', () => {
    expect(() => parseWidthList('phone')).toThrow(/width/i);
    expect(() => parseWidthList('0')).toThrow(/width/i);
    expect(() => parseWidthList('99999')).toThrow(/width/i);
  });
});

describe('parseSelectorList', () => {
  it('splits a comma-separated list and drops blanks', () => {
    expect(parseSelectorList('.a, .b ,')).toEqual(['.a', '.b']);
  });

  it('refuses an empty list, because an empty measurement is not a measurement', () => {
    expect(() => parseSelectorList(' , ')).toThrow(/selector/i);
  });
});

describe('formatContrastReport', () => {
  const finding = {
    selector: '.char-hp-label',
    fontSizePx: 9,
    fontWeight: 600,
    color: 'rgb(96, 85, 82)',
    background: 'rgb(255, 255, 255)',
    themes: {
      light: { ratio: 6.68, grade: { verdict: 'aa', requirement: 'AA' } },
      dark: { ratio: 4.91, grade: { verdict: 'aa', requirement: 'AA' } },
    },
  };

  it('reports the ratio for both themes, side by side', () => {
    const text = formatContrastReport([finding]);
    expect(text).toMatch(/light/);
    expect(text).toMatch(/dark/);
    expect(text).toMatch(/6\.68:1/);
    expect(text).toMatch(/4\.91:1/);
  });

  it('says an element that is absent is absent, rather than passing it silently', () => {
    const text = formatContrastReport([{ selector: '.nope', missing: ['light', 'dark'] }]);
    expect(text).toMatch(/not found/i);
  });
});

describe('classifyTap', () => {
  const hidden = { display: 'none', visibility: 'visible', expanded: null };
  const shown = { display: 'block', visibility: 'visible', expanded: null };

  it('passes when the tap changed the target state', () => {
    const verdict = classifyTap({
      controlFound: true,
      controlHasBox: true,
      targetFound: true,
      before: hidden,
      after: shown,
    });
    expect(verdict).toMatchObject({ verdict: 'opened', failure: false });
  });

  it('passes when no toggle is rendered at all and the panel is already shown', () => {
    // At sm+ the disclosure does not exist and `sm:flex!` keeps the panel in a
    // row. A run there that reported a dead toggle would be reporting the design.
    const verdict = classifyTap({
      controlFound: true,
      controlHasBox: false,
      targetFound: true,
      before: shown,
      after: shown,
    });
    expect(verdict).toMatchObject({ verdict: 'already-open', failure: false });
  });

  it('fails when no toggle is rendered and the panel is closed, because nothing can open it', () => {
    const verdict = classifyTap({
      controlFound: true,
      controlHasBox: false,
      targetFound: true,
      before: hidden,
      after: hidden,
    });
    expect(verdict).toMatchObject({ verdict: 'unreachable', failure: true });
  });

  it('fails when a tappable control changed nothing', () => {
    const verdict = classifyTap({
      controlFound: true,
      controlHasBox: true,
      targetFound: true,
      before: hidden,
      after: hidden,
    });
    expect(verdict).toMatchObject({ verdict: 'no-effect', failure: true });
  });

  it('fails when the control is not in the DOM at all', () => {
    const verdict = classifyTap({ controlFound: false, controlHasBox: false, targetFound: true, before: hidden, after: hidden });
    expect(verdict.failure).toBe(true);
  });
});

describe('formatTapReport', () => {
  const tap = {
    width: 390,
    selector: 'button[aria-controls="feat-filter-panel"]',
    target: '#feat-filter-panel',
    touch: 'Input.dispatchTouchEvent',
    before: { display: 'none', visibility: 'visible', expanded: 'false', classes: ['sm:hidden'] },
    after: { display: 'flex', visibility: 'visible', expanded: 'true', classes: ['sm:hidden', 'is-open'] },
    opened: true,
  };

  it('reports display, visibility, expanded state and the class delta', () => {
    const text = formatTapReport([tap]);
    expect(text).toMatch(/display/);
    expect(text).toMatch(/none/);
    expect(text).toMatch(/flex/);
    expect(text).toMatch(/expanded/);
    expect(text).toMatch(/is-open/);
  });

  it('reports the control aria-expanded transition, which is the a11y contract', () => {
    const text = formatTapReport([
      {
        ...tap,
        control: {
          before: { display: 'inline-flex', expanded: 'false' },
          after: { display: 'none', expanded: 'true' },
        },
      },
    ]);
    expect(text).toMatch(/aria-expanded false -> true/);
  });

  it('says plainly when a tap changed nothing', () => {
    const text = formatTapReport([{ ...tap, opened: false, after: tap.before }]);
    expect(text).toMatch(/no change/i);
  });
});
