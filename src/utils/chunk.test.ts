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

  it('emits an empty trailing column when there are more columns than rows', () => {
    // The card tables ask for two columns; a character with one proficient save
    // still gets the second, empty, rather than a malformed grid.
    expect(chunk(['a'], 2)).toEqual([['a'], []]);
  });

  it('degrades to one column rather than an empty list for a bad count', () => {
    expect(chunk(['a', 'b'], 0)).toEqual([['a', 'b']]);
  });
});
