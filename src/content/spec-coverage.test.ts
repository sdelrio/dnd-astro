import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const repoRoot = join(__dirname, '../..');
const SPEC = join(repoRoot, 'SPEC.md');
const COMPONENTS = join(repoRoot, 'src/components');

const specSource = readFileSync(SPEC, 'utf8');

/**
 * #384: the net that would have caught #384 before it was filed.
 *
 * `SPEC.md` is the document an agent is told to read first, and it had drifted
 * out of contact with the tree it describes: it named three interactive
 * components when the repository ships five, and its file-structure section
 * omitted the Alpine entrypoint, the content configuration, the styles
 * directory, the test harness and the generated-data directory. Every other
 * document in the repository was already correct - the README listed the Point
 * Buy calculator, the specs index carried the archived character-viewer specs -
 * so nothing else would have failed when the specification went stale.
 *
 * The assertion is deliberately coarse: **every component directory is named in
 * `SPEC.md`**. It does not attempt to check that the description of a component
 * is accurate, because that would be a prose-matching exercise with a false
 * positive on every rewording, and a guard that cries wolf gets deleted. What it
 * catches is the failure mode that actually happened, which is total silence:
 * a directory that exists in the tree and appears nowhere in the specification.
 *
 * Two properties keep it from going stale in the other direction:
 *
 * - A pattern that matches nothing fails, so a rename cannot turn the guard
 *   into a no-op. This mirrors the `proseSurfaces` list in
 *   `prose-style.test.ts`, for the same reason.
 * - The guard also asserts the inverse, that every directory named in the
 *   specification's own component inventory exists on disk. A specification
 *   describing a component that was deleted or renamed is the same defect
 *   pointing the other way, and it is the one that sends an agent to a path
 *   that does not resolve.
 */

/** Directories under `src/components/` that are a component, not a shared part. */
function componentDirectories(): string[] {
	return readdirSync(COMPONENTS)
		.filter((entry) => statSync(join(COMPONENTS, entry)).isDirectory())
		.sort();
}

/** Every `src/components/<name>/` path the specification writes down. */
function componentPathsNamedInSpec(): string[] {
	const names = new Set<string>();
	const pattern = new RegExp(`src${sep === '/' ? '/' : '\\\\/'}components${sep === '/' ? '/' : '\\\\/'}([A-Za-z0-9-]+)${sep === '/' ? '/' : '\\\\/'}`, 'g');
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(specSource)) !== null) {
		names.add(match[1]);
	}

	return [...names].sort();
}

describe('SPEC.md component coverage', () => {
	const directories = componentDirectories();

	it('finds component directories to check, so the guard is not vacuous', () => {
		expect(directories.length).toBeGreaterThan(0);
		expect(directories).toContain('dice-roller');
	});

	it('names every component directory in the specification', () => {
		const named = componentPathsNamedInSpec();

		expect(directories.filter((name) => !named.includes(name))).toEqual([]);
	});

	it('names only directories that exist', () => {
		const named = componentPathsNamedInSpec();

		expect(named.filter((name) => !directories.includes(name))).toEqual([]);
	});

	it('describes all five interactive components, each with a location and a hydration strategy', () => {
		const inventory = specSource.slice(
			specSource.indexOf('### Interactive Component Inventory'),
			specSource.indexOf('## 4. Repository & File System Conventions'),
		);

		expect(inventory).not.toBe('');
		expect(inventory).not.toBe(specSource);

		// One heading per component, numbered 1 through 5. The numbering is the
		// assertion: it is what fails when a sixth is added without a heading, and
		// it is a count the document cannot quietly satisfy by renumbering.
		const headings = inventory.match(/^#### Component \d+: .+$/gm) ?? [];
		expect(headings).toHaveLength(5);

		for (const directory of directories) {
			expect(inventory).toContain(`src/components/${directory}/`);
		}

		// Every component states both, which is the part an agent extending one
		// actually needs and the part the drift removed.
		const blocks = inventory.split(/^#### Component \d+: /m).slice(1);
		expect(blocks).toHaveLength(5);

		for (const block of blocks) {
			expect(block).toContain('**File Location:**');
			expect(block).toContain('**Hydration Strategy:**');
		}
	});

	it('states each registration in the site-wide Alpine entrypoint', () => {
		const entrypoint = readFileSync(join(repoRoot, 'src/alpine.ts'), 'utf8');
		const registrations = [...entrypoint.matchAll(/Alpine\.data\('([^']+)'/g)].map(
			(match) => match[1],
		);

		// The entrypoint is the wiring every `x-data` root depends on, and the
		// specification's job is to say so. Each name has to appear in the file
		// tree entry for `src/alpine.ts` and in the call-out beneath it.
		for (const name of registrations) {
			expect(specSource).toContain(`\`${name}\``);
		}

		expect(registrations).toEqual([
			'charSearch',
			'pointBuy',
			'diceRoller',
			'partyView',
			'featExplorer',
		]);
	});

	it('lists the load-bearing files in the file-structure section', () => {
		const tree = specSource.slice(
			specSource.indexOf('## 4. Repository & File System Conventions'),
			specSource.indexOf('## 5. Development Integrity Rules'),
		);

		expect(tree).not.toBe('');

		const required = [
			'src/alpine.ts',
			'src/content.config.ts',
			'src/styles/',
			'src/test-utils/alpine-dom.ts',
			'src/generated/',
		];

		for (const path of required) {
			expect(tree).toContain(path);
		}
	});

	it('lists the files the required entries point at, as they are on disk', () => {
		for (const path of [
			'src/alpine.ts',
			'src/content.config.ts',
			'src/styles/tailwind.css',
			'src/styles/contrast.ts',
			'src/test-utils/alpine-dom.ts',
			'src/generated/characters.json',
		]) {
			expect(statSync(resolve(repoRoot, path)).isFile()).toBe(true);
			expect(specSource).toContain(path);
		}
	});

	it('says a non-Alpine component is non-Alpine rather than leaving it out', () => {
		// The rulebook spread is the one component that is not an Alpine
		// registration. Silence about it is the defect this assertion exists to
		// prevent, so the word has to be there.
		expect(specSource).toContain('#### Component 5: Rulebook Spread');
		expect(specSource).toMatch(/Hydration Strategy:\*\* Not Alpine/);
	});

	it('names the two site-chrome components the inventory deliberately excludes', () => {
		// An exclusion that is not stated reads as an oversight, which is exactly
		// the failure the issue was filed about.
		expect(specSource).toContain('ThemeProvider.astro');
		expect(specSource).toContain('ThemeSelect.astro');
	});

	it('preserves the rule of least client-side JavaScript', () => {
		expect(specSource).toContain('### Rule of Least Client-Side JavaScript');
		expect(specSource).toContain('Frameworks must be scoped strictly to individual component instances');
	});
});
