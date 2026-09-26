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

/** The declarations of the single rule whose selector contains `fragment`. */
function rule(fragment: string): { selector: string; body: string } {
  for (const m of parsed.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = m[1].trim().split('}').pop()!.trim();
    if (selector.includes(fragment)) return { selector, body: m[2] };
  }
  throw new Error(`no rule matching ${fragment}`);
}

const prop = (body: string, name: string) => {
  const value = body.match(new RegExp(`${name}:\\s*([^;]+)`))?.[1].trim();
  if (!value) throw new Error(`no ${name} declaration`);
  return value;
};

const theme = (body: string) => (body.includes('data-theme') ? 'dark' : 'light');

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
  };

  it.each(Object.entries(EXPECTED))('pins gray-%s', (step, hex) => {
    expect(css).toContain(`--color-gray-${step}: ${hex};`);
  });

  it('declares no step outside the pinned set', () => {
    const declared = [...parsed.matchAll(/--color-gray-(\d+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
      m[1],
      m[2],
    ]);
    expect(Object.fromEntries(declared)).toEqual(EXPECTED);
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
  it.each(['200', '300', '500'])('marks the derived gray-%s step as interpolated', (step) => {
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
    const cases: [string, string, string][] = [
      ['500', '50'],
      ['600', '50'],
      ['700', '50'],
      ['900', '50'],
      ['100', '800'],
      ['300', '800'],
      ['400', '800'],
    ].map(([text, surface]) => [text, EXPECTED[text], EXPECTED[surface]]);
    for (const [step, hex, surface] of cases) {
      expect(contrast(hex, surface), `gray-${step} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('admonition palette', () => {
  const TYPES = ['note', 'tip', 'caution', 'danger'] as const;
  const SCOPES = ['', ":root[data-theme='dark'] "] as const;

  it.each(TYPES)('paints the %s aside from the warm ramps in both themes', (type) => {
    for (const scope of SCOPES) {
      const { body } = rule(`${scope}.starlight-aside--${type}`);
      const border = prop(body, '--sl-color-asides-border');
      const title = prop(body, '--sl-color-asides-text-accent');
      const fill = prop(body, 'background-color');
      for (const value of [border, title, fill]) {
        expect(value, `${type} ${theme(body)} ${value}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // 1.4.11 non-text contrast for the border, 1.4.3 for the title text.
      expect(contrast(border, fill), `${type} ${theme(body)} border`).toBeGreaterThanOrEqual(3);
      expect(contrast(title, fill), `${type} ${theme(body)} title`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Starlight declares --sl-color-asides-text-accent on the same bare class in
  // its own stylesheet, later in the cascade. At equal specificity the later
  // declaration wins, which makes an override silently dead - so the light rules
  // carry an extra `:root`.
  it.each(TYPES)('scopes the %s light rule to outrank Starlight', (type) => {
    const { selector } = rule(`.starlight-aside--${type}`);
    expect(selector.startsWith(':root '), `"${selector}" needs a :root prefix`).toBe(true);
    expect(specificity(selector)[1]).toBeGreaterThan(1);
  });
});

describe('table row striping', () => {
  // Light odd, light even, dark odd, dark even. The light odd rule fades
  // between two stops, so only its first is captured here.
  const STRIPES = ['#dfe4d1', '#e8ede1', '#404521', '#363b17'];
  const LIGHT_TEXT = '#2a2010';
  const DARK_TEXT = '#f1eceb';

  it('pins the stripe colours to the moss family', () => {
    const found = [...parsed.matchAll(/linear-gradient\(to right, transparent, (#[0-9a-f]{6})/gi)].map(
      (m) => m[1],
    );
    expect(found).toEqual(STRIPES);
  });

  it.each(STRIPES.map((hex, i) => [hex, i < 2 ? LIGHT_TEXT : DARK_TEXT] as const))(
    'keeps %s readable under its stripe text',
    (hex, text) => {
      expect(contrast(text, hex), `stripe ${hex}`).toBeGreaterThanOrEqual(4.5);
    },
  );
});
