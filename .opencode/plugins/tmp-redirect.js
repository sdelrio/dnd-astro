import fs from 'node:fs';
import path from 'node:path';

import { bashReferencesTmp, rewriteTmpPath, TMP_BASH_ERROR } from '../lib/tmp-redirect.js';

export const TmpRedirect = async ({ directory, worktree } = {}) => {
  const repoRoot = worktree || directory || process.cwd();

  return {
    'tool.execute.before': async (input, output) => {
      const tool = input?.tool;
      const args = output?.args;
      if (!args || typeof args !== 'object') return;

      if (tool === 'bash') {
        const command = args.command;
        if (typeof command === 'string' && bashReferencesTmp(command)) {
          throw new Error(TMP_BASH_ERROR);
        }
        return;
      }

      if (tool !== 'write' && tool !== 'edit') return;

      const filePath = args.filePath;
      if (typeof filePath !== 'string') return;

      const { path: nextPath, redirected } = rewriteTmpPath(filePath, repoRoot);
      if (!redirected) return;

      fs.mkdirSync(path.dirname(nextPath), { recursive: true });
      args.filePath = nextPath;
      console.log(`[tmp-redirect] ${filePath} -> ${nextPath}`);
    },
  };
};
