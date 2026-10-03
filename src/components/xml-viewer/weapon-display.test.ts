import { describe, it, expect } from 'vitest';
import { toWeaponRows } from './weapon-display';
import type { CharacterData } from '@/utils/parse-character-xml';

type Abilities = CharacterData['abilities'];
type Weapons = CharacterData['weapons'];
type Weapon = Weapons[number];

const abilities: Abilities = {
  strength: { score: 18, bonus: 4, save: 4, saveprof: 0 },
  dexterity: { score: 14, bonus: 2, save: 2, saveprof: 0 },
  charisma: { score: 16, bonus: 3, save: 3, saveprof: 0 },
};

function weapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    name: 'Weapon',
    attackbonus: 0,
    attackstat: '',
    properties: '',
    carried: 2,
    type: 0,
    damage: [],
    ...overrides,
  };
}

describe('toWeaponRows', () => {
  it('computes the golden greatsword example: STR 18, prof +2 -> +6, 2d6+4 Slashing', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Greatsword',
          properties: 'reroll 2',
          damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
        }),
      ],
      abilities,
      2
    );
    expect(rows).toEqual([
      { name: 'Greatsword', attack: '+6', properties: 'reroll 2', damage: '2d6+4 Slashing' },
    ]);
  });

  it('keeps only equipped (carried 2) weapons and renders empty properties as a dash', () => {
    const rows = toWeaponRows(
      [
        weapon({ name: 'In the pack', carried: 1, properties: 'Finesse' }),
        weapon({ name: 'Left behind', carried: 0 }),
        weapon({ name: 'Equipped' }),
      ],
      abilities,
      2
    );
    expect(rows).toEqual([{ name: 'Equipped', attack: '+6', properties: '-', damage: '' }]);
  });

  it('lists carried-but-not-equipped weapons when the card asks for the carried set', () => {
    // A character with three weapons in the pack showed only the two in hand. The
    // builder decides which set it is building rather than the card asking for one
    // by name, so the display layer can never put a weapon in both tables.
    const rows = toWeaponRows(
      [
        weapon({ name: 'Longsword', carried: 1, properties: 'Versatile' }),
        weapon({ name: 'Greatsword', carried: 2 }),
        weapon({ name: 'Left behind', carried: 0 }),
      ],
      abilities,
      2,
      'carried'
    );
    expect(rows).toEqual([
      { name: 'Longsword', attack: '+6', properties: 'Versatile', damage: '' },
    ]);
  });

  it('computes carried weapons exactly as it computes equipped ones', () => {
    // A stowed weapon is as usable as a held one, so its attack bonus and its
    // damage come from the same arithmetic rather than from a second copy of it.
    const carried = [
      weapon({
        name: 'Handaxe',
        carried: 1,
        type: 2,
        damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'slashing' }],
      }),
    ];
    expect(toWeaponRows(carried, abilities, 2, 'carried')[0]).toEqual(
      toWeaponRows([{ ...carried[0], carried: 2 }], abilities, 2, 'equipped')[0]
    );
  });

  it('never returns the same weapon in both sets, and never returns a stowed one', () => {
    const all = [
      weapon({ name: 'Greatsword', carried: 2 }),
      weapon({ name: 'Crossbow', carried: 1 }),
      weapon({ name: 'Wand', carried: 0 }),
    ];
    const equipped = toWeaponRows(all, abilities, 2, 'equipped').map((row) => row.name);
    const carried = toWeaponRows(all, abilities, 2, 'carried').map((row) => row.name);
    expect(equipped).toEqual(['Greatsword']);
    expect(carried).toEqual(['Crossbow']);
    expect(equipped.filter((name) => carried.includes(name))).toEqual([]);
    expect([...equipped, ...carried]).not.toContain('Wand');
  });

  it('adds the weapon attack bonus and the named attack stat bonus', () => {
    const rows = toWeaponRows(
      [weapon({ name: 'Warlock Blade', attackbonus: 2, attackstat: 'charisma' })],
      abilities,
      2
    );
    expect(rows[0].attack).toBe('+7');
  });

  it('treats an unknown attack stat as a zero ability bonus', () => {
    const rows = toWeaponRows(
      [weapon({ name: 'Mystery Blade', attackbonus: 1, attackstat: 'luck' })],
      abilities,
      2
    );
    expect(rows[0].attack).toBe('+3');
  });

  it('maps base attack and damage to DEX for ranged weapons and to STR otherwise', () => {
    const ranged = weapon({
      name: 'Longbow',
      type: 1,
      damage: [{ bonus: 0, dice: 'd8', stat: 'base', statmult: 1, type: 'piercing' }],
    });
    const thrown = weapon({
      name: 'Javelin',
      type: 2,
      damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'piercing' }],
    });
    const rows = toWeaponRows([ranged, thrown], abilities, 2);
    expect(rows[0].attack).toBe('+4');
    expect(rows[0].damage).toBe('d8+2 Piercing');
    expect(rows[1].attack).toBe('+6');
    expect(rows[1].damage).toBe('d6+4 Piercing');
  });

  it('normalizes repeated comma dice into NdX and keeps distinct groups in order', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Greatsword',
          damage: [{ bonus: 0, dice: 'd6,d6', stat: '', statmult: 1, type: '' }],
        }),
        weapon({
          name: 'Mixed',
          damage: [{ bonus: 0, dice: 'd8,d6,d6', stat: '', statmult: 1, type: '' }],
        }),
        weapon({
          name: 'Flail',
          damage: [{ bonus: 0, dice: 'd8+d6', stat: '', statmult: 1, type: '' }],
        }),
      ],
      abilities,
      2
    );
    expect(rows[0].damage).toBe('2d6');
    expect(rows[1].damage).toBe('d8+2d6');
    expect(rows[2].damage).toBe('d8+d6');
  });

  it('multiplies the damage stat bonus by statmult', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Double',
          damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 2, type: 'slashing' }],
        }),
        weapon({
          name: 'Ignored',
          damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 0, type: 'slashing' }],
        }),
      ],
      abilities,
      2
    );
    expect(rows[0].damage).toBe('d6+8 Slashing');
    expect(rows[1].damage).toBe('d6 Slashing');
  });

  it('joins multiple damage parts with a semicolon and title-cases each damage type', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Flametongue',
          damage: [
            { bonus: 1, dice: 'd8', stat: 'base', statmult: 1, type: 'piercing,magic' },
            { bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'fire' },
          ],
        }),
      ],
      abilities,
      2
    );
    expect(rows[0].damage).toBe('d8+5 Piercing, Magic; d6+4 Fire');
  });

  it('treats an empty damage stat as no stat bonus and omits an empty damage type', () => {
    const rows = toWeaponRows(
      [weapon({ name: 'Off-hand', damage: [{ bonus: 2, dice: 'd6', stat: '', statmult: 1, type: '' }] })],
      abilities,
      2
    );
    expect(rows[0].damage).toBe('d6+2');
  });

  it('renders a dice-less damage part from its modifier and type', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Improvised Rock',
          damage: [{ bonus: 0, dice: '', stat: 'base', statmult: 1, type: 'piercing' }],
        }),
      ],
      abilities,
      2
    );
    expect(rows[0].damage).toBe('+4 Piercing');
  });
});
