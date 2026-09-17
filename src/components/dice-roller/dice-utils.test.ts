import { describe, it, expect } from 'vitest';
import { rollDie, rollDice, rollAbility, getTopThreeIndices, calculateModifier, formatModifier, updateAbilityWithRoll, calculateStats, formatStats, formatResultLog, swapAbilities, type Ability } from './dice-utils';

describe('rollDie', () => {
  it('returns a number between 1 and sides', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it('defaults to 6 sides', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDie();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });
});

describe('rollDice', () => {
  it('returns array of correct length', () => {
    const result = rollDice(4, 6);
    expect(result).toHaveLength(4);
  });

  it('each value is between 1 and sides', () => {
    const result = rollDice(4, 6);
    result.forEach((die) => {
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    });
  });
});

describe('rollAbility', () => {
  it('returns object with correct shape', () => {
    const result = rollAbility();
    expect(result).toHaveProperty('dice');
    expect(result).toHaveProperty('sorted');
    expect(result).toHaveProperty('topThree');
    expect(result).toHaveProperty('sum');
  });

  it('dice array has 4 elements', () => {
    const result = rollAbility();
    expect(result.dice).toHaveLength(4);
  });

  it('sorted array is dice sorted descending', () => {
    const result = rollAbility();
    const expectedSorted = [...result.dice].sort((a, b) => b - a);
    expect(result.sorted).toEqual(expectedSorted);
  });

  it('topThree contains the three highest values', () => {
    const result = rollAbility();
    expect(result.topThree).toHaveLength(3);
    expect(result.topThree).toEqual(result.sorted.slice(0, 3));
  });

  it('sum equals sum of topThree', () => {
    const result = rollAbility();
    const expectedSum = result.topThree.reduce((a, b) => a + b, 0);
    expect(result.sum).toBe(expectedSum);
  });

  it('topThreeIndices contains exactly 3 indices', () => {
    const result = rollAbility();
    expect(result.topThreeIndices).toHaveLength(3);
  });

  it('topThreeIndices are valid indices into dice array', () => {
    const result = rollAbility();
    result.topThreeIndices.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    });
  });

  it('topThreeIndices correspond to the three highest dice values', () => {
    const result = rollAbility();
    const droppedValues = result.dice.filter((_, i) => !result.topThreeIndices.includes(i));
    const keptValues = result.topThreeIndices.map((i) => result.dice[i]);
    const sortedKept = [...keptValues].sort((a, b) => b - a);
    const sortedAll = [...result.dice].sort((a, b) => b - a);
    expect(sortedKept).toEqual(sortedAll.slice(0, 3));
    expect(droppedValues).toHaveLength(1);
    expect(sortedAll[3]).toBe(droppedValues[0]);
  });
});

describe('getTopThreeIndices', () => {
  it('returns indices of the three highest values', () => {
    const indices = getTopThreeIndices([6, 5, 4, 3]);
    expect(indices).toHaveLength(3);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('handles duplicate lowest values', () => {
    const indices = getTopThreeIndices([2, 6, 2, 2]);
    expect(indices).toHaveLength(3);
    const keptValues = indices.map((i) => [2, 6, 2, 2][i]);
    expect(keptValues.sort((a, b) => b - a)).toEqual([6, 2, 2]);
  });

  it('handles all same values', () => {
    const indices = getTopThreeIndices([3, 3, 3, 3]);
    expect(indices).toHaveLength(3);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('returns sorted indices', () => {
    const indices = getTopThreeIndices([1, 4, 2, 3]);
    expect(indices).toEqual([1, 2, 3]);
  });
});

describe('calculateModifier', () => {
  it('returns correct D&D 5e modifier', () => {
    expect(calculateModifier(1)).toBe(-5);
    expect(calculateModifier(2)).toBe(-4);
    expect(calculateModifier(3)).toBe(-4);
    expect(calculateModifier(4)).toBe(-3);
    expect(calculateModifier(10)).toBe(0);
    expect(calculateModifier(11)).toBe(0);
    expect(calculateModifier(12)).toBe(1);
    expect(calculateModifier(16)).toBe(3);
    expect(calculateModifier(20)).toBe(5);
    expect(calculateModifier(30)).toBe(10);
  });
});

describe('formatModifier', () => {
  it('formats positive modifier with + prefix', () => {
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(0)).toBe('+0');
  });

  it('formats negative modifier without + prefix', () => {
    expect(formatModifier(-1)).toBe('-1');
    expect(formatModifier(-5)).toBe('-5');
  });
});

describe('updateAbilityWithRoll', () => {
  it('updates ability with roll result', () => {
    const ability = {
      name: 'STR',
      dice: [],
      topThree: [],
      topThreeIndices: [],
      sum: 0,
      modifier: 0,
      rolling: true,
    };
    
    const result = {
      dice: [6, 5, 4, 3],
      sorted: [6, 5, 4, 3],
      topThree: [6, 5, 4],
      topThreeIndices: [0, 1, 2],
      sum: 15,
    };
    
    const updated = updateAbilityWithRoll(ability, result);
    
    expect(updated.dice).toEqual([6, 5, 4, 3]);
    expect(updated.topThree).toEqual([6, 5, 4]);
    expect(updated.topThreeIndices).toEqual([0, 1, 2]);
    expect(updated.sum).toBe(15);
    expect(updated.modifier).toBe(2); // floor((15-10)/2) = 2
    expect(updated.rolling).toBe(false);
    expect(updated.name).toBe('STR');
  });
});

describe('calculateStats', () => {
  it('computes average rounded to 1 decimal', () => {
    const stats = calculateStats([10, 12, 14, 16]);
    expect(stats.average).toBe(13.0);
  });

  it('computes average with rounding', () => {
    const stats = calculateStats([10, 11, 13]);
    expect(stats.average).toBe(11.3);
  });

  it('computes median for odd count', () => {
    const stats = calculateStats([10, 12, 14]);
    expect(stats.median).toBe(12);
  });

  it('computes median for even count', () => {
    const stats = calculateStats([10, 12, 14, 16]);
    expect(stats.median).toBe(13);
  });

  it('returns lowest with count', () => {
    const stats = calculateStats([8, 10, 10, 12]);
    expect(stats.lowest).toEqual({ value: 8, count: 1 });
  });

  it('returns highest with count', () => {
    const stats = calculateStats([8, 10, 10, 12]);
    expect(stats.highest).toEqual({ value: 12, count: 1 });
  });

  it('handles single element', () => {
    const stats = calculateStats([15]);
    expect(stats.average).toBe(15.0);
    expect(stats.median).toBe(15);
    expect(stats.lowest).toEqual({ value: 15, count: 1 });
    expect(stats.highest).toEqual({ value: 15, count: 1 });
  });

  it('handles all same values', () => {
    const stats = calculateStats([10, 10, 10]);
    expect(stats.average).toBe(10.0);
    expect(stats.median).toBe(10);
    expect(stats.lowest).toEqual({ value: 10, count: 3 });
    expect(stats.highest).toEqual({ value: 10, count: 3 });
  });

  it('handles unsorted input', () => {
    const stats = calculateStats([16, 8, 12, 10]);
    expect(stats.average).toBe(11.5);
    expect(stats.median).toBe(11);
    expect(stats.lowest).toEqual({ value: 8, count: 1 });
    expect(stats.highest).toEqual({ value: 16, count: 1 });
  });
});

describe('formatStats', () => {
  it('formats average to one decimal', () => {
    const stats = calculateStats([10, 12, 14]);
    const formatted = formatStats(stats);
    expect(formatted.average).toBe('12.0');
  });

  it('formats median as integer when whole number', () => {
    const stats = calculateStats([10, 12, 14]);
    const formatted = formatStats(stats);
    expect(formatted.median).toBe('12');
  });

  it('formats median with decimal when needed', () => {
    const stats = calculateStats([10, 12, 14, 16]);
    const formatted = formatStats(stats);
    expect(formatted.median).toBe('13');
  });

  it('formats lowest with count', () => {
    const stats = calculateStats([8, 10, 10, 12]);
    const formatted = formatStats(stats);
    expect(formatted.lowest).toBe('8');
  });

  it('formats highest with count', () => {
    const stats = calculateStats([8, 10, 10, 12]);
    const formatted = formatStats(stats);
    expect(formatted.highest).toBe('12');
  });

  it('formats all same values', () => {
    const stats = calculateStats([10, 10, 10]);
    const formatted = formatStats(stats);
    expect(formatted.average).toBe('10.0');
    expect(formatted.median).toBe('10');
    expect(formatted.lowest).toBe('10');
    expect(formatted.highest).toBe('10');
  });
});

describe('formatResultLog', () => {
  it('formats abilities into comma-separated string', () => {
    const abilities = [
      { name: 'STR', sum: 15, modifier: 2 },
      { name: 'DEX', sum: 12, modifier: 1 },
    ];
    expect(formatResultLog(abilities)).toBe('STR 15 (+2), DEX 12 (+1)');
  });

  it('formats all six abilities', () => {
    const abilities = [
      { name: 'STR', sum: 15, modifier: 2 },
      { name: 'DEX', sum: 12, modifier: 1 },
      { name: 'CON', sum: 14, modifier: 2 },
      { name: 'INT', sum: 10, modifier: 0 },
      { name: 'WIS', sum: 13, modifier: 1 },
      { name: 'CHA', sum: 11, modifier: 0 },
    ];
    const result = formatResultLog(abilities);
    expect(result).toBe('STR 15 (+2), DEX 12 (+1), CON 14 (+2), INT 10 (+0), WIS 13 (+1), CHA 11 (+0)');
  });

  it('handles zero modifier', () => {
    const abilities = [{ name: 'INT', sum: 10, modifier: 0 }];
    expect(formatResultLog(abilities)).toBe('INT 10 (+0)');
  });

  it('handles negative modifier', () => {
    const abilities = [{ name: 'STR', sum: 7, modifier: -2 }];
    expect(formatResultLog(abilities)).toBe('STR 7 (-2)');
  });
});

describe('swapAbilities', () => {
  const makeAbility = (name: string, sum: number, modifier: number): Ability => ({
    name,
    dice: [6, 5, 4, 3],
    topThree: [6, 5, 4],
    topThreeIndices: [0, 1, 2],
    sum,
    modifier,
    rolling: false,
  });

  it('swaps scores between two abilities', () => {
    const abilities = [
      makeAbility('STR', 15, 2),
      makeAbility('DEX', 12, 1),
    ];
    const result = swapAbilities(abilities, 0, 1);
    expect(result[0].name).toBe('STR');
    expect(result[0].sum).toBe(12);
    expect(result[0].modifier).toBe(1);
    expect(result[1].name).toBe('DEX');
    expect(result[1].sum).toBe(15);
    expect(result[1].modifier).toBe(2);
  });

  it('preserves names in original positions', () => {
    const abilities = [
      makeAbility('STR', 15, 2),
      makeAbility('DEX', 12, 1),
      makeAbility('CON', 14, 2),
    ];
    const result = swapAbilities(abilities, 0, 2);
    expect(result[0].name).toBe('STR');
    expect(result[2].name).toBe('CON');
  });

  it('does not mutate original array', () => {
    const abilities = [
      makeAbility('STR', 15, 2),
      makeAbility('DEX', 12, 1),
    ];
    swapAbilities(abilities, 0, 1);
    expect(abilities[0].sum).toBe(15);
    expect(abilities[1].sum).toBe(12);
  });

  it('swaps dice and topThree arrays', () => {
    const abilities = [
      { ...makeAbility('STR', 15, 2), dice: [6, 5, 4, 3], topThree: [6, 5, 4], topThreeIndices: [0, 1, 2] },
      { ...makeAbility('DEX', 12, 1), dice: [4, 4, 3, 1], topThree: [4, 4, 3], topThreeIndices: [0, 1, 2] },
    ];
    const result = swapAbilities(abilities, 0, 1);
    expect(result[0].dice).toEqual([4, 4, 3, 1]);
    expect(result[0].topThree).toEqual([4, 4, 3]);
    expect(result[1].dice).toEqual([6, 5, 4, 3]);
    expect(result[1].topThree).toEqual([6, 5, 4]);
  });

  it('handles swapping same index (no-op)', () => {
    const abilities = [
      makeAbility('STR', 15, 2),
      makeAbility('DEX', 12, 1),
    ];
    const result = swapAbilities(abilities, 0, 0);
    expect(result[0].sum).toBe(15);
    expect(result[1].sum).toBe(12);
  });

  it('handles swapping non-adjacent indices', () => {
    const abilities = [
      makeAbility('STR', 15, 2),
      makeAbility('DEX', 12, 1),
      makeAbility('CON', 14, 2),
      makeAbility('INT', 10, 0),
      makeAbility('WIS', 13, 1),
      makeAbility('CHA', 11, 0),
    ];
    const result = swapAbilities(abilities, 0, 5);
    expect(result[0].name).toBe('STR');
    expect(result[0].sum).toBe(11);
    expect(result[5].name).toBe('CHA');
    expect(result[5].sum).toBe(15);
  });
});
