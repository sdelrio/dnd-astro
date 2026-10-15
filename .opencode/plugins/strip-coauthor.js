import { Plugin } from '@opencode/plugin';

import { rewriteGitCommitCommand } from '../lib/strip-coauthor.js';

/**
 * Project plugin: keep Co-authored-by trailers out of commits.
 *
 * Rewrites `git commit` shell commands so any `Co-authored-by` / `Co-Authored-By`
 * line is dropped from `-m` arguments before the command runs. opencode has no
 * schema key for this, so the enforcement lives here (auto-loaded from
 * `.opencode/plugins/`).
 *
 * opencode V2 renamed the shell tool from `bash` to `shell` and expects a
 * default-exported definition with an `id` and a `setup` function.
 */
export default Plugin.define({
  id: 'strip-coauthor',
  async setup(ctx) {
    await ctx.tool.hook('execute.before', (event) => {
      if (event.tool !== 'shell') return;

      const input = event.input;
      if (!input || typeof input !== 'object') return;

      const command = input.command;
      if (typeof command !== 'string') return;

      const { command: next, stripped } = rewriteGitCommitCommand(command);
      if (!stripped) return;

      // Mutate in place and reassign: opencode reads `event.input` back after
      // the hook, so either contract carries the rewrite.
      input.command = next;
      event.input = input;
      console.log('[strip-coauthor] removed Co-authored-by trailer from git commit command');
    });
  },
});
