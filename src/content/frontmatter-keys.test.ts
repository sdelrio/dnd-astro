import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { CONTENT_ROOT, contentPageFiles } from '../test-utils/content-pages';

const docsRoot = CONTENT_ROOT;

/**
 * The front-matter keys a content page is allowed to declare.
 *
 * The first group is Starlight's own docs front-matter reference - the keys its
 * `docsSchema` knows how to read. The second group is the keys this project adds
 * through `docsSchema({ extend: ... })` in `src/content.config.ts`, plus `tags`,
 * which is not read by the schema at all but is this project's discovery
 * mechanism: `AGENTS.md` and `README.md` both tell a reader to match work to a
 * spec by tag, and every house-rule page carries them by convention.
 *
 * A key that is missing from this list is not necessarily wrong: a near miss of
 * one of them is what this guard is for. The list is the set a typo is measured
 * against, so it has to name every key a page might intend to write.
 */
const KNOWN_FRONTMATTER_KEYS = new Set([
  // Starlight docs front-matter reference.
  'title',
  'description',
  'slug',
  'draft',
  'lastUpdated',
  'editUrl',
  'head',
  'tableOfContents',
  'template',
  'hero',
  'banner',
  'sidebar',
  'pagefind',
  // Project extensions and conventions.
  'tags',
  'columns',
]);

/**
 * The house-rule pages, which are the non-partial pages under `dnd/`.
 *
 * Every one of these is expected to declare `tags`, because the tag is how a
 * reader finds the rule that answers a question, and a page with no tag is
 * invisible to that search.
 */
function houseRulePages() {
  return contentPages().filter((path) => path.startsWith('dnd/'));
}

/** Every `.md`/`.mdx` page under `src/content/docs`, relative to that root, `/`-separated. */
function contentPages(): string[] {
  return contentPageFiles().map((file) => relative(docsRoot, file).split(sep).join('/'));
}

/**
 * The keys a page's front matter declares, as written. Only top-level keys are
 * read: a nested key such as `sidebar.order` or `hero.tagline` is indented and
 * belongs to its parent, so it cannot be a misspelling of a top-level key.
 */
function frontmatterKeys(path: string): string[] {
  const text = readFileSync(join(docsRoot, path), 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return [];
  }

  return match[1]
    .split('\n')
    .map((line) => line.match(/^([A-Za-z0-9_-]+):/))
    .filter((key): key is RegExpMatchArray => key !== null)
    .map((key) => key[1]);
}

function hasFrontmatter(path: string): boolean {
  return /^---\r?\n/.test(readFileSync(join(docsRoot, path), 'utf8'));
}

/** Whether two keys are at most one edit apart, where an edit is a substitution, a transposition, or an insertion/deletion. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }

  if (a.length === b.length) {
    const differing = Array.from({ length: a.length }, (_, i) => i).filter((i) => a[i] !== b[i]);

    if (differing.length <= 1) {
      return true;
    }

    // A transposition of two adjacent characters reads as two substitutions.
    if (differing.length === 2) {
      const [i, j] = differing;
      return j === i + 1 && a[i] === b[j] && a[j] === b[i];
    }

    return false;
  }

  // Lengths differ by one, so a match means a single insertion or deletion.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;

  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
      continue;
    }

    if (skipped) {
      return false;
    }

    skipped = true;
    j += 1;
  }

  return true;
}

/**
 * The known key a written key is one edit away from, or `null`.
 *
 * One edit covers the failure this guard exists for: a leading stray character
 * (`ztags`), a substitution (`tgas`), a transposition the simple walk reads as
 * two substitutions, or a dropped character (`tag`).
 */
function nearMissOfKnownKey(key: string): string | null {
  if (KNOWN_FRONTMATTER_KEYS.has(key)) {
    return null;
  }

  for (const known of KNOWN_FRONTMATTER_KEYS) {
    if (withinOneEdit(key, known)) {
      return known;
    }
  }

  return null;
}

describe('content front matter', () => {
  it('reads pages and their keys rather than matching nothing', () => {
    const pages = contentPages();

    expect(pages.length).toBeGreaterThan(15);
    expect(pages.filter((path) => hasFrontmatter(path)).length).toBeGreaterThan(15);
  });

  it.each(contentPages().filter(hasFrontmatter))('%s declares only real keys', (path) => {
    const offenders = frontmatterKeys(path)
      .map((key) => ({ key, intended: nearMissOfKnownKey(key) }))
      .filter(({ intended }) => intended !== null);

    expect(offenders).toEqual([]);
  });

  it('catches the typo this guard was written for', () => {
    // `ztags` is the real one: the Magic page declared it and the key was
    // stripped silently, so the page carried no tags at all. If the guard ever
    // stops seeing this it has gone vacuous.
    expect(nearMissOfKnownKey('ztags')).toBe('tags');
    expect(nearMissOfKnownKey('tgas')).toBe('tags');
    expect(nearMissOfKnownKey('descripton')).toBe('description');
    expect(nearMissOfKnownKey('sidebar')).toBeNull();
    expect(nearMissOfKnownKey('columns')).toBeNull();
  });

  it('gives every house-rule page a tags key', () => {
    const pages = houseRulePages();

    expect(pages).toHaveLength(8);

    const untagged = pages.filter((path) => !frontmatterKeys(path).includes('tags'));

    expect(untagged).toEqual([]);
  });
});
