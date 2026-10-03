import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../../src/styles/contrast';
import { readPngSize } from './handbook-helpers.mjs';
import {
  ORNAMENT_BOX,
  ORNAMENT_PATH,
  PARCHMENT_BASE,
  PARCHMENT_COLOUR_SPACE,
  PARCHMENT_PATH,
  PARCHMENT_TILE_PX,
  ornamentSvg,
  parchmentPixel,
  parchmentPng,
  parchmentTile,
  readPngChunks,
} from './handbook-art.mjs';

/**
 * The Handbook's generated artwork, asserted at the two seams it has.
 *
 * The parchment and the ornament are *files*, not stylesheet values, and that is
 * the whole point of them: replacing one file changes the paper without touching
 * code. A property that only holds while nothing changes is a comment, so what
 * is asserted is that the committed bytes are the generator's output - that the
 * file is regenerable and the generator is what produced it - and that the
 * properties a reader of the artifact depends on are in the file's own bytes
 * rather than in this test's expectations.
 *
 * The contrast check is the one that matters most and it is here rather than in
 * a comment: a decorative background behind body text is exactly where contrast
 * quietly goes, and a texture that is one step too dark is invisible in a
 * directory listing. The threshold is the same 4.5:1 the stylesheet tests use and
 * it is applied to the *worst* pixel of the tile, not to its average.
 */

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const parchment = readFileSync(resolve(REPO_ROOT, PARCHMENT_PATH));
const ornament = readFileSync(resolve(REPO_ROOT, ORNAMENT_PATH), 'utf8');
const tailwind = readFileSync(resolve(REPO_ROOT, 'src/styles/tailwind.css'), 'utf8');
const printCss = readFileSync(resolve(REPO_ROOT, 'src/styles/handbook-print.css'), 'utf8');

/** The AA threshold every contrast assertion in this repository uses. */
const AA_BODY_TEXT = 4.5;

/** The colour steps body and muted text are actually set in on a sheet. */
const BODY_TEXT_STEPS = ['#2a2010', '#4a403a', '#605552'];

function token(css, name) {
  return css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`))?.[1] ?? '';
}

function chunkNames(bytes) {
  return readPngChunks(bytes).map((chunk) => chunk.type);
}

/** Every pixel of the committed tile, decoded from the file rather than generated. */
function committedPixels() {
  const { width, height } = readPngSize(parchment);
  // The pixels live in the IDAT chunks, and there is more than one of them: a
  // large tile is compressed as a stream of chunks, so reading the first and
  // calling it the image would decode two thirds of a row and the rest as
  // whatever followed it.
  const idat = inflateSync(
    Buffer.concat(
      readPngChunks(parchment)
        .filter((chunk) => chunk.type === 'IDAT')
        .map((chunk) => chunk.data)
    )
  );

  return { width, height, rgb: [...unfilter(idat, width, height)] };
}

/**
 * The committed tile's pixels, unfiltered.
 *
 * A deliberately small PNG reader: the IDAT stream is inflated, and each row is
 * prefixed with a filter byte whose reconstruction is defined against the
 * previous row and the pixel to the left, so undoing it is arithmetic over five
 * cases. Sharp is a dependency of this project and could decode this in one line,
 * but a test that reads the artifact with the same code that wrote it is a test
 * that agrees with itself, and this one reads the committed bytes and nothing
 * else.
 */
function unfilter(raw, width, height) {
  const bytesPerPixel = 3;
  const stride = width * bytesPerPixel;
  const out = new Uint8Array(stride * height);
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const row = new Uint8Array(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;

      row[x] =
        (line[x] +
          (filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? (left + up) >> 1 : paeth(left, up, upLeft))) &
        0xff;
    }

    out.set(row, y * stride);
    previous = row;
  }

  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const toHex = (r, g, b) =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

describe('the parchment the sheet is printed on', () => {
  it('is committed at one documented path', () => {
    expect(PARCHMENT_PATH).toBe('public/handbook/parchment.png');
  });

  it('is the documented size, read out of its own header', () => {
    // 256 x 256, square, because it tiles: a tile that is not square puts a
    // visible grid of seams across every page of the book, and the file is the
    // only thing that knows how big it is.
    expect(readPngSize(parchment)).toEqual({ width: PARCHMENT_TILE_PX, height: PARCHMENT_TILE_PX });
  });

  it('carries the documented colour profile rather than an assumed one', () => {
    // sRGB, embedded: a tile whose profile is left to whatever decoded it is a
    // tile whose paper is a different colour on a different machine.
    expect(PARCHMENT_COLOUR_SPACE).toBe('srgb');
    expect(chunkNames(parchment)).toContain('iCCP');
  });

  it('is the same tile the generator makes, so it is regenerable', async () => {
    // The "generated once and committed" claim, checked rather than asserted in a
    // comment: the committed bytes have to be what the committed generator
    // produces, or one of the two is lying.
    const tile = parchmentTile();

    expect({ width: tile.width, height: tile.height }).toEqual({
      width: PARCHMENT_TILE_PX,
      height: PARCHMENT_TILE_PX,
    });
    expect(parchment.equals(await parchmentPng())).toBe(true);
  });

  it('tiles without a seam, because its noise is periodic at the tile edge', () => {
    // Observable as periodicity: the pixel at x and at x + tile width is the same
    // pixel, which is what "no seam" means for a texture that repeats. A tile
    // with a hard edge would put a grid of faint lines down every page.
    for (const [x, y] of [
      [0, 0],
      [1, 1],
      [200, 33],
    ]) {
      expect(parchmentPixel(x + PARCHMENT_TILE_PX, y)).toEqual(parchmentPixel(x, y));
      expect(parchmentPixel(x, y + PARCHMENT_TILE_PX)).toEqual(parchmentPixel(x, y));
    }
  });

  it('is built on the colour the stylesheet declares beside it', () => {
    // Two places naming the paper would be two numbers that can disagree, so the
    // stylesheet's value is asserted against the generator's own.
    expect(PARCHMENT_BASE).toBe('#ece2cd');
    expect(token(printCss, '--handbook-paper')).toBe(PARCHMENT_BASE);
  });

  // The check the ticket is really asking for. A decorative background behind
  // body text is where contrast quietly goes, and the worst pixel of a texture
  // is not its average - so every pixel is tested against every text step the
  // sheet actually uses.
  it('clears AA body text at its darkest pixel, in every step body text is set in', () => {
    const { rgb } = committedPixels();

    for (let index = 0; index < rgb.length; index += 3) {
      const pixel = toHex(rgb[index], rgb[index + 1], rgb[index + 2]);

      for (const text of BODY_TEXT_STEPS) {
        expect(
          contrast(text, pixel),
          `${text} on ${pixel}, the darkest pixel of the committed tile`
        ).toBeGreaterThanOrEqual(AA_BODY_TEXT);
      }
    }
  });

  it('is a texture rather than a flat fill, or there was no reason to commit a file', () => {
    const { rgb } = committedPixels();
    const shades = new Set();

    for (let index = 0; index < rgb.length; index += 3) shades.add(rgb[index]);

    expect(shades.size).toBeGreaterThan(1);
  });
});

describe('the ornament in the centre of a footer', () => {
  it('is committed at one documented path', () => {
    expect(ORNAMENT_PATH).toBe('public/handbook/ornament.svg');
  });

  it('is drawn in the gold rule colour, taken from the site\'s own token', () => {
    // Read from `tailwind.css` rather than restated: the ornament belongs to the
    // site's rule vocabulary, and an unrelated colour would make the footer's
    // decorative rule a different material from every other rule in the system.
    const goldRule = token(tailwind, '--color-gold-rule');

    expect(goldRule).toBe('#c9ad6a');
    expect(ornament).toContain(goldRule);
    expect(ornamentSvg()).toBe(ornament);
  });

  it('is the size the footer reserves for it', () => {
    // The stylesheet sizes the image, so the file and the box have to agree or
    // the ornament is scaled by the browser into something else.
    expect(ornament).toContain(`width="${ORNAMENT_BOX.width}"`);
    expect(ornament).toContain(`height="${ORNAMENT_BOX.height}"`);
    expect(printCss).toContain(`--handbook-ornament-width: ${ORNAMENT_BOX.width}px;`);
    expect(printCss).toContain(`--handbook-ornament-height: ${ORNAMENT_BOX.height}px;`);
  });

  it('is decorative, so it says nothing to a reader who cannot see it', () => {
    // A title on the ornament would put its colour into the artifact's extracted
    // text, where a reader searching the PDF would find it.
    expect(ornament).not.toMatch(/<title|<desc/);
  });
});
