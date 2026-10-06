import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coerceNumber, roundAverage } from './numeric';
import {
  spellSaveDc,
  spellAttackBonus,
  resolveCastingAbility,
} from '@/components/xml-viewer/spellcasting-display';
import type { StoredCharacter } from './build-xml-characters';

describe('coerceNumber', () => {
  it('reads a plain number string', () => {
    expect(coerceNumber('19')).toBe(19);
  });

  it('reads a thousand-separated total as the number it writes', () => {
    expect(coerceNumber('1,000')).toBe(1000);
  });

  it('reads a signed encoded value', () => {
    expect(coerceNumber('+3')).toBe(3);
    expect(coerceNumber('-2')).toBe(-2);
  });

  it('falls back on a junk string', () => {
    expect(coerceNumber('abc')).toBe(0);
  });

  it('falls back on an exponential literal that overflows', () => {
    expect(coerceNumber('1e999')).toBe(0);
  });

  it('falls back on an empty or absent value', () => {
    expect(coerceNumber('')).toBe(0);
    expect(coerceNumber(undefined)).toBe(0);
    expect(coerceNumber(null)).toBe(0);
  });

  it('falls back on a real number that is not finite', () => {
    expect(coerceNumber(NaN)).toBe(0);
    expect(coerceNumber(Infinity)).toBe(0);
  });

  it('falls back on a number that overflows to Infinity', () => {
    expect(coerceNumber(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('uses the fallback it was given rather than always zero', () => {
    expect(coerceNumber('abc', 1)).toBe(1);
    expect(coerceNumber('', 1)).toBe(1);
  });

  it('never returns NaN or Infinity for any junk input', () => {
    for (const junk of ['abc', '1e999', '', ' ', '--', 'NaN', 'Infinity', '1,0,0,0']) {
      expect(Number.isFinite(coerceNumber(junk))).toBe(true);
    }
  });

  it('never returns a non-finite number when handed a number', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(Number.isFinite(coerceNumber(value))).toBe(true);
    }
  });
});

describe('roundAverage', () => {
  it('rounds a mean to the nearest integer', () => {
    expect(roundAverage(51, 3)).toBe(17);
    expect(roundAverage(47, 3)).toBe(16);
  });

  it('returns positive zero for a mean that rounds to negative zero', () => {
    const rounded = roundAverage(-1, 3);
    expect(rounded).toBe(0);
    expect(Object.is(rounded, -0)).toBe(false);
  });

  it('returns zero for no members', () => {
    expect(Object.is(roundAverage(0, 0), -0)).toBe(false);
    expect(roundAverage(0, 0)).toBe(0);
  });

  it('keeps a genuine negative average negative', () => {
    expect(roundAverage(-8, 2)).toBe(-4);
  });
});

/**
 * The corpus-wide guard from #448: no numeric field of any committed sheet may
 * read as non-finite, and no Spellcasting plate may print a non-finite number.
 *
 * Every other test here builds its own junk, so all of them are satisfied by a
 * coercion that is correct about the junk they name and unguarded about the rest.
 * The defect this replaces lives in the corpus's twenty numeric reads, so the
 * assertion is made over the real roster on disk rather than over fixtures.
 */
const roster: StoredCharacter[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src/generated/characters.json'), 'utf8')
);

/** Every numeric leaf of a character, named by path so a failure names the field. */
function numericLeaves(value: unknown, path = 'character'): string[] {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? [] : [path];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => numericLeaves(entry, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      numericLeaves(entry, `${path}.${key}`)
    );
  }
  return [];
}

describe('the corpus numeric invariant from #448', () => {
  it('reads a roster, or the guards below it are vacuous', () => {
    expect(roster.length).toBeGreaterThan(100);
  });

  it('reads no non-finite numeric field of any committed sheet', () => {
    const offenders = roster.flatMap((character) => numericLeaves(character, character.filename));
    expect(offenders).toEqual([]);
  });

  it('prints a finite Save DC and attack bonus for every corpus character', () => {
    const nonFinite = roster
      .flatMap((character) => {
        const { modifier } = resolveCastingAbility(
          character.classes ?? [],
          character.abilities ?? {}
        );
        const profBonus = coerceNumber(character.profBonus);
        return [
          { name: character.filename, value: spellSaveDc(profBonus, modifier) },
          { name: character.filename, value: spellAttackBonus(profBonus, modifier) },
        ];
      })
      .filter((entry) => !Number.isFinite(entry.value));
    expect(nonFinite).toEqual([]);
  });
});