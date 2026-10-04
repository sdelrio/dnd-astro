import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { StripCoauthor } from '../plugins/strip-coauthor.js';

const toolInput = (tool) => ({ tool, sessionID: 'ses', callID: 'call' });

async function loadBeforeHook() {
  const hooks = await StripCoauthor({});
  return hooks['tool.execute.before'];
}

describe('StripCoauthor plugin', () => {
  let before;

  beforeEach(async () => {
    before = await loadBeforeHook();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes a Co-authored-by trailer from a git commit -m command', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const output = {
      args: {
        command:
          'git commit -m "feat(handbook): print the book (#426)\\n\\nCo-authored-by: opencode <opencode@openai.com>"',
      },
    };

    await before(toolInput('bash'), output);

    expect(output.args.command).not.toMatch(/co-authored-by/i);
    expect(output.args.command).toContain('feat(handbook): print the book (#426)');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[strip-coauthor]'));
  });

  it('leaves a clean git commit untouched', async () => {
    const command = 'git commit -m "fix(docs): make the README guards fail"';
    const output = { args: { command } };

    await before(toolInput('bash'), output);

    expect(output.args.command).toBe(command);
  });

  it('does not touch non-bash tools', async () => {
    const output = { args: { filePath: 'AGENTS.md', content: 'x' } };

    await before(toolInput('edit'), output);

    expect(output.args.filePath).toBe('AGENTS.md');
  });

  it('does not touch bash commands that are not git commit', async () => {
    const command = 'echo Co-authored-by: opencode <opencode@openai.com>';
    const output = { args: { command } };

    await before(toolInput('bash'), output);

    expect(output.args.command).toBe(command);
  });
});
