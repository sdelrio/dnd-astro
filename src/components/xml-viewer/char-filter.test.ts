import { describe, it, expect } from 'vitest';
import { createCharFilter } from './char-filter';

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
