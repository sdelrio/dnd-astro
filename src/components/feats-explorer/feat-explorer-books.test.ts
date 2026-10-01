/**
 * Runtime coverage for the Feat Explorer's book label.
 *
 * The card footer names the book a feat comes from, and a reader who is told
 * `phb` has learned nothing - so the label resolves the key through the book
 * map. Two things have to survive that lookup: an unknown key, and a feat with
 * no book at all. Both are real states - the dataset is generated, so a feat
 * from a book the map has not caught up with is a matter of time, and an
 * unattributed feat is already in the sheet - and a label that renders empty
 * for either leaves the reader with a blank in a column of names.
 *
 * The lookup lives inside the component's inline Alpine script, which is not an
 * importable module, so the script is evaluated here the way the browser
 * evaluates it and the factory is driven directly. This is the same seam
 * `theme.test.ts` uses for an inline component script.
 *
 * The types on this path are covered by `CI=true pnpm typecheck` rather than
 * here: the `books` field has to be a string-keyed record for the index
 * expression to compile at all (#377), and no runtime assertion can see that.
 */
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { BOOKS } from './feat-data';

const source = readFileSync(new URL('./FeatExplorer.astro', import.meta.url), 'utf8');
const windows: Window[] = [];

interface FeatExplorerData {
  feats?: unknown[];
  books?: Record<string, string>;
}

interface FeatExplorer {
  bookLabel(feat: { book?: string }): string;
}

/**
 * Evaluates the component's inline script in a window and returns the Alpine
 * data factory it installs. The import lines are dropped because the browser
 * resolves them through the module graph; nothing reached from here needs them,
 * and the factory takes its data as an argument.
 */
function factory(): (data: FeatExplorerData) => FeatExplorer {
  const window = new Window({ url: 'https://dnd-astro.test/' });
  windows.push(window);
  const script = source.match(/<script>([\s\S]*?)<\/script>/)![1].replace(/^\s*import .*$/gm, '');
  window.eval(ts.transpile(script, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }));
  return (window as unknown as { featExplorer: (data: FeatExplorerData) => FeatExplorer }).featExplorer;
}

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('FeatExplorer book label', () => {
  // The whole point of the map: a reader is told "Player's Handbook", not the
  // three-letter key the dataset stores.
  it('names the book a feat comes from', () => {
    expect(factory()({ books: BOOKS }).bookLabel({ book: 'phb' })).toBe("Player's Handbook");
  });

  // A generated dataset grows a book before the map grows with it. The key is
  // still the better of the two answers - it is what the book select filters
  // on, so a reader can act on it - but it must never be an empty footer.
  it('falls back to the raw key when the book map has no entry for it', () => {
    expect(factory()({ books: BOOKS }).bookLabel({ book: 'xyz' })).toBe('xyz');
  });

  // An unattributed feat has no key to fall back to, so the footer says so.
  // Blank would read as a broken card rather than as an honest gap.
  it('reads Unattributed for a feat with no book at all', () => {
    expect(factory()({ books: BOOKS }).bookLabel({})).toBe('Unattributed');
  });

  // The map is optional in the data contract, and the page must still render
  // its footers if it arrives without one - which is the empty-object case
  // rather than a crash.
  it('falls back to the raw key when the component is given no book map', () => {
    expect(factory()({}).bookLabel({ book: 'phb' })).toBe('phb');
  });
});