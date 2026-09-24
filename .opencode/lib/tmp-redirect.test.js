import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { rewriteTmpPath, bashReferencesTmp, TMP_BASH_ERROR } from './tmp-redirect.js';

const REPO = '/repo/dnd';

describe('rewriteTmpPath', () => {
  it('rewrites a /tmp file into the repo tmp directory', () => {
    expect(rewriteTmpPath('/tmp/notes.md', REPO)).toEqual({
      path: path.join(REPO, 'tmp', 'notes.md'),
      redirected: true,
    });
  });

  it('rewrites a /private/tmp file into the repo tmp directory', () => {
    expect(rewriteTmpPath('/private/tmp/pr-301.md', REPO)).toEqual({
      path: path.join(REPO, 'tmp', 'pr-301.md'),
      redirected: true,
    });
  });

  it('preserves nested subdirectories under /tmp', () => {
    expect(rewriteTmpPath('/tmp/a/b/c.md', REPO)).toEqual({
      path: path.join(REPO, 'tmp', 'a', 'b', 'c.md'),
      redirected: true,
    });
  });

  it('leaves paths already inside the repo tmp directory untouched', () => {
    const input = path.join(REPO, 'tmp', 'notes.md');
    expect(rewriteTmpPath(input, REPO)).toEqual({ path: input, redirected: false });
  });

  it('leaves relative tmp paths untouched', () => {
    expect(rewriteTmpPath('tmp/notes.md', REPO)).toEqual({ path: 'tmp/notes.md', redirected: false });
  });

  it('leaves ordinary project paths untouched', () => {
    const input = path.join(REPO, 'src', 'env.d.ts');
    expect(rewriteTmpPath(input, REPO)).toEqual({ path: input, redirected: false });
  });

  it('does not treat a similarly named directory as /tmp', () => {
    expect(rewriteTmpPath('/tmpfoo/notes.md', REPO).redirected).toBe(false);
    expect(rewriteTmpPath('/var/tmp/notes.md', REPO).redirected).toBe(false);
    expect(rewriteTmpPath('src/tmp/notes.md', REPO).redirected).toBe(false);
  });

  it('refuses to escape the repo tmp directory via traversal', () => {
    expect(rewriteTmpPath('/tmp/../etc/passwd', REPO)).toEqual({
      path: '/tmp/../etc/passwd',
      redirected: false,
    });
  });
});

describe('bashReferencesTmp', () => {
  it.each([
    'echo hi > /tmp/notes.md',
    'cat /tmp/notes.md',
    'rm -rf /private/tmp/notes.md',
    'node -e "require(\'/tmp/x\')"',
    'cd /tmp && ls',
  ])('detects the system tmp path in %j', (command) => {
    expect(bashReferencesTmp(command)).toBe(true);
  });

  it.each([
    'ls tmp/',
    'cat tmp/notes.md',
    'echo "no system path here"',
    'git commit -m "add tmp/pr.md"',
    'curl https://example.com/tmp/file',
    'ls /var/tmp/',
    'printf /tmpfiles',
  ])('ignores non-system-tmp references in %j', (command) => {
    expect(bashReferencesTmp(command)).toBe(false);
  });
});

describe('TMP_BASH_ERROR', () => {
  it('names the repo-local tmp convention and AGENTS.md', () => {
    expect(TMP_BASH_ERROR).toMatch(/tmp\//);
    expect(TMP_BASH_ERROR).toMatch(/AGENTS\.md/);
  });
});
