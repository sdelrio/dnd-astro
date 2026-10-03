/**
 * The six abilities, in the order both the dice roller and the point buy lay
 * them out. One list, so a card cannot end up with a seventh ability the other
 * has never heard of.
 */
export const ABILITY_NAMES = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
] as const;

export type AbilityName = (typeof ABILITY_NAMES)[number];

/**
 * The sheet's spelling of each ability, beside the codes rather than in either
 * tool's folder.
 *
 * It lived in `point-buy-utils.ts` and was documented as shared, which was the
 * intent but not the shape: the dice roller importing a sibling tool's utils to
 * label its own rows is the wrong dependency direction, and the practical
 * consequence was that the roller kept printing the three-letter codes. The
 * ability order is the 5e one, and a player reads "Constitution" on a character
 * sheet, not "CON".
 *
 * `ABILITY_NAMES` stays the short code because it is the key the maths, the
 * presets and the trade all address. This is the display name, and it is the
 * only place the two are allowed to differ.
 */
export const ABILITY_LABELS: Readonly<Record<AbilityName, string>> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

/**
 * The mark beside each ability's name, beside the names for the same reason.
 *
 * Point Buy already printed a silhouette beside all six, and the roller printing
 * six bare names made the two tools look like two products: the mark is what
 * makes the sheet read as one sheet. It is a `game-icons` solid throughout so
 * the six read as a set rather than as six borrowed glyphs.
 *
 * The mark identifies the *ability*, not the position, so it travels with the
 * name. A trade moves two rolls between two abilities and leaves both names where
 * they were, so a mark bound to a row would end up beside the wrong name the
 * moment a trade was taken.
 */
export const ABILITY_MARKS: Readonly<Record<AbilityName, string>> = {
  STR: "game-icons:mailed-fist",
  DEX: "game-icons:boots",
  CON: "game-icons:round-shield",
  INT: "game-icons:brain",
  WIS: "game-icons:all-seeing-eye",
  CHA: "game-icons:crown",
};

export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count: number, sides = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

export function getTopThreeIndices(dice: number[]): number[] {
  return dice
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .slice(0, 3)
    .map(({ index }) => index)
    .sort((a, b) => a - b);
}

export function rollAbility() {
  const dice = rollDice(4);
  const sorted = [...dice].sort((a, b) => b - a);
  const topThree = sorted.slice(0, 3);
  const topThreeIndices = getTopThreeIndices(dice);
  const sum = topThree.reduce((a, b) => a + b, 0);
  return { dice, sorted, topThree, topThreeIndices, sum };
}

export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * The sheet's strength, read as six bonuses rather than six numbers: what the
 * six rolled scores add up to once each is a bonus or a penalty. It is the one
 * figure that answers "how strong is this sheet", and it is the same figure
 * Point Buy puts at the foot of its ledger, so the two tools answer the same
 * question the same way.
 *
 * It is a sum, not a position, so a trade cannot move it: the two rolls change
 * rows and the total stays where it was. That is the point - a trade is a
 * rearrangement, and the sheet's strength is not what a player is changing.
 */
export function totalModifier(
  abilities: ReadonlyArray<Pick<Ability, "modifier">>,
): number {
  return abilities.reduce((total, ability) => total + ability.modifier, 0);
}

/**
 * The modifier total, signed and always carrying its sign. A bare `2` reads as a
 * quantity of points; a `+2` reads as a bonus, which is what it is, and `-6` is
 * the number a sheet can genuinely start at. Zero is the one exception: `+0` is
 * not a thing a modifier does, so it is written plain.
 *
 * It lives here beside `formatModifier` because both tools owe the sheet the
 * same rule, and Point Buy's own total is spelled through this function rather
 * than by a second copy of the same three branches.
 */
export function formatModifierTotal(total: number): string {
  if (total === 0) {
    return "0";
  }
  return total > 0 ? `+${total}` : `${total}`;
}

export function calculateStats(sums: number[]) {
  const sorted = [...sums].sort((a, b) => a - b);
  const average =
    Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return {
    average,
    median,
    lowest: { value: lowest, count: sorted.filter((v) => v === lowest).length },
    highest: {
      value: highest,
      count: sorted.filter((v) => v === highest).length,
    },
  };
}

export function formatStats(stats: ReturnType<typeof calculateStats>) {
  return {
    average: stats.average.toFixed(1),
    median:
      stats.median % 1 === 0
        ? stats.median.toString()
        : stats.median.toFixed(1),
    lowest: stats.lowest.value.toString(),
    lowestCount: stats.lowest.count,
    highest: stats.highest.value.toString(),
    highestCount: stats.highest.count,
  };
}

export function formatResultLog(
  abilities: Array<{ name: string; sum: number; modifier: number }>,
): string {
  return abilities
    .map((a) => `${a.name} ${a.sum} (${formatModifier(a.modifier)})`)
    .join(", ");
}

export function updateAbilityWithRoll(
  ability: Ability,
  result: ReturnType<typeof rollAbility>,
): Ability {
  return {
    ...ability,
    dice: result.dice,
    topThree: result.topThree,
    topThreeIndices: result.topThreeIndices,
    sum: result.sum,
    modifier: calculateModifier(result.sum),
    rolling: false,
  };
}

export interface Ability {
  name: string;
  dice: number[];
  topThree: number[];
  topThreeIndices: number[];
  sum: number;
  modifier: number;
  rolling: boolean;
}

export function swapAbilities(
  abilities: Ability[],
  index1: number,
  index2: number,
): Ability[] {
  const copy = abilities.map((a) => ({ ...a }));
  const a = copy[index1];
  const b = copy[index2];
  const tmpDice = a.dice;
  const tmpTopThree = a.topThree;
  const tmpTopThreeIndices = a.topThreeIndices;
  const tmpSum = a.sum;
  const tmpModifier = a.modifier;
  a.dice = b.dice;
  a.topThree = b.topThree;
  a.topThreeIndices = b.topThreeIndices;
  a.sum = b.sum;
  a.modifier = b.modifier;
  b.dice = tmpDice;
  b.topThree = tmpTopThree;
  b.topThreeIndices = tmpTopThreeIndices;
  b.sum = tmpSum;
  b.modifier = tmpModifier;
  return copy;
}
