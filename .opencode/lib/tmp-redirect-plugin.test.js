import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import plugin from '../plugins/tmp-redirect.js';

const toolEvent = (tool, input) => ({ tool, input });

async function loadBeforeHook(repoRoot) {
  let before;
  await plugin.setup({
    location: { directory: repoRoot, project: { canonical: repoRoot } },
    tool: {
      hook: async (name, callback) => {
        if (name === 'execute.before') before = callback;
        return { dispose: async () => {} };
      },
    },
  });
  return before;
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

  it('is a V2 default definition with an id and a setup function', () => {
    expect(plugin.id).toBe('tmp-redirect');
    expect(typeof plugin.setup).toBe('function');
  });

  it('redirects a write to /tmp into repo tmp and creates the parent directory', async () => {
    const event = toolEvent('write', { path: '/tmp/sub/notes.md', content: 'hi' });

    await before(event);

    const expected = path.join(repoRoot, 'tmp', 'sub', 'notes.md');
    expect(event.input.path).toBe(expected);
    expect(fs.existsSync(path.dirname(expected))).toBe(true);
  });

  it('redirects an edit targeting /private/tmp', async () => {
    const event = toolEvent('edit', { path: '/private/tmp/notes.md', oldString: 'a', newString: 'b' });

    await before(event);

    expect(event.input.path).toBe(path.join(repoRoot, 'tmp', 'notes.md'));
  });

  it('logs each redirect', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const event = toolEvent('write', { path: '/tmp/notes.md', content: 'hi' });

    await before(event);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('/tmp/notes.md'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(path.join(repoRoot, 'tmp', 'notes.md')));
  });

  it('leaves a write already under the repo tmp untouched', async () => {
    const filePath = path.join(repoRoot, 'tmp', 'notes.md');
    const event = toolEvent('write', { path: filePath, content: 'hi' });

    await before(event);

    expect(event.input.path).toBe(filePath);
  });

  it('leaves read calls untouched', async () => {
    const event = toolEvent('read', { path: '/tmp/notes.md' });

    await before(event);

    expect(event.input.path).toBe('/tmp/notes.md');
  });

  it('rejects a shell command referencing /tmp with guidance', async () => {
    const event = toolEvent('shell', { command: 'echo hi > /tmp/notes.md' });

    expect(() => before(event)).toThrow(/AGENTS\.md/);
    expect(() => before(event)).toThrow(/tmp\//);
  });

  it('allows a shell command using the repo-relative tmp convention', () => {
    const event = toolEvent('shell', { command: 'mkdir -p tmp && echo hi > tmp/notes.md' });

    expect(() => before(event)).not.toThrow();
  });

  it('ignores tools it does not guard', () => {
    const event = toolEvent('list', { path: '/tmp/notes.md' });

    expect(() => before(event)).not.toThrow();
    expect(event.input.path).toBe('/tmp/notes.md');
  });
});
