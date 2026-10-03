#!/usr/bin/env node
/**
 * The Handbook's generated artwork: the parchment the sheet is printed on and
 * the ornament in the centre of each footer.
 *
 *   node .opencode/lib/design-review/handbook-art.mjs          # write both files
 *   node .opencode/lib/design-review/handbook-art.mjs --check  # fail if stale
 *
 * Two files, generated once and committed, at two single documented paths. The
 * reason they are files rather than stylesheet values is the property that
 * matters: replacing one file changes the paper without touching code. A gradient
 * painted in CSS would put the paper's design back into the stylesheet, which is
 * the thing the file exists to keep out of it.
 *
 * Nothing here enters the build. `sharp` is already a dependency of this project
 * and this command is not part of it, so `git diff -- package.json
 * pnpm-lock.yaml pnpm-workspace.yaml` stays empty (ADR-0011). The two functions
 * the tests compare against are the same ones this command writes with, so a
 * test that passes is a test that the committed bytes are regenerable.
 *
 * The parchment's base colour is the palette's parchment step *lifted*, which is
 * a move this palette already records: `--color-gray-400` is bark-500 raised off
 * #948985 to clear 4.5:1 on bark-800. Parchment at #d4c4a8 is a text colour, and
 * as a surface it puts the muted text steps under AA - #605552 on it measures
 * 4.20:1. The lifted step keeps every body-text step above AA with room for the
 * texture's own darkening, which is why the contrast is *measured* against the
 * worst pixel of the generated tile rather than assumed from its average.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** The one committed path the parchment is written to. */
export const PARCHMENT_PATH = 'public/handbook/parchment.png';

/**
 * The tile's edge, in pixels.
 *
 * Square because it tiles: a tile that is not square puts a visible grid of
 * seams down every page, and the file is the only thing that knows how big it is.
 * 256 rather than larger because the texture is fine grain, and the PDF and the
 * captures both carry this file once per page.
 */
export const PARCHMENT_TILE_PX = 256;

/** The colour profile embedded in the tile, so its paper is the same everywhere. */
export const PARCHMENT_COLOUR_SPACE = 'srgb';

/** The colour the tile is built on, and the colour behind it in the stylesheet. */
export const PARCHMENT_BASE = '#ece2cd';

/**
 * How far the texture strays from the base colour, as a fraction.
 *
 * Bounded rather than expressive: the tile is a background for body text, and its
 * darkest pixel is what the measured contrast is taken against. At 0.08 the
 * darkest pixel of this tile still clears 4.5:1 against #605552, the muted text
 * step, and the assertion that says so is in `handbook-art.test.mjs`.
 */
const PARCHMENT_GRAIN = 0.08;

/** The one committed path the ornament is written to. */
export const ORNAMENT_PATH = 'public/handbook/ornament.svg';

/** The box the footer reserves for the ornament, which the file has to match. */
export const ORNAMENT_BOX = Object.freeze({ width: 88, height: 10 });

/** The token the ornament is drawn in, read from the site's own palette. */
const GOLD_RULE_TOKEN = '--color-gold-rule';

/* -------------------------------------------------------------------------
 * The parchment
 * ---------------------------------------------------------------------- */

/** A lattice hash, so the noise is the same on every machine and every run. */
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Smooth value noise over a lattice that wraps at `cellsX` by `cellsY`.
 *
 * The wrap is the whole point. A texture that does not wrap puts a seam at every
 * tile edge, and a seam every 256 pixels down a 297mm page is a grid of faint
 * lines a reader would see before they read anything.
 */
function noise(x, y, cellsX, cellsY, seed) {
  const wrap = (value, cells) => ((value % cells) + cells) % cells;
  const smooth = (t) => t * t * (3 - 2 * t);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = smooth(x - x0);
  const v = smooth(y - y0);

  const corner = (dx, dy) => hash(wrap(x0 + dx, cellsX), wrap(y0 + dy, cellsY), seed);
  const top = corner(0, 0) * (1 - u) + corner(1, 0) * u;
  const bottom = corner(0, 1) * (1 - u) + corner(1, 1) * u;

  return top * (1 - v) + bottom * v;
}

/**
 * One pixel of the tile, wrapped at the tile edge.
 *
 * Exported because "the tile has no seam" is a claim about periodicity, and
 * periodicity is only checkable against a function you can ask for a coordinate
 * outside the tile. `x + width` and `x` are the same pixel by construction, and
 * the test says so.
 */
export function parchmentPixel(x, y) {
  const size = PARCHMENT_TILE_PX;
  const at = (value) => ((value % size) + size) % size;
  const u = at(x) / size;
  const v = at(y) / size;
  const base = [
    Number.parseInt(PARCHMENT_BASE.slice(1, 3), 16),
    Number.parseInt(PARCHMENT_BASE.slice(3, 5), 16),
    Number.parseInt(PARCHMENT_BASE.slice(5, 7), 16),
  ];

  const grain = noise(u * 32, v * 32, 32, 32, 11) - 0.5;
  const fibre = noise(u * 96, v * 6, 96, 6, 23) - 0.5;
  const mottle = noise(u * 8, v * 8, 8, 8, 37) - 0.5;

  const shade = 1 + (grain * 0.35 + fibre * 0.75 + mottle) * PARCHMENT_GRAIN;

  return base.map((channel) => Math.max(0, Math.min(255, Math.round(channel * shade))));
}

/**
 * The tile's pixels, as raw sRGB triples.
 *
 * Pure, synchronous and free of any file format, because the test needs to compare
 * the *pattern* against the committed PNG - including at the tile edge, where a
 * non-periodic texture would show a seam - and decoding the PNG to do that would
 * be circular.
 *
 * Three octaves at different lattice densities: a fine grain, a fibre stretched
 * along the sheet because paper fibre is, and a slow mottle so two pages of the
 * same sheet are not identical.
 */
export function parchmentTile() {
  const size = PARCHMENT_TILE_PX;
  const data = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = parchmentPixel(x, y);
      const offset = (y * size + x) * 3;

      data[offset] = pixel[0];
      data[offset + 1] = pixel[1];
      data[offset + 2] = pixel[2];
    }
  }

  return { width: size, height: size, data };
}

/**
 * The parchment as a PNG, with the colour profile embedded.
 *
 * Deterministic: same pixels in, same bytes out, which is what lets a test
 * assert that the committed file is the generator's output rather than a file
 * that happens to look like it.
 */
export async function parchmentPng() {
  const tile = parchmentTile();

  return sharp(tile.data, { raw: { width: tile.width, height: tile.height, channels: 3 } })
    .withIccProfile(PARCHMENT_COLOUR_SPACE)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The PNG's chunks, in order.
 *
 * A reader rather than an assumption, so a test can say "the file carries an sRGB
 * profile" by looking at the file. `length` is the chunk's own declared length;
 * the type and the four CRC bytes are outside it.
 */
export function readPngChunks(bytes) {
  const chunks = [];

  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('latin1');

    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 12 + length;

    if (type === 'IEND') break;
  }

  return chunks;
}

/* -------------------------------------------------------------------------
 * The ornament
 * ---------------------------------------------------------------------- */

/** The gold rule token's value, read out of the site's own stylesheet. */
export function goldRuleColour(css = readFileSync(resolve(REPO_ROOT, 'src/styles/tailwind.css'), 'utf8')) {
  return css.match(new RegExp(`${GOLD_RULE_TOKEN}:\\s*(#[0-9a-f]{6})`))?.[1] ?? '';
}

/**
 * The footer ornament: a pair of tapered rules either side of a lozenge.
 *
 * Drawn in the gold rule colour and in nothing else, which is what makes it part
 * of the site's rule vocabulary rather than an unrelated drawing. A plain SVG
 * rather than a glyph or a CSS border because it has to be the same file in the
 * PDF, in every capture and in a browser, at any scale.
 *
 * No `<title>`: the ornament says nothing a reader needs, and a title would put
 * its colour into the artifact's extracted text where a search would find it.
 */
export function ornamentSvg(gold = goldRuleColour()) {
  if (!/^#[0-9a-f]{6}$/.test(gold)) {
    throw new Error(
      `${GOLD_RULE_TOKEN} is ${JSON.stringify(gold)} in tailwind.css, so the ornament has no colour to be drawn in.`
    );
  }

  const { width, height } = ORNAMENT_BOX;
  const middle = width / 2;
  const rule = (from, to) => `M${from} ${height / 2}H${to}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`,
    `  <g stroke="${gold}" stroke-width="1" stroke-linecap="round">`,
    `    <path d="${rule(0, middle - 9)}" />`,
    `    <path d="${rule(middle + 9, width)}" />`,
    '  </g>',
    `  <path d="M${middle} 1.5 47.5 5 ${middle} 8.5 40.5 5Z" fill="${gold}" />`,
    '</svg>',
    '',
  ].join('\n');
}

/* -------------------------------------------------------------------------
 * The command
 * ---------------------------------------------------------------------- */

/** The two artifacts, as the bytes each path should hold. */
export async function artwork() {
  return [
    { path: PARCHMENT_PATH, bytes: await parchmentPng() },
    { path: ORNAMENT_PATH, bytes: Buffer.from(ornamentSvg(), 'utf8') },
  ];
}

async function main(argv) {
  const check = argv.includes('--check');
  const unknown = argv.filter((arg) => arg !== '--check');

  if (unknown.length > 0) {
    process.stderr.write(`Unknown option ${unknown[0]}. Run with --check or no options.\n`);
    return 1;
  }

  let stale = 0;

  for (const { path, bytes } of await artwork()) {
    const target = resolve(REPO_ROOT, path);

    if (check) {
      let current = null;
      try {
        current = readFileSync(target);
      } catch {
        current = null;
      }

      if (!current?.equals(bytes)) {
        process.stderr.write(`${path} is not what this generator makes. Re-run without --check.\n`);
        stale += 1;
      }
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    process.stdout.write(`  ok   ${path} - ${bytes.length} bytes\n`);
  }

  if (check && stale > 0) {
    process.stderr.write(
      `${stale} of the Handbook's generated files are stale, so the committed artwork is not the ` +
        "generator's output and cannot be regenerated from this repository.\n"
    );
    return 1;
  }

  return 0;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exitCode = await main(process.argv.slice(2));
}
