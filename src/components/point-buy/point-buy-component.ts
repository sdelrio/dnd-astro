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
  announcement: string;
  calculateModifier: typeof pointBuy.calculateModifier;
  formatModifier: typeof pointBuy.formatModifier;
  getScoreCost: typeof pointBuy.getScoreCost;
  canIncrease: typeof pointBuy.canIncrease;
  canDecrease: typeof pointBuy.canDecrease;
  pointsRemaining: typeof pointBuy.pointsRemaining;
  announce(message: string): void;
  announceScore(ability: pointBuy.AbilityName): void;
  increase(ability: pointBuy.AbilityName): void;
  decrease(ability: pointBuy.AbilityName): void;
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
    announcement: '',
    calculateModifier: pointBuy.calculateModifier,
    formatModifier: pointBuy.formatModifier,
    getScoreCost: pointBuy.getScoreCost,
    canIncrease: pointBuy.canIncrease,
    canDecrease: pointBuy.canDecrease,
    pointsRemaining: pointBuy.pointsRemaining,
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
        `${ability} ${value}, modifier ${this.formatModifier(this.calculateModifier(value))}. ` +
          `${this.pointsRemaining(this.scores)} points remaining.`
      );
    },
    increase(ability: pointBuy.AbilityName) {
      this.scores = pointBuy.increaseScore(this.scores, ability);
      this.announceScore(ability);
    },
    decrease(ability: pointBuy.AbilityName) {
      this.scores = pointBuy.decreaseScore(this.scores, ability);
      this.announceScore(ability);
    },
    reset() {
      this.scores = pointBuy.resetScores(this.scores);
      this.announce(
        `All scores reset. ${this.pointsRemaining(this.scores)} points remaining.`
      );
    },
  };
}
