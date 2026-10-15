import fs from 'node:fs';
import path from 'node:path';

import { Plugin } from '@opencode/plugin';

import { bashReferencesTmp, rewriteTmpPath, TMP_BASH_ERROR } from '../lib/tmp-redirect.js';

/**
 * Project plugin: keep scratch files inside the repo, never in `/tmp`.
 *
 * Refuses shell commands that reference `/tmp` and redirects `write`/`edit`
 * targets under `/tmp` into the repo-relative `tmp/` directory (see AGENTS.md
 * Temporary Files).
 *
 * opencode V2 renamed the shell tool from `bash` to `shell`, moved the file
 * argument from `filePath` to `path`, and expects a default-exported definition
 * with an `id` and a `setup` function. `ctx.location.project.canonical` is the
 * V2 equivalent of the V1 `worktree` root.
 */
export default Plugin.define({
  id: 'tmp-redirect',
  async setup(ctx) {
    const repoRoot = ctx.location.project.canonical || ctx.location.directory;

    await ctx.tool.hook('execute.before', (event) => {
      const input = event.input;
      if (!input || typeof input !== 'object') return;

      if (event.tool === 'shell') {
        const command = input.command;
        if (typeof command === 'string' && bashReferencesTmp(command)) {
          throw new Error(TMP_BASH_ERROR);
        }
        return;
      }

      if (event.tool !== 'write' && event.tool !== 'edit') return;

      const filePath = input.path;
      if (typeof filePath !== 'string') return;

      const { path: nextPath, redirected } = rewriteTmpPath(filePath, repoRoot);
      if (!redirected) return;

      fs.mkdirSync(path.dirname(nextPath), { recursive: true });
      // Mutate in place and reassign: opencode reads `event.input` back after
      // the hook, so either contract carries the rewrite.
      input.path = nextPath;
      event.input = input;
      console.log(`[tmp-redirect] ${filePath} -> ${nextPath}`);
    });
  },
});
