import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./DiceRoller.astro', import.meta.url), 'utf8');

describe('DiceRoller theme colors', () => {
  it('does not use hardcoded blue utility classes', () => {
    expect(source).not.toMatch(/\bblue-\d+/);
  });

  it('uses the Starlight accent color variables for interactive and highlight elements', () => {
    for (const variable of ['--sl-color-accent', '--sl-color-accent-low', '--sl-color-accent-high']) {
      expect(source).toContain(variable);
    }
  });
});
