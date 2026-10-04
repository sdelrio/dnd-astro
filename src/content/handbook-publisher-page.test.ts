import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  HANDBOOK_EDITION,
  HANDBOOK_EDITION_DATE,
  HANDBOOK_SOURCE_DIRECTORY,
  HANDBOOK_TITLE,
  HANDBOOK_VERSION,
  handbookSourcePages,
} from '../utils/handbook';

/**
 * The page that will publish the Handbook once the design settles.
 *
 * It exists because the index page cannot carry a download button - a test
 * asserts no `LinkButton` appears anywhere in that page's source, and the surface
 * brief states the whole surface is the index - and because a PDF of house rules
 * has to say what version it is before it can be trusted at a table. Until the
 * design settles it states the version and the edition date and links nothing.
 * It lives outside the house-rule pages so the Handbook is not printed into
 * itself, and it is reached through a fourth sidebar group, which is what makes
 * it discoverable from every page rather than only from the homepage.
 */

const repoRoot = join(__dirname, '../..');
const PAGE_PATH = 'src/content/docs/handbook.mdx';
const page = readFileSync(join(repoRoot, PAGE_PATH), 'utf8');
const indexSource = readFileSync(join(repoRoot, 'src/content/docs/index.mdx'), 'utf8');
const configSource = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');

/** The title the page's own front matter gives it. */
const pageTitle = page.match(/^title: '(.+)'$/m)?.[1];

describe('the publisher page', () => {
  it('exists in the docs collection at its own URL', () => {
    expect(existsSync(join(repoRoot, PAGE_PATH))).toBe(true);
    expect(pageTitle).toBe(HANDBOOK_TITLE);
  });

  // Outside the house-rule directory, because `handbookSourcePages` prints
  // everything under `dnd/`: a publisher page in there would be printed into the
  // artifact it describes, and the contents would list itself.
  it('is outside the house-rule pages, so the Handbook does not print itself', () => {
    const printed = handbookSourcePages([
      { id: 'dnd/skills', data: { title: 'Skills' } },
      { id: 'handbook', data: { title: HANDBOOK_TITLE } },
    ]);

    expect(PAGE_PATH).not.toContain(`${HANDBOOK_SOURCE_DIRECTORY}/`);
    expect(printed.map((source) => source.slug)).toEqual(['dnd/skills']);
  });

  it('states the version and the edition date', () => {
    expect(page).toContain('HANDBOOK_VERSION');
    expect(page).toContain('HANDBOOK_EDITION_DATE');
    expect(HANDBOOK_EDITION).toBe(`Version ${HANDBOOK_VERSION}, edition ${HANDBOOK_EDITION_DATE}`);
  });

  // The book is not published, so this page states that and links no file. A
  // link that resolves to nothing is the one failure a publisher page cannot
  // have, and until the design settles there is nothing for a link to resolve
  // to.
  it('states that the PDF is not published yet', () => {
    expect(page).toMatch(/not published yet/i);
  });

  it('contains no link to a PDF', () => {
    expect(page).not.toMatch(/\.pdf/i);
    expect(page).not.toMatch(/<a[\s>]/);
    expect(page).not.toMatch(/href=/);
  });

  it('is a plain page rather than a button, because the index page is free of both', () => {
    expect(page).not.toMatch(/<LinkButton/);
    expect(page).not.toMatch(/actions:/);
  });

  // The placeholder-cell and footnote guards read this file themselves, from
  // `src/content/docs/`. What is asserted here is that there is nothing in it for
  // them to trip over: no table at all, and no caret that could read as one.
  it('passes the guards that sweep every published file', () => {
    expect(page).not.toMatch(/^\s*\|/m);
    expect(page).not.toContain('[^');
  });
});

describe('the index page', () => {
  // The whole surface is the index, so the primary action is the first entry
  // under Part One. A download affordance here reverses a deliberate decision.
  it('carries no download affordance and no action button', () => {
    expect(indexSource).not.toMatch(/<LinkButton/);
    expect(indexSource).not.toMatch(/\.pdf/i);
    expect(indexSource).not.toContain('handbook');
  });

  it('leaves the index page out of the print route, which prints `dnd/` only', () => {
    expect(indexSource).not.toContain('data-handbook-source');
  });
});

describe('the sidebar group that carries it', () => {
  // A fourth group rather than a link inside an existing one: the sidebar is
  // global, so this is what makes the page reachable from every page of the site
  // rather than from the homepage only. The README's group table is compared
  // against the configured groups by `readme.test.ts`.
  it('lists the publisher page in a group named after the book', () => {
    expect(configSource).toMatch(
      /label: 'Handbook',\s*items: \[\s*\{\s*label: 'D&D House Rules Handbook',\s*slug: 'handbook'\s*\}\s*\]/
    );
  });

  it('is a fourth group, so the other three are untouched', () => {
    expect([...configSource.matchAll(/label: '(D&D rule fixes|D&D Tools|Fantasy Grounds|Handbook)',/g)]).toHaveLength(4);
  });
});