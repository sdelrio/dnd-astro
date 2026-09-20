import { createCharFilter, type FilterableCharacter } from './char-filter';

interface CharSearchComponent {
  $el: { dataset: Record<string, string | undefined> };
  search: string;
  selectedClass: string;
  selectedRace: string;
  characters: FilterableCharacter[];
  init(): void;
  matches(index: number): boolean;
  readonly matchCount: number;
  createFilter(): ReturnType<typeof createCharFilter>;
  clearFilters(): void;
}

export function charSearchComponent(): CharSearchComponent {
  return {
    $el: { dataset: {} },
    search: '',
    selectedClass: '',
    selectedRace: '',
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
    clearFilters() {
      this.search = '';
      this.selectedClass = '';
      this.selectedRace = '';
    },
  };
}
