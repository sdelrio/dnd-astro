import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The content collection directory, stated once.
 *
 * Every page the site publishes is under it, and a guard that walks it and a
 * guard that checks what it holds are talking about the same place rather than
 * two paths that can drift apart.
 */
export const CONTENT_ROOT = join(__dirname, '../content/docs');

/**
 * The one kind of file the content directory holds that is not a route.
 *
 * Astro reads a leading underscore as a partial: `_markdown-impactful.mdx` is
 * shared prose a page includes, never a page of its own. This is the single
 * statement of the rule. The guards that enumerate content pages skip a leading
 * underscore by calling `isPartial` and by nothing else, so the exception cannot
 * drift from one guard to the next.
 */
export function isPartial(name: string): boolean {
  return name.startsWith('_');
}

/**
 * Every content page under `root`, recursively, as absolute paths.
 *
 * A page is a `.md`/`.mdx` file that is not a partial. `statSync` follows
 * symlinks, so a dangling one throws and is skipped rather than read.
 */
export function contentPageFiles(root: string = CONTENT_ROOT): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = join(root, entry.name);

    if (entry.isDirectory()) {
      return contentPageFiles(full);
    }

    if (!/\.(md|mdx)$/.test(entry.name) || isPartial(entry.name)) {
      return [];
    }

    try {
      return statSync(full).isFile() ? [full] : [];
    } catch {
      return [];
    }
  });
}
