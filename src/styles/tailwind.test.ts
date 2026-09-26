import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tailwind.css', import.meta.url), 'utf8');

/**
 * Comments are stripped before any selector is parsed. A leading block comment
 * is part of the text between the previous `}` and the next `{`, so without this
 * a selector capture can contain prose that mentions `data-theme` and quietly
 * break a filter looking for a dark-theme rule.
 */
const parsed = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** CSS specificity as [ids, classes + pseudo-classes + attrs, elements]. */
function specificity(selector: string): [number, number, number] {
  const sel = selector.trim();
  return [
    (sel.match(/#[\w-]+/g) ?? []).length,
    (sel.match(/\.[\w-]+/g) ?? []).length +
      (sel.match(/(?<!:):(?!:)[a-z-]+/g) ?? []).length +
      (sel.match(/\[[^\]]+\]/g) ?? []).length,
    (sel.match(/(?:^|[\s>+~])([a-z][\w-]*)/g) ?? []).length,
  ];
}

/**
 * The declarations of the rule whose selector contains `fragment`.
 *
 * `scope` narrows the search when a selector exists in both themes, so the
 * result does not depend on which rule happens to come first in the file.
 */
function rule(fragment: string, scope: 'light' | 'dark' = 'light'): { selector: string; body: string } {
  const matches: { selector: string; body: string }[] = [];
  for (const m of parsed.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = m[1].trim().split('}').pop()!.trim();
    if (selector.includes(fragment)) matches.push({ selector, body: m[2] });
  }
  const scoped = matches.filter((r) => (r.selector.includes('data-theme') ? 'dark' : 'light') === scope);
  const found = scoped[0];
  if (!found) throw new Error(`no ${scope} rule matching ${fragment}`);
  return found;
}

const prop = (body: string, name: string) => {
  const value = body.match(new RegExp(`${name}:\\s*([^;]+)`))?.[1].trim();
  if (!value) throw new Error(`no ${name} declaration`);
  return value;
};

describe('gray scale is redefined onto the bark ramp', () => {
  // DESIGN.md's Warm-Only Rule forbids the cool default scale, but 823 call
  // sites were written against `gray-*`. Redefining the scale in @theme warms
  // all of them from one place, so these are the only ten values to defend.
  const EXPECTED: Record<string, string> = {
    '50': '#f8f6f5',
    '100': '#f1eceb',
    '200': '#e6e0de',
    '300': '#d9d3cf',
    '400': '#9a908c',
    '500': '#786d6a',
    '600': '#605552',
    '700': '#4a403a',
    '800': '#2e2421',
    '900': '#1b1716',
    '950': '#0f0d0c',
  };

  it.each(Object.entries(EXPECTED))('pins gray-%s', (step, hex) => {
    expect(css).toContain(`--color-gray-${step}: ${hex};`);
  });

  // The value pattern is deliberately not `#[0-9a-f]{6}`: Tailwind ships its
  // steps as `oklch(...)`, so a hex-only match would let a cool non-hex step -
  // which is exactly what gray-950 is by default - pass unnoticed.
  it('declares no step outside the pinned set', () => {
    const declared = [...parsed.matchAll(/--color-gray-(\d+):\s*([^;]+);/gi)].map((m) => [
      m[1],
      m[2].trim(),
    ]);
    expect(Object.fromEntries(declared)).toEqual(EXPECTED);
  });

  it('redefines every step Tailwind ships, so none keeps its cool default', () => {
    // Tailwind v4's gray scale is 50-950. A step left undefined keeps the
    // built-in value, and `bg-gray-950` is used by Starlight's own components.
    const steps = [...parsed.matchAll(/--color-gray-(\d+):/g)].map((m) => m[1]);
    expect(steps).toEqual(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);
  });

  it('keeps the steps monotonically darker as the number rises', () => {
    const steps = Object.entries(EXPECTED).sort((a, b) => Number(a[0]) - Number(b[0]));
    for (let i = 1; i < steps.length; i++) {
      expect(luminance(steps[i][1])).toBeLessThan(luminance(steps[i - 1][1]));
    }
  });

  // gray-200, gray-300 and gray-500 have no DESIGN.md counterpart; the rest are
  // literal palette values. The inline comment on each line says which, so a
  // reader can tell a real token from a derived one.
  it.each(['200', '300', '500', '950'])('marks the derived gray-%s step as interpolated', (step) => {
    expect(css).toMatch(new RegExp(`--color-gray-${step}:[^;]*;[^\\n]*interpolated`));
  });

  it.each(['50', '100', '400', '600', '700', '800', '900'])(
    'maps gray-%s to a named palette step rather than an interpolated one',
    (step) => {
      expect(css).toMatch(new RegExp(`--color-gray-${step}:[^;]*;[^\\n]*bark-`));
    },
  );

  it('keeps every muted text step at or above 4.5:1 on the surface it is paired with', () => {
    // Every text-gray-N call site in src/ carries a dark: counterpart, so each
    // step only has to clear the theme it is used in.
    // Every text/surface pairing that occurs in src/, derived from the actual
    // `text-gray-N dark:text-gray-M` call sites.
    const cases: [string, string][] = [
      ['500', '50'],
      ['600', '50'],
      ['700', '50'],
      ['900', '50'],
      ['800', '100'],
      ['100', '800'],
      ['200', '800'],
      ['300', '800'],
      ['400', '800'],
    ];
    for (const [step, surface] of cases) {
      expect(contrast(EXPECTED[step], EXPECTED[surface]), `gray-${step} on gray-${surface}`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('admonition palette', () => {
  const TYPES = ['note', 'tip', 'caution', 'danger'] as const;
  it.each(TYPES)('paints the %s aside from the warm ramps in both themes', (type) => {
    for (const mode of ['light', 'dark'] as const) {
      const { body } = rule(`.starlight-aside--${type}`, mode);
      const border = prop(body, '--sl-color-asides-border');
      const title = prop(body, '--sl-color-asides-text-accent');
      const fill = prop(body, 'background-color');
      for (const value of [border, title, fill]) {
        expect(value, `${type} ${mode} ${value}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // 1.4.11 non-text contrast for the border, 1.4.3 for the title text.
      expect(contrast(border, fill), `${type} ${mode} border`).toBeGreaterThanOrEqual(3);
      expect(contrast(title, fill), `${type} ${mode} title`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Starlight declares --sl-color-asides-text-accent on the same bare class in
  // its own stylesheet, later in the cascade. At equal specificity the later
  // declaration wins, which makes an override silently dead - so the light rules
  // carry an extra `:root`.
  it.each(TYPES)('scopes the %s light rule to outrank Starlight', (type) => {
    const { selector } = rule(`.starlight-aside--${type}`, 'light');
    expect(selector.startsWith(':root '), `"${selector}" needs a :root prefix`).toBe(true);
    expect(specificity(selector)[1]).toBeGreaterThan(1);
  });
});

describe('table row striping', () => {
  // Every stop of every stripe, in source order. The light odd rule fades
  // between two stops, so pinning only the first would leave the second free to
  // drift cool.
  const STRIPES: [string, string][] = [
    ['#dfe4d1', '#d5dcc6'],
    ['#e8ede1', '#e8ede1'],
    ['#404521', '#404521'],
    ['#363b17', '#363b17'],
  ];
  const LIGHT_TEXT = '#2a2010';
  const DARK_TEXT = '#f1eceb';

  it('pins every gradient stop to the moss family', () => {
    const found = [
      ...parsed.matchAll(/linear-gradient\(to right, transparent, (#[0-9a-f]{6}) 2%, (#[0-9a-f]{6}) 98%/gi),
    ].map((m) => [m[1], m[2]]);
    expect(found).toEqual(STRIPES);
  });

  it('keeps every stripe readable under its body text', () => {
    STRIPES.forEach(([from, to], i) => {
      const text = i < 2 ? LIGHT_TEXT : DARK_TEXT;
      expect(contrast(text, from), `stripe ${from}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(text, to), `stripe ${to}`).toBeGreaterThanOrEqual(4.5);
    });
  });
});
