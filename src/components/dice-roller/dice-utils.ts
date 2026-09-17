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

export function calculateStats(sums: number[]) {
  const sorted = [...sums].sort((a, b) => a - b);
  const average = Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return {
    average,
    median,
    lowest: { value: lowest, count: sorted.filter((v) => v === lowest).length },
    highest: { value: highest, count: sorted.filter((v) => v === highest).length },
  };
}

export function formatStats(stats: ReturnType<typeof calculateStats>) {
  return {
    average: stats.average.toFixed(1),
    median: stats.median % 1 === 0 ? stats.median.toString() : stats.median.toFixed(1),
    lowest: stats.lowest.value.toString(),
    lowestCount: stats.lowest.count,
    highest: stats.highest.value.toString(),
    highestCount: stats.highest.count,
  };
}

export function formatResultLog(
  abilities: Array<{ name: string; sum: number; modifier: number }>
): string {
  return abilities
    .map((a) => `${a.name} ${a.sum} (${formatModifier(a.modifier)})`)
    .join(', ');
}

export function updateAbilityWithRoll(ability: any, result: any) {
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
  index2: number
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
