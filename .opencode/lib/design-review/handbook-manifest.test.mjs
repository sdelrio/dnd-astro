import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  MANIFEST_PATH,
  MANIFEST_VERSION,
  SOURCE_DIRECTORY,
  buildManifest,
  isSourceFile,
  manifestText,
  sourceEntries,
  sourceHash,
  validateManifest,
} from './handbook-manifest.mjs';

/**
 * The manifest: the record that makes a stale artifact fail.
 *
 * The tests here are about a *file*. A manifest parsed out of a string in the
 * same process that wrote it would pass while the file on disk was truncated, so
 * every check in this file goes through `manifestText` and back out of
 * `validateManifest`, which is what a test of the artifact has to do.
 */

const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** One measured source page and one sheet, as the layout publishes them. */
function run({ sheets = 2, splits = [] } = {}) {
  return {
    sources: [
      { slug: 'dnd/magic', path: `${SOURCE_DIRECTORY}/magic.md`, hash: sha('magic') },
      { slug: 'dnd/skills', path: `${SOURCE_DIRECTORY}/skills.md`, hash: sha('skills') },
    ],
    sheets: Array.from({ length: sheets }, (_, index) => ({
      number: index + 1,
      page: index + 1,
      source: index === 0 ? 'dnd/magic' : 'dnd/skills',
      part: 1,
      parts: index === 0 ? 1 : sheets - 1,
      section: index === 0 ? 'Casting' : 'General',
      text: `sheet ${index + 1}`,
    })),
    splits,
  };
}

const temporary = [];

function scratch(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'handbook-manifest-'));
  temporary.push(dir);

  mkdirSync(join(dir, SOURCE_DIRECTORY), { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, SOURCE_DIRECTORY, name), contents);
  }

  return dir;
}

afterEach(() => {
  while (temporary.length > 0) rmSync(temporary.pop(), { recursive: true, force: true });
});

describe('the sources of the book', () => {
  it('records every source page under the content directory, by slug and hash', () => {
    const root = scratch({ 'magic.md': 'magic', 'skills.md': 'skills' });

    expect(sourceEntries(root)).toEqual([
      { slug: 'dnd/magic', path: `${SOURCE_DIRECTORY}/magic.md`, hash: sha('magic') },
      { slug: 'dnd/skills', path: `${SOURCE_DIRECTORY}/skills.md`, hash: sha('skills') },
    ]);
  });

  // A file whose name starts with an underscore is a partial in Astro's content
  // collection: it is never a page, so it is not a source, so the manifest does
  // not pretend it is one.
  it('leaves out a partial, which is not a page', () => {
    const root = scratch({ 'magic.md': 'magic', '_shared.mdx': 'shared' });

    expect(sourceEntries(root).map((entry) => entry.slug)).toEqual(['dnd/magic']);
    expect(isSourceFile('_shared.mdx')).toBe(false);
    expect(isSourceFile('magic.md')).toBe(true);
  });

  // The one hash the gate is really about. Sorted, so the hash does not depend on
  // the order a directory listing happens to come back in.
  it('hashes the sources as one value, in slug order', () => {
    const entries = [
      { slug: 'dnd/skills', path: 'p', hash: sha('skills') },
      { slug: 'dnd/magic', path: 'p', hash: sha('magic') },
    ];

    expect(sourceHash(entries)).toBe(sourceHash([...entries].reverse()));
    expect(sourceHash(entries)).toMatch(/^[0-9a-f]{64}$/);
    expect(sourceHash(entries)).not.toBe(sourceHash([{ ...entries[0], hash: sha('edited') }, entries[1]]));
  });

  // A page renamed in the sidebar is a page whose order in the book changed, and
  // an order change is a content change as far as the reader is concerned.
  it('changes when a source is added, removed or renamed', () => {
    const one = [{ slug: 'dnd/magic', path: 'p', hash: sha('magic') }];

    expect(sourceHash(one)).not.toBe(sourceHash([...one, { slug: 'dnd/injuries', path: 'p', hash: sha('i') }]));
    expect(sourceHash(one)).not.toBe(sourceHash([{ ...one[0], slug: 'dnd/magic2' }]));
    expect(sourceHash(one)).not.toBe(sourceHash([]));
  });
});

describe('the manifest', () => {
  it('carries the source hash, the sheet count and every sheet', () => {
    const manifest = buildManifest(run());

    expect(manifest).toMatchObject({ version: MANIFEST_VERSION, sheetCount: 2 });
    expect(manifest.sheets).toHaveLength(2);
    expect(manifest.splits).toEqual([]);
    // The combined hash is a function of the recorded sources, so a manifest that
    // disagrees with its own entries cannot be produced by this builder.
    expect(manifest.sourceHash).toBe(sourceHash(manifest.sources));
  });

  it('hashes each sheet by the text it prints, not by its position', () => {
    const [first, second] = buildManifest(run()).sheets;

    expect(first.textHash).toBe(sha('sheet 1'));
    expect(second.textHash).toBe(sha('sheet 2'));
    expect(first.textHash).not.toBe(second.textHash);
  });

  // Whitespace in the rendered text is the document's own newlines and
  // indentation, none of which is anything a reader of the book can see. A hash
  // that moved when a paragraph was rewrapped would be a hash that cried wolf.
  it('hashes the text with its whitespace collapsed', () => {
    const manifest = buildManifest({
      ...run({ sheets: 1 }),
      sheets: [{ number: 1, page: 1, source: 'dnd/magic', part: 1, parts: 1, section: '', text: 'one\n\n  two  ' }],
    });

    expect(manifest.sheets[0].textHash).toBe(sha('one two'));
  });

  it('records every split by the sheet it starts and the block it starts with', () => {
    const manifest = buildManifest(
      run({ splits: [{ source: 'dnd/skills', sheet: 2, kind: 'h2', label: 'h2 at h2 "Dash"' }] })
    );

    expect(manifest.splits).toEqual([{ source: 'dnd/skills', sheet: 2, kind: 'h2', label: 'h2 at h2 "Dash"' }]);
  });

  // An element too tall for a sheet was not split, so calling it a split would
  // be a lie about what happened; it is recorded, and it is recorded as the thing
  // it is, because the gate that fails on it is the gate that has to catch it.
  it('records a block that no sheet could hold as an oversized split', () => {
    const manifest = buildManifest(
      run({
        splits: [
          {
            source: 'dnd/skills',
            sheet: 3,
            kind: 'p',
            label: 'p at "You must have the spell prepared"',
            oversized: true,
            height: 1453,
          },
        ],
      })
    );

    expect(manifest.splits[0]).toMatchObject({ oversized: true, height: 1453 });
  });

  // Stable text, so a diff over the manifest is a diff over the book and a
  // regenerated manifest with no change in the content is byte-identical.
  it('writes the same bytes for the same book', () => {
    const once = manifestText(buildManifest(run()));
    const twice = manifestText(buildManifest(run()));

    expect(once).toBe(twice);
    expect(once.endsWith('\n')).toBe(true);
    // Two spaces, one sheet per block of lines: reviewable in a diff, which is
    // the entire reason this file exists in the repository.
    expect(once.split('\n').slice(0, 2)).toEqual(['{', `  "version": ${MANIFEST_VERSION},`]);
    expect(once.split('\n')[2]).toMatch(/^ {2}"sourceHash": "[0-9a-f]{64}",$/);
  });
});

describe('the written manifest read back', () => {
  const written = (options) => manifestText(buildManifest(run(options)));

  it('accepts what it wrote', () => {
    const verdict = validateManifest({ label: 'manifest.json', text: written() });

    expect(verdict.problems).toEqual([]);
    expect(verdict.ok).toBe(true);
    expect(verdict.manifest.sheetCount).toBe(2);
  });

  // The reason the file is read back rather than trusted: a truncated manifest
  // parses as nothing at all, and a test that checks an object it built itself
  // would pass on the empty one.
  it('fails on a file that was cut short rather than passing on an empty object', () => {
    const text = written();
    const verdict = validateManifest({ label: 'manifest.json', text: text.slice(0, Math.floor(text.length / 2)) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/not readable as JSON|truncated/);
    expect(verdict.manifest).toBeNull();
  });

  it('fails on a file that is empty or absent', () => {
    for (const text of ['', '   ']) {
      expect(validateManifest({ label: 'manifest.json', text }).ok).toBe(false);
    }
  });

  it('fails when the combined hash disagrees with the sources beside it', () => {
    const manifest = JSON.parse(written());
    manifest.sourceHash = sha('something else');

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/sourceHash/);
  });

  // A hand-edited manifest that kept the combined hash but changed a source hash
  // would pass that check, so each recorded hash is recomputed from the shape the
  // builder writes.
  it('fails when a source hash is not the hash of the record it belongs to', () => {
    const manifest = JSON.parse(written());
    manifest.sources[0].hash = 'not a hash';

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/sources\[0\]/);
  });

  it('fails when the sheet count disagrees with the sheets', () => {
    const manifest = JSON.parse(written());
    manifest.sheetCount = 7;

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/sheetCount/);
  });

  it('fails when a sheet has no text hash to compare', () => {
    const manifest = JSON.parse(written());
    delete manifest.sheets[1].textHash;

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/textHash/);
  });

  it('fails when a sheet names a source page the manifest never recorded', () => {
    const manifest = JSON.parse(written());
    manifest.sheets[1].source = 'dnd/nonexistent';

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/dnd\/nonexistent/);
  });

  it('fails when the sheets are not the book in order', () => {
    const manifest = JSON.parse(written());
    manifest.sheets[1].number = 1;

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/sheets\[1\]/);
  });

  it('fails when a split names a sheet that is not in the book', () => {
    const manifest = JSON.parse(written({ splits: [{ source: 'dnd/skills', sheet: 9, kind: 'h2', label: 'x' }] }));

    expect(validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) }).ok).toBe(false);
  });

  it('fails on a split with nothing to find it by', () => {
    const manifest = JSON.parse(written({ splits: [{ source: 'dnd/skills', sheet: 2, kind: 'h2', label: '  ' }] }));

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join(' ')).toMatch(/label/);
  });

  // A timestamp in here would make the file change on every run, which is the one
  // thing a staleness gate cannot be: a gate that fails when nothing changed is a
  // gate nobody keeps.
  it('refuses a field that would make the file change when nothing does', () => {
    for (const key of ['generatedAt', 'timestamp', 'date', 'builtAt']) {
      const manifest = { ...JSON.parse(written()), [key]: '2026-10-04T00:00:00.000Z' };

      const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

      expect(verdict.ok, key).toBe(false);
      expect(verdict.problems.join(' ')).toMatch(new RegExp(key));
    }
  });

  it('refuses a version it was not written for', () => {
    const manifest = { ...JSON.parse(written()), version: 99 };

    expect(validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) }).ok).toBe(false);
  });

  it('names the file in every problem, because that is what a reader has to fix', () => {
    const verdict = validateManifest({ label: 'public/handbook/manifest.json', text: '' });

    expect(verdict.problems.every((problem) => problem.includes('public/handbook/manifest.json'))).toBe(true);
  });

  it('reports every problem at once rather than only the first', () => {
    const manifest = JSON.parse(written());
    manifest.sheetCount = 7;
    manifest.sheets[0].page = 0;

    const verdict = validateManifest({ label: 'manifest.json', text: JSON.stringify(manifest) });

    expect(verdict.problems.length).toBeGreaterThan(1);
  });
});

describe('the manifest committed in this repository', () => {
  const ROOT = new URL('../../..', import.meta.url).pathname;
  const committed = () => readFileSync(join(ROOT, MANIFEST_PATH), 'utf8');
  const read = () => validateManifest({ label: MANIFEST_PATH, text: committed() });

  it('reads back as the record it is', () => {
    const verdict = read();

    expect(verdict.problems).toEqual([]);
    expect(verdict.manifest.sources).toHaveLength(8);
  });

  // The gate. Edit a house rule and this fails, which is the whole point of
  // committing the file: the artifact cannot go stale with nothing failing.
  it('matches the content it was made from', () => {
    const verdict = read();
    const entries = sourceEntries(ROOT);

    expect(entries.length).toBeGreaterThan(0);
    expect(verdict.manifest.sourceHash).toBe(sourceHash(entries));
  });

  // A new house-rule page that nobody regenerated the artifact for is the same
  // failure as an edited one, and it is invisible without this check.
  it('accounts for every source page in the content directory', () => {
    const verdict = read();

    for (const entry of sourceEntries(ROOT)) {
      expect(verdict.manifest.sources.map((source) => source.slug)).toContain(entry.slug);
    }
  });

  // Deliberately red while the book's content still needs automatic breaks, and
  // that is the design: the report names every one of them, an authored horizontal
  // rule replaces it, and the artifact converges on breaks a person chose.
  it('has no automatic splits left in it', () => {
    const verdict = read();

    expect(verdict.manifest.splits.map((split) => `${split.source} sheet ${split.sheet}: ${split.label}`)).toEqual([]);
  });
});
