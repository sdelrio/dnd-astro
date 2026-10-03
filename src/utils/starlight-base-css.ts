/**
 * The Starlight stylesheets the print routes load, and the one they do not.
 *
 * The Handbook prints the house rules with the site's own fonts, colours and
 * spacing, which is only true if it loads the stylesheets the house-rule pages
 * load. A print route is not a Starlight page - it has no sidebar, no table of
 * contents and no navigation - so it cannot use `StarlightPage`, and it cannot
 * import the package's stylesheets by name either: the only one Starlight
 * exports is `markdown.css`, and the rest are internal. Reading them out of the
 * installed package at build time keeps the print document on the same CSS as
 * the website, whatever version is installed, with nothing copied into this
 * repository to drift.
 *
 * Zero dependencies, like the rest of the browser tooling, and nothing here
 * enters the build: this is a build-time read of files an install already put
 * there. See ADR-0020.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The stylesheets `Page.astro` loads, minus the ones about page chrome.
 *
 * `layers.css` first because it declares the cascade layer order the others are
 * written in. `props.css`, `reset.css`, `asides.css` and `util.css` are the
 * tokens, the reset, the admonitions the house rules use and the utility
 * classes markdown can reach for. `markdown.css` is last for the same reason
 * Starlight's own shell has it last: it arrives through `MarkdownContent`, and
 * the site's stylesheet, loaded outside these layers, overrides it either way.
 *
 * `anchor-links.css` is absent because it styles the heading anchor links a
 * reader cannot click on paper, and `print.css` is absent on purpose - see the
 * module comment.
 */
export const STARLIGHT_BASE_STYLESHEETS = [
  'layers.css',
  'props.css',
  'reset.css',
  'asides.css',
  'util.css',
  'markdown.css',
] as const;

/**
 * Where the installed package keeps its stylesheets.
 *
 * Resolved from the one stylesheet the package exports, so this works through
 * pnpm's store layout and through a hoisted `node_modules` alike, and without
 * reaching into the package's internals by relative path.
 */
function starlightStyleDirectory(): string {
  return dirname(
    createRequire(import.meta.url).resolve('@astrojs/starlight/style/markdown.css')
  );
}

/**
 * Starlight's base CSS as one string, ready to inline in a print document.
 *
 * A missing stylesheet is a build error naming the file rather than a page that
 * quietly loses its typography, which is what reading an optional file would
 * produce.
 */
export function starlightBaseCss(): string {
  const directory = starlightStyleDirectory();

  return STARLIGHT_BASE_STYLESHEETS.map((file) => {
    const path = join(directory, file);

    try {
      return `/* ${file} */\n${readFileSync(path, 'utf8')}`;
    } catch (cause) {
      throw new Error(
        `Starlight's ${file} was not found at ${path}, so the print document cannot be styled. ` +
          'This usually means the installed Starlight version moved its stylesheets.',
        { cause }
      );
    }
  }).join('\n');
}