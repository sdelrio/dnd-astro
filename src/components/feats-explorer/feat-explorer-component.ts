import * as featData from './feat-data';
import * as feats from './feat-filter';

/**
 * Imported as namespaces rather than by name because of the toolchain trap
 * ADR-0010 records: a named import that is also referenced from a type position
 * (`typeof FEATS`) loses its runtime binding under the SSR transform the tests
 * run through, and the value then arrives `undefined` in every test and nowhere
 * else. `featData.FEATS` is a member read, which survives.
 */

/**
 * The book key to book name map, as it reaches the component: keyed by an
 * arbitrary feat's `book`, which is a string and not one of four known
 * literals. The literal's own inferred shape would refuse that index
 * expression outright, which is the error #377 fixed.
 */
export type BookLabels = Record<string, string>;

export interface FeatExplorerData {
  feats?: typeof featData.FEATS;
  books?: BookLabels;
  abilities?: typeof featData.ABILITIES;
}

export interface FeatExplorerComponent {
  feats: typeof featData.FEATS;
  filteredFeats: typeof featData.FEATS;
  abilities: typeof featData.ABILITIES;
  books: BookLabels;
  searchQuery: string;
  selectedAbility: string;
  selectedBook: string;
  selectedLevel: string;
  filtersOpen: boolean;
  filterFeats(): void;
  clearFilters(): void;
  hasActiveFilters(): boolean;
  activeFilterCount(): number;
  tierKey(level: number): string;
  tierName(level: number): string;
  tierMono(key: string): string;
  bookLabel(feat: { book?: string }): string;
}

/** The two-letter mark stamped into the tier medallion. */
const TIER_MONO: Record<string, string> = { origin: 'OR', general: 'GE', epic: 'EB' };

/**
 * Registered with `Alpine.data('featExplorer', ...)`, so every helper the
 * template's expressions call is a property here and resolves from the
 * component's own scope. `x-data="featExplorer({...})"` with a factory on
 * `window` was the alternative, and it was what kept this behaviour untestable:
 * it was an inline script in a `.astro` file, so the only way to reach it was
 * to read that file as text.
 *
 * The data is an argument so the two book-label fallbacks - an unknown key, and
 * no map at all - stay reachable states rather than dead branches the shipped
 * dataset happens not to exercise. Alpine calls a registered provider with no
 * arguments, so a page always gets the generated dataset and the arguments exist
 * for the tests that cannot produce it.
 */
export function featExplorerComponent(data: FeatExplorerData = {}): FeatExplorerComponent {
  const all = data.feats ?? featData.FEATS;
  return {
    feats: all,
    // Copied rather than shared: `filterFeats` is given the full list and
    // returns a new one, and the unfiltered list has to survive that.
    filteredFeats: [...all],
    abilities: data.abilities ?? featData.ABILITIES,
    books: data.books ?? featData.BOOKS,
    searchQuery: '',
    selectedAbility: 'All',
    selectedBook: 'All',
    selectedLevel: 'All',
    filtersOpen: false,

    filterFeats() {
      this.filteredFeats = feats.filterFeats(this.feats, {
        search: this.searchQuery,
        ability: this.selectedAbility,
        book: this.selectedBook,
        level: this.selectedLevel,
      });
    },

    clearFilters() {
      this.searchQuery = '';
      this.selectedAbility = 'All';
      this.selectedBook = 'All';
      this.selectedLevel = 'All';
      this.filterFeats();
    },

    hasActiveFilters() {
      return this.searchQuery !== '' || this.activeFilterCount() > 0;
    },

    /** Counts the selects only. The search box is always visible below sm, so
        a query is not a reason to reveal the collapsed panel. */
    activeFilterCount() {
      return [this.selectedAbility, this.selectedBook, this.selectedLevel].filter(
        (value) => value !== 'All'
      ).length;
    },

    tierKey(level: number) {
      return level === 0 ? 'origin' : level >= 19 ? 'epic' : 'general';
    },

    tierName(level: number) {
      return level === 0 ? 'Origin' : level >= 19 ? 'Epic Boon' : 'General';
    },

    tierMono(key: string) {
      return TIER_MONO[key] ?? '';
    },

    bookLabel(feat: { book?: string }) {
      return feat.book ? this.books[feat.book] || feat.book : 'Unattributed';
    },
  };
}