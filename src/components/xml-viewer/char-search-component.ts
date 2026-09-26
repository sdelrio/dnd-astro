import { createCharFilter, type FilterableCharacter } from './char-filter';

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
  createFilter(): ReturnType<typeof createCharFilter>;
  activeFilterCount(): number;
  clearFilters(): void;
}

export function charSearchComponent(): CharSearchComponent {
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
      return this.createFilter().matches(index);
    },
    get matchCount() {
      return this.createFilter().count;
    },
    createFilter() {
      return createCharFilter(this.characters, {
        search: this.search,
        selectedClass: this.selectedClass,
        selectedRace: this.selectedRace,
      });
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
