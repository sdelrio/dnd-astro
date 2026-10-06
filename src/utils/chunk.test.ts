import { describe, expect, it } from 'vitest';
import { chunk } from './chunk';

describe('chunk', () => {
  it('splits evenly when the length divides', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e', 'f'], 2)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('gives the remainder to the earlier column', () => {
    expect(chunk(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('keeps every element exactly once', () => {
    for (const length of [0, 1, 5, 6, 7, 18]) {
      const list = Array.from({ length }, (_, i) => i);
      const flat = chunk(list, 2).flat();
      expect(flat).toEqual(list);
    }
  });

  it('returns a single column unchanged', () => {
    expect(chunk(['a', 'b'], 1)).toEqual([['a', 'b']]);
  });

  it('drops the trailing empty column when there are fewer rows than columns', () => {
    // The card tables ask for two columns; a one-row list would otherwise get a
    // second table carrying only a header, which is the empty sheet ADR-0016
    // exists to prevent.
    expect(chunk(['a'], 2)).toEqual([['a']]);
  });

  it('returns no columns for an empty list, rather than one per column', () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it('rejects a count below one instead of reinterpreting it as one column', () => {
    expect(() => chunk(['a', 'b'], 0)).toThrow(RangeError);
    expect(() => chunk(['a', 'b'], -1)).toThrow(RangeError);
  });

  it('rejects a count that is not a positive integer', () => {
    for (const count of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => chunk(['a', 'b'], count)).toThrow(RangeError);
    }
  });
});
