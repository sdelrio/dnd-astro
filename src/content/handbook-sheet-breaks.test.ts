import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { contentPageFiles } from '../test-utils/content-pages';

const repoRoot = join(__dirname, '../..');
const HANDBOOK_DIR = join(repoRoot, 'src/content/docs/dnd');

/**
 * #423: a horizontal rule in a house-rule page is a gold divider.
 *
 * Since ADR-0024 it no longer starts a sheet, and the vestigial print rules that
 * commit `ecf883a` authored to force breaks have been removed, so the eight
 * house-rule pages currently author no horizontal rules at all. The guard stays
 * because the way to write one is still not safe by accident: if a rule is
 * authored again, a
 * `---` needs a blank line above it, and that is a parser constraint rather than
 * a style one, because two readers of the same file disagree about a rule that
 * does not have one:
 *
 *   - **CommonMark** reads a rule on the line immediately after paragraph text as
 *     a setext heading level two, so the break silently stops being a break.
 *   - **The weapon-properties table reader** (`weapon-properties.test.ts`) takes a
 *     lone `---` after a table's last data row for a table separator, which deletes
 *     that row and fails four assertions with nothing pointing at the rule.
 *
 * Both skip a rule that has a blank line above it, so one rule makes both safe,
 * and this test is what makes it stay safe.
 */

/** The eight house-rule sources, in the order the sidebar lists them. */
function houseRuleFiles(dir = HANDBOOK_DIR): string[] {
  return contentPageFiles(dir).sort();
}

/** The path a file is reported under, so a failure names the page. */
function asRepoPath(file: string): string {
  return relative(repoRoot, file).split(sep).join('/');
}

interface Break {
  line: number;
  above: string;
}

/**
 * Every thematic break in a house-rule page, with the line above it.
 *
 * Fenced code blocks are left alone and the YAML front matter's own `---`
 * delimiters are skipped: neither is a rule the author meant as a sheet break,
 * and a test that counted them would be a test about the file format rather than
 * about the handbook.
 */
function authoredBreaks(source: string): Break[] {
  const lines = source.split('\n');
  const breaks: Break[] = [];
  let fenced = false;
  let inFrontMatter = lines[0] === '---';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (fenced) {
      fenced = !/^\s*(```|~~~)/.test(line);
      continue;
    }

    if (/^\s*(```|~~~)/.test(line)) {
      fenced = true;
      continue;
    }

    if (inFrontMatter) {
      if (index > 0 && line.trim() === '---') inFrontMatter = false;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      breaks.push({ line: index + 1, above: index === 0 ? '' : lines[index - 1] });
    }
  }

  return breaks;
}

describe('the authored sheet breaks in the house-rule pages', () => {
  it('reads all eight source pages, so the guard cannot pass by reading nothing', () => {
    expect(houseRuleFiles()).toHaveLength(8);
  });

  // Non-vacuity is the scanner's own, asserted against worked examples in the
  // next describe. It is not asserted on the content, because since ADR-0024
  // removed the break a rule forced and the vestigial print rules were deleted,
  // the house-rule pages author none, and demanding one to guard would be
  // demanding a divider the book does not want.

  it('gives every horizontal rule a blank line above it', () => {
    const unreadable = houseRuleFiles().flatMap((file) =>
      authoredBreaks(readFileSync(file, 'utf8'))
        .filter((entry) => entry.above.trim() !== '')
        .map((entry) => `${asRepoPath(file)}:${entry.line} follows ${JSON.stringify(entry.above)}`)
    );

    expect(unreadable).toEqual([]);
  });

  });

describe('the guard that reads them', () => {
  // The scanner's own reader, asserted against a worked example, because a guard
  // that quietly stops matching `---` would pass over every rule in the book.
  // A rule inside a fenced example and the front matter's own delimiters are not
  // authored breaks and must not be counted as any.
  it('ignores front matter and fenced examples, and counts a real break', () => {
    const source = [
      '---',
      'title: Skills',
      '---',
      '',
      'A rule.',
      '',
      '---',
      '',
      '```md',
      '---',
      '```',
    ].join('\n');

    expect(authoredBreaks(source)).toEqual([{ line: 7, above: '' }]);
  });

  it('reports a rule with text above it, which is the failure this guard exists for', () => {
    const source = ['A paragraph.', '---'].join('\n');

    expect(authoredBreaks(source)).toEqual([{ line: 2, above: 'A paragraph.' }]);
  });
});

describe('the writing-style section', () => {
  const agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');
  const section = agents.slice(agents.indexOf('## Writing Style'));

  it('documents that a horizontal rule needs a blank line above it', () => {
    expect(section).toMatch(/blank line above/i);
    expect(section).toMatch(/horizontal rule|---/);
    expect(section).toMatch(/setext/i);
  });

  it('names the guard that enforces it', () => {
    expect(section).toMatch(/guard|test|tested|enforced/i);
    expect(section).toContain('handbook-sheet-breaks.test.ts');
  });
});