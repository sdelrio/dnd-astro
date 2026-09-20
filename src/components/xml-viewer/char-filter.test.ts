import { describe, it, expect } from 'vitest';
import { createCharFilter, toFilterableCharacters } from './char-filter';
import type { StoredCharacter } from '@/utils/build-xml-characters';

const characters = [
  {
    name: 'Aelar',
    race: 'Elf',
    classes: [{ name: 'Ranger', level: 5 }],
  },
  {
    name: 'Borin',
    race: 'Dwarf',
    classes: [{ name: 'Fighter', level: 3 }],
  },
  {
    name: 'Caelwyn',
    race: 'Elf',
    classes: [{ name: 'Wizard', level: 2 }],
  },
];

describe('createCharFilter', () => {
  it('matches every character when no filters are set', () => {
    const filter = createCharFilter(characters);
    expect(filter.matches(0)).toBe(true);
    expect(filter.matches(1)).toBe(true);
    expect(filter.matches(2)).toBe(true);
    expect(filter.count).toBe(3);
  });

  it('matches by name case-insensitively', () => {
    const filter = createCharFilter(characters, { search: 'bor' });
    expect(filter.matches(1)).toBe(true);
    expect(filter.matches(0)).toBe(false);
    expect(filter.count).toBe(1);
  });

  it('matches a character that has the selected class', () => {
    const filter = createCharFilter(characters, { selectedClass: 'Wizard' });
    expect(filter.matches(2)).toBe(true);
    expect(filter.matches(0)).toBe(false);
    expect(filter.count).toBe(1);
  });

  it('matches by exact race', () => {
    const filter = createCharFilter(characters, { selectedRace: 'Elf' });
    expect(filter.matches(0)).toBe(true);
    expect(filter.matches(2)).toBe(true);
    expect(filter.matches(1)).toBe(false);
    expect(filter.count).toBe(2);
  });

  it('combines filters with AND', () => {
    const filter = createCharFilter(characters, {
      search: 'ae',
      selectedClass: 'Wizard',
      selectedRace: 'Elf',
    });
    expect(filter.matches(2)).toBe(true);
    expect(filter.matches(0)).toBe(false);
    expect(filter.count).toBe(1);
  });

  it('returns no matches when filters contradict', () => {
    const filter = createCharFilter(characters, {
      selectedClass: 'Wizard',
      selectedRace: 'Dwarf',
    });
    expect(filter.count).toBe(0);
    expect(filter.matches(0)).toBe(false);
    expect(filter.matches(1)).toBe(false);
    expect(filter.matches(2)).toBe(false);
  });
});

describe('toFilterableCharacters', () => {
  const fullCharacter: StoredCharacter = {
    name: 'Aelar',
    race: 'Elf',
    alignment: 'Chaotic Good',
    background: 'Sage',
    deity: '',
    classes: [{ name: 'Ranger', level: 5, subclass: 'Gloom Stalker' }],
    abilities: {
      dexterity: { score: 16, bonus: 3, save: 3, saveprof: 1 },
    },
    ac: 14,
    hp: 44,
    tempHp: 0,
    speed: 30,
    initiative: 2,
    profBonus: 3,
    skills: [{ name: 'Perception', total: 6 }],
    languages: ['Common'],
    feats: ['Sharpshooter'],
    features: [{ level: 1, name: 'Favored Enemy', source: 'Ranger' }],
    powers: [],
    filename: 'aelar',
    avatarPath: '/fg/avatar/aelar.jpg',
  };

  it('keeps only the fields the filter needs, preserving order', () => {
    const payload = toFilterableCharacters([fullCharacter, { ...fullCharacter, name: 'Borin' }]);
    expect(payload).toEqual([
      { name: 'Aelar', race: 'Elf', classes: [{ name: 'Ranger', level: 5 }] },
      { name: 'Borin', race: 'Elf', classes: [{ name: 'Ranger', level: 5 }] },
    ]);
  });

  it('produces a payload the shared filter can match against', () => {
    const filter = createCharFilter(toFilterableCharacters([fullCharacter]), {
      search: 'ael',
      selectedClass: 'Ranger',
      selectedRace: 'Elf',
    });
    expect(filter.matches(0)).toBe(true);
    expect(filter.count).toBe(1);
  });
});
