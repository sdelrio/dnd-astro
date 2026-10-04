import { rewriteGitCommitCommand } from '../lib/strip-coauthor.js';

/**
 * Project plugin: keep Co-authored-by trailers out of commits.
 *
 * Rewrites `git commit` bash commands so any `Co-authored-by` / `Co-Authored-By`
 * line is dropped from `-m` arguments before the command runs. opencode has no
 * schema key for this, so the enforcement lives here (auto-loaded from
 * `.opencode/plugins/`).
 */
export const StripCoauthor = async () => {
  return {
    'tool.execute.before': async (input, output) => {
      const tool = input?.tool;
      const args = output?.args;
      if (!args || typeof args !== 'object') return;
      if (tool !== 'bash') return;

      const command = args.command;
      if (typeof command !== 'string') return;

      const { command: next, stripped } = rewriteGitCommitCommand(command);
      if (!stripped) return;

      args.command = next;
      console.log('[strip-coauthor] removed Co-authored-by trailer from git commit command');
    },
  };
};
