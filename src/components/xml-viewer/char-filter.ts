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

  const indices = () => characters.map((_, i) => i).filter(matchesIndex);

  return {
    matches: matchesIndex,
    indices,
    get count() {
      return indices().length;
    },
  };
}
