import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const ADR_DIR = join(repoRoot, 'docs/adr');
const SPECS_DIR = join(repoRoot, 'docs/specs');

const adrIndex = readFileSync(join(ADR_DIR, 'README.md'), 'utf8');
const specIndex = readFileSync(join(SPECS_DIR, 'README.md'), 'utf8');

/**
 * The indexes in `docs/adr/` and `docs/specs/` are how an agent discovers a
 * decision or a specification. A record that exists but is not indexed is
 * invisible to every reader of the repository, and nothing else would fail: the
 * prose-style guard reads files directly and never opens the index, so an
 * unindexed ADR is the one kind of omission that reaches the branch green.
 *
 * The assertion is coarse in both directions. It requires that every record file
 * on disk has a row, and that every row names a record file on disk, so a rename
 * pointing at nothing fails as loudly as a record nothing points at. It does not
 * attempt to check that a description is accurate, for the same reason
 * `spec-coverage.test.ts` stays coarse: that would be prose matching with a false
 * positive on every rewording, and a guard that cries wolf gets deleted.
 *
 * The status column is checked against the record's own front matter, because a
 * `proposed` decision indexed as `accepted` is a correctness failure with real
 * consequences: an agent is told only accepted ADRs are binding, so the index is
 * what makes that rule enforceable.
 */

interface IndexRow {
	id: string;
	status: string;
}

/** Rows of the `| ID | Title | Status | ... |` tables, keyed by their ID column. */
function indexRows(index: string): Map<string, IndexRow> {
	const rows = new Map<string, IndexRow>();
	const pattern = /^\|\s*(\d{3,4})\s*\|\s*(.*?)\s*\|\s*(\w+)\s*\|/gm;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(index)) !== null) {
		rows.set(match[1], { id: match[1], status: match[3] });
	}

	return rows;
}

/** `status: <value>` from a record's YAML front matter. */
function frontMatterStatus(path: string): string {
	const source = readFileSync(path, 'utf8');
	const frontMatter = source.slice(0, source.indexOf('\n---', 4));
	const match = frontMatter.match(/^status:\s*(\S+)\s*$/m);

	if (!match) {
		throw new Error(`no status in the front matter of ${path}`);
	}

	return match[1];
}

function adrFiles() {
	return readdirSync(ADR_DIR)
		.filter((name) => /^\d{4}-.+\.md$/.test(name) && name !== 'README.md')
		.sort();
}

function specDirectories() {
	return readdirSync(SPECS_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
		.map((entry) => entry.name)
		.sort();
}

const adrRows = indexRows(adrIndex);
const specRows = indexRows(specIndex);

describe('ADR index coverage', () => {
	it('finds the records and the index rows, so the guard is not vacuous', () => {
		expect(adrFiles().length).toBeGreaterThan(10);
		expect(adrRows.size).toBeGreaterThan(10);
		expect(adrFiles().some((name) => name.startsWith('0019-'))).toBe(true);
		expect(adrFiles().some((name) => name.startsWith('0020-'))).toBe(true);
	});

	it('indexes every ADR that exists', () => {
		const unindexed = adrFiles().filter((name) => !adrRows.has(name.slice(0, 4)));

		expect(unindexed).toEqual([]);
	});

	it('indexes nothing that does not exist', () => {
		const indexed = [...adrRows.keys()];
		const orphans = indexed.filter((id) => !adrFiles().some((name) => name.startsWith(`${id}-`)));

		expect(orphans).toEqual([]);
	});

	it('gives every ADR an indexed status equal to its front matter', () => {
		const mismatched = adrFiles()
			.map((name) => {
				const id = name.slice(0, 4);

				return { id, declared: frontMatterStatus(join(ADR_DIR, name)), indexed: adrRows.get(id)?.status };
			})
			.filter(({ declared, indexed }) => declared !== indexed);

		expect(mismatched).toEqual([]);
	});
});

describe('spec index coverage', () => {
	it('indexes every specification that exists', () => {
		const unindexed = specDirectories().filter((name) => !specRows.has(name.slice(0, 3)));

		expect(unindexed).toEqual([]);
	});

	it('indexes nothing that does not exist', () => {
		const orphans = [...specRows.keys()].filter((id) => !specDirectories().some((name) => name.startsWith(`${id}-`)));

		expect(orphans).toEqual([]);
	});

	it('gives every specification an indexed status equal to its front matter', () => {
		const mismatched = specDirectories()
			.map((name) => {
				const id = name.slice(0, 3);

				return {
					id,
					declared: frontMatterStatus(join(SPECS_DIR, name, 'SPEC.md')),
					indexed: specRows.get(id)?.status,
				};
			})
			.filter(({ declared, indexed }) => declared !== indexed);

		expect(mismatched).toEqual([]);
	});
});