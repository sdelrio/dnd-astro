import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const configSource = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
const pageDirectory = join(repoRoot, 'src/content/docs/fantasy-grounds');

/**
 * Starlight builds the sidebar two ways. An explicit `slug` entry builds a link
 * from the config alone, so the target page's `sidebar.hidden` front matter is
 * ignored. An `autogenerate` entry builds the tree from the directory and drops
 * every page whose front matter sets `sidebar.hidden`. The guard below asserts
 * the invariant that fits whichever mode the group is in, so switching the group
 * from explicit slugs to `autogenerate` cannot silently drop a page.
 */
const groupBody = (() => {
  const match = configSource.match(
    /label: 'Fantasy Grounds',\s*items: \[([\s\S]*?)\],\s*\}/
  );

  if (match === null) {
    throw new Error(
      "astro.config.mjs no longer has a 'Fantasy Grounds' sidebar group with " +
        'items, so the sidebar guard has no source of truth to read'
    );
  }

  return match[1];
})();

const generated = /autogenerate/.test(groupBody);

const explicitSlugs = [...groupBody.matchAll(/slug: 'fantasy-grounds\/([^']+)'/g)]
  .map((match) => match[1])
  .sort();

function pageSlugs() {
  return readdirSync(pageDirectory)
    .filter((name) => /\.mdx?$/.test(name))
    .map((name) => name.replace(/\.mdx?$/, ''))
    .sort();
}

function pageSource(slug: string) {
  const name = readdirSync(pageDirectory).find(
    (candidate) => candidate === `${slug}.mdx` || candidate === `${slug}.md`
  );

  if (name === undefined) {
    throw new Error(`no page file on disk for slug ${slug}`);
  }

  return readFileSync(join(pageDirectory, name), 'utf8');
}

function isHidden(slug: string) {
  return /^sidebar:\n\s+hidden: true$/m.test(pageSource(slug));
}

describe('Fantasy Grounds sidebar', () => {
  it('lists every page in the directory, and no page that is absent', () => {
    if (generated) {
      return;
    }

    expect(explicitSlugs).toEqual(pageSlugs());
  });

  it('does not hide a page the sidebar would otherwise carry', () => {
    if (generated) {
      // Autogenerate drops a hidden page, so none may be hidden here.
      for (const slug of pageSlugs()) {
        expect(isHidden(slug), `${slug} is hidden`).toBe(false);
      }

      return;
    }

    // An explicit slug link ignores `sidebar.hidden`, so a page cannot be both
    // listed and hidden without the two settings contradicting each other.
    for (const slug of explicitSlugs) {
      expect(isHidden(slug), `${slug} is hidden`).toBe(false);
    }
  });
});
