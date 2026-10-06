import { describe, it, expect } from 'vitest';
import { charSearchComponent } from './char-search-component';
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

function makeComponent() {
  const component = charSearchComponent();
  component.$el = { dataset: { characters: JSON.stringify(characters) } };
  component.init();
  return component;
}

describe('charSearchComponent', () => {
  it('init loads characters from the element dataset', () => {
    const component = makeComponent();
    expect(component.characters).toHaveLength(3);
  });

  it('matches exposes the shared predicate per index', () => {
    const component = makeComponent();
    component.selectedRace = 'Dwarf';
    expect(component.matches(1)).toBe(true);
    expect(component.matches(0)).toBe(false);
  });

  it('initial state keeps every card visible with the full count before any filters', () => {
    const component = makeComponent();
    characters.forEach((_, index) => {
      expect(component.matches(index)).toBe(true);
    });
    expect(component.matchCount).toBe(characters.length);
    expect(component.matches(characters.length)).toBe(false);
  });

  it('matchCount counts characters passing the predicate', () => {
    const component = makeComponent();
    expect(component.matchCount).toBe(3);
    component.search = 'bor';
    expect(component.matchCount).toBe(1);
  });

  it('clearFilters resets state and restores full count', () => {
    const component = makeComponent();
    component.search = 'ael';
    component.selectedClass = 'Wizard';
    component.selectedRace = 'Elf';
    expect(component.matchCount).toBe(1);
    component.clearFilters();
    expect(component.search).toBe('');
    expect(component.selectedClass).toBe('');
    expect(component.selectedRace).toBe('');
    expect(component.matchCount).toBe(3);
  });
});

describe('charSearchComponent filter memoisation', () => {
  function makeCountingComponent() {
    let builds = 0;
    const component = charSearchComponent((chars, state) => {
      builds++;
      return createCharFilter(chars, state);
    });
    component.$el = { dataset: { characters: JSON.stringify(characters) } };
    component.init();
    return { component, builds: () => builds };
  }

  it('builds the filter once across a whole read pass over every card', () => {
    const { component, builds } = makeCountingComponent();
    component.search = 'e';
    for (let index = 0; index < characters.length; index++) {
      component.matches(index);
    }
    void component.matchCount;
    expect(builds()).toBe(1);
  });

  it('rebuilds exactly once per filter-input change', () => {
    const { component, builds } = makeCountingComponent();
    component.matches(0);
    component.matches(1);
    void component.matchCount;
    expect(builds()).toBe(1);

    component.search = 'bor';
    component.matches(0);
    component.matches(1);
    void component.matchCount;
    expect(builds()).toBe(2);

    component.selectedClass = 'Wizard';
    void component.matchCount;
    expect(builds()).toBe(3);

    component.selectedRace = 'Elf';
    void component.matchCount;
    expect(builds()).toBe(4);

    component.clearFilters();
    component.matches(0);
    void component.matchCount;
    expect(builds()).toBe(5);
  });

  it('keeps the count correct after every filter change, back to the unfiltered total', () => {
    const { component } = makeCountingComponent();
    expect(component.matchCount).toBe(3);
    component.search = 'bor';
    expect(component.matchCount).toBe(1);
    component.search = '';
    component.selectedClass = 'Wizard';
    expect(component.matchCount).toBe(1);
    component.selectedRace = 'Elf';
    expect(component.matchCount).toBe(1);
    component.clearFilters();
    expect(component.matchCount).toBe(3);
  });

  it('reads the same filter instance for the count and for every card', () => {
    let last: ReturnType<typeof createCharFilter> | undefined;
    const component = charSearchComponent((chars, state) => {
      last = createCharFilter(chars, state);
      return last;
    });
    component.$el = { dataset: { characters: JSON.stringify(characters) } };
    component.init();

    expect(component.filter()).toBe(last);
    expect(component.filter()).toBe(last);
  });
});

describe('charSearchComponent mobile filter disclosure', () => {
  // The two selects collapse behind a toggle below sm, so the panel state has
  // to live in the component rather than being derived in the template.
  it('starts collapsed', () => {
    expect(makeComponent().filtersOpen).toBe(false);
  });

  it('counts only the selects, since the search box is always visible below sm', () => {
    const component = makeComponent();
    component.search = 'ael';
    expect(component.activeFilterCount()).toBe(0);
    component.selectedClass = 'Wizard';
    component.selectedRace = 'Elf';
    expect(component.activeFilterCount()).toBe(2);
  });
});
