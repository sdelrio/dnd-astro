import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const repoRoot = join(__dirname, '../..');
const EM_DASH = '\u2014';

/**
 * The prose surfaces the project maintains, as an explicit list of glob-ish
 * patterns. An unbounded glob (every `*.md` in the tree) is deliberately not
 * used: it would silently absorb vendored, generated, and third-party
 * documentation the project does not write, and it would make the guard's scope
 * depend on whatever happens to be checked out. Every entry here is a file the
 * project authors or edits, and a new surface has to be named deliberately.
 *
 * A pattern that matches nothing fails the "covers the surfaces" test below, so
 * a typo or a renamed directory cannot quietly turn the guard into a no-op.
 */
const proseSurfaces = [
  'README.md',
  'AGENTS.md',
  'CONTEXT.md',
  'SPEC.md',
  'PRODUCT.md',
  'DESIGN.md',
  'docs/adr/*.md',
  'docs/agents/*.md',
  'docs/audits/*.md',
  'docs/specs/README.md',
  'docs/specs/_TEMPLATE.md',
  'docs/specs/*/SPEC.md',
  'src/content/docs/**/*.md',
  'src/content/docs/**/*.mdx',
];

/**
 * Lines where the em dash is the subject of the sentence rather than a
 * violation of it. `AGENTS.md` states the house rule by quoting the character it
 * bans, and `CLAUDE.md` is a symlink to it, so the rule necessarily contains the
 * thing it forbids.
 *
 * The allowance is an exact-line allow list rather than a heuristic such as
 * "skip any line mentioning em dash". A heuristic would exempt every future line
 * that happens to talk about the rule, which is precisely the surface where a
 * stray dash is most likely to hide. An exact line only stops exempting when
 * someone rewrites the rule, and the "rule statements are the only exemptions"
 * test below fails in that case, so the exemption cannot rot away unnoticed.
 */
const ruleStatements: Record<string, string[]> = {
  'AGENTS.md': ['- Never use the em dash "\u2014". Use plain dash "-" instead.'],
};

/** `*` matches within a path segment, `**` matches whole segments (zero or more). */
function matchesSurface(relativePath: string, pattern: string) {
  const patternParts = pattern.split('/');
  const pathParts = relativePath.split('/');

  const withinSegment = (segment: string, text: string) => {
    if (segment === '*') {
      return true;
    }

    const glob = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*');

    return new RegExp(`^${glob}$`).test(text);
  };

  const match = (patternIndex: number, pathIndex: number): boolean => {
    if (patternIndex === patternParts.length) {
      return pathIndex === pathParts.length;
    }

    if (patternParts[patternIndex] === '**') {
      return Array.from({ length: pathParts.length - pathIndex + 1 }, (_, offset) => pathIndex + offset).some(
        (next) => match(patternIndex + 1, next)
      );
    }

    if (pathIndex === pathParts.length) {
      return false;
    }

    return withinSegment(patternParts[patternIndex], pathParts[pathIndex]) && match(patternIndex + 1, pathIndex + 1);
  };

  return match(0, 0);
}

/** Every file under the repository root, minus directories the project does not author. */
function candidateProseFiles() {
  const ignored = ['node_modules', 'dist', '.astro', '.git', 'tmp', '.scratch', '.impeccable-skill'];

  const walkIgnored = (dir: string): string[] => {
    if (ignored.some((name) => dir === name || dir.endsWith(`/${name}`))) {
      return [];
    }

    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        return walkIgnored(full);
      }

      return [relative(repoRoot, full).split(sep).join('/')];
    });
  };

  return walkIgnored(repoRoot).filter((path) => {
    if (!/\.(md|mdx)$/.test(path)) {
      return false;
    }

    try {
      // `statSync` follows symlinks, so a dangling one throws. A link that no
      // longer resolves is not prose this project maintains.
      return statSync(join(repoRoot, path)).isFile();
    } catch {
      return false;
    }
  });
}

function coveredFiles() {
  const candidates = candidateProseFiles();

  return candidates.filter((path) => proseSurfaces.some((pattern) => matchesSurface(path, pattern)));
}

function lines(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8').split('\n');
}

function violations(path: string) {
  const allowed = ruleStatements[path] ?? [];

  return lines(path)
    .map((text, number) => ({ number: number + 1, text }))
    .filter(({ text }) => text.includes(EM_DASH) && !allowed.includes(text));
}

describe('prose style', () => {
  it('covers every prose surface the project maintains', () => {
    const covered = coveredFiles();

    for (const pattern of proseSurfaces) {
      expect(covered.filter((path) => matchesSurface(path, pattern))).not.toEqual([]);
    }

    expect(covered.length).toBeGreaterThan(30);
  });

  it.each(coveredFiles())('%s has no em dash', (path) => {
    expect(violations(path)).toEqual([]);
  });

  it('exempts only the lines where the rule quotes the character it bans', () => {
    const exempted = new Set(
      Object.entries(ruleStatements).flatMap(([path, texts]) => texts.map((text) => `${path}: ${text}`))
    );

    expect(exempted.size).toBeGreaterThan(0);

    for (const path of Object.keys(ruleStatements)) {
      const found = lines(path).filter((text) => text.includes(EM_DASH));

      expect(new Set(found)).toEqual(new Set(ruleStatements[path]));
    }
  });

  it('documents the covered surfaces where the rule is stated', () => {
    const agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');
    const section = agents.slice(agents.indexOf('## Writing Style'));

    expect(section).toContain(EM_DASH);
    expect(section).toMatch(/guard|test|tested|enforced/i);

    for (const surface of ['README.md', 'AGENTS.md', 'docs/adr/', 'docs/specs/']) {
      expect(section).toContain(surface);
    }
  });
});
