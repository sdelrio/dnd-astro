import type * as featData from './feat-data';
import * as feats from './feat-filter';

/**
 * The generated dataset is reached through a type-only import, so this module
 * carries no *value* edge to `./feat-data` at all and the two are free to be
 * separate chunks. ADR-0010 recorded the trap behind the previous namespace
 * import - a named import referenced from a `typeof` position loses its runtime
 * binding under the SSR transform the tests run through - and `import type` is
 * the spelling that has no runtime binding to lose. The `typeof` query stays,
 * because it is what keeps the component's field types tied to the generated
 * file rather than to a hand-written copy of its shape. ADR-0013 accepts a
 * `typeof` query when the import carrying it is erased, which is what this is.
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

/** What the generated module hands over, shaped as the component consumes it. */
export interface FeatDataset {
  feats: typeof featData.FEATS;
  books: BookLabels;
  abilities: typeof featData.ABILITIES;
}

/**
 * Where the dataset has got to. Three states rather than a pair of booleans,
 * because "no feats have arrived" and "the fetch failed" are different things
 * and the page says different words about each of them.
 */
export type FeatDatasetState = 'loading' | 'ready' | 'failed';

let pendingDataset: Promise<FeatDataset> | undefined;

/**
 * The generated feat dataset, as its own content-hashed chunk.
 *
 * #387 moved this off a static import. Statically imported, the 219 records were
 * bundled into the Alpine entrypoint, which `@astrojs/alpinejs` injects into
 * *every* page on the site, so 26KB of minified data that only the Feat Explorer
 * page can use was downloaded by all 129 of them, on first visit and on every
 * cache miss, forever. A dynamic `import()` with a literal specifier tells the
 * bundler to emit the module as a separate chunk and leave a loader behind, so:
 *
 * - the entrypoint on the other 128 pages shrinks by the whole dataset;
 * - this page's entrypoint shrinks by the same amount and asks for the data
 *   chunk by a content-hashed URL, which the CDN serves immutably, so the second
 *   visit costs nothing and a data change changes the filename.
 *
 * The promise is cached at module scope, so the chunk is requested at most once
 * per page however many roots mount, and a rejected promise is dropped rather
 * than cached: a failed fetch of a static asset is worth one retry, not a page
 * that can never load its data again.
 *
 * Exported so a test can await the real delivery rather than a stand-in for it.
 */
export function featDataset(): Promise<FeatDataset> {
  pendingDataset ??= import('./feat-data').then(
    (module) => ({
      feats: module.FEATS,
      books: module.BOOKS,
      abilities: module.ABILITIES,
    }),
    (error: unknown) => {
      pendingDataset = undefined;
      throw error;
    }
  );
  return pendingDataset;
}

export interface FeatExplorerComponent {
  feats: typeof featData.FEATS;
  filteredFeats: typeof featData.FEATS;
  abilities: typeof featData.ABILITIES;
  books: BookLabels;
  datasetState: FeatDatasetState;
  searchQuery: string;
  selectedAbility: string;
  selectedBook: string;
  selectedLevel: string;
  filtersOpen: boolean;
  init(): void;
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
 * Alpine calls a registered provider with no arguments, so a page gets no data
 * argument and `init()` fetches the generated dataset from its own chunk. The
 * argument is still here for two reasons: the two book-label fallbacks - an
 * unknown key, and no map at all - stay reachable states rather than dead
 * branches the shipped dataset happens not to exercise, and a caller that
 * already holds the data is spared the fetch. Passing it is also what marks the
 * component ready from the first frame, with no loading state in between.
 *
 * Eager mount is preserved: `init()` runs the moment Alpine initialises the
 * root, which is the same moment the previous static import populated the state.
 * There is no scroll trigger and no deferred hydration - only the network round
 * trip for the chunk moved, and that chunk is immutable and cached.
 */
export function featExplorerComponent(data: FeatExplorerData = {}): FeatExplorerComponent {
  // Empty rather than the generated dataset: the whole point is that the page
  // does not hold it yet. Empty until init() supplies it.
  const supplied = data.feats ?? [];
  return {
    feats: supplied,
    // Copied rather than shared: `filterFeats` is given the full list and
    // returns a new one, and the unfiltered list has to survive that.
    filteredFeats: [...supplied],
    abilities: data.abilities ?? [],
    books: data.books ?? {},
    datasetState: data.feats ? 'ready' : 'loading',
    searchQuery: '',
    selectedAbility: 'All',
    selectedBook: 'All',
    selectedLevel: 'All',
    filtersOpen: false,

    init() {
      if (this.datasetState !== 'loading') return;
      featDataset().then(
        (dataset) => {
          // Alpine evaluates `init` against the reactive scope, so `this` here
          // is the proxy the template reads: assigning through it is what makes
          // the arriving cards appear, rather than leaving the grid empty.
          this.feats = dataset.feats;
          this.filteredFeats = [...dataset.feats];
          this.abilities = dataset.abilities;
          this.books = dataset.books;
          this.datasetState = 'ready';
          // Re-run rather than leave the list untouched: a reader who typed into
          // the search box while the chunk was in flight asked a question of the
          // data that has now arrived, and it has to be answered.
          this.filterFeats();
        },
        () => {
          this.datasetState = 'failed';
        }
      );
    },

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