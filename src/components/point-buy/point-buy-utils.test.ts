import { describe, it, expect } from 'vitest';
import {
  ABILITY_NAMES,
  MIN_SCORE,
  MAX_SCORE,
  POINT_BUY_POOL,
  SCORE_COSTS,
  getScoreCost,
  createDefaultScores,
  resetScores,
  pointsSpent,
  pointsRemaining,
  canIncrease,
  canDecrease,
  calculateModifier,
  formatModifier,
  type Scores,
} from './point-buy-utils';
import {
  calculateModifier as diceCalculateModifier,
  formatModifier as diceFormatModifier,
} from '../dice-roller/dice-utils';

describe('constants', () => {
  it('lists the six abilities in the Dice Roller order', () => {
    expect(ABILITY_NAMES).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  });

  it('defines the minimum, maximum and pool', () => {
    expect(MIN_SCORE).toBe(8);
    expect(MAX_SCORE).toBe(15);
    expect(POINT_BUY_POOL).toBe(27);
  });

  it('defines the standard 5e cost table', () => {
    expect(SCORE_COSTS).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
  });
});

describe('getScoreCost', () => {
  it('returns the documented cost for each score', () => {
    expect(getScoreCost(8)).toBe(0);
    expect(getScoreCost(9)).toBe(1);
    expect(getScoreCost(10)).toBe(2);
    expect(getScoreCost(11)).toBe(3);
    expect(getScoreCost(12)).toBe(4);
    expect(getScoreCost(13)).toBe(5);
    expect(getScoreCost(14)).toBe(7);
    expect(getScoreCost(15)).toBe(9);
  });
});

describe('createDefaultScores', () => {
  it('starts every ability at the minimum score', () => {
    expect(createDefaultScores()).toEqual({
      STR: 8,
      DEX: 8,
      CON: 8,
      INT: 8,
      WIS: 8,
      CHA: 8,
    });
  });
});

describe('pointsSpent', () => {
  it('spends 0 for a fresh allocation', () => {
    expect(pointsSpent(createDefaultScores())).toBe(0);
  });

  it('spends the documented 27 for the standard array', () => {
    const scores: Scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    expect(pointsSpent(scores)).toBe(27);
  });

  it('spends 12 for six scores of 10', () => {
    const scores: Scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(pointsSpent(scores)).toBe(12);
  });
});

describe('pointsRemaining', () => {
  it('leaves 27 for a fresh allocation', () => {
    expect(pointsRemaining(createDefaultScores())).toBe(27);
  });

  it('leaves 0 for the standard array', () => {
    const scores: Scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    expect(pointsRemaining(scores)).toBe(0);
  });

  it('leaves 15 for six scores of 10', () => {
    const scores: Scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(pointsRemaining(scores)).toBe(15);
  });
});

describe('canIncrease', () => {
  it('allows increasing a score below the maximum while points remain', () => {
    expect(canIncrease(createDefaultScores(), 'STR')).toBe(true);
  });

  it('blocks increasing a score at the maximum', () => {
    const scores: Scores = { STR: 15, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(canIncrease(scores, 'STR')).toBe(false);
  });

  it('blocks increasing when remaining points cannot cover the next step', () => {
    const scores: Scores = { STR: 15, DEX: 14, CON: 14, INT: 11, WIS: 8, CHA: 8 };
    expect(pointsRemaining(scores)).toBe(1);
    expect(canIncrease(scores, 'DEX')).toBe(false);
    expect(canIncrease(scores, 'INT')).toBe(true);
  });

  it('blocks increasing when the pool is exhausted', () => {
    const scores: Scores = { STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 };
    expect(pointsRemaining(scores)).toBe(0);
    expect(canIncrease(scores, 'INT')).toBe(false);
  });
});

describe('canDecrease', () => {
  it('allows decreasing a score above the minimum', () => {
    const scores: Scores = { STR: 9, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(canDecrease(scores, 'STR')).toBe(true);
  });

  it('blocks decreasing a score at the minimum', () => {
    expect(canDecrease(createDefaultScores(), 'STR')).toBe(false);
  });
});

describe('resetScores', () => {
  it('returns every score to 8 from a dirty allocation', () => {
    const dirty: Scores = { STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 };
    const scores = resetScores(dirty);
    expect(scores).toEqual({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 });
    expect(pointsSpent(scores)).toBe(0);
    expect(pointsRemaining(scores)).toBe(27);
  });

  it('does not mutate the allocation passed in', () => {
    const dirty: Scores = { STR: 15, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    resetScores(dirty);
    expect(dirty.STR).toBe(15);
  });
});

describe('modifier reuse', () => {
  it('re-exports the Dice Roller modifier helpers', () => {
    expect(calculateModifier).toBe(diceCalculateModifier);
    expect(formatModifier).toBe(diceFormatModifier);
  });

  it('computes modifiers for point-buy scores', () => {
    expect(calculateModifier(8)).toBe(-1);
    expect(calculateModifier(15)).toBe(2);
    expect(formatModifier(calculateModifier(8))).toBe('-1');
    expect(formatModifier(calculateModifier(15))).toBe('+2');
  });
});
