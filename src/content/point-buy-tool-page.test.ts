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

  it('carries the full point buy rules so it stands on its own', () => {
    expect(pageSource).toContain('27 points');
    expect(pageSource).toContain('8');
    expect(pageSource).toContain('15');
    expect(pageSource).toMatch(/\| 8\s+\| 0\s+\|/);
    expect(pageSource).toMatch(/\| 14\s+\| 7\s+\|/);
    expect(pageSource).toMatch(/\| 15\s+\| 9\s+\|/);
  });

  it('nests its headings under the title the template renders, skipping no level', () => {
    expect(pageSource).toContain('## Point Buy Rules');
    expect(pageSource).toContain('### Cost of Ability Scores');
    expect(pageSource).not.toMatch(/^####\s/m);
  });
});
