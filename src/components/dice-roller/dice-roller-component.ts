import * as dice from './dice-utils';

/**
 * Imported as a namespace rather than by name because of a toolchain trap: a
 * named import that is also referenced from a type position (`typeof
 * rollAbility`) loses its runtime binding under the SSR transform the tests
 * run through, and the helper then arrives `undefined` in every test and
 * nowhere else. `dice.rollAbility` is a member read, which survives.
 */
export interface DiceRollerComponent {
  abilities: dice.Ability[];
  /**
   * Four zeroes, standing in for the four d6 an unrolled ability is still
   * waiting on. The template renders one die per entry of `ability.dice`, and an
   * unrolled ability has none, so without this the tray was empty and the row
   * arrived as a wide band with a dot in a box - the tool looked broken before
   * it was used. Face `0` is not a d6, so it lights no pips and the stylesheet
   * draws it as an engraved socket instead of a die.
   */
  emptyFaces: number[];
  resultLog: string[];
  /** Array of ability sums per completed "Roll All Abilities". */
  sessionRolls: number[][];
  isRolling: boolean;
  currentRollingIndex: number;
  stats: ReturnType<typeof dice.formatStats> | null;
  selectedIndex: number | null;
  stagedSwap: { index1: number; index2: number } | null;
  swapUsed: boolean;
  announcement: string;
  rollEpoch: number;
  formatModifier: typeof dice.formatModifier;
  announce(message: string): void;
  pushLog(entry: string): void;
  /**
   * The sheet's modifier total, as the figure in the foot reads it.
   *
   * A method rather than a stored number so it cannot go stale: it is read from
   * `abilities` at every evaluation, so a re-roll, a swap and the arrival state
   * all land on it without anything having to remember to update it. The sum and
   * the signing rule are the shared helpers, the same ones Point Buy's own total
   * is spelled through - two copies of either is a copy that will one day
   * disagree with the other panel's.
   */
  modifierTotal(): string;
  rollAll(): void;
  rollIndividual(index: number): void;
  selectAbility(index: number): void;
  confirmSwap(): void;
  cancelSwap(): void;
}

/**
 * A session is unbounded - a table can roll all six abilities a hundred times
 * over, and both the log and the sample feeding the Stats card grew for as
 * long as the tab stayed open. The log is a recall aid for the current
 * conversation, and the stats only need a recent sample to be meaningful, so
 * both are capped. The log is newest-first (`unshift`), so it keeps the head.
 */
const LOG_LIMIT = 20;
const SESSION_ROLL_LIMIT = 50;

/** The unrolled starting state, one tile per ability. */
export function createDefaultAbilities(): dice.Ability[] {
  // `name` is the display name, not the code. It is what the row prints, what
  // the roll log and the live region speak, and what the swap panel names the
  // two abilities it is about - so labelling the rows with the full name and
  // leaving `name` as "CON" would have put "CON" in the log and the swap panel
  // while the sheet said "Constitution". The code stays the key everywhere the
  // maths and the trade address an ability, which is what `ABILITY_NAMES` is.
  return dice.ABILITY_NAMES.map((code) => ({
    name: dice.ABILITY_LABELS[code],
    dice: [],
    topThree: [],
    topThreeIndices: [],
    sum: 0,
    modifier: 0,
    rolling: false,
  }));
}

/**
 * Registered with `Alpine.data('diceRoller', ...)`, so the helpers the
 * template's expressions call are properties of this object and resolve from
 * its scope. `x-data="diceRoller"` used to be a call into a global, and the
 * eight helpers behind it were eight more globals, none of which the type
 * checker could see.
 */
export function diceRollerComponent(): DiceRollerComponent {
  return {
    abilities: createDefaultAbilities(),
    emptyFaces: [0, 0, 0, 0],
    resultLog: [],
    sessionRolls: [],
    isRolling: false,
    currentRollingIndex: -1,
    stats: null,
    selectedIndex: null,
    stagedSwap: null,
    swapUsed: false,
    announcement: '',
    /**
     * Bumped by every "Roll All Abilities". A re-roll timer captures the value
     * it was scheduled under and bails if it has moved, so a pending
     * per-ability roll cannot land in the middle of a full roll and overwrite
     * one of its six tiles with a stale result.
     */
    rollEpoch: 0,
    formatModifier: dice.formatModifier,
    modifierTotal() {
      return dice.formatModifierTotal(dice.totalModifier(this.abilities));
    },
    /**
     * Writes to the polite live region. Clearing first and restoring on the
     * next tick means an identical repeat (re-rolling the same total) is still
     * announced, which a plain assignment would swallow.
     */
    announce(message: string) {
      this.announcement = '';
      setTimeout(() => {
        this.announcement = message;
      }, 50);
    },
    pushLog(entry: string) {
      this.resultLog.unshift(entry);
      if (this.resultLog.length > LOG_LIMIT) this.resultLog.length = LOG_LIMIT;
    },
    rollAll() {
      if (this.isRolling) return;
      this.isRolling = true;
      this.rollEpoch++;
      this.selectedIndex = null;
      this.stagedSwap = null;
      this.swapUsed = false;
      let index = 0;
      if (!Array.isArray(this.sessionRolls)) this.sessionRolls = [];
      const rollNext = () => {
        if (index >= this.abilities.length) {
          this.isRolling = false;
          this.pushLog(dice.formatResultLog(this.abilities));
          const sums = this.abilities.map((a) => a.sum);
          this.sessionRolls.push(sums);
          if (this.sessionRolls.length > SESSION_ROLL_LIMIT) {
            this.sessionRolls.splice(0, this.sessionRolls.length - SESSION_ROLL_LIMIT);
          }
          const allSums = this.sessionRolls.flat();
          this.stats = dice.formatStats(dice.calculateStats(allSums));
          const scores = this.abilities
            .map((a) => `${a.name} ${a.sum} (${this.formatModifier(a.modifier)})`)
            .join(', ');
          // The total belongs in this sentence rather than in a second one: the
          // six scores and their modifiers have just been read out, so their sum
          // is the one thing the reader still has to do by hand. Announced after
          // them rather than before, because "modifier total +6" means nothing
          // until the six figures it is a total of have been heard.
          this.announce(`All abilities rolled. ${scores}. Modifier total ${this.modifierTotal()}.`);
          return;
        }
        this.currentRollingIndex = index;
        this.abilities[index].rolling = true;

        setTimeout(() => {
          const result = dice.rollAbility();
          this.abilities[index] = dice.updateAbilityWithRoll(this.abilities[index], result);
          index++;
          setTimeout(rollNext, 150);
        }, 300);
      };
      rollNext();
    },
    rollIndividual(index: number) {
      if (this.isRolling || this.abilities[index].rolling) return;
      this.abilities[index].rolling = true;
      const epoch = this.rollEpoch;

      setTimeout(() => {
        // Release the flag this function set before bailing. `rollAll` currently
        // sweeps all six tiles and would clear it anyway, so leaving it set is
        // masked today - but the bail path owns the flag it set, and any future
        // caller that bumps the epoch without a full sweep would strand the tile
        // pulsing forever.
        if (this.rollEpoch !== epoch) {
          this.abilities[index].rolling = false;
          return;
        }
        const result = dice.rollAbility();
        this.abilities[index] = dice.updateAbilityWithRoll(this.abilities[index], result);
        const rolled = this.abilities[index];
        this.announce(
          `${rolled.name} rolled ${rolled.sum}, modifier ${this.formatModifier(rolled.modifier)}.`
        );
      }, 300);
    },
    selectAbility(index: number) {
      // The tile stays clickable through a roll and after the session's one
      // swap, so both refusals are announced. Silently ignoring the tap left a
      // control that looked live and did nothing, and no sighted user gets any
      // other signal about why.
      if (this.isRolling) {
        this.announce('Wait for the current roll to finish before swapping.');
        return;
      }
      if (this.swapUsed) {
        this.announce('This session has already used its swap. Roll all abilities to start a new one.');
        return;
      }
      if (this.selectedIndex === null) {
        this.selectedIndex = index;
        this.announce(`${this.abilities[index].name} selected. Choose a second ability to stage a swap.`);
        return;
      }
      if (this.selectedIndex === index) {
        this.selectedIndex = null;
        this.announce(`${this.abilities[index].name} deselected.`);
        return;
      }
      this.stagedSwap = { index1: this.selectedIndex, index2: index };
      const a = this.abilities[this.selectedIndex].name;
      const b = this.abilities[index].name;
      this.announce(`Swap ${a} with ${b} staged. Confirm or cancel, or press Escape to cancel.`);
    },
    confirmSwap() {
      if (!this.stagedSwap) return;
      const { index1, index2 } = this.stagedSwap;
      const a = this.abilities[index1].name;
      const b = this.abilities[index2].name;
      this.abilities = dice.swapAbilities(this.abilities, index1, index2);
      this.selectedIndex = null;
      this.stagedSwap = null;
      this.swapUsed = true;
      // Only rewrite the newest entry when there is one. A swap staged before
      // the first roll would otherwise invent a log line of six zeroes.
      if (this.resultLog.length > 0) {
        this.resultLog[0] = dice.formatResultLog(this.abilities);
      }
      this.announce(
        `Swapped ${a} and ${b}. ${this.abilities.map((x) => `${x.name} ${x.sum}`).join(', ')}.`
      );
    },
    /**
     * Also bound to Escape on the window, so a staged swap is recoverable
     * without hunting for the cancel button. A no-op when nothing is staged -
     * Escape must not speak over the page on every keypress.
     */
    cancelSwap() {
      if (!this.stagedSwap && this.selectedIndex === null) return;
      const staged = this.stagedSwap;
      this.selectedIndex = null;
      this.stagedSwap = null;
      this.announce(
        staged
          ? `Swap of ${this.abilities[staged.index1].name} and ${this.abilities[staged.index2].name} cancelled.`
          : 'Selection cleared.'
      );
    },
  };
}
