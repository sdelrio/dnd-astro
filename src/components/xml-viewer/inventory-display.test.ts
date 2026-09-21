import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCharacterXML } from '@/utils/parse-character-xml';
import {
  toInventoryRows,
  carriedWeight,
  carryCapacity,
  toCoinRows,
  hasInventoryContents,
} from './inventory-display';
import type { CharacterData } from '@/utils/parse-character-xml';

type Inventory = CharacterData['inventory'];
type InventoryItem = Inventory[number];

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    name: 'Item',
    count: 1,
    weight: 1,
    carried: 1,
    ...overrides,
  };
}

describe('toInventoryRows', () => {
  it('keeps carried (1) and equipped (2) items in sheet order and drops carried 0', () => {
    const rows = toInventoryRows([
      item({ name: 'Greatsword', carried: 2 }),
      item({ name: 'Sold Gem', carried: 0 }),
      item({ name: 'Backpack', carried: 1 }),
    ]);
    expect(rows.map((row) => row.name)).toEqual(['Greatsword', 'Backpack']);
  });

  it('labels the carried state as Carried and Equipped', () => {
    const rows = toInventoryRows([
      item({ name: 'Greatsword', carried: 2 }),
      item({ name: 'Backpack', carried: 1 }),
    ]);
    expect(rows[0].state).toBe('Equipped');
    expect(rows[1].state).toBe('Carried');
  });

  it('renders the unit weight to one decimal with a lb. suffix', () => {
    const rows = toInventoryRows([
      item({ name: 'Greatsword', weight: 6 }),
      item({ name: 'Handaxe', weight: 2.5 }),
      item({ name: 'Gem', weight: 0.01 }),
    ]);
    expect(rows.map((row) => row.weight)).toEqual(['6.0 lb.', '2.5 lb.', '0.0 lb.']);
  });

  it('keeps the sheet count on the row', () => {
    const rows = toInventoryRows([item({ name: 'Handaxe', count: 2 })]);
    expect(rows[0].count).toBe(2);
  });
});

describe('carriedWeight', () => {
  it('sums weight times count over shown items to one decimal', () => {
    const items: Inventory = [
      item({ name: 'Greatsword', weight: 6, count: 1, carried: 2 }),
      item({ name: 'Handaxe', weight: 2, count: 2, carried: 2 }),
      item({ name: 'Scale Mail', weight: 45, count: 1, carried: 2 }),
      item({ name: 'Rhodochrosite', weight: 0.01, count: 1, carried: 1 }),
      item({ name: 'Potion of Healing', weight: 0.5, count: 0, carried: 1 }),
      item({ name: 'Drowcraft Studded Leather', weight: 13, count: 1, carried: 1 }),
      item({ name: 'Azurite', weight: 0.01, count: 1, carried: 1 }),
      item({ name: 'Malachite', weight: 0.01, count: 1, carried: 1 }),
    ];
    expect(carriedWeight(items)).toBe('68.0');
  });

  it('excludes dropped (carried 0) items', () => {
    const items: Inventory = [
      item({ name: 'Equipped', weight: 2, count: 1, carried: 2 }),
      item({ name: 'Sold', weight: 100, count: 1, carried: 0 }),
    ];
    expect(carriedWeight(items)).toBe('2.0');
  });

  it('reads 0.0 for no carried items', () => {
    expect(carriedWeight([])).toBe('0.0');
  });
});

describe('carryCapacity', () => {
  it('applies the 5e STR score x 15 rule', () => {
    expect(carryCapacity(18)).toBe(270);
    expect(carryCapacity(10)).toBe(150);
  });
});

describe('toCoinRows', () => {
  it('orders the parsed coins PP, GP, EP, SP, CP', () => {
    const rows = toCoinRows({ pp: 5, gp: 57, ep: 1, sp: 28, cp: 92 });
    expect(rows).toEqual([
      { label: 'PP', value: 5 },
      { label: 'GP', value: 57 },
      { label: 'EP', value: 1 },
      { label: 'SP', value: 28 },
      { label: 'CP', value: 92 },
    ]);
  });
});

describe('hasInventoryContents', () => {
  const zeroCoins = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  it('is false when nothing is carried and all coins are zero', () => {
    expect(hasInventoryContents([], zeroCoins)).toBe(false);
    expect(hasInventoryContents([item({ carried: 0 })], zeroCoins)).toBe(false);
  });

  it('is true when at least one item is carried or equipped', () => {
    expect(hasInventoryContents([item({ carried: 1 })], zeroCoins)).toBe(true);
    expect(hasInventoryContents([item({ carried: 2 })], zeroCoins)).toBe(true);
  });

  it('is true when any coin is non-zero', () => {
    expect(hasInventoryContents([], { ...zeroCoins, gp: 1 })).toBe(true);
  });
});

describe('inventory display against the alberich sheet', () => {
  const character = parseCharacterXML(
    readFileSync(
      join(__dirname, '../../assets/fantasy-grounds-sheets/alberich.xml'),
      'utf8'
    )
  );

  it('reads 68.0 / 270 lb. carried', () => {
    expect(character).not.toBeNull();
    expect(carriedWeight(character!.inventory)).toBe('68.0');
    expect(carryCapacity(character!.abilities.strength.score)).toBe(270);
  });

  it('orders his parsed coins GP, SP, CP with the zero denominations kept', () => {
    const rows = toCoinRows(character!.coins);
    expect(rows.map((row) => `${row.label}:${row.value}`)).toEqual([
      'PP:0',
      'GP:57',
      'EP:0',
      'SP:28',
      'CP:92',
    ]);
  });
});
