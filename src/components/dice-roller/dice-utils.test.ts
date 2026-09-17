import { describe, it, expect } from 'vitest';
import { rollDie, rollDice, rollAbility, calculateModifier, formatModifier, updateAbilityWithRoll, calculateStats, formatResultLog } from './dice-utils';

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
      sum: 0,
      modifier: 0,
      rolling: true,
    };
    
    const result = {
      dice: [6, 5, 4, 3],
      sorted: [6, 5, 4, 3],
      topThree: [6, 5, 4],
      sum: 15,
    };
    
    const updated = updateAbilityWithRoll(ability, result);
    
    expect(updated.dice).toEqual([6, 5, 4, 3]);
    expect(updated.topThree).toEqual([6, 5, 4]);
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
