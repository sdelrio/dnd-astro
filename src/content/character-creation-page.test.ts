import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSource = readFileSync(join(__dirname, '../content/docs/dnd/character-creation.mdx'), 'utf8');

describe('Character Creation page', () => {
  it('declares the source frontmatter without an H1', () => {
    expect(pageSource).toContain('title: Character Creation');
    expect(pageSource).toContain('description: Character creation selection guide.');
    expect(pageSource).toContain('tags: [character, character-creation, dnd]');
    expect(pageSource).not.toMatch(/^# Character Creation$/m);
  });

  it('mounts the Point Buy and Dice Roller components', () => {
    expect(pageSource).toContain("import PointBuy from '@/components/point-buy/PointBuy.astro';");
    expect(pageSource).toContain(
      "import DiceRoller from '@/components/dice-roller/DiceRoller.astro';"
    );
    expect(pageSource).toContain('<PointBuy />');
    expect(pageSource).toContain('<DiceRoller />');
    expect(pageSource).not.toContain('DnDPointBuy');
    expect(pageSource).not.toContain('StatDiceRoller');
    expect(pageSource).not.toContain('@site/');
  });

  it('preserves the source prose, table, and admonitions', () => {
    expect(pageSource).toContain(
      'The standard array for ability scores is: `15, 14, 13, 12, 10, 8`.'
    );
    expect(pageSource).toContain(
      'Players may discard their rolled ability scores and use the Mulligan array instead: `15, 14, 12, 12, 10, 8`.'
    );
    expect(pageSource).toMatch(/\| 14\s+\| 7\s+\|/);
    expect(pageSource).toMatch(/\| 15\s+\| 9\s+\|/);
    expect(pageSource).toContain(':::tip Fantasy Grounds');
    expect(pageSource).toContain('`/die 4d6k3`');
    expect(pageSource.match(/:::note\[Example\]/g)).toHaveLength(2);
    expect(pageSource).not.toMatch(/^:::info/m);
    expect(pageSource).not.toMatch(/^:::warning/m);
  });

  it('fixes the hit die grammar', () => {
    expect(pageSource).toContain('The character rolls its hit die');
    expect(pageSource).not.toContain('The character roll its hit die');
  });
});
