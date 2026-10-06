/**
 * Runtime coverage for the Feat Explorer's Alpine expressions.
 *
 * Every expression in this component is a string, so the only net that catches
 * a broken one is running it: these tests boot the real component against the
 * real rendered markup and drive it the way a reader does - typing in the
 * search box, picking a book, pressing clear. See
 * `src/test-utils/alpine-dom.ts` for why that needs a harness.
 *
 * This file replaces the two source-scanning suites that used to cover the
 * component. `feat-explorer-books.test.ts` transpiled the `.astro` file's own
 * `<script>` block with `ts.transpile` and called the factory the browser would
 * have found on `window`; a string read as text cannot tell a working
 * expression from a broken one, which is the defect class ADR-0010 names. The
 * book-label cases that suite covered are still covered, but at the seam the
 * behaviour now lives at.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import FeatExplorer from './FeatExplorer.astro';
import { BOOKS, FEATS } from './feat-data';
import { featDataset, featExplorerComponent } from './feat-explorer-component';
import { filterFeats, UNATTRIBUTED_BOOK } from './feat-filter';
import { mountAlpine, type MountedAlpine } from '@/test-utils/alpine-dom';

let harness: MountedAlpine;

beforeEach(async () => {
  // Mounted with no props, exactly as the page renders it, so every test below
  // drives the shipped delivery path: the component fetches the dataset chunk
  // rather than receiving it. Awaiting the module's own loader - rather than
  // sleeping and hoping - is what makes that deterministic; the chunk is already
  // in the module graph under test, so there is no timing to race.
  harness = await mountAlpine(FeatExplorer);
  await featDataset();
  await harness.settle();
});

/** The rendered cards, in dataset order. */
function cards(): HTMLElement[] {
  return [...harness.window.document.querySelectorAll('.fx-card')] as unknown as HTMLElement[];
}

function cardNames(): string[] {
  return cards().map((card) => text(card.querySelector('.fx-name')));
}

/**
 * happy-dom's element and event types are not the DOM lib's, which is what
 * TypeScript compiles the tests against. The objects are the same either way,
 * so the harness's window is read through `unknown` rather than cast field by
 * field.
 */
function text(el: unknown): string {
  const node = el as { textContent?: string } | null;
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The head's live region: "N of M feats on this sheet". */
function countline(): string {
  return text(harness.window.document.querySelector('.fx-countline'));
}

async function type(value: string): Promise<void> {
  const input = harness.window.document.querySelector('#fx-search') as unknown as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new harness.window.Event('input', { bubbles: true }) as unknown as Event);
  // The box is `@input.debounce.300ms`, so the filter runs on a timer rather
  // than on the event itself.
  await harness.settle(350);
}

async function pick(selectId: string, value: string): Promise<void> {
  const select = harness.window.document.querySelector(`#${selectId}`) as unknown as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new harness.window.Event('change', { bubbles: true }) as unknown as Event);
  await harness.settle();
}

async function click(selector: string): Promise<void> {
  const el = harness.window.document.querySelector(selector) as unknown as HTMLElement;
  if (!el) throw new Error(`no element for ${selector}`);
  el.dispatchEvent(new harness.window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  await harness.settle();
}

describe('FeatExplorer at runtime', () => {
  it('registers the component, so no expression falls back to a global', () => {
    // Without `Alpine.data('featExplorer', ...)`, `x-data="featExplorer"` is an
    // unresolved identifier and Alpine warns rather than throwing, so an
    // unread `messages` would render a clean-looking empty sheet.
    expect(harness.messages).toEqual([]);
    expect(cards().length).toBeGreaterThan(0);
  });

  it('opens with every feat on the sheet and nothing filtered', () => {
    expect(cards()).toHaveLength(FEATS.length);
    expect(countline()).toBe(`${FEATS.length} of ${FEATS.length} feats on this sheet`);
    // "All" on all three selects, and no query in the box: the untouched state.
    expect(text(harness.window.document.querySelector('#fx-search'))).toBe('');
    for (const id of ['fx-ability', 'fx-book', 'fx-level']) {
      const select = harness.window.document.querySelector(`#${id}`) as unknown as HTMLSelectElement;
      expect(select.value, id).toBe('All');
      expect(select.options, id).toHaveLength(id === 'fx-level' ? 5 : id === 'fx-book' ? 6 : 7);
    }
  });

  it('narrows the grid to a search and says so in the live region', async () => {
    await type('luck');
    // Fuzzy match, not substring: "luck" reaches Lucky through the levenshtein
    // tolerance and through nothing else.
    expect(cardNames()).toEqual(['Lucky']);
    expect(countline()).toBe(`1 of ${FEATS.length} feats on this sheet`);
    expect(harness.messages).toEqual([]);
  });

  it('narrows the grid to a book, and says so in the live region', async () => {
    await pick('fx-book', 'hof');
    const expected = FEATS.filter((feat) => feat.book === 'hof');
    expect(expected.length).toBe(32);
    expect(cardNames()).toEqual(expected.map((feat) => feat.name));
    expect(countline()).toBe(`${expected.length} of ${FEATS.length} feats on this sheet`);
  });

  it('offers the unattributed feats as their own book option (#458)', async () => {
    // The ten feats with no book used to be unreachable once any book was
    // picked. The option is the fix, and it lists exactly those ten - not the
    // named books, and not the named books' feats.
    const book = harness.window.document.querySelector('#fx-book') as unknown as HTMLSelectElement;
    const option = [...book.options].find((o) => o.value === UNATTRIBUTED_BOOK);
    expect(option?.textContent?.trim()).toBe('Unattributed');

    const expected = FEATS.filter((feat) => !feat.book);
    expect(expected).toHaveLength(10);
    await pick('fx-book', UNATTRIBUTED_BOOK);
    expect(cardNames()).toEqual(expected.map((feat) => feat.name));
    expect(countline()).toBe(`${expected.length} of ${FEATS.length} feats on this sheet`);
    expect(harness.messages).toEqual([]);
  });

  it('reaches every feat through a single book option', () => {
    // The invariant from #458, asserted against the options the select
    // actually renders: no feat in the archive is left with no book selection
    // that returns it. Scoped to the book dimension, which is the one whose
    // options did not cover the dataset, and to the specific buckets ("All" is
    // the no-filter default, so counting it would make the assertion vacuous).
    const book = harness.window.document.querySelector('#fx-book') as unknown as HTMLSelectElement;
    const values = [...book.options]
      .map((option) => option.value)
      .filter((value) => value !== 'All');

    const reached = new Set<string>();
    for (const value of values) {
      for (const feat of filterFeats(FEATS, { book: value })) reached.add(feat.name);
    }
    expect(reached.size).toBe(FEATS.length);

    // And none of the named buckets may carry an unattributed feat: the ten are
    // reached only by the Unattributed option.
    const unattributed = new Set(FEATS.filter((feat) => !feat.book).map((feat) => feat.name));
    for (const value of values.filter((v) => v !== UNATTRIBUTED_BOOK)) {
      for (const feat of filterFeats(FEATS, { book: value })) {
        expect(unattributed.has(feat.name), `${feat.name} leaked into ${value}`).toBe(false);
      }
    }
  });

  it('stacks a search on a filter, so the two narrow together', async () => {
    await pick('fx-book', 'hof');
    await type('agent');
    const expected = FEATS.filter((feat) => feat.book === 'hof' && /agent/i.test(feat.name));
    expect(cardNames().length).toBeGreaterThan(0);
    expect(cardNames()).toEqual(expected.map((feat) => feat.name));
  });

  it('reports an empty grid rather than a blank one', async () => {
    await type('zzzznotafeat');
    expect(cards()).toHaveLength(0);
    // The count span renders a literal `0` in a browser, which happy-dom
    // coerces to the empty string on `textContent` - a harness artefact, not
    // the page's output. The zero is asserted as the card count above, and
    // this line carries the half of the sentence the harness can see.
    expect(countline()).toBe(`of ${FEATS.length} feats on this sheet`);
    // The empty state is `x-show`, which hides by writing an inline display,
    // so unlike a class binding it is observable here.
    const empty = harness.window.document.querySelector('.fx-empty') as unknown as HTMLElement;
    expect(empty.style.display).toBe('');
    expect(text(empty)).toBe('No feats match your filters.');
  });

  it('puts every feat back when the clear control is pressed', async () => {
    await type('luck');
    await pick('fx-book', 'hof');
    await click('.fx-clear');
    expect(cards()).toHaveLength(FEATS.length);
    expect(text(harness.window.document.querySelector('#fx-search'))).toBe('');
  });

  it('counts the selects on the disclosure toggle, and not the search box', async () => {
    // The box is always visible below sm, so a query is not a reason to reveal
    // the collapsed panel. The count is asserted against the state behind the
    // element that carries it: `x-show` on the badge and the toggle's own
    // `aria-expanded`, neither of which is a class binding.
    const toggle = harness.window.document.querySelector('.fx-filters-toggle') as unknown as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    await type('luck');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const badge = toggle.querySelector('span:last-of-type') as unknown as HTMLElement;
    expect(badge.style.display).toBe('none');

    await pick('fx-book', 'hof');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(badge.style.display).toBe('');
    expect(text(badge)).toBe('1');

    await pick('fx-ability', 'Strength');
    expect(text(badge)).toBe('2');

    await click('.fx-filters-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = harness.window.document.querySelector('#fx-panel') as unknown as HTMLElement;
    expect(panel.style.display).toBe('');
  });

  it('stamps the tier mark on each card from the feat level, not the category', async () => {
    await type('lucky');
    const card = cards()[0];
    // Lucky is an Origin feat: `level === 0`, and its `category` happens to
    // agree, so the pair below is what makes the assertion about `level`.
    expect(card.getAttribute('data-tier')).toBe('origin');
    expect(text(card.querySelector('.fx-seal'))).toBe('OR');
    expect(text(card.querySelector('.fx-tier'))).toBe('Origin');
    expect(harness.messages).toEqual([]);
  });

  it('stamps General and Epic Boon seals on the levels above zero', async () => {
    const general = FEATS.find((feat) => feat.name === 'Mage Slayer')!;
    await type('mage slayer');
    expect(cards()[0].getAttribute('data-tier')).toBe('general');
    expect(text(cards()[0].querySelector('.fx-seal'))).toBe('GE');
    expect(text(cards()[0].querySelector('.fx-tier'))).toBe('General');
    expect(general.level).toBe(4);

    await pick('fx-level', '19');
    await type('combat prowess');
    expect(cards()[0].getAttribute('data-tier')).toBe('epic');
    expect(text(cards()[0].querySelector('.fx-seal'))).toBe('EB');
    expect(text(cards()[0].querySelector('.fx-tier'))).toBe('Epic Boon');
  });

  it('names the book a feat comes from, and admits an unattributed one', async () => {
    await type('lucky');
    expect(text(cards()[0].querySelector('.fx-book'))).toBe(BOOKS.phb);

    // The dataset carries ten feats with no `book` at all. A blank footer would
    // read as a broken card rather than as an honest gap.
    const unattributed = FEATS.find((feat) => feat.book === undefined)!;
    await pick('fx-ability', 'All');
    await type(unattributed.name);
    expect(cardNames()).toEqual([unattributed.name]);
    expect(text(cards()[0].querySelector('.fx-book'))).toBe('Unattributed');
  });

  it('renders the prerequisite line only for a feat that has one', async () => {
    const withPrereq = FEATS.find((feat) => feat.prerequisite !== undefined)!;
    await type(withPrereq.name);
    // The label and the requirement are two spans separated by the label's own
    // margin, not by a space, so they are read separately.
    expect(text(cards()[0].querySelector('.fx-prereq-k'))).toBe('Requires');
    expect(text(cards()[0].querySelector('.fx-prereq span:last-of-type'))).toBe(
      withPrereq.prerequisite
    );

    await pick('fx-ability', 'All');
    await type('lucky');
    expect(cards()[0].querySelector('.fx-prereq')).toBeNull();
  });
});

describe('the book label, on states the shipped dataset does not contain', () => {
  // The mounted suite above covers the two labels real data produces. These are
  // the two the generated dataset cannot currently produce, and they are the
  // branches that keep it honest as it grows: a book the map has not caught up
  // with, and a page that arrives with no book names at all. The factory takes
  // its data as an argument, so a case can be handed to it directly - which is
  // the seam this behaviour moved to, and the reason these no longer need the
  // component's source text.
  it('falls back to the raw key when the book map has no entry for it', () => {
    expect(featExplorerComponent({ books: BOOKS }).bookLabel({ book: 'xyz' })).toBe('xyz');
  });

  it('falls back to the raw key when the page arrives with no book names in it', () => {
    // An empty map rather than an absent one, because that is what the data
    // contract produces when a caller has no names to pass: the key is still
    // the better of the two answers - it is what the book select filters on, so
    // a reader can act on it - but it must never be an empty footer.
    expect(featExplorerComponent({ books: {} }).bookLabel({ book: 'phb' })).toBe('phb');
  });

  it('starts empty and says so, rather than pretending the sheet is empty', () => {
    // The counterpart to the mounted tests above, and the reason the count line
    // is gated. Called with no data at all, so this is the pre-delivery state:
    // the grid is empty, and the page's own words must be about the fetch rather
    // than about the reader's filters.
    const component = featExplorerComponent();
    expect(component.datasetState).toBe('loading');
    expect(component.feats).toHaveLength(0);
    expect(component.filteredFeats).toHaveLength(0);
  });
});

describe('the dataset arrives as its own chunk, not inside the page', () => {
  // #387. The component used to hold the dataset through a static import, which
  // put all 219 records into the Alpine entrypoint - the bundle injected into
  // every page on the site. These are the tests that pin the replacement shape.

  it('loads the whole generated dataset into a component that was given none', async () => {
    // Mounted with no props and awaited past the loader, this is the assertion
    // that the split did not cost the component its data.
    expect(cards()).toHaveLength(FEATS.length);
    expect(countline()).toBe(`${FEATS.length} of ${FEATS.length} feats on this sheet`);
    expect(harness.messages).toEqual([]);
  });

  it('fills both selects from the chunk, not just the grid', async () => {
    const book = harness.window.document.querySelector('#fx-book') as unknown as HTMLSelectElement;
    const ability = harness.window.document.querySelector('#fx-ability') as unknown as HTMLSelectElement;
    // The four named books, the All default, and the Unattributed bucket #458
    // added, so the select can reach the ten feats that name no book.
    expect(book.options).toHaveLength(Object.keys(BOOKS).length + 2);
    expect(ability.options).toHaveLength(6 + 1);
  });

  it('answers a search typed while the chunk was still in flight', async () => {
    // The re-run in `init()`'s success path. Without it the arriving cards would
    // ignore a query the reader had already typed, which is the one regression
    // a lazily delivered dataset can introduce.
    const fresh = await mountAlpine(FeatExplorer);
    const input = fresh.window.document.querySelector('#fx-search') as unknown as HTMLInputElement;
    input.value = 'lucky';
    input.dispatchEvent(new fresh.window.Event('input', { bubbles: true }) as unknown as Event);
    await featDataset();
    await fresh.settle(350);
    const names = [...fresh.window.document.querySelectorAll('.fx-name')].map((el) =>
      (el.textContent ?? '').trim()
    );
    expect(names).toEqual(['Lucky']);
  });

  it('requests the dataset once, however many times the loader is called', async () => {
    // At most once per page is half the ticket: a cache that missed on every
    // root would be no cheaper than one shared import. The promise is cached at
    // module scope, so identity is the assertion - a re-import would resolve to
    // a different promise even where it happened to be free.
    expect(featDataset()).toBe(featDataset());
  });
});