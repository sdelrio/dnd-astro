import type { StoredCharacter } from '@/utils/build-xml-characters';

export interface FilterableCharacter {
  name: string;
  race: string;
  classes: { name: string; level: number }[];
}

export interface CharFilterState {
  search?: string;
  selectedClass?: string;
  selectedRace?: string;
}

export function toFilterableCharacters(characters: StoredCharacter[]): FilterableCharacter[] {
  return characters.map((c) => ({
    name: c.name,
    race: c.race,
    classes: c.classes.map((cl) => ({ name: cl.name, level: cl.level })),
  }));
}

export function createCharFilter(characters: FilterableCharacter[], state: CharFilterState = {}) {
  const search = state.search ?? '';
  const selectedClass = state.selectedClass ?? '';
  const selectedRace = state.selectedRace ?? '';

  const matchesIndex = (index: number): boolean => {
    const c = characters[index];
    if (!c) return false;
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !selectedClass || c.classes.some((cl) => cl.name === selectedClass);
    const matchesRace = !selectedRace || c.race === selectedRace;
    return matchesSearch && matchesClass && matchesRace;
  };

  return {
    matches: matchesIndex,
    get count() {
      let total = 0;
      for (let i = 0; i < characters.length; i++) {
        if (matchesIndex(i)) total++;
      }
      return total;
    },
  };
}
