import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * #352: the net that would have caught #351 before it shipped.
 *
 * Nothing else in this repo can see a Node builtin in the client graph, and the
 * reason is structural rather than an oversight. The type checker sees valid
 * TypeScript on both sides of the edge. The Alpine DOM harness imports the same
 * entrypoint the site uses, but under a Node test environment, where
 * `readFileSync` resolves perfectly. The production build tree-shakes the unused
 * build-time function away and drops the import, so the bundle is clean and the
 * built site works. Only the browser ever evaluates the bad edge, and it does so
 * by throwing - which under `astro dev` lands before `Alpine.start()` and leaves
 * every page on the site inert. Under a build it is a warning in the log.
 *
 * So this asserts a property of the module *graph*, statically. It is the one
 * place where reading the source is the correct instrument: the defect is
 * precisely a shape the runtime tools erase and the compiler permits.
 *
 * ADR-0013 is the decision this enforces. Its first rule is that a browser-bound
 * module may not reach a build-side module, not even for a value it happens not
 * to call - so the walk does not stop at the first Node builtin, and it reports
 * every one it finds, each with the chain that got there.
 *
 * The sweep has two roots, because the class of bug has two shapes:
 *
 * - `src/alpine.ts`, the entrypoint injected into every page. A bad edge here
 *   breaks the whole site.
 * - the client scripts embedded in `.astro` files, which is where a
 *   self-registering component like the feat explorer lives. A bad edge there
 *   breaks exactly one page, silently, which is quieter and not less bad.
 */

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(REPO, 'src');
/** The entrypoint `@astrojs/alpinejs` injects into every page. */
const ALPINE_ENTRY = resolve(SRC, 'alpine.ts');

/** Extensions a first-party specifier is allowed to resolve to. */
const RESOLVABLE = ['', '.ts', '.js', '.mjs', '.astro', '/index.ts', '/index.js'];

/** A Node builtin, spelled either way. `node:fs` and `fs` are the same module. */
const NODE_BUILTINS = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));

/**
 * Edges a browser bundle would keep.
 *
 * `import type` is deliberately absent: the compiler erases it, so it leaves no
 * edge to resolve, nothing to externalise and nothing to throw on. That erasure
 * is the whole of ADR-0013's fix, and a walk that counted a type-only import
 * would be modelling a graph the bundler never builds. A `typeof` query against
 * a value is a value import wearing a type hat, so it is counted, as it must be.
 */
const VALUE_EDGES = [
  // import ... from 'x'   /   export ... from 'x'
  /^\s*(?:import|export)\s[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/gm,
  // import 'x'
  /^\s*import\s+['"]([^'"]+)['"]/gm,
  // import('x') - a dynamic import is still an edge the bundler resolves.
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/** `import type` / `export type`, including the braced multi-line spelling. */
const TYPE_ONLY_EDGES = /^\s*(?:import|export)\s+type\s[\s\S]*?;/gm;

/** The client half of a `.astro` file: every `<script>` block, frontmatter excluded. */
const ASTRO_SCRIPT = /<script[^>]*>([\s\S]*?)<\/script>/g;

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

/** The source the browser would evaluate in `file`. */
function clientSource(file: string): string {
  const source = read(file);
  if (!file.endsWith('.astro')) return source;
  return [...source.matchAll(ASTRO_SCRIPT)]
    .map((match) => match[1])
    .join('\n');
}

/**
 * Every value-edge specifier in `source`, in source order and deduped.
 *
 * The `import type` spans are measured first and then skipped by position, so a
 * type-only statement is removed even when its specifier is the only one in the
 * file. An inline `import { type Role }` modifier is not recognised and is
 * counted as a value edge: over-reporting a type-only import is the safe
 * direction, because it can only send someone to look at a line that is
 * already correct.
 */
function edgesIn(source: string): string[] {
  const typeOnlySpans: [number, number][] = [...source.matchAll(TYPE_ONLY_EDGES)].map((match) => [
    match.index ?? 0,
    (match.index ?? 0) + match[0].length,
  ]);
  const inside = (index: number): boolean =>
    typeOnlySpans.some(([start, end]) => index >= start && index < end);

  const edges = new Set<string>();
  for (const pattern of VALUE_EDGES) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (inside(match.index)) continue;
      edges.add(match[1]);
    }
  }
  return [...edges];
}

/** Repo-relative, forward-slashed, so a failure message reads as a path. */
function label(file: string): string {
  return relative(REPO, file).split(sep).join('/');
}

type Kind = 'first-party' | 'third-party' | 'node-builtin';

function classify(specifier: string): Kind {
  if (specifier.startsWith('node:')) return 'node-builtin';
  if (specifier.startsWith('.') || specifier.startsWith('@/')) return 'first-party';
  if (NODE_BUILTINS.has(specifier)) return 'node-builtin';
  return 'third-party';
}

/** Resolve a first-party specifier to a file on disk, or null if there is none. */
function resolveFirstParty(specifier: string, from: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(SRC, specifier.slice(2))
    : resolve(dirname(from), specifier);
  for (const suffix of RESOLVABLE) {
    const candidate = `${base}${suffix}`;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not this spelling. Try the next one.
    }
  }
  return null;
}

type Leak = {
  /** The Node builtin that reached the browser. */
  specifier: string;
  /** The first-party modules walked to get there, entry first, offender last. */
  chain: string[];
};

type Walk = {
  /** First-party modules reached, entry first. Breadth-first, so this is a BFS order. */
  visited: string[];
  /** Every Node builtin reached, each with the chain that reached it. */
  leaks: Leak[];
  /** Third-party specifiers seen, deduped. Never opened: not this repo's boundary. */
  thirdParty: string[];
  /** First-party specifiers that resolved to no file. A broken walk shows up here. */
  unresolved: string[];
};

function chainTo(file: string, cameFrom: Map<string, string | null>): string[] {
  const chain = [file];
  let current = file;
  for (let guard = 0; guard < 100; guard += 1) {
    const parent = cameFrom.get(current);
    if (parent === undefined || parent === null) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain.map(label);
}

/**
 * Walk the first-party import graph from `entry` and report every Node builtin
 * it reaches.
 *
 * Third-party specifiers are recorded and not followed. A dependency's own
 * internals are not this repo's boundary to enforce, and following them would
 * make the walk both slower and wrong: the test would report other people's
 * bundling choices as this repo's failure.
 */
function walk(entry: string): Walk {
  const visited: string[] = [];
  const cameFrom = new Map<string, string | null>([[entry, null]]);
  const leaks: Leak[] = [];
  const thirdParty = new Set<string>();
  const unresolved = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    visited.push(current);
    for (const specifier of edgesIn(clientSource(current))) {
      const kind = classify(specifier);
      if (kind === 'node-builtin') {
        leaks.push({ specifier, chain: chainTo(current, cameFrom) });
        continue;
      }
      if (kind === 'third-party') {
        thirdParty.add(`${specifier} (from ${label(current)})`);
        continue;
      }
      const resolved = resolveFirstParty(specifier, current);
      if (resolved === null) {
        unresolved.add(`${specifier} (from ${label(current)})`);
        continue;
      }
      if (!cameFrom.has(resolved)) {
        cameFrom.set(resolved, current);
        queue.push(resolved);
      }
    }
  }

  return {
    visited,
    leaks,
    thirdParty: [...thirdParty],
    unresolved: [...unresolved],
  };
}

/** Every `.astro` file under `src/`, recursively. */
function astroFiles(dir: string = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) return astroFiles(full);
    return full.endsWith('.astro') ? [full] : [];
  });
}

/** The components `src/alpine.ts` registers, paired with the specifier each came from. */
function registeredComponents(): { name: string; specifier: string }[] {
  const source = read(ALPINE_ENTRY);
  const imported = new Map<string, string>();
  for (const match of source.matchAll(/import\s+([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g)) {
    for (const binding of match[1].replace(/[{}]/g, '').split(',')) {
      const name = binding.trim().split(/\s+as\s+/).pop();
      if (name) imported.set(name, match[2]);
    }
  }
  return [...source.matchAll(/Alpine\.data\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_$]+)\s*\)/g)].map(
    (match) => ({ name: match[2], specifier: imported.get(match[2]) ?? '' })
  );
}

const walkFromAlpine = walk(ALPINE_ENTRY);

describe('the browser-bound graph (issue #352)', () => {
  describe('the scanner', () => {
    it('reads a value import as an edge', () => {
      expect(edgesIn("import { readFileSync } from 'node:fs';")).toEqual(['node:fs']);
    });

    it('does not read a type-only import as an edge, because the compiler erases it', () => {
      // This is the fix itself, from ADR-0013. A walk that counted it would
      // forbid the only sanctioned way for client code to name build-side data.
      const source = [
        "import type { Role, RoleConfig } from './party-roles';",
        "import { partyViewComponent } from './party-view-component';",
      ].join('\n');
      expect(edgesIn(source)).toEqual(['./party-view-component']);
    });

    it('reads a re-export as an edge, because a re-export pulls the module in', () => {
      const source = "export { ROLE_CONFIG } from './party-roles';";
      expect(edgesIn(source)).toEqual(['./party-roles']);
    });

    it('reads a dynamic import as an edge', () => {
      expect(edgesIn("const m = await import('node:fs');")).toEqual(['node:fs']);
    });

    it('spells a Node builtin the same way with or without the node: prefix', () => {
      expect(classify('node:fs')).toBe('node-builtin');
      expect(classify('fs')).toBe('node-builtin');
    });

    it('classifies a bare specifier as third-party, so it is recorded and never opened', () => {
      expect(classify('alpinejs')).toBe('third-party');
      expect(classify('@alpinejs/intersect')).toBe('third-party');
    });
  });

  describe('the walk from the Alpine entrypoint', () => {
    it('registers every component the entrypoint declares, and resolves every one of them', () => {
      // The non-vacuity property. A walker that resolved nothing would return an
      // empty `visited` and pass every other assertion here for the wrong
      // reason; this fails instead. `unresolved` is the same guard from the
      // other side: a first-party specifier that resolves to no file is a broken
      // walk, not a clean graph.
      const components = registeredComponents();
      expect(components).toEqual([
        { name: 'charSearchComponent', specifier: '@/components/xml-viewer/char-search-component' },
        { name: 'pointBuyComponent', specifier: '@/components/point-buy/point-buy-component' },
        { name: 'diceRollerComponent', specifier: '@/components/dice-roller/dice-roller-component' },
        { name: 'partyViewComponent', specifier: '@/components/xml-viewer/party-view-component' },
      ]);

      const reached = components.map(({ specifier }) => resolveFirstParty(specifier, ALPINE_ENTRY));
      expect(reached.every((file) => file !== null)).toBe(true);
      expect(walkFromAlpine.visited).toEqual(expect.arrayContaining(reached));
      expect(walkFromAlpine.unresolved).toEqual([]);
    });

    it('reaches no Node builtin from the entrypoint', () => {
      // Every entrypoint is injected into every page, so a leak here is the
      // whole site going inert rather than one page. The chain is in the message
      // because the file alone does not say how it got there.
      expect(walkFromAlpine.leaks).toEqual([]);
    });

    it('builds the chain from the entrypoint down to the file holding the bad import', () => {
      // Unit coverage for the chain builder, so the reporting cannot silently
      // degrade to "the offending file" after the real graph is clean. The proof
      // that the chain is right is planting the regression and reading it.
      const entry = ALPINE_ENTRY;
      const middle = resolve(SRC, 'components/xml-viewer/party-view-component.ts');
      const cameFrom = new Map<string, string | null>([
        [entry, null],
        [middle, entry],
      ]);
      expect(chainTo(middle, cameFrom)).toEqual([
        'src/alpine.ts',
        'src/components/xml-viewer/party-view-component.ts',
      ]);
    });

    it('does not traverse third-party packages', () => {
      // The boundary is this repo's own code. A dependency's internals are
      // recorded as a dependency edge and never opened, so the walk cannot
      // report another package's bundling choice as a failure here.
      expect(walkFromAlpine.thirdParty).toEqual(
        expect.arrayContaining(['@alpinejs/intersect (from src/alpine.ts)'])
      );
      // `alpinejs` itself is a type-only import at the entrypoint, so it is not
      // a third-party *edge* at all - the erasure ADR-0013 relies on.
      expect(walkFromAlpine.thirdParty).not.toContain('alpinejs (from src/alpine.ts)');
      expect(walkFromAlpine.visited.filter((file) => file.includes('node_modules'))).toEqual([]);
      // Stronger than "no node_modules happened to be visited": every file the
      // walk opened is first-party source under `src/`, so it could not have
      // opened a dependency even if one were reachable.
      expect(walkFromAlpine.visited.filter((file) => !file.startsWith(SRC + sep))).toEqual([]);
      // The walk had the opportunity and declined: the entrypoint's dependency
      // edge is recorded, and the first-party modules behind the entrypoint were
      // still followed. Stopping at the third-party specifier did not stop the
      // walk.
      expect(walkFromAlpine.visited.length).toBeGreaterThan(registeredComponents().length);
      expect(walkFromAlpine.visited).toEqual(
        expect.arrayContaining([resolve(SRC, 'components/xml-viewer/party-view-component.ts')])
      );
    });
  });

  describe('the client scripts embedded in .astro files', () => {
    const scripts = astroFiles()
      .map((file) => ({ file, specifiers: edgesIn(clientSource(file)) }))
      .filter(({ specifiers }) => specifiers.length > 0);

    it('finds the embedded client scripts, so the sweep is not empty', () => {
      // The same non-vacuity guard for the second root. A sweep that matched no
      // `<script>` block would report a clean graph having looked at nothing.
      expect(scripts.map(({ file }) => label(file))).toContain(
        'src/components/feats-explorer/FeatExplorer.astro'
      );
      expect(scripts.length).toBeGreaterThan(0);
    });

    it('reaches no Node builtin from any embedded client script', () => {
      // A self-registering component lives here, so the same mistake breaks one
      // page silently instead of the whole site. Quieter, not less bad.
      const findings = scripts.flatMap(({ file }) =>
        walk(file).leaks.map((leak) => ({ entry: label(file), ...leak }))
      );
      expect(findings).toEqual([]);
    });

    it('follows an embedded script edge into a first-party module, not just its own source', () => {
      // Proves the `.astro` half of the sweep reaches *past* the file it was
      // handed. A walker that only read the `<script>` block itself would pass
      // the test above having never looked at `feat-filter.ts`.
      const featExplorer = walk(resolve(SRC, 'components/feats-explorer/FeatExplorer.astro'));
      expect(featExplorer.visited).toEqual(
        expect.arrayContaining([
          resolve(SRC, 'components/feats-explorer/FeatExplorer.astro'),
          resolve(SRC, 'components/feats-explorer/feat-filter.ts'),
        ])
      );
      expect(featExplorer.unresolved).toEqual([]);
    });
  });
});
