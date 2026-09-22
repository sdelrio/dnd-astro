import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSource = readFileSync(
  join(__dirname, '../content/docs/fantasy-grounds/fg-effects.mdx'),
  'utf8'
);

describe('FG Effects page', () => {
  it('declares the source frontmatter without an H1 or hidden sidebar', () => {
    expect(pageSource).toContain('title: Fantasy Grounds Effects');
    expect(pageSource).toContain(
      'description: Automation effects, conditional operators, and macros for the Fantasy Grounds BCE Gold extension.'
    );
    expect(pageSource).toContain('tags: [fantasy-grounds, fg-effects, bce, automation, dnd]');
    expect(pageSource).not.toMatch(/^# Fantasy Grounds Effects$/m);
    expect(pageSource).not.toMatch(/^sidebar:/m);
    expect(pageSource).not.toMatch(/^\s+hidden: true$/m);
  });

  it('uses the local IconifyIcon component for the PDF download', () => {
    expect(pageSource).toContain("import IconifyIcon from '@/components/IconifyIcon.astro';");
    expect(pageSource).toContain('<IconifyIcon icon="mdi:download" width="1.25em" />');
    expect(pageSource).not.toContain('@iconify/react');
    expect(pageSource).not.toContain('material-symbols:download');
  });

  it('preserves every source section', () => {
    expect(pageSource).toContain('## BCE Gold');
    expect(pageSource).toContain('### Important Tips');
    expect(pageSource).toContain('## Larger Than Life Feat');
    expect(pageSource).toContain('## Attack & Damage Differentiation');
    expect(pageSource).toContain('## Ongoing Saves & Effects');
    expect(pageSource).toContain('## Macros (Automatic Scaling)');
    expect(pageSource).toContain('## Conditional Operators (If/Then Logic)');
    expect(pageSource).toContain('## Special Utility Tags');
  });

  it('preserves effect strings byte-exact', () => {
    expect(pageSource).toContain('`LTL_Tracker; EXPIREADD: LTL_Heal; RESTS`');
    expect(pageSource).toContain('`LTL_Heal; TREGENA: 5; EXPIREADD: LTL_Tracker`');
    expect(pageSource).toContain('`ATK: 10, spell`');
    expect(pageSource).toContain('`ATK: 2, weapon, melee`');
    expect(pageSource).toContain('`RESIST: all, spell`');
    expect(pageSource).toContain(
      '`SAVEST: wisdom; SaveDamage: 1d6 poison; SaveAd: Poisoned`'
    );
    expect(pageSource).toContain('`Tick; ExpireAdd: Talk`');
    expect(pageSource).toContain('`SAVE: [SAVEDC] wisdom`');
    expect(pageSource).toContain('`STR: [19-STR]`');
    expect(pageSource).toContain('`ATK: [PRF]`');
    expect(pageSource).toContain('`IFT: TYPE(humanoid); ATK: 2`');
    expect(pageSource).toContain('`IF: !CUSTOM(Sneak Attack); ATK: 10`');
    expect(pageSource).toContain('`IF: RANGE(5); IFT: ADJ(enemy); ADVATK`');
    expect(pageSource).toContain('`IFT: CR(<=.25); Destroy`');
    expect(pageSource).toContain('`Immune: CUSTOM(Frightened)`');
  });

  it('keeps supported admonitions with bracketed titles', () => {
    expect(pageSource).toContain(':::note[Effect Naming]');
    expect(pageSource).not.toMatch(/^:::(note|tip|caution|danger) [^[]/m);
    expect(pageSource).not.toMatch(/^:::info/m);
    expect(pageSource).not.toMatch(/^:::warning/m);
  });

  it('keeps the Mermaid sequence diagram and the native details block', () => {
    expect(pageSource).toContain('<details>');
    expect(pageSource).toContain('<summary>Click to expand</summary>');
    expect(pageSource).toContain('```mermaid');
    expect(pageSource).toContain('sequenceDiagram');
    expect(pageSource).toContain('LTLT->>LTLH: EXPIREADD: LTL_Heal');
    expect(pageSource).toContain('</details>');
  });
});
