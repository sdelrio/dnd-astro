/**
 * The manifest: the small committed record that makes a stale Handbook fail.
 *
 * A generated artifact that is committed without a gate against it is worse than
 * no artifact, because it is confidently wrong. The gate is this file - a content
 * hash of the eight sources, the sheet count, and each sheet's page number and
 * text hash - and it is a few kilobytes so that it can be read in a diff. A
 * reviewer looking at a change to a house rule sees the rule's diff and the
 * manifest's diff together, which is how a reader of the repository learns the
 * artifact is not allowed to drift.
 *
 * Three properties are load-bearing and each is asserted rather than argued about:
 *
 *   - **The hash is content-based and never a timestamp.** A file that changed on
 *     every run would fail on a fresh checkout with nothing changed, which is a
 *     gate that cries wolf and is therefore a gate nobody keeps.
 *   - **It is read back, not remembered.** A truncated file is a failure rather
 *     than a passing test against an empty object, which is why nothing in this
 *     module hands back the object it built.
 *   - **Golden captures stay out of version control.** The text manifest is a few
 *     kilobytes; a PNG per sheet is hundreds of kilobytes and the book is dozens
 *     of sheets. Image comparison is a local mode against a baseline the
 *     repository does not track, and it corroborates the manifest rather than
 *     replacing it.
 *
 * See `handbook.mjs`, the Manifest entry in CONTEXT.md and ADR-0020.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The one committed path the manifest is written to.
 *
 * Beside the artwork and, from the publisher page onwards, beside the artifact
 * itself: the record of the book belongs with the book rather than in a directory
 * of build output. It is a few kilobytes, so publishing it costs nothing and lets
 * a reader see what they are holding.
 */
export const MANIFEST_PATH = 'public/handbook/manifest.json';

/**
 * The content collection the eight source pages live in.
 *
 * Stated once, and the slug of a source page is its path under this directory.
 * That is what keeps the manifest reviewable: the eight entries read as the eight
 * paths a reviewer would open.
 */
export const SOURCE_DIRECTORY = 'src/content/docs/dnd';

/**
 * The shape this version of the record has.
 *
 * A version, rather than a reader that tolerates whatever it finds, because a
 * manifest written by a later version of the command is not readable by an older
 * test and should say so rather than quietly pass the checks it happens to share.
 *
 * Version 2 is the book with front matter. Version 1 recorded only sheets printed
 * from a source page, so a cover and a contents in the artifact were pages the
 * record did not account for - and a record that does not account for the first
 * two pages of a book is not a record of it. Each sheet now carries a `kind`:
 * `source` for a sheet printed from one of the eight pages, `front` for the cover
 * and the contents, which come from no source page and are not broken by one.
 */
export const MANIFEST_VERSION = 2;

const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * Keys that would make the file change when nothing about the book did.
 *
 * A timestamp is the obvious way to break a content gate, and it is obvious
 * enough that it is worth the validator refusing one by name rather than relying
 * on nobody to add it.
 */
const CLOCK_KEYS = ['generated', 'generatedAt', 'timestamp', 'date', 'created', 'createdAt', 'built', 'builtAt'];

/** One sha256 of some bytes or text, as lower-case hex. */
function sha256(encoding, contents) {
  return createHash('sha256').update(contents, encoding).digest('hex');
}

/** What a content file's hash looks like when it is one. */
const isHash = (value) => typeof value === 'string' && HEX_64.test(value);

/**
 * Whether a file in the content directory is a source page.
 *
 * A leading underscore is Astro's own convention for a partial: `_markdown-impactful.mdx`
 * holds shared prose and is not a page, so it is not one of the eight, and the
 * manifest does not pretend otherwise.
 */
export function isSourceFile(name) {
  return !String(name).startsWith('_') && /\.(md|mdx)$/.test(name);
}

/**
 * The eight sources, as `{ slug, path, hash }`, in slug order.
 *
 * Hashed from the files themselves rather than from the collection, because the
 * manifest has to be checkable by a test that starts a browser: reading frontmatter
 * the way the route does would mean running Astro, and a gate that needs the whole
 * toolchain to run is a gate that gets skipped.
 *
 * Sorted by slug, so the list does not depend on the order a directory listing
 * happens to come back in. That is the difference between a hash that survives a
 * clone and one that does not.
 */
export function sourceEntries(root) {
  const directory = join(root, SOURCE_DIRECTORY);
  if (!existsSync(directory)) {
    throw new Error(`${SOURCE_DIRECTORY} is not in ${root}, so there are no source pages to hash.`);
  }

  return readdirSync(directory)
    .filter((name) => isSourceFile(name))
    .sort()
    .map((name) => {
      const path = `${SOURCE_DIRECTORY}/${name}`;

      return {
        slug: `dnd/${name.replace(/\.(md|mdx)$/, '')}`,
        path,
        hash: createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'),
      };
    });
}

/**
 * One hash of all the sources.
 *
 * Derived from the recorded entries rather than from the files, so the same
 * function answers "what is in the directory" and "is this manifest's own list of
 * sources consistent", and those two answers cannot drift apart.
 *
 * Slug and hash separated by a NUL, which neither can contain, so two pairs cannot
 * be joined into the same line as another pair: `a b` + `c` and `a` + `b c` are
 * different books and must not hash alike.
 */
export function sourceHash(entries) {
  const lines = [...(entries ?? [])]
    .map((entry) => `${entry.slug}\0${entry.hash}`)
    .sort();

  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

/** The text a sheet prints, with the document's own whitespace collapsed. */
function sheetText(sheet) {
  return String(sheet?.text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The manifest for one run.
 *
 * Nothing is passed through that the run did not measure: the sheets arrive with
 * their numbers and their text, the splits with the sheet each one starts. The
 * builder adds no fields of its own, because a field nobody measured is a field
 * that can disagree with the artifact.
 */
export function buildManifest({ sources, sheets, splits = [] }) {
  const ordered = [...sources].sort((a, b) => a.slug.localeCompare(b.slug));

  return {
    version: MANIFEST_VERSION,
    sourceHash: sourceHash(ordered),
    sheetCount: sheets.length,
    sources: ordered,
    sheets: sheets.map((sheet) => ({
      number: sheet.number,
      page: sheet.page,
      kind: sheet.kind ?? 'source',
      // Empty for a front sheet rather than absent: a reader that finds the key
      // knows the book has sheets with no source page, and one that finds a
      // missing key has to guess whether the file is truncated or the sheet is.
      source: sheet.source ?? '',
      title: sheet.title ?? '',
      part: sheet.part ?? 1,
      parts: sheet.parts ?? 1,
      section: sheet.section ?? '',
      textHash: sha256('utf8', sheetText(sheet)),
    })),
    splits: splits.map((split) =>
      split.oversized
        ? { source: split.source, sheet: split.sheet, kind: split.kind, label: split.label, oversized: true, height: split.height }
        : { source: split.source, sheet: split.sheet, kind: split.kind, label: split.label }
    ),
  };
}

/**
 * The manifest as it is written to disk.
 *
 * Two spaces and a trailing newline, and the keys in one order every time: the
 * file's purpose is to be read in a diff, and a diff of a file whose keys move
 * about is a diff nobody reads.
 */
export function manifestText(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Read a manifest back off disk and say whether it is the record it claims to be.
 *
 * The read is the point. `JSON.parse` of a string this process built would pass
 * while the file on disk was half a kilobyte of a manifest, so every check here
 * runs against text that came off the filesystem, and a file that does not parse
 * reports a problem rather than an empty object.
 *
 * Every problem is reported rather than the first, so one run says the whole
 * story about a record that is wrong in three ways.
 */
export function validateManifest({ label, text }) {
  const problems = [];
  const fail = (problem) => problems.push(`${label} ${problem}`);

  if (typeof text !== 'string' || text.trim() === '') {
    fail('is empty, so there is no record of what the artifact was made from. Regenerate it.');
    return { ok: false, label, problems, manifest: null };
  }

  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    fail(`is not readable as JSON (${error.message}), so it was truncated or hand-edited. Regenerate it.`);
    return { ok: false, label, problems, manifest: null };
  }

  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    fail('is not a record at all. Regenerate it.');
    return { ok: false, label, problems, manifest: null };
  }

  if (manifest.version !== MANIFEST_VERSION) {
    fail(`is version ${JSON.stringify(manifest.version)}, and this command writes version ${MANIFEST_VERSION}.`);
  }

  for (const key of CLOCK_KEYS) {
    if (key in manifest) {
      fail(`carries a ${key}, and a record that changes when nothing does cannot be a staleness gate.`);
    }
  }

  const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
  if (sources.length === 0) {
    fail('records no source pages, so it cannot say what the book was made from.');
  }

  const slugs = new Set();
  sources.forEach((entry, index) => {
    if (!entry || typeof entry.slug !== 'string' || entry.slug === '') {
      fail(`sources[${index}] has no slug.`);
      return;
    }
    if (slugs.has(entry.slug)) fail(`sources[${index}] repeats ${entry.slug}.`);
    slugs.add(entry.slug);
    if (typeof entry.path !== 'string' || !entry.path.startsWith(`${SOURCE_DIRECTORY}/`)) {
      fail(`sources[${index}] does not say which file it is: ${JSON.stringify(entry.path)}.`);
    }
    if (!isHash(entry.hash)) {
      fail(`sources[${index}] (${entry.slug}) has no usable content hash.`);
    }
  });

  if (isHash(manifest.sourceHash) && manifest.sourceHash !== sourceHash(sources)) {
    fail('has a sourceHash that is not the hash of the sources beside it, so the two were edited apart.');
  } else if (!isHash(manifest.sourceHash)) {
    fail('has no usable sourceHash.');
  }

  const sheets = Array.isArray(manifest.sheets) ? manifest.sheets : [];
  if (manifest.sheetCount !== sheets.length) {
    fail(`says sheetCount is ${manifest.sheetCount} and lists ${sheets.length} sheets.`);
  }
  if (sheets.length === 0) {
    fail('records no sheets, so there is no artifact to be a record of.');
  }

  sheets.forEach((sheet, index) => {
    if (!sheet || typeof sheet !== 'object') {
      fail(`sheets[${index}] is not a sheet.`);
      return;
    }
    if (sheet.number !== index + 1) {
      fail(`sheets[${index}] is sheet ${JSON.stringify(sheet.number)}, so the book is not in order.`);
    }
    if (!Number.isInteger(sheet.page) || sheet.page < 1) {
      fail(`sheets[${index}] has no page number a reader could turn to.`);
    }
    if (!isHash(sheet.textHash)) {
      fail(`sheets[${index}] has no usable textHash, so nothing would notice its text changing.`);
    }

    // Front matter is printed from no source page and is never broken by one, so
    // the two cases are checked against each other rather than both being asked
    // to name a source: a front sheet claiming one, or a source sheet claiming
    // none, is a record that disagrees with the artifact.
    if (sheet.kind === 'front') {
      if (sheet.source !== '') {
        fail(`sheets[${index}] is front matter printed from ${JSON.stringify(sheet.source)}.`);
      }
      if (sheet.part !== 1 || sheet.parts !== 1) {
        fail(`sheets[${index}] is front matter and does not say it is one whole sheet.`);
      }
      return;
    }

    if (sheet.kind !== 'source') {
      fail(`sheets[${index}] is ${JSON.stringify(sheet.kind)}, which is neither front matter nor a source page.`);
    }

    if (!slugs.has(sheet.source)) {
      fail(`sheets[${index}] is printed from ${JSON.stringify(sheet.source)}, which no source page provides.`);
    }
    if (!Number.isInteger(sheet.part) || sheet.part < 1 || !Number.isInteger(sheet.parts) || sheet.parts < sheet.part) {
      fail(`sheets[${index}] does not say which part of its source page it is.`);
    }
  });

  const splits = Array.isArray(manifest.splits) ? manifest.splits : [];
  if (!Array.isArray(manifest.splits)) {
    fail('does not say whether it recorded any splits, and an unrecorded split is the failure this file exists for.');
  }

  splits.forEach((split, index) => {
    if (!split || typeof split !== 'object') {
      fail(`splits[${index}] is not a split.`);
      return;
    }
    if (!slugs.has(split.source)) {
      fail(`splits[${index}] is in ${JSON.stringify(split.source)}, which no source page provides.`);
    }
    if (!Number.isInteger(split.sheet) || split.sheet < 1 || split.sheet > sheets.length) {
      fail(`splits[${index}] names sheet ${JSON.stringify(split.sheet)}, which is not in the book.`);
    } else if (sheets[split.sheet - 1]?.kind === 'front') {
      fail(`splits[${index}] is in the front matter, which is never broken at a block boundary.`);
    }
    if (typeof split.label !== 'string' || split.label.trim() === '') {
      fail(`splits[${index}] has no label, and a split nobody can name is a split nobody can act on.`);
    }
  });

  return { ok: problems.length === 0, label, problems, manifest };
}

/**
 * The manifest, read back off disk.
 *
 * `null` rather than an empty object when the file is absent or unreadable, so a
 * missing record cannot be mistaken for a book with no sheets.
 */
export function readManifest(root, path = MANIFEST_PATH) {
  const target = join(root, path);
  if (!existsSync(target) || !statSync(target).isFile()) return null;

  try {
    return validateManifest({ label: path, text: readFileSync(target, 'utf8') });
  } catch (error) {
    return {
      ok: false,
      label: path,
      problems: [`${path} could not be read (${error.message}), so it is not a record of anything.`],
      manifest: null,
    };
  }
}
