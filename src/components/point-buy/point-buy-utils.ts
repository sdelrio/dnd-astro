import { ABILITY_NAMES, calculateModifier, formatModifier } from '../dice-roller/dice-utils';

export { calculateModifier, formatModifier };

// Re-exported rather than redeclared: the six abilities are the same six in
// both tools, and two lists would drift.
export { ABILITY_NAMES };

export type AbilityName = (typeof ABILITY_NAMES)[number];

export type Scores = Record<AbilityName, number>;

export const MIN_SCORE = 8;
export const MAX_SCORE = 15;
export const POINT_BUY_POOL = 27;

export const SCORE_COSTS: Readonly<Record<number, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export function getScoreCost(score: number): number {
  return SCORE_COSTS[score];
}

export function createDefaultScores(): Scores {
  return {
    STR: MIN_SCORE,
    DEX: MIN_SCORE,
    CON: MIN_SCORE,
    INT: MIN_SCORE,
    WIS: MIN_SCORE,
    CHA: MIN_SCORE,
  };
}

export function resetScores(scores: Scores): Scores {
  return { ...scores, ...createDefaultScores() };
}

export function pointsSpent(scores: Scores): number {
  return ABILITY_NAMES.reduce((total, ability) => total + getScoreCost(scores[ability]), 0);
}

export function pointsRemaining(scores: Scores): number {
  return POINT_BUY_POOL - pointsSpent(scores);
}

/**
 * What the next point on this ability costs, marginal to the score it already
 * has. The 5e table is not linear (1 per point up to 13, then 2 for each
 * of the last two), so the delta is the only honest number to put in front of
 * someone deciding whether to press the stepper: the score's total cost says
 * nothing about the price of the next press.
 *
 * 0 at the maximum, where there is no next press to price.
 */
export function nextStepCost(score: number): number {
  if (score >= MAX_SCORE) {
    return 0;
  }
  return getScoreCost(score + 1) - getScoreCost(score);
}

/**
 * The one line that explains what a press costs: the total the score has
 * already bought, then the marginal price of the next one. A stepper that goes
 * dead at the cap or with an empty pool says nothing on its own, and at a table
 * that silence reads as a broken control. At the maximum there is no next press
 * to price, so the line says that instead of a number.
 */
export function formatCostLine(score: number): string {
  const total = `Cost ${getScoreCost(score)}`;
  return score >= MAX_SCORE ? `${total}, max` : `${total}, next +${nextStepCost(score)}`;
}

export function canIncrease(scores: Scores, ability: AbilityName): boolean {
  const score = scores[ability];
  if (score >= MAX_SCORE) {
    return false;
  }
  return nextStepCost(score) <= pointsRemaining(scores);
}

export function canDecrease(scores: Scores, ability: AbilityName): boolean {
  return scores[ability] > MIN_SCORE;
}

export function increaseScore(scores: Scores, ability: AbilityName): Scores {
  if (!canIncrease(scores, ability)) {
    return { ...scores };
  }
  return { ...scores, [ability]: scores[ability] + 1 };
}

export function decreaseScore(scores: Scores, ability: AbilityName): Scores {
  if (!canDecrease(scores, ability)) {
    return { ...scores };
  }
  return { ...scores, [ability]: scores[ability] - 1 };
}
