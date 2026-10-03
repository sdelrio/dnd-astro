import { describe, it, expect } from 'vitest';
import {
  resolveCastingAbility,
  spellAttackBonus,
  spellSaveDc,
  toSpellSlotRows,
  hasSpellcasting,
  isSpellGroup,
} from './spellcasting-display';
import type { CharacterData } from '@/utils/parse-character-xml';

type Abilities = CharacterData['abilities'];
type Class = CharacterData['classes'][number];

function ability(score: number) {
  return { score, bonus: Math.floor((score - 10) / 2), save: 0, saveprof: 0 };
}

/**
 * A Wizard's sheet: Intelligence 18 (+4) is the casting stat and Wisdom 16 (+3)
 * is deliberately higher than nothing but lower than it, so a wrong resolution to
 * Wisdom cannot pass as the right one by accident.
 */
const wizardAbilities: Abilities = {
  strength: ability(8),
  dexterity: ability(14),
  constitution: ability(14),
  intelligence: ability(18),
  wisdom: ability(12),
  charisma: ability(10),
};

function klass(name: string, level: number, subclass?: string): Class {
  return { name, level, ...(subclass ? { subclass } : {}) };
}

describe('resolveCastingAbility', () => {
  it.each([
    ['Wizard', 'intelligence'],
    ['Artificer', 'intelligence'],
    ['Cleric', 'wisdom'],
    ['Druid', 'wisdom'],
    ['Ranger', 'wisdom'],
    ['Bard', 'charisma'],
    ['Sorcerer', 'charisma'],
    ['Warlock', 'charisma'],
    ['Paladin', 'charisma'],
  ])('resolves %s to %s', (className, expected) => {
    const resolved = resolveCastingAbility([klass(className, 5)], wizardAbilities);
    expect(resolved.ability).toBe(expected);
    expect(resolved.recorded).toBe(true);
    expect(resolved.modifier).toBe(wizardAbilities[expected].bonus);
  });

  it('resolves Intelligence for a Fighter whose subclass is Eldritch Knight', () => {
    // A Fighter 3 has no Wizard level and no class that casts, and its spell slots
    // are half-caster slots. Without the subclass the card would either show a
    // guessed stat or show nothing.
    const resolved = resolveCastingAbility(
      [klass('Fighter', 3, 'Eldritch Knight')],
      wizardAbilities
    );
    expect(resolved.ability).toBe('intelligence');
    expect(resolved.recorded).toBe(true);
    expect(resolved.modifier).toBe(4);
  });

  it('resolves Intelligence for a Rogue whose subclass is Arcane Trickster', () => {
    const resolved = resolveCastingAbility(
      [klass('Rogue', 9, 'Arcane Trickster')],
      wizardAbilities
    );
    expect(resolved.ability).toBe('intelligence');
  });

  it('does not resolve from the Fighter class alone', () => {
    // A Fighter with no casting subclass is not a caster. The answer is still
    // returned so the section can render, but it is flagged as inferred rather
    // than presented as something the sheet recorded. Wisdom is deliberately the
    // best of the three here, so a resolution that quietly picked Intelligence
    // would fail rather than pass by coincidence.
    const martial: Abilities = {
      ...wizardAbilities,
      intelligence: ability(10),
      wisdom: ability(14),
      charisma: ability(8),
    };
    const resolved = resolveCastingAbility([klass('Fighter', 3)], martial);
    expect(resolved.recorded).toBe(false);
    expect(resolved.ability).toBe('wisdom');
    expect(resolved.modifier).toBe(2);
  });

  it('takes the higher-level class when more than one entry matches', () => {
    // Fighter 3 / Wizard 2 shows Intelligence and not the Fighter's Strength:
    // the class that actually casts is the one with the Wizard levels.
    const multiclass = resolveCastingAbility(
      [klass('Fighter', 12), klass('Wizard', 2)],
      wizardAbilities
    );
    expect(multiclass.ability).toBe('intelligence');
    expect(multiclass.recorded).toBe(true);
  });

  it('prefers the class name over a subclass at the same level', () => {
    // Cleric 3 / Fighter 3 (Eldritch Knight) is a tie between two different
    // abilities, and a class name is the stronger record: the sheet wrote
    // "Cleric" where "Eldritch Knight" is a specialisation it also wrote, but the
    // first is what a reader would call the class.
    const tie = resolveCastingAbility(
      [klass('Fighter', 3, 'Eldritch Knight'), klass('Cleric', 3)],
      wizardAbilities
    );
    expect(tie.ability).toBe('wisdom');
    expect(tie.recorded).toBe(true);
  });

  it('falls back to the best of Wisdom, Intelligence and Charisma, flagged inferred', () => {
    const martial: Abilities = {
      ...wizardAbilities,
      intelligence: ability(10),
      wisdom: ability(13),
      charisma: ability(8),
    };
    const resolved = resolveCastingAbility([klass('Barbarian', 8)], martial);
    expect(resolved.ability).toBe('wisdom');
    expect(resolved.modifier).toBe(1);
    expect(resolved.recorded).toBe(false);
  });

  it('picks Charisma as the inferred fallback when it is the best of the three', () => {
    const charismatic: Abilities = {
      ...wizardAbilities,
      wisdom: ability(8),
      intelligence: ability(10),
      charisma: ability(16),
    };
    const resolved = resolveCastingAbility([klass('Fighter', 5)], charismatic);
    expect(resolved.ability).toBe('charisma');
    expect(resolved.recorded).toBe(false);
  });

  it('falls back rather than throwing when the sheet carries no abilities at all', () => {
    const resolved = resolveCastingAbility([], {} as Abilities);
    expect(resolved.ability).toBe('wisdom');
    expect(resolved.modifier).toBe(0);
    expect(resolved.recorded).toBe(false);
  });

  it('matches a class name however the sheet cased it', () => {
    // Sheets are exported from a tool, not written by hand, so the same class
    // arrives as "Wizard" here and "wizard" there. The resolver reads a name, so
    // it must not be case-sensitive about one.
    expect(resolveCastingAbility([klass('wizard', 3)], wizardAbilities).ability).toBe(
      'intelligence'
    );
  });
});

describe('spellSaveDc and spellAttackBonus', () => {
  it('computes a Wizard 5 Save DC of 15 from proficiency 3 and Intelligence +4', () => {
    // 8 + 3 + 4 = 15. Both figures are printed formulae rather than sheet fields,
    // because a Fantasy Grounds sheet records neither.
    expect(spellSaveDc(3, 4)).toBe(15);
  });

  it('computes that Wizard\'s spell attack bonus as +7', () => {
    // 3 + 4 = 7. No +8: the +8 in the Save DC is the save's own constant, not an
    // attack's.
    expect(spellAttackBonus(3, 4)).toBe(7);
  });

  it('handles a negative casting modifier without losing the base', () => {
    // A -1 Charisma caster still gets 8 + 2 - 1 = 9, and an attack of +1.
    expect(spellSaveDc(2, -1)).toBe(9);
    expect(spellAttackBonus(2, -1)).toBe(1);
  });
});

describe('toSpellSlotRows', () => {
  const slots = [
    { level: 1, max: 4, used: 2 },
    { level: 2, max: 3, used: 3 },
    { level: 3, max: 2, used: 0 },
    { level: 4, max: 0, used: 0 },
    { level: 5, max: 1, used: 1 },
    { level: 6, max: 0, used: 0 },
    { level: 7, max: 0, used: 0 },
    { level: 8, max: 0, used: 0 },
    { level: 9, max: 0, used: 0 },
  ];

  it('keeps only the levels with slots, in level order, reading used out of total', () => {
    // A level with no slots is a plate of zeroes, and a plate grid of nine zeroes
    // is the first thing the panel would show a reader who cannot cast anything
    // at that level.
    expect(toSpellSlotRows(slots)).toEqual([
      { level: 1, label: 'Level 1', spent: '2/4' },
      { level: 2, label: 'Level 2', spent: '3/3' },
      { level: 3, label: 'Level 3', spent: '0/2' },
      { level: 5, label: 'Level 5', spent: '1/1' },
    ]);
  });

  it('distinguishes a full level from an empty one rather than showing both as a bare total', () => {
    const rows = toSpellSlotRows(slots);
    expect(rows.find((r) => r.level === 2)?.spent).toBe('3/3');
    expect(rows.find((r) => r.level === 3)?.spent).toBe('0/2');
  });

  it('returns nothing at all when the character has no slots', () => {
    expect(toSpellSlotRows(slots.map((s) => ({ ...s, max: 0, used: 0 })))).toEqual([]);
    expect(toSpellSlotRows([])).toEqual([]);
  });

  it('renders nine populated levels for a caster who has them all', () => {
    // The worst case for a plate grid, and the reason the label is a level number
    // rather than a word: nine plates have to be scannable at a glance.
    const full = toSpellSlotRows(
      Array.from({ length: 9 }, (_, i) => ({ level: i + 1, max: 4, used: 1 }))
    );
    expect(full).toHaveLength(9);
    expect(full.map((r) => r.label)).toEqual([
      'Level 1',
      'Level 2',
      'Level 3',
      'Level 4',
      'Level 5',
      'Level 6',
      'Level 7',
      'Level 8',
      'Level 9',
    ]);
  });

  it('reports a sheet that says it spent more slots than it has rather than correcting it', () => {
    // Clamping would make the card disagree with the sheet in front of the player,
    // and the disagreement would be invisible: 4/4 looks exactly like 2/2 spent.
    expect(toSpellSlotRows([{ level: 1, max: 2, used: 4 }])).toEqual([
      { level: 1, label: 'Level 1', spent: '4/2' },
    ]);
  });
});

describe('isSpellGroup', () => {
  it.each([
    ['Spells', true],
    ['Spells Domain (Life)', true],
    ['Cantrips', true],
    ['Barbarian Actions', false],
    ['Rogue Abilities', false],
    ['', false],
  ])('reads %j as spell-group: %s', (group, expected) => {
    expect(isSpellGroup(group)).toBe(expected);
  });
});

describe('hasSpellcasting', () => {
  it('is true for a class the casting table recognises', () => {
    expect(hasSpellcasting([klass('Cleric', 3)], [])).toBe(true);
  });

  it('is true for a subclass the casting table recognises, with no spell powers at all', () => {
    // An Eldritch Knight whose sheet carries no spell entries still casts; the
    // card must not decide otherwise from the absence of a power list.
    expect(hasSpellcasting([klass('Fighter', 3, 'Eldritch Knight')], [])).toBe(true);
  });

  it('is true for a half-caster with one spell power and no casting class', () => {
    // The gate that keeps a pure martial character out of the section is also the
    // gate that must not keep this character out of it.
    const powers: CharacterData['powers'] = [
      { level: 3, name: 'Fire Bolt', group: 'Spells', prepared: 1, preparedDomain: 0 },
    ];
    expect(hasSpellcasting([klass('Fighter', 3, 'Champion')], powers)).toBe(true);
  });

  it('is false for a character with no spell powers and no recognised class or subclass', () => {
    const powers: CharacterData['powers'] = [
      { level: 1, name: 'Rage', group: 'Barbarian Actions', prepared: 0, preparedDomain: 0 },
    ];
    expect(hasSpellcasting([klass('Barbarian', 8)], powers)).toBe(false);
  });

  it('is false for a character with nothing on the sheet at all', () => {
    expect(hasSpellcasting([], [])).toBe(false);
  });
});
