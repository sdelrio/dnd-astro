import {
  ABILITY_LABELS,
  ABILITY_NAMES,
  calculateModifier,
  formatModifier,
} from '../dice-roller/dice-utils';

export { calculateModifier, formatModifier };

// Re-exported rather than redeclared: the six abilities are the same six in
// both tools, and two lists would drift. `ABILITY_LABELS` moved to
// `dice-utils.ts` beside the codes it maps; it used to be declared here while its
// own comment claimed all three tools shared it, which is what left the dice
// roller printing three-letter codes - labelling its own rows would have meant
// importing a sibling tool's utils, and nothing obliged it to.
export { ABILITY_LABELS, ABILITY_NAMES };

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
 * The spread's modifier total: what the six scores add up to once each is
 * read as a bonus or penalty. It is the number a player actually compares
 * builds on, and it is the only figure on the sheet that says whether the
 * allocation is any good - a spread can spend all 27 and still be a worse
 * character than one that spends 25.
 */
export function totalModifier(scores: Scores): number {
  return ABILITY_NAMES.reduce((total, ability) => total + calculateModifier(scores[ability]), 0);
}

/**
 * Starting spreads, offered so nobody has to spend 27 presses to find out
 * what a Striker looks like. Each is a legal 5e spread and each costs
 * exactly the full pool, so loading one is a finished allocation rather than
 * a head start; a spread that underspends is a trap at the table, because
 * the obvious next move is to dump the remainder into the first score.
 *
 * `point-buy.test.ts` pins every one of them to the pool, so adding one
 * here without costing it out fails the build rather than shipping.
 */
export const STARTING_SPREADS: ReadonlyArray<{ id: string; label: string; scores: Scores }> = [
  {
    id: 'standard-array',
    label: 'Standard Array',
    scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
  },
  {
    id: 'striker',
    label: 'Striker',
    scores: { STR: 15, DEX: 15, CON: 14, INT: 8, WIS: 10, CHA: 8 },
  },
  {
    // `caster`, not `sage`: `sage` is a colour token in this system, and an id
    // that reads as a hex-adjacent palette name is a name that will eventually
    // be grepped as one.
    id: 'caster',
    label: 'Caster',
    scores: { STR: 8, DEX: 14, CON: 14, INT: 15, WIS: 12, CHA: 8 },
  },
];

/**
 * A starting spread looked up by id, or `undefined` for an id that does not exist.
 * The lookup goes through here rather than being inlined in the component so
 * an unknown id degrades to "do nothing" instead of installing six `undefined`
 * scores on the sheet.
 */
export function getStartingSpread(id: string): Scores | undefined {
  const found = STARTING_SPREADS.find((entry) => entry.id === id);
  // Copied, never handed back by reference: this object is a module-level
  // constant, and a component that mutated its own `scores` in place would
  // rewrite the spread for the rest of the session.
  return found ? { ...found.scores } : undefined;
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

/**
 * Exchanges the two abilities' scores, leaving the other four alone.
 *
 * Trading rather than moving is deliberate: a player who raises Strength to 15
 * and then regrets it almost never wants the 15 back, they want it on
 * Dexterity instead, and the two-step that gets there is a decrease, a
 * increase, and a re-read of the cost column to check nothing went over the
 * pool. One exchange is that whole detour, and it cannot overspend - the
 * scores are already legal, so the swap keeps the spend and the modifier total
 * exactly where they were and only moves them.
 *
 * Copy, never mutate: `scores` is the Alpine component's own state and every
 * other helper here hands back a fresh object.
 */
export function tradeScores(scores: Scores, from: AbilityName, to: AbilityName): Scores {
  if (from === to) {
    return { ...scores };
  }
  return {
    ...scores,
    [from]: scores[to],
    [to]: scores[from],
  };
}

export function applyStartingSpread(scores: Scores, id: string): Scores {
  return getStartingSpread(id) ?? { ...scores };
}

/**
 * The modifier total, signed and always carrying its sign. A bare `2` on the
 * foot of the sheet reads as a quantity of points; a `+2` reads as a bonus,
 * which is what it is, and `-6` is the number a blank sheet actually starts
 * at and the one people forget. Zero is the one exception: `+0` is not a
 * thing a modifier does, so it is written plain.
 */
export function formatTotalModifier(scores: Scores): string {
  const total = totalModifier(scores);
  if (total === 0) {
    return '0';
  }
  return total > 0 ? `+${total}` : String(total);
}
