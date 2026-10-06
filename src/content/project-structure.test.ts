import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
const spec = readFileSync(join(repoRoot, 'SPEC.md'), 'utf8');

/**
 * #466: the README and `SPEC.md` each carry a project-structure tree, and
 * nothing compared either tree to the repository it describes. Both omitted
 * committed, load-bearing paths - the source character sheets, the site index
 * component, the configuration-injected theme components, the Alpine entrypoint,
 * the content configuration, the print layout, the shared test harness, the
 * source sheets directory, the dev-time spike route and the design-review
 * library - so a reader who followed a tree to find a thing concluded it did not
 * exist.
 *
 * The guard below is the part that matters: it derives its subject from git
 * rather than from a hand-kept list, so it cannot rot into a tautology. Every
 * committed top-level directory of the repository and of `src/` has to appear
 * in at least one of the two trees. A new top-level directory, or a tree entry
 * deleted in a rewrite, fails the suite. A pattern that matches nothing also
 * fails, so a rename cannot turn the guard into a no-op.
 *
 * The scope is deliberately directories, not files: the trees do not list every
 * root manifest and are not meant to. Agent-harness and editor configuration
 * directories are excluded by an explicit, documented list rather than by a
 * hidden heuristic. The existence half points the other way - a path a tree
 * writes down has to be on disk - which is what makes a tree entry for a
 * deleted file as loud as a missing one.
 */

function runGit(args: string[]) {
	return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

/** A `## Heading` section's body, up to the next level-two heading. */
function markdownSection(markdown: string, heading: string): string {
	const marker = `${heading}\n`;
	const start = markdown.indexOf(marker);

	if (start === -1) {
		return '';
	}

	const rest = markdown.slice(start + marker.length);
	const end = rest.search(/\n## /);

	return end === -1 ? rest : rest.slice(0, end);
}

/** The first fenced block in a chunk of Markdown. */
function fencedBlock(markdown: string): string {
	const match = markdown.match(/```[a-z]*\n([\s\S]*?)```/);
	return match ? match[1] : '';
}

const README_TREE = fencedBlock(markdownSection(readme, '## Project structure'));
const SPEC_TREE = fencedBlock(
	spec.slice(spec.indexOf('## 4. Repository & File System Conventions')),
);

/**
 * Reconstruct the full path of every entry in a tree, in either the README's
 * two-space indentation style or the spec's box-drawing style. The two styles
 * encode depth differently but produce the same ancestor-joined paths, so one
 * parser reads both.
 */
function treeEntries(tree: string): { path: string; line: string }[] {
	const entries: { path: string; line: string }[] = [];
	const stack: { depth: number; segment: string }[] = [];
	const glyphTree = /[├└]──/.test(tree);

	for (const line of tree.split('\n')) {
		if (line.trim() === '') {
			continue;
		}

		let depth: number;
		let body: string;

		if (glyphTree) {
			const withoutPipes = line.replace(/│/g, ' ');
			const index = withoutPipes.search(/[├└]──/);

			if (index === -1) {
				continue;
			}

			depth = Math.floor(index / 4);
			body = withoutPipes.slice(index).replace(/^[├└]──\s*/, '');
		} else {
			const indent = line.length - line.trimStart().length;
			depth = Math.floor(indent / 2);
			body = line.trim();
		}

		const segment = body.split(/\s{2,}/)[0].trim();

		if (segment === '') {
			continue;
		}

		while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
			stack.pop();
		}

		entries.push({ path: stack.map((entry) => entry.segment).join('') + segment, line });
		stack.push({ depth, segment });
	}

	return entries;
}

/**
 * Root directories that are agent-harness or editor configuration rather than
 * part of the site a contributor navigates. `.opencode/` is deliberately absent:
 * its design-review library is executed by four documented make targets, so it
 * is load-bearing and has to be in the trees.
 */
const IGNORED_REPO_DIRECTORIES = new Set([
	'.agents',
	'.claude',
	'.impeccable',
	'.vscode',
]);

/** Committed directories one level under the repository root, and under `src/`. */
function committedTopLevelDirectories(): { repo: string[]; src: string[] } {
	const files = runGit(['ls-files']).trim().split('\n').filter(Boolean);
	const repo = new Set<string>();
	const src = new Set<string>();

	for (const file of files) {
		const segments = file.split('/');

		if (segments.length > 1) {
			repo.add(segments[0]);
		}

		if (segments[0] === 'src' && segments.length > 2) {
			src.add(segments[1]);
		}
	}

	return { repo: [...repo].sort(), src: [...src].sort() };
}

const documentedPaths = new Set(
	[...treeEntries(README_TREE), ...treeEntries(SPEC_TREE)].map((entry) =>
		entry.path.replace(/\/$/, ''),
	),
);
const { repo: repoDirectories, src: srcDirectories } = committedTopLevelDirectories();

describe('documented project structure', () => {
	it('parses both trees and reads the committed directories, so the guard is not vacuous', () => {
		expect(treeEntries(README_TREE).length).toBeGreaterThan(10);
		expect(treeEntries(SPEC_TREE).length).toBeGreaterThan(10);
		expect(repoDirectories).toContain('src');
		expect(repoDirectories).toContain('.opencode');
		expect(srcDirectories).toContain('components');
		expect(documentedPaths.has('.opencode')).toBe(true);
		expect(documentedPaths.has('src/layouts')).toBe(true);
	});

	it('lists every committed top-level directory in the README or the spec', () => {
		const missingRepo = repoDirectories
			.filter((name) => !IGNORED_REPO_DIRECTORIES.has(name))
			.filter((name) => !documentedPaths.has(name));

		expect(missingRepo).toEqual([]);

		const missingSrc = srcDirectories.filter((name) => !documentedPaths.has(`src/${name}`));

		expect(missingSrc).toEqual([]);
	});

	it('lists only paths that exist on disk, except generated artifacts', () => {
		for (const entry of [...treeEntries(README_TREE), ...treeEntries(SPEC_TREE)]) {
			if (/generated|gitignored/i.test(entry.line)) {
				continue;
			}

			expect(existsSync(join(repoRoot, entry.path.replace(/\/$/, '')))).toBe(true);
		}
	});
});
