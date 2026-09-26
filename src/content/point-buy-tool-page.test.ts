import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSource = readFileSync(join(__dirname, './docs/dnd-tools/point-buy.mdx'), 'utf8');

describe('Point Buy tool page', () => {
  it('declares the source frontmatter without an H1', () => {
    expect(pageSource).toContain('title: Point Buy');
    expect(pageSource).toContain('description: Allocate a 27-point budget across your six ability scores');
    expect(pageSource).toContain('tableOfContents: false');
    expect(pageSource).toContain('order: 2');
    expect(pageSource).not.toMatch(/^# Point Buy$/m);
  });

  it('mounts the shared Point Buy component', () => {
    expect(pageSource).toContain("import PointBuy from '@/components/point-buy/PointBuy.astro';");
    expect(pageSource).toContain('<PointBuy />');
    expect(pageSource).not.toContain('DnDPointBuy');
  });

  it('carries no rules prose: the tool shows every fact the prose restated', () => {
    expect(pageSource).not.toContain('## Point Buy Rules');
    expect(pageSource).not.toContain('### Cost of Ability Scores');
    expect(pageSource).not.toContain('27 points to spend');
    expect(pageSource).not.toContain('Each ability score starts at');
    expect(pageSource).not.toContain('racial bonuses');
    expect(pageSource).not.toContain('Higher scores cost more points');
    expect(pageSource).not.toMatch(/^\|.*\|$/m);
  });

  it('is exactly frontmatter, the import, the intro line and the component', () => {
    const body = pageSource.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

    expect(body.split('\n').map((line) => line.trim()).filter(Boolean)).toEqual([
      "import PointBuy from '@/components/point-buy/PointBuy.astro';",
      'Allocate your ability scores with the standard D&D 5e point buy system.',
      '<PointBuy />',
    ]);
  });

  it('leaves no heading behind, orphan or level-skipping', () => {
    const headings = pageSource.match(/^#{1,6}\s.*$/gm) ?? [];

    expect(headings).toEqual([]);
  });
});
