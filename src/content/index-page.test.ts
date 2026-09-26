import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexSource = readFileSync(join(__dirname, '../content/docs/index.mdx'), 'utf8');
const astroConfig = readFileSync(join(__dirname, '../../astro.config.mjs'), 'utf8');

describe('Companion index page', () => {
  it('links the Rules list Character Creation item to the page', () => {
    expect(indexSource).toContain(
      '<strong><a href="/dnd/character-creation/">Character Creation</a></strong>'
    );
  });

  it('links the Tools list Point Buy item to the tool page', () => {
    expect(indexSource).toContain('<strong><a href="/dnd-tools/point-buy/">Point Buy</a></strong>');
    // The action button row stays as it was; Point Buy is listed, not promoted to a button.
    expect(indexSource).not.toMatch(/<LinkButton href="\/dnd-tools\/point-buy\/"/);
  });

  it('adds a secondary Character Creation button to the top action row', () => {
    const buttonPattern =
      /<LinkButton href="\/dnd\/character-creation\/" variant="secondary">\s*<IconifyIcon icon="mdi:account-plus" width="1\.5em" \/>\s*Character Creation\s*<\/LinkButton>/;

    expect(indexSource).toMatch(buttonPattern);
    expect(indexSource.match(new RegExp(buttonPattern.source, 'g'))).toHaveLength(1);
  });

  it('has no unlinked tool placeholder entries', () => {
    const strongWithoutLink = /<strong>(?!<a\b)[^<]+<\/strong>/g;
    expect(indexSource.match(strongWithoutLink)).toBeNull();
  });

  it('points the Starlight GitHub social link at this repository', () => {
    expect(astroConfig).toContain(
      "{ icon: 'github', label: 'GitHub', href: 'https://github.com/sdelrio/dnd-astro' }"
    );
    expect(astroConfig).not.toContain('https://github.com/withastro/starlight');
  });
});
