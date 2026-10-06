import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { basename, join, relative } from 'node:path';

import { CONTENT_ROOT, isPartial } from '../test-utils/content-pages';

const repoRoot = join(__dirname, '../..');
const CONTENT_DIRECTORY = relative(repoRoot, CONTENT_ROOT);

/**
 * #471: the content collection directory holds content, and nothing else.
 *
 * A unit test for the handbook's page-columns schema used to sit at
 * `src/content/docs/handbook-columns-schema.test.ts`, beside the pages it
 * constrained. The content loader globs Markdown only, so it was never a page -
 * but a directory whose whole job is to be a plain list of pages should not hold
 * something a reader has to be told to skip. Any command that walks the
 * directory either has to know the test is there or quietly picks it up.
 *
 * The guard derives its subject from git rather than from a directory listing,
 * so an untracked editor or OS file cannot fail it, and it cannot rot into a
 * tautology: a committed non-content file fails, and so does a rename that makes
 * a path name nothing.
 */

/** Every committed file under the content directory, repository-relative. */
function trackedContentFiles(): string[] {
	return execFileSync('git', ['ls-files', '-z', CONTENT_DIRECTORY], { cwd: repoRoot, encoding: 'utf8' })
		.split('\0')
		.filter(Boolean);
}

describe('the content collection directory', () => {
	const files = trackedContentFiles();

	it('holds content to check, so the guard cannot pass by listing nothing', () => {
		expect(files.length).toBeGreaterThan(15);
		expect(files.some((path) => path.endsWith('.mdx'))).toBe(true);
		expect(files.some((path) => path.endsWith('.md'))).toBe(true);
	});

	it('holds content only, so nothing in it has to be skipped by extension', () => {
		const foreign = files.filter((path) => !/\.(md|mdx)$/.test(path));

		expect(foreign).toEqual([]);
	});

	it('has the stated partial as its only non-route file', () => {
		const partials = files.filter((path) => isPartial(basename(path)));

		// The rule is `isPartial`, not this filename: a page that starts with an
		// underscore is a partial. Pinning the current set makes adding or removing
		// one a deliberate edit rather than a silent new file every walker sees.
		expect(partials).toEqual([`${CONTENT_DIRECTORY}/dnd/_markdown-impactful.mdx`]);
	});
});
