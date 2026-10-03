import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import PrintDocument from './PrintDocument.astro';

/**
 * The shell every printed document is rendered into.
 *
 * Two things are asserted here that cannot be asserted anywhere else. The first
 * is that the document carries no JavaScript at all: ADR-0020 requires the
 * committed route to be inert HTML, because the artifact must not be a page
 * that runs code a reader could run, and the sheet assignment the generator
 * needs is injected at document start instead. The second is that the
 * document is styled by the site's own stylesheets rather than by a stylesheet
 * written for print, which is the whole of what "the Handbook looks like the
 * site" means.
 */

const shellSource = readFileSync(new URL('./PrintDocument.astro', import.meta.url), 'utf8');

async function render(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(PrintDocument, {
    slots: { default: '<section data-handbook-source="dnd/injuries"><h1>Lingering Injuries</h1></section>' },
  });
}

describe('print document shell', () => {
  it('ships no client-side JavaScript', async () => {
    expect(await render()).not.toMatch(/<script/);
  });

  it('ships no client island', async () => {
    expect(await render()).not.toMatch(/<astro-island/);
  });

  it('carries no site chrome, so a sheet is the rule and nothing else', async () => {
    // Only the body: the inlined stylesheet legitimately names a sidebar width,
    // and a stylesheet that has not been rendered is not chrome on the page.
    const body = (await render()).match(/<body>[\s\S]*<\/body>/)?.[0] ?? '';

    // The sidebar, the table of contents, the header and the skip link are the
    // four things a printed page must not have on it.
    for (const chrome of ['<nav', 'sidebar', 'starlight__on-this-page', 'Skip to content']) {
      expect({ chrome, present: body.includes(chrome) }).toEqual({ chrome, present: false });
    }
  });

  it('renders its content in the document body', async () => {
    const html = await render();

    expect(html).toMatch(/<body>[\s\S]*Lingering Injuries[\s\S]*<\/body>/);
  });

  it('is styled by Starlight base css rather than by a print stylesheet of its own', async () => {
    // The content rules have to be on the document: without them the house
    // rules print as unstyled markdown, which is not a Handbook.
    expect(await render()).toContain('.sl-markdown-content');
  });

  it('loads the site stylesheet that carries the vendored faces and the bark ramp', () => {
    expect(shellSource).toMatch(/styles\/tailwind\.css/);
  });

  it('loads the print stylesheet that carries the page geometry', () => {
    expect(shellSource).toMatch(/styles\/handbook-print\.css/);
  });

  it('inlines the base css in the document head, where a stylesheet can apply', async () => {
    const html = await render();
    const head = html.match(/<head>[\s\S]*?<\/head>/)?.[0] ?? '';

    expect(head).toContain('.sl-markdown-content');
  });
});