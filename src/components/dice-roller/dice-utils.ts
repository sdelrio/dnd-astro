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
