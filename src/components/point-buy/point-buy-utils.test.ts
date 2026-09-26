import { describe, it, expect } from 'vitest';
import {
  ABILITY_NAMES,
  MIN_SCORE,
  MAX_SCORE,
  POINT_BUY_POOL,
  SCORE_COSTS,
  getScoreCost,
  nextStepCost,
  formatCostLine,
  createDefaultScores,
  resetScores,
  pointsSpent,
  pointsRemaining,
  canIncrease,
  canDecrease,
  increaseScore,
  decreaseScore,
  calculateModifier,
  formatModifier,
  type AbilityName,
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

describe('nextStepCost', () => {
  it('prices the marginal press, not the score', () => {
    // The 5e table is not linear, so the delta is the only number that answers
    // "what does one more cost": 1 per point up to 13, then 2 for each of the
    // last two.
    expect(nextStepCost(8)).toBe(1);
    expect(nextStepCost(12)).toBe(1);
    expect(nextStepCost(13)).toBe(2);
    expect(nextStepCost(14)).toBe(2);
  });

  it('is 0 at the maximum, where there is no next press', () => {
    expect(nextStepCost(MAX_SCORE)).toBe(0);
  });

  it('agrees with the bound it guards', () => {
    // canIncrease refuses a step the pool cannot pay for, and the tile quotes
    // this same number as the price. One helper, so they cannot disagree.
    for (let score = MIN_SCORE; score < MAX_SCORE; score++) {
      const affordable: Scores = { STR: score, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
      const broke: Scores = { ...affordable, DEX: 14, CON: 14, INT: 14 };
      expect(canIncrease(affordable, 'STR')).toBe(true);
      if (pointsRemaining(broke) < nextStepCost(score)) {
        expect(canIncrease(broke, 'STR')).toBe(false);
      }
    }
  });
});

describe('formatCostLine', () => {
  it('carries the score cost and the price of the next press', () => {
    expect(formatCostLine(8)).toBe('Cost 0, next +1');
    expect(formatCostLine(13)).toBe('Cost 5, next +2');
    expect(formatCostLine(14)).toBe('Cost 7, next +2');
  });

  it('says max at the ceiling instead of quoting a price for a press that cannot happen', () => {
    expect(formatCostLine(MAX_SCORE)).toBe('Cost 9, max');
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

describe('increaseScore', () => {
  it('increases the chosen ability by one', () => {
    const scores = increaseScore(createDefaultScores(), 'STR');
    expect(scores.STR).toBe(9);
    expect(pointsSpent(scores)).toBe(1);
  });

  it('leaves the other abilities untouched', () => {
    const scores = increaseScore(createDefaultScores(), 'WIS');
    expect(scores).toEqual({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 9, CHA: 8 });
  });

  it('does not mutate the allocation passed in', () => {
    const before = createDefaultScores();
    increaseScore(before, 'STR');
    expect(before.STR).toBe(8);
  });

  it('returns a new allocation even when the increase is blocked', () => {
    const before: Scores = { STR: 15, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    const after = increaseScore(before, 'STR');
    expect(after).toEqual(before);
    expect(after).not.toBe(before);
  });

  it('stops at the maximum score', () => {
    const capped: Scores = { STR: 15, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(increaseScore(capped, 'STR')).toEqual(capped);
  });

  it('stops when the remaining points cannot cover the next step', () => {
    const scores: Scores = { STR: 15, DEX: 14, CON: 14, INT: 11, WIS: 8, CHA: 8 };
    expect(pointsRemaining(scores)).toBe(1);
    expect(increaseScore(scores, 'CON')).toEqual(scores);

    const afterInt = increaseScore(scores, 'INT');
    expect(afterInt.INT).toBe(12);
    expect(pointsRemaining(afterInt)).toBe(0);
  });

  it('spends the full pool through a sequence of increases and then blocks further spending', () => {
    const targets: Record<AbilityName, number> = {
      STR: 15,
      DEX: 14,
      CON: 13,
      INT: 12,
      WIS: 10,
      CHA: 8,
    };
    let scores = createDefaultScores();
    for (const ability of ABILITY_NAMES) {
      while (scores[ability] < targets[ability]) {
        scores = increaseScore(scores, ability);
      }
    }
    expect(scores).toEqual(targets);
    expect(pointsRemaining(scores)).toBe(0);
    expect(increaseScore(scores, 'CHA')).toEqual(scores);
  });
});

describe('decreaseScore', () => {
  it('decreases the chosen ability by one', () => {
    const scores: Scores = { STR: 10, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(decreaseScore(scores, 'STR').STR).toBe(9);
  });

  it('leaves the other abilities untouched', () => {
    const scores: Scores = { STR: 10, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(decreaseScore(scores, 'STR')).toEqual({
      STR: 9,
      DEX: 8,
      CON: 8,
      INT: 8,
      WIS: 8,
      CHA: 8,
    });
  });

  it('does not mutate the allocation passed in', () => {
    const before: Scores = { STR: 10, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    decreaseScore(before, 'STR');
    expect(before.STR).toBe(10);
  });

  it('returns a new allocation even when the decrease is blocked', () => {
    const before = createDefaultScores();
    const after = decreaseScore(before, 'STR');
    expect(after).toEqual(before);
    expect(after).not.toBe(before);
  });

  it('stops at the minimum score', () => {
    expect(decreaseScore(createDefaultScores(), 'STR')).toEqual(createDefaultScores());
  });

  it('returns points to the pool', () => {
    const scores: Scores = { STR: 15, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 };
    expect(pointsRemaining(scores)).toBe(18);
    expect(pointsRemaining(decreaseScore(scores, 'STR'))).toBe(20);
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
