import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { TmpRedirect } from '../plugins/tmp-redirect.js';

const toolInput = (tool) => ({ tool, sessionID: 'ses', callID: 'call' });

async function loadBeforeHook(repoRoot) {
  const hooks = await TmpRedirect({ directory: repoRoot, worktree: repoRoot });
  return hooks['tool.execute.before'];
}

describe('TmpRedirect plugin', () => {
  let repoRoot;
  let before;

  beforeEach(async () => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tmp-redirect-'));
    before = await loadBeforeHook(repoRoot);
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('redirects a write to /tmp into repo tmp and creates the parent directory', async () => {
    const output = { args: { filePath: '/tmp/sub/notes.md', content: 'hi' } };

    await before(toolInput('write'), output);

    const expected = path.join(repoRoot, 'tmp', 'sub', 'notes.md');
    expect(output.args.filePath).toBe(expected);
    expect(fs.existsSync(path.dirname(expected))).toBe(true);
  });

  it('redirects an edit targeting /private/tmp', async () => {
    const output = { args: { filePath: '/private/tmp/notes.md', oldString: 'a', newString: 'b' } };

    await before(toolInput('edit'), output);

    expect(output.args.filePath).toBe(path.join(repoRoot, 'tmp', 'notes.md'));
  });

  it('logs each redirect', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const output = { args: { filePath: '/tmp/notes.md', content: 'hi' } };

    await before(toolInput('write'), output);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('/tmp/notes.md'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(path.join(repoRoot, 'tmp', 'notes.md')));
  });

  it('leaves a write already under the repo tmp untouched', async () => {
    const filePath = path.join(repoRoot, 'tmp', 'notes.md');
    const output = { args: { filePath, content: 'hi' } };

    await before(toolInput('write'), output);

    expect(output.args.filePath).toBe(filePath);
  });

  it('leaves read calls untouched', async () => {
    const output = { args: { filePath: '/tmp/notes.md' } };

    await before(toolInput('read'), output);

    expect(output.args.filePath).toBe('/tmp/notes.md');
  });

  it('rejects a bash command referencing /tmp with guidance', async () => {
    const output = { args: { command: 'echo hi > /tmp/notes.md' } };

    await expect(before(toolInput('bash'), output)).rejects.toThrow(/AGENTS\.md/);
    await expect(before(toolInput('bash'), output)).rejects.toThrow(/tmp\//);
  });

  it('allows a bash command using the repo-relative tmp convention', async () => {
    const output = { args: { command: 'mkdir -p tmp && echo hi > tmp/notes.md' } };

    await expect(before(toolInput('bash'), output)).resolves.toBeUndefined();
  });

  it('ignores tools it does not guard', async () => {
    const output = { args: { filePath: '/tmp/notes.md' } };

    await expect(before(toolInput('list'), output)).resolves.toBeUndefined();
    expect(output.args.filePath).toBe('/tmp/notes.md');
  });
});
