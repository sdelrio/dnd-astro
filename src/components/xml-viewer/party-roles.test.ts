import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_ROLES, ROLE_CONFIG } from './party-roles';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * #351: the party view's client component used to import the party roster
 * module for its role config, and the roster module reads the roster file from
 * disk. Under `astro dev` that edge is served to the browser, the Node
 * filesystem module is externalised and throws on access, and because module
 * evaluation is atomic the throw lands before the Alpine entrypoint's last
 * statement - so Alpine never starts and the whole site is inert.
 *
 * These are static assertions about the module graph, which is exactly what the
 * defect is. They are not a substitute for a behavioural test; they are the one
 * place where reading the source is the correct instrument.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));
const ROLES_MODULE = resolve(SRC, 'party-roles.ts');
const ROSTER_MODULE = resolve(SRC, 'party-roster.ts');
const CLIENT_MODULE = resolve(SRC, 'party-view-component.ts');

const IMPORT_STATEMENT = /^\s*import\s[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
const BARE_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/gm;

function sourceOf(file: string): string {
  return readFileSync(file, 'utf8');
}

/**
 * The specifiers that become real edges in a client bundle. `import type` is
 * erased at compile time, so it is deliberately not counted - that erasure is
 * the whole fix, and a graph walk that counted it would be modelling the wrong
 * graph.
 */
function specifiersIn(file: string): string[] {
  const source = sourceOf(file).replace(/^\s*import\s+type\s[\s\S]*?;\s*$/gm, '');
  const specifiers = new Set<string>();
  for (const pattern of [IMPORT_STATEMENT, BARE_IMPORT]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) specifiers.add(match[1]);
  }
  return [...specifiers];
}

/** Every specifier in the source, type-only ones included. */
function allSpecifiersIn(file: string): string[] {
  const source = sourceOf(file);
  const specifiers = new Set<string>();
  for (const pattern of [IMPORT_STATEMENT, BARE_IMPORT]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) specifiers.add(match[1]);
  }
  return [...specifiers];
}

/** Resolve a relative or `@/` specifier to a file on disk, or null if unresolvable. */
function resolveLocal(specifier: string, from: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(SRC, '../..', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null;
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, resolve(base, 'index.ts')]) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      // Not this one. Try the next spelling.
    }
  }
  return null;
}

/**
 * Every Node builtin reachable from `entry` through the edges a client bundle
 * would keep. The walk does not stop at the first one: a graph with two leaks
 * should report both, so the failure names every module that has to be fixed.
 */
function nodeBuiltinsIn(entry: string): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  const found = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const specifier of specifiersIn(current)) {
      if (specifier.startsWith('node:')) {
        found.add(`${specifier} (from ${current.replace(`${SRC}/`, '')})`);
        continue;
      }
      const local = resolveLocal(specifier, current);
      if (local !== null && !seen.has(local)) {
        seen.add(local);
        queue.push(local);
      }
    }
  }
  return [...found];
}

describe('the browser-safe role data', () => {
  it('lives in its own module with no imports of its own', () => {
    expect(specifiersIn(ROLES_MODULE)).toEqual([]);
  });

  it('is the only source the party roster module reaches for', () => {
    const rosterImports = allSpecifiersIn(ROSTER_MODULE).filter((s) => s.includes('party-roles'));
    expect(rosterImports).toEqual(['./party-roles']);
  });

  it('lists every role the config declares, and nothing else', () => {
    // The roster module filters unknown roles with `Object.hasOwn`, so a role
    // missing from the list would be silently unselectable in the view.
    expect(new Set(ALL_ROLES)).toEqual(new Set(Object.keys(ROLE_CONFIG)));
  });

  it('is not re-exported from the roster module, so a client import there is visibly wrong', () => {
    // The roster module must not hand the role data back out. `import` and
    // `export ... from` are both an edge, so only a real re-export is forbidden.
    const reExports = /export\s+(?:type\s+)?\{[^}]*\}\s*from\s+['"][^'"]*party-roles['"]/g;
    expect(sourceOf(ROSTER_MODULE).match(reExports)).toBeNull();
  });

  it('is imported by the party view client component as a type only, leaving no runtime edge', () => {
    const source = sourceOf(CLIENT_MODULE);
    const importLine = source
      .split('\n')
      .find((line) => /^\s*import\s/.test(line) && line.includes('party-roles'));
    expect(importLine).toBeDefined();
    expect(importLine?.trim().startsWith('import type')).toBe(true);
  });

  it('leaves no Node builtin anywhere in the party view client graph', () => {
    expect(nodeBuiltinsIn(CLIENT_MODULE)).toEqual([]);
  });

  it('keeps the accessibility reasoning next to the values it explains', () => {
    const source = sourceOf(ROLES_MODULE);
    expect(source).toContain('4.5:1');
    expect(source).toContain('never as the text color');
    // The comment must sit above the values, not be separated from them.
    const configIndex = source.indexOf('export const ROLE_CONFIG');
    const commentIndex = source.indexOf('4.5:1');
    expect(commentIndex).toBeGreaterThan(-1);
    expect(commentIndex).toBeLessThan(configIndex);
  });
});
