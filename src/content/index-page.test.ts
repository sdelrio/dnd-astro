import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexSource = readFileSync(join(__dirname, '../content/docs/index.mdx'), 'utf8');

describe('Companion index page', () => {
  it('links the Rules list Character Creation item to the page', () => {
    expect(indexSource).toContain(
      '<strong><a href="/dnd/character-creation/">Character Creation</a></strong>'
    );
  });

  it('adds a secondary Character Creation button to the top action row', () => {
    const buttonPattern =
      /<LinkButton href="\/dnd\/character-creation\/" variant="secondary">\s*<IconifyIcon icon="mdi:account-plus" width="1\.5em" \/>\s*Character Creation\s*<\/LinkButton>/;

    expect(indexSource).toMatch(buttonPattern);
    expect(indexSource.match(new RegExp(buttonPattern.source, 'g'))).toHaveLength(1);
  });
});
