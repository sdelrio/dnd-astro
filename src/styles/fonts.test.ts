import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ADR-0019: the display face is served from the repository, not a CDN.
 *
 * The failure this guards against is the silent one. A heading rendered in the
 * declared fallback rather than in Cinzel is a different set of advances, and
 * therefore a different line length and a different heading height, and
 * nothing about that is visible. These assertions are about the declaration
 * being genuinely local and complete; whether the browser then really loaded
 * the face is `make capture`'s font gate, which is the only thing that can
 * answer that.
 */

const repoRoot = new URL('../../', import.meta.url);
const css = readFileSync(new URL('./tailwind.css', import.meta.url), 'utf8');
const astroConfig = readFileSync(fileURLToPath(new URL('../../astro.config.mjs', import.meta.url)), 'utf8');

/** Every `@font-face` block's family, src, weight and style declarations. */
function fontFaces(): { family: string; src: string; weight: string; style: string }[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    family: body.match(/font-family:\s*'([^']+)'/)?.[1] ?? '',
    src: body.match(/url\(([^)]+)\)/)?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '',
    weight: body.match(/font-weight:\s*([^;]+);/)?.[1].trim() ?? '',
    style: body.match(/font-style:\s*([^;]+);/)?.[1].trim() ?? '',
  }));
}

/**
 * The weights a `font-weight` declaration covers.
 *
 * A range (`400 700`, the variable font's axis bounds) covers every value
 * between its ends, so the two spellings have to mean the same thing here.
 */
function weightsCover(weight: string, target: number): boolean {
  const parts = weight.split(/\s+/).map(Number);
  return parts.length === 1
    ? parts[0] === target
    : parts.every(Number.isFinite) && parts[0] <= target && target <= parts[1];
}

const faces = fontFaces();
const cinzel = faces.filter((face) => face.family === 'Cinzel');

/** The vendored file a face's `src` points at, resolved against `public/`. */
function vendoredPath(src: string): string {
  const relative = src.split(/[?#]/)[0];
  return fileURLToPath(new URL(`public${relative}`, repoRoot));
}

describe('vendored display face', () => {
  it('declares Cinzel from the site stylesheet, not from a remote stylesheet', () => {
    expect(cinzel.length).toBeGreaterThan(0);
    for (const face of cinzel) {
      expect(face.src).toMatch(/^\/fonts\//);
    }
  });

  it('covers both weights the CDN serves, and adds no italic', () => {
    expect(cinzel.filter((face) => weightsCover(face.weight, 400))).not.toEqual([]);
    expect(cinzel.filter((face) => weightsCover(face.weight, 700))).not.toEqual([]);
    expect(cinzel.filter((face) => face.style === 'italic')).toEqual([]);
  });

  it('has every declared source present in public/fonts', () => {
    // An unparsed `src` must not read as a pass: an empty src resolves to the
    // public directory itself, which of course exists.
    for (const face of faces) {
      expect({ family: face.family, src: face.src }).toEqual({
        family: face.family,
        src: expect.stringMatching(/^\/fonts\/\S/),
      });
      expect({ src: face.src, exists: existsSync(vendoredPath(face.src)) }).toEqual({
        src: face.src,
        exists: true,
      });
    }
  });

  it('keeps the fallback chain the ADR declined to change', () => {
    expect(css).toContain("--sl-font-heading: 'Cinzel', 'Bookinsanity', Georgia, serif;");
  });

  it('preloads the display face, which is now the render-blocking request', () => {
    expect(astroConfig).toMatch(/rel:\s*'preload'/);
  });

  it('preloads the exact URL a @font-face asks for', () => {
    // A preload whose href is not byte-identical to the `src` the stylesheet
    // requests is discarded by the browser, which then fetches the face a
    // second time. Nothing errors and the page looks correct, so nothing else
    // would notice.
    const preloaded = astroConfig.match(/rel:\s*'preload'[\s\S]*?href:\s*'([^']+)'/)?.[1];
    expect(preloaded).toBe(cinzel[0]?.src);
  });
});

describe('site head', () => {
  it('carries no Google Fonts reference at all', () => {
    for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com']) {
      expect({ host, inConfig: astroConfig.includes(host) }).toEqual({ host, inConfig: false });
    }
  });

  it('declares no remote stylesheet or preconnect in the head', () => {
    const head = astroConfig.match(/\bhead:\s*\[([\s\S]*?)\n {6}\],/)?.[1] ?? '';
    expect(head).not.toBe('');
    const remoteTags = [...head.matchAll(/href:\s*'([^']+)'/g)].map(([, href]) => href);
    expect(remoteTags.filter((href) => /^https?:\/\//.test(href))).toEqual([]);
  });
});