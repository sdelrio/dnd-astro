import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const repoRoot = join(__dirname, '../..');
const DAY_MS = 86_400_000;

/**
 * #430: the regression test for `make clean-tmp`.
 *
 * The target deletes files, so the test can never point it at the repository's
 * own `tmp/`: a bug in the recipe would then delete a developer's scratch files,
 * and the test would be the thing that loses the data. Every case below overrides
 * `TMP_ROOT` with a fixture directory it creates under `tmp/` (gitignored, and
 * where AGENTS.md says temporary files go) and removes afterwards. That also means
 * no case exercises the default root, which is correct: the property worth
 * proving is that the default *is* `tmp/`, read out of the Makefile below rather
 * than inferred from a run.
 *
 * Ages are set explicitly with `utimesSync` rather than by sleeping, so the suite
 * does not take three days to answer the question.
 */
const fixtureParent = join(repoRoot, 'tmp');
const fixtures: string[] = [];

/** A fixture directory the test owns, under the repository's own `tmp/`. */
function fixture(): string {
  mkdirSync(fixtureParent, { recursive: true });

  const dir = mkdtempSync(join(fixtureParent, 'clean-tmp-test-'));

  fixtures.push(dir);

  return dir;
}

/** Backdates a path by whole days, forwards and backwards for the mtime. */
function age(path: string, days: number) {
  const when = new Date(Date.now() - days * DAY_MS);

  utimesSync(path, when, when);
}

/** Writes a file `ageInDays` old, and ages the directory holding it. */
function file(root: string, relativePath: string, ageInDays: number) {
  const path = join(root, relativePath);

  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${relativePath}\n`);

  age(path, ageInDays);
  age(join(path, '..'), ageInDays);

  return path;
}

interface CleanRun {
  stdout: string;
  status: number;
}

/** Runs the real target, with the root and any variables overridden. */
function cleanTmp(root: string, variables: Record<string, string> = {}): CleanRun {
  const overrides = Object.entries(variables).map(([name, value]) => `${name}=${value}`);

  try {
    const stdout = execFileSync('make', ['--no-print-directory', 'clean-tmp', `TMP_ROOT=${root}`, ...overrides], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return { stdout, status: 0 };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };

    return { stdout: `${failure.stdout ?? ''}${failure.stderr ?? ''}`, status: failure.status ?? 1 };
  }
}

/** Runs `make help`, the surface the target has to be discoverable on. */
function makeHelp(): string {
  try {
    return execFileSync('make', ['help'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };

    return `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
  }
}

/** Every path under a root, relative to it and slash-separated, in a stable order. */
function tree(root: string): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);

      return entry.isDirectory() ? [path, ...walk(path)] : [path];
    });

  return [root, ...(existsSync(root) ? walk(root) : [])]
    .map((path) => relative(root, path).split(sep).join('/'))
    .sort();
}

/** The paths the target reported, which a dry run prints and a real run deletes. */
function reported(root: string, stdout: string): string[] {
  const prefix = `${root.split(sep).join('/')}/`;

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix))
    .map((line) => relative(root, line).split(sep).join('/'))
    .sort();
}

const makefile = readFileSync(join(repoRoot, 'Makefile'), 'utf8');
const agents = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('make clean-tmp', () => {
  it('defaults to the repository tmp/ root and a three day retention', () => {
    expect(makefile).toMatch(/^TMP_ROOT \?= tmp$/m);
    expect(makefile).toMatch(/^TMP_RETENTION_DAYS \?= 3$/m);
  });

  it('deletes stale files and leaves newer ones alone', () => {
    const root = fixture();

    file(root, 'stale.txt', 4);
    file(root, 'fresh.txt', 0);
    file(root, 'nested/stale.txt', 5);
    file(root, 'nested/fresh.txt', 1);

    expect(cleanTmp(root).status).toBe(0);
    expect(tree(root)).toEqual(['', 'fresh.txt', 'nested', 'nested/fresh.txt']);
  });

  it('removes a directory that empties out and keeps one holding a fresh file', () => {
    const root = fixture();

    file(root, 'all-stale/one.txt', 6);
    file(root, 'all-stale/deeper/two.txt', 6);
    file(root, 'partly-fresh/old.txt', 6);
    file(root, 'partly-fresh/new.txt', 0);

    expect(cleanTmp(root).status).toBe(0);
    expect(tree(root)).toEqual(['', 'partly-fresh', 'partly-fresh/new.txt']);
  });

  it('exits 0 on a tree that mixes stale and fresh content', () => {
    const root = fixture();

    file(root, 'mixed/old.txt', 7);
    file(root, 'mixed/new.txt', 0);
    file(root, 'mixed/deeper/old.txt', 8);
    file(root, 'loose.txt', 0);

    const run = cleanTmp(root);

    expect(run.status).toBe(0);
    expect(run.stdout).not.toMatch(/Directory not empty/i);
  });

  it('lists the same entries under -n and deletes nothing', () => {
    const root = fixture();

    file(root, 'stale.txt', 4);
    file(root, 'all-stale/one.txt', 6);
    file(root, 'partly-fresh/old.txt', 6);
    file(root, 'partly-fresh/new.txt', 0);

    const before = tree(root);
    const dry = cleanTmp(root, { ARGS: '-n' });

    expect(dry.status).toBe(0);
    expect(tree(root)).toEqual(before);

    cleanTmp(root);

    const removed = before.filter((path) => !tree(root).includes(path));

    expect(reported(root, dry.stdout)).toEqual(removed);
    expect(removed).toEqual(['all-stale', 'all-stale/one.txt', 'partly-fresh/old.txt', 'stale.txt']);
  });

  it('takes the retention age from the command line', () => {
    const root = fixture();

    file(root, 'two-days.txt', 2);
    file(root, 'four-days.txt', 4);

    expect(cleanTmp(root).status).toBe(0);
    expect(tree(root)).toEqual(['', 'two-days.txt']);

    expect(cleanTmp(root, { TMP_RETENTION_DAYS: '1' }).status).toBe(0);
    expect(tree(root)).toEqual(['']);
  });

  it('never treats the root itself as a candidate, even when it is the oldest thing there', () => {
    const root = fixture();

    file(root, 'stale.txt', 4);
    age(root, 9);

    expect(cleanTmp(root).status).toBe(0);
    expect(existsSync(root)).toBe(true);
    expect(tree(root)).toEqual(['']);
  });

  it('is a no-op with a clear message when the directory does not exist', () => {
    const missing = join(fixture(), 'never-created');
    const run = cleanTmp(missing);

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('clean-tmp');
    expect(run.stdout).toContain('never-created');
  });

  it('leaves a symlink alone, because a link is not a regular file', () => {
    const root = fixture();
    const target = file(root, 'target.txt', 0);

    symlinkSync(target, join(root, 'link.txt'));

    expect(cleanTmp(root).status).toBe(0);
    expect(tree(root)).toContain('link.txt');
    expect(tree(root)).toContain('target.txt');
  });

  it('is declared phony and listed under Maintenance in make help', () => {
    expect(makefile).toMatch(/^\.PHONY:[\s\S]*?clean-tmp/m);

    const help = makeHelp();
    const verification = help.slice(help.indexOf('Verification'), help.indexOf('Print'));
    const maintenance = help.slice(help.indexOf('Maintenance')).split('\n\n')[0];

    expect(maintenance).toContain('make clean-tmp');
    expect(verification).not.toContain('make clean-tmp');
  });

  it('is the target the Temporary Files section of AGENTS.md points at', () => {
    const section = agents.slice(agents.indexOf('## Temporary Files'), agents.indexOf('## Browser evidence'));

    expect(section).toContain('make clean-tmp');
    expect(section).toMatch(/three days|3 days/);
  });
});