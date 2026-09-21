import type { CharacterData, Coins } from '@/utils/parse-character-xml';

type Inventory = CharacterData['inventory'];
type InventoryItem = Inventory[number];

export interface InventoryRow {
  name: string;
  count: number;
  weight: string;
  state: string;
}

const CARRIED_STATE: Record<number, string> = {
  1: 'Carried',
  2: 'Equipped',
};

function isCarried(item: InventoryItem): boolean {
  return item.carried === 1 || item.carried === 2;
}

export function toInventoryRows(items: Inventory): InventoryRow[] {
  return items.filter(isCarried).map((item) => ({
    name: item.name,
    count: item.count,
    weight: `${item.weight.toFixed(1)} lb.`,
    state: CARRIED_STATE[item.carried],
  }));
}

export function carriedWeight(items: Inventory): string {
  const total = items
    .filter(isCarried)
    .reduce((sum, item) => sum + item.weight * item.count, 0);
  return total.toFixed(1);
}

export function carryCapacity(strengthScore: number): number {
  return strengthScore * 15;
}

export interface CoinRow {
  label: string;
  value: number;
}

const COIN_DENOMINATIONS: Array<[string, keyof Coins]> = [
  ['PP', 'pp'],
  ['GP', 'gp'],
  ['EP', 'ep'],
  ['SP', 'sp'],
  ['CP', 'cp'],
];

export function toCoinRows(coins: Coins): CoinRow[] {
  return COIN_DENOMINATIONS.map(([label, key]) => ({ label, value: coins[key] }));
}

export function hasInventoryContents(items: Inventory, coins: Coins): boolean {
  return items.some(isCarried) || toCoinRows(coins).some((coin) => coin.value !== 0);
}
