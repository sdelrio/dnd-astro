import { createCharFilter, type CharFilterState, type FilterableCharacter } from './char-filter';

type CreateCharFilter = (
  characters: FilterableCharacter[],
  state?: CharFilterState,
) => ReturnType<typeof createCharFilter>;

interface CharSearchComponent {
  $el: { dataset: Record<string, string | undefined> };
  search: string;
  selectedClass: string;
  selectedRace: string;
  /** Below sm the two selects collapse behind a toggle; search stays visible. */
  filtersOpen: boolean;
  characters: FilterableCharacter[];
  init(): void;
  matches(index: number): boolean;
  readonly matchCount: number;
  filter(): ReturnType<typeof createCharFilter>;
  activeFilterCount(): number;
  clearFilters(): void;
}

export function charSearchComponent(
  createFilter: CreateCharFilter = createCharFilter,
): CharSearchComponent {
  let cached: ReturnType<typeof createCharFilter> | null = null;
  let cachedKey: string | null = null;

  return {
    $el: { dataset: {} },
    search: '',
    selectedClass: '',
    selectedRace: '',
    filtersOpen: false,
    characters: [],
    init() {
      this.characters = this.$el.dataset.characters ? JSON.parse(this.$el.dataset.characters) : [];
    },
    matches(index: number): boolean {
      return this.filter().matches(index);
    },
    get matchCount() {
      return this.filter().count;
    },
    /** One filter per distinct combination of the three filter inputs: every
        card and the count readout share the instance within a render pass. */
    filter() {
      const key = `${this.search}\u0000${this.selectedClass}\u0000${this.selectedRace}`;
      if (cached && cachedKey === key) return cached;
      cached = createFilter(this.characters, {
        search: this.search,
        selectedClass: this.selectedClass,
        selectedRace: this.selectedRace,
      });
      cachedKey = key;
      return cached;
    },
    /** Counts the selects only. The search box is always visible below sm, so
        a query is not a reason to reveal the collapsed panel. */
    activeFilterCount() {
      return [this.selectedClass, this.selectedRace].filter((value) => value !== '').length;
    },
    clearFilters() {
      this.search = '';
      this.selectedClass = '';
      this.selectedRace = '';
    },
  };
}
