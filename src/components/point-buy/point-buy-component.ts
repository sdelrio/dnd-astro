import * as pointBuy from './point-buy-utils';

/**
 * Imported as a namespace rather than by name because of a toolchain trap: a
 * named import that is also referenced from a type position (`typeof
 * calculateModifier`) loses its runtime binding under the SSR transform the
 * tests run through, and the helper then arrives `undefined` in every test and
 * nowhere else. `pointBuy.calculateModifier` is a member read, which survives.
 */
export interface PointBuyComponent {
  scores: pointBuy.Scores;
  /** The ability picked up for a trade, or `null` when nothing is picked. */
  picked: pointBuy.AbilityName | null;
  announcement: string;
  calculateModifier: typeof pointBuy.calculateModifier;
  formatModifier: typeof pointBuy.formatModifier;
  getScoreCost: typeof pointBuy.getScoreCost;
  formatCostLine: typeof pointBuy.formatCostLine;
  canIncrease: typeof pointBuy.canIncrease;
  canDecrease: typeof pointBuy.canDecrease;
  pointsRemaining: typeof pointBuy.pointsRemaining;
  pointsSpent: typeof pointBuy.pointsSpent;
  totalModifier: typeof pointBuy.totalModifier;
  formatTotalModifier: typeof pointBuy.formatTotalModifier;
  presets: typeof pointBuy.PRESET_SPREADS;
  announce(message: string): void;
  tradeLabel(ability: pointBuy.AbilityName): string;
  announceScore(ability: pointBuy.AbilityName): void;
  increase(ability: pointBuy.AbilityName): void;
  decrease(ability: pointBuy.AbilityName): void;
  pickForSwap(ability: pointBuy.AbilityName): void;
  loadPreset(id: string): void;
  reset(): void;
}

/**
 * Registered with `Alpine.data('pointBuy', ...)`, so every helper the
 * template's expressions call is a property here and resolves from the
 * component's own scope. A bare `x-data="pointBuy"` used to lean on
 * `window.pointBuy` and eleven helper globals, none of which the type checker
 * could see.
 */
export function pointBuyComponent(): PointBuyComponent {
  return {
    scores: pointBuy.createDefaultScores(),
    picked: null,
    announcement: '',
    calculateModifier: pointBuy.calculateModifier,
    formatModifier: pointBuy.formatModifier,
    getScoreCost: pointBuy.getScoreCost,
    formatCostLine: pointBuy.formatCostLine,
    canIncrease: pointBuy.canIncrease,
    canDecrease: pointBuy.canDecrease,
    pointsRemaining: pointBuy.pointsRemaining,
    pointsSpent: pointBuy.pointsSpent,
    totalModifier: pointBuy.totalModifier,
    formatTotalModifier: pointBuy.formatTotalModifier,
    presets: pointBuy.PRESET_SPREADS,
    /**
     * What the trade handle says it will do, in the state it is in. Naming the
     * action is the whole of it: a control labelled only "Strength" leaves a
     * screen-reader user to guess that pressing it does anything to the score,
     * and the picked state has to say what the next press will do, not just
     * that this one is on.
     */
    tradeLabel(ability: pointBuy.AbilityName) {
      const name = pointBuy.ABILITY_LABELS[ability];
      return this.picked === ability
        ? `Put ${name} back, cancelling the trade`
        : `Pick up ${name}, ${this.scores[ability]}, to trade its score`;
    },
    /**
     * Writes to the polite live region. Clearing first and restoring on the
     * next tick means a repeated value (buys that net zero) is still
     * announced, which a plain assignment would swallow.
     */
    announce(message: string) {
      this.announcement = '';
      setTimeout(() => {
        this.announcement = message;
      }, 50);
    },
    announceScore(ability: pointBuy.AbilityName) {
      const value = this.scores[ability];
      this.announce(
        `${pointBuy.ABILITY_LABELS[ability]} ${value}, ` +
          `modifier ${this.formatModifier(this.calculateModifier(value))}. ` +
          `${this.pointsRemaining(this.scores)} points remaining.`
      );
    },
    increase(ability: pointBuy.AbilityName) {
      this.scores = pointBuy.increaseScore(this.scores, ability);
      // A score is about to move, so anything held for a trade is stale: the
      // pickup was taken against a different sheet.
      this.picked = null;
      this.announceScore(ability);
    },
    decrease(ability: pointBuy.AbilityName) {
      this.scores = pointBuy.decreaseScore(this.scores, ability);
      this.picked = null;
      this.announceScore(ability);
    },
    /**
     * Two presses, one trade: the first picks an ability up, the second names
     * where its score goes. Pressing the picked ability again puts it back
     * down, because on a phone a mis-tap that cannot be undone is a worse
     * thing than a mis-tap that takes two to confirm.
     *
     * The pick is announced rather than only drawn, because the drawn state is
     * a ring on one of six names and a screen reader is told nothing by that.
     */
    pickForSwap(ability: pointBuy.AbilityName) {
      if (this.picked === ability) {
        this.picked = null;
        this.announce(`${pointBuy.ABILITY_LABELS[ability]} put back. No scores traded.`);
        return;
      }
      if (this.picked === null) {
        this.picked = ability;
        this.announce(
          `${pointBuy.ABILITY_LABELS[ability]} ${this.scores[ability]} picked up. ` +
            'Choose another ability to trade it with, or press it again to put it back.'
        );
        return;
      }
      const from = this.picked;
      this.scores = pointBuy.tradeScores(this.scores, from, ability);
      this.picked = null;
      this.announce(
        `Traded. ${pointBuy.ABILITY_LABELS[from]} ${this.scores[from]}, ` +
          `${pointBuy.ABILITY_LABELS[ability]} ${this.scores[ability]}. ` +
          `${this.pointsRemaining(this.scores)} points remaining.`
      );
    },
    loadPreset(id: string) {
      const label = pointBuy.PRESET_SPREADS.find((preset) => preset.id === id)?.label;
      if (!label) {
        return;
      }
      this.scores = pointBuy.applyPreset(this.scores, id);
      this.picked = null;
      this.announce(
        `${label} loaded. Modifier total ${this.formatTotalModifier(this.scores)}.`
      );
    },
    reset() {
      this.scores = pointBuy.resetScores(this.scores);
      this.picked = null;
      this.announce(
        `All scores reset. ${this.pointsRemaining(this.scores)} points remaining.`
      );
    },
  };
}
