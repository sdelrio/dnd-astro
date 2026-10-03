import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The print route, asserted as the inert document it has to be.
 *
 * The rendered HTML cannot be asserted here: the Astro container API has no
 * markdown renderer registered, so `<Content />` throws. What is asserted is the
 * part that is decided in this file and cannot be decided anywhere else - which
 * entries it prints, what it marks them with, and that it ships no JavaScript -
 * plus the order those entries are printed in, which `src/utils/handbook.test.ts`
 * covers as a function.
 */

const route = readFileSync(new URL('./print.astro', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./spike-fixture.astro', import.meta.url), 'utf8');

describe('the handbook print route', () => {
  it('ships no client-side JavaScript of its own', () => {
    // The sheet assignment is injected at document start by the command, so the
    // committed route is inert HTML: the artifact is not a page a reader could
    // run code on.
    expect(route).not.toMatch(/<script/);
    expect(route).not.toMatch(/client:(load|idle|visible|media|only)/);
    expect(route).not.toMatch(/set:html/);
  });

  it('marks each source page for the command to turn into a sheet', () => {
    expect(route).toContain('data-handbook-source={slug}');
    expect(route).toContain('data-handbook-title={title}');
  });

  // The opt-out is carried onto the element rather than left in frontmatter,
  // because the stylesheet is the only thing that can lay the page out in one
  // column and it reads the DOM, not the collection.
  it('carries the page opt-out onto the element the stylesheet lays out', () => {
    expect(route).toContain('data-handbook-columns={columns}');
  });

  // The two-column measure applies to the flow of the page's own content. The
  // title above it and the footer below it are page furniture and are outside
  // the measure, which is why they are not inside it.
  it('puts the content in its own flow box so the columns have something to fill', () => {
    expect(route).toContain('data-handbook-flow');
  });

  // The footer is not authored here. It carries a page number, and a page
  // number is arithmetic about the whole book, which the route cannot know: it
  // renders content, and the command injects what it measured at document start.
  it('authors no footer, because a page number is not the route to decide', () => {
    expect(route).not.toContain('data-handbook-footer');
    expect(route).not.toMatch(/of \{\{?\s*(total|count)/);
  });

  // The sheet number is the command's to assign, from what it measured. A route
  // that marked its own sheets would be asserting a page boundary it never laid
  // out.
  it('assigns no sheets itself', () => {
    expect(route).not.toContain('data-handbook-sheet');
    expect(fixture).not.toContain('data-handbook-sheet');
  });

  it('prints the source pages in the order the sidebar lists them', () => {
    expect(route).toContain('handbookSourcePages(entries)');
  });

  it('heads each sheet with its source page title', () => {
    expect(route).toMatch(/<h1>\{title\}<\/h1>/);
  });

  it('renders the content the way a documentation page renders it', () => {
    expect(route).toContain('class="sl-markdown-content"');
  });
});

describe('the spike fixture', () => {
  // The fixture is what ADR-0020's spike ran against, and it stays as the
  // regression that the mechanism still paginates: two source pages, so two
  // pages, which is a count a run can state without knowing anything else.
  it('is two source pages and nothing else', () => {
    expect(fixture.match(/\{ slug: 'fixture\/[^']+', title: '[^']+' \}/g)).toHaveLength(2);
  });

  it('carries no house-rule content, so it is counted rather than read', () => {
    expect(fixture).not.toContain('<Content />');
  });
});