import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toWeaponRows, type WeaponRow, type WeaponSet } from './weapon-display';
import { parseCharacterXML, type CharacterData } from '@/utils/parse-character-xml';

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
      2,
      'equipped'
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
      2,
      'equipped'
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
      2,
      'equipped'
    );
    expect(rows[0].attack).toBe('+7');
  });

  it('treats an unknown attack stat as a zero ability bonus', () => {
    const rows = toWeaponRows(
      [weapon({ name: 'Mystery Blade', attackbonus: 1, attackstat: 'luck' })],
      abilities,
      2,
      'equipped'
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
    const rows = toWeaponRows([ranged, thrown], abilities, 2, 'equipped');
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
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('2d6+4');
    expect(rows[1].damage).toBe('d8+2d6+4');
    expect(rows[2].damage).toBe('d8+d6+4');
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
      2,
      'equipped'
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
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('d8+5 Piercing, Magic; d6+4 Fire');
  });

  it('resolves a blank damage stat to the weapon base ability, as the attack line already does', () => {
    // A sheet that omits <stat> on a damage part means the weapon's base ability,
    // which is the same thing it means on the attack line. Reading it as "no
    // ability at all" dropped the Strength or Dexterity bonus with nothing else on
    // the row looking wrong, so two identical weapons rendered different damage.
    const named = weapon({
      name: 'Shortsword',
      damage: [{ bonus: 0, dice: 'd6', stat: '', statmult: 1, type: 'piercing' }],
    });
    const explicit = weapon({
      name: 'Shortsword left handed',
      damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'piercing' }],
    });
    const rows = toWeaponRows([named, explicit], abilities, 2, 'equipped');
    expect(rows.map((row) => row.attack)).toEqual(['+6', '+6']);
    expect(rows.map((row) => row.damage)).toEqual(['d6+4 Piercing', 'd6+4 Piercing']);
  });

  it('resolves an absent damage stat to the weapon base ability, DEX for ranged', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Longbow',
          type: 1,
          damage: [{ bonus: 0, dice: 'd8', stat: '', statmult: 1, type: 'piercing' }],
        }),
      ],
      abilities,
      2,
      'equipped'
    );
    expect(rows[0].attack).toBe('+4');
    expect(rows[0].damage).toBe('d8+2 Piercing');
  });

  it('resolves an explicit base damage stat to the weapon base ability, unchanged', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Greatsword',
          damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
        }),
      ],
      abilities,
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('2d6+4 Slashing');
  });

  it('resolves a named damage stat to that stat, not to the base ability', () => {
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Warlock Blade',
          damage: [{ bonus: 0, dice: 'd6', stat: 'charisma', statmult: 1, type: 'slashing' }],
        }),
      ],
      abilities,
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('d6+3 Slashing');
  });

  it('omits an empty damage type while still resolving the stat', () => {
    const rows = toWeaponRows(
      [weapon({ name: 'Off-hand', damage: [{ bonus: 2, dice: 'd6', stat: '', statmult: 1, type: '' }] })],
      abilities,
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('d6+6');
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
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('+4 Piercing');
  });

  it('applies the same stat bonus to both damage parts of one weapon', () => {
    // The Staff on teoride spells its two damage parts two ways - one names `base`,
    // one leaves the stat out - and the two rendered different bonuses. Both spell
    // the same rule, so both must resolve to the same ability.
    const rows = toWeaponRows(
      [
        weapon({
          name: 'Staff',
          damage: [
            { bonus: 2, dice: 'd6', stat: 'base', statmult: 1, type: 'bludgeoning' },
            { bonus: 0, dice: 'd6', stat: '', statmult: 1, type: 'bludgeoning' },
          ],
        }),
      ],
      abilities,
      2,
      'equipped'
    );
    expect(rows[0].damage).toBe('d6+6 Bludgeoning; d6+4 Bludgeoning');
  });
});

describe('toWeaponRows over the committed corpus', () => {
  function character(name: string): CharacterData {
    const data = parseCharacterXML(
      readFileSync(join(__dirname, `../../assets/fantasy-grounds-sheets/${name}.xml`), 'utf8')
    );
    if (!data) throw new Error(`${name}.xml did not parse`);
    return data;
  }

  function row(name: string, set: WeaponSet, pick: (row: WeaponRow) => boolean): WeaponRow {
    const data = character(name);
    const found = toWeaponRows(data.weapons, data.abilities, data.profBonus, set).filter(pick);
    expect(found).toHaveLength(1);
    return found[0];
  }

  it('gives sorey off-hand Shortsword the Strength bonus its attack line already used', () => {
    // STR 12 (+1), a `+2` off-hand attack bonus and proficiency 3 make the attack
    // `+6`; the damage part carried no flat bonus, so the base ability is all of
    // it and the row reads `d6+1`, not a bare `d6`.
    const found = row('sorey', 'equipped', (r) => r.name === 'Shortsword left handed');
    expect(found.attack).toBe('+6');
    expect(found.damage).toBe('d6+1 Piercing');
  });

  it('gives teoride Staff both damage parts the Strength bonus', () => {
    // STR 14 (+2). The first part adds a flat `+2` on top of the stat, the second
    // does not, so the parts read `d6+4` and `d6+2` - and both carry the bonus the
    // `base` part already had.
    const found = row('teoride', 'equipped', (r) => r.name === 'Staff');
    expect(found.attack).toBe('+7');
    expect(found.damage).toBe('d6+4 Bludgeoning; d6+2 Bludgeoning');
  });

  it('gives viktor off-hand Dagger the Strength bonus', () => {
    // STR 14 (+2). viktor carries two Daggers, and they rendered `d4+2` and `d4`:
    // the thrown one spells its stat `base`, the off-hand one leaves it out. Both
    // now read the same.
    const data = character('viktor');
    const daggers = toWeaponRows(data.weapons, data.abilities, data.profBonus, 'equipped').filter(
      (r) => r.name === 'Dagger'
    );
    expect(daggers).toHaveLength(2);
    expect(daggers.map((r) => r.damage)).toEqual(['d4+2 Piercing', 'd4+2 Piercing']);
  });
});
