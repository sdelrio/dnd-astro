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

export function canIncrease(scores: Scores, ability: AbilityName): boolean {
  const score = scores[ability];
  if (score >= MAX_SCORE) {
    return false;
  }
  const nextStepCost = getScoreCost(score + 1) - getScoreCost(score);
  return nextStepCost <= pointsRemaining(scores);
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
