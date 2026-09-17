export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count: number, sides = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

export function rollAbility() {
  const dice = rollDice(4);
  const sorted = [...dice].sort((a, b) => b - a);
  const topThree = sorted.slice(0, 3);
  const sum = topThree.reduce((a, b) => a + b, 0);
  return { dice, sorted, topThree, sum };
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

export function updateAbilityWithRoll(ability: any, result: any) {
  return {
    ...ability,
    dice: result.dice,
    topThree: result.topThree,
    sum: result.sum,
    modifier: calculateModifier(result.sum),
    rolling: false,
  };
}
