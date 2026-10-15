import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import plugin from '../plugins/strip-coauthor.js';

const toolEvent = (tool, input) => ({ tool, input });

async function loadBeforeHook() {
  let before;
  await plugin.setup({
    tool: {
      hook: async (name, callback) => {
        if (name === 'execute.before') before = callback;
        return { dispose: async () => {} };
      },
    },
  });
  return before;
}

describe('StripCoauthor plugin', () => {
  let before;

  beforeEach(async () => {
    before = await loadBeforeHook();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a V2 default definition with an id and a setup function', () => {
    expect(plugin.id).toBe('strip-coauthor');
    expect(typeof plugin.setup).toBe('function');
  });

  it('removes a Co-authored-by trailer from a git commit -m command', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const event = toolEvent('shell', {
      command:
        'git commit -m "feat(handbook): print the book (#426)\\n\\nCo-authored-by: opencode <opencode@openai.com>"',
    });

    await before(event);

    expect(event.input.command).not.toMatch(/co-authored-by/i);
    expect(event.input.command).toContain('feat(handbook): print the book (#426)');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[strip-coauthor]'));
  });

  it('leaves a clean git commit untouched', async () => {
    const command = 'git commit -m "fix(docs): make the README guards fail"';
    const event = toolEvent('shell', { command });

    await before(event);

    expect(event.input.command).toBe(command);
  });

  it('does not touch non-shell tools', async () => {
    const event = toolEvent('edit', { path: 'AGENTS.md', newString: 'x' });

    await before(event);

    expect(event.input.path).toBe('AGENTS.md');
  });

  it('does not touch shell commands that are not git commit', async () => {
    const command = 'echo Co-authored-by: opencode <opencode@openai.com>';
    const event = toolEvent('shell', { command });

    await before(event);

    expect(event.input.command).toBe(command);
  });
});
