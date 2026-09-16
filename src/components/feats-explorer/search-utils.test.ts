import { describe, it, expect } from 'vitest';
import { levenshtein, fuzzyMatch } from './search-utils';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('calculates correct distance for single character changes', () => {
    expect(levenshtein('hello', 'helo')).toBe(1);
    expect(levenshtein('hello', 'helllo')).toBe(1);
    expect(levenshtein('hello', 'hxllo')).toBe(1);
  });

  it('calculates correct distance for multiple changes', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('saturday', 'sunday')).toBe(3);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'hello')).toBe(5);
    expect(levenshtein('hello', '')).toBe(5);
    expect(levenshtein('', '')).toBe(0);
  });
});

describe('fuzzyMatch', () => {
  it('returns true for empty query', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true);
  });

  it('performs case-insensitive substring match', () => {
    expect(fuzzyMatch('alert', 'Alert')).toBe(true);
    expect(fuzzyMatch('ALERT', 'alert')).toBe(true);
    expect(fuzzyMatch('ert', 'Alert')).toBe(true);
  });

  it('performs fuzzy match with tolerance', () => {
    // "alrt" is close to "alert" (distance 1)
    expect(fuzzyMatch('alrt', 'Alert')).toBe(true);
    // "alerty" is close to "alert" (distance 1)
    expect(fuzzyMatch('alerty', 'Alert')).toBe(true);
  });

  it('rejects non-matching strings', () => {
    expect(fuzzyMatch('xyz', 'Alert')).toBe(false);
  });

  it('handles long queries with appropriate tolerance', () => {
    // "fighter" is 7 chars, tolerance = floor(7/3) = 2
    // "fighter" vs "Fighter" should match (substring)
    expect(fuzzyMatch('fighter', 'Fighter')).toBe(true);
    // "fghter" is distance 1 from "fighter"
    expect(fuzzyMatch('fghter', 'Fighter')).toBe(true);
  });
});
