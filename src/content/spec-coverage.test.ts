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

/**
 * #385: the net that would have caught #385 before it was filed.
 *
 * The tech stack list named the site framework, the documentation base, the
 * runtime, the two interactivity tiers, styling and hosting, and then said that
 * no framework runtime is shipped. `astro-mermaid` and `mermaid` are both
 * runtime dependencies and `astro.config.mjs` registers the former, so a reader
 * checking the specification against the manifest found a dependency the stack
 * never declared, next to a sentence that read as if the project ships no
 * third-party client JavaScript at all. Neither statement was false; the
 * specification was silent where the manifest was not, which is the failure
 * mode here.
 *
 * The assertion derives its subject from the real files rather than from a
 * hand-kept list, so it cannot rot into a tautology: it reads the integration
 * imports out of `astro.config.mjs`, intersects them with the runtime
 * dependencies in `package.json`, and requires each to be named in the stack
 * list. Registering an integration without declaring it is exactly the defect,
 * so the check follows the registration. It says nothing about whether the
 * prose describing a dependency is *accurate*, for the same reason the
 * component coverage guard above stays coarse - that would be a
 * prose-matching exercise with a false positive on every rewording.
 */
describe('SPEC.md tech stack coverage', () => {
	const stackList = specSource.slice(
		specSource.indexOf('### Tech Stack Constraints'),
		specSource.indexOf('## 2. Infrastructure & Deployment Architecture'),
	);

	const manifest = JSON.parse(
		readFileSync(join(repoRoot, 'package.json'), 'utf8'),
	) as { dependencies?: Record<string, string> };
	const runtimeDependencies = Object.keys(manifest.dependencies ?? {});

	const astroConfig = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');

	/** Packages `astro.config.mjs` imports that are runtime dependencies. */
	function registeredIntegrations(): string[] {
		const names = new Set<string>();
		const pattern = /from\s+'([^']+)'/g;
		let match: RegExpExecArray | null;

		while ((match = pattern.exec(astroConfig)) !== null) {
			const specifier = match[1];
			if (runtimeDependencies.includes(specifier)) {
				names.add(specifier);
			}
		}

		return [...names].sort();
	}

	it('finds the stack list and the registered integrations, so the guard is not vacuous', () => {
		expect(stackList).not.toBe('');
		expect(stackList).not.toBe(specSource);
		expect(runtimeDependencies.length).toBeGreaterThan(0);

		const registered = registeredIntegrations();

		expect(registered).toContain('astro-mermaid');
		expect(registered).toContain('@astrojs/alpinejs');
	});

	it('names every integration the site config registers', () => {
		for (const name of registeredIntegrations()) {
			expect(stackList).toContain(name);
		}
	});

	it('names the diagram renderer, its scoping, and the decision behind it', () => {
		// The renderer is named, the claim about *where* it loads is present,
		// and ADR 0007 is cited the way every other architectural choice in the
		// document is cited. A bare mention of the package would satisfy none of
		// the three, which is why each is asserted separately.
		expect(stackList).toMatch(/\*\*Diagram Rendering:\*\*/);
		expect(stackList).toContain('`mermaid`');
		expect(stackList).toContain('only on pages that contain a Mermaid diagram');
		expect(stackList).toContain('./docs/adr/0007-mermaid-rendering-strategy.md');
	});

	it('scopes the no-framework-runtime claim so it does not read as no client JavaScript', () => {
		// The old absolute wording is asserted absent, and the replacement has
		// to name both halves of the scoping: what is excluded, and what is
		// still shipped.
		expect(stackList).not.toContain('no framework runtime is shipped');
		expect(stackList).toMatch(/No UI framework runtime is shipped to the browser/);
		expect(stackList).toMatch(/scoped to framework runtimes, not to client JavaScript as a whole/);
		expect(stackList).toMatch(/Everything that does reach the browser is named in this list/);
	});

	it('agrees with the README stack table on the renderer', () => {
		// Two documents list the stack independently. They are not required to
		// match line for line, but the renderer row is the one the specification
		// got wrong, so both have to name the same library.
		const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
		const table = readme.slice(readme.indexOf('## Tech stack'), readme.indexOf('## Quick start'));
		const diagramRow = table
			.split('\n')
			.find((line) => /^\|\s*Diagram/i.test(line));

		expect(diagramRow).toBeDefined();
		expect(diagramRow).toMatch(/mermaid/i);
		expect(stackList).toMatch(/mermaid/i);
	});
});
