import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const ADR_DIR = join(repoRoot, 'docs/adr');
const SPECS_DIR = join(repoRoot, 'docs/specs');

/**
 * The indexes in `docs/adr/` and `docs/specs/` are how an agent discovers a
 * decision or a specification. A record that exists but is not indexed is
 * invisible to every reader of the repository, and nothing else would fail: the
 * prose-style guard reads files directly and never opens the index, so an
 * unindexed ADR is the one kind of omission that reaches the branch green.
 *
 * The assertions are coarse in both directions. Every record file on disk needs
 * a row, and every row needs a record file on disk, so a rename pointing at
 * nothing fails as loudly as a record nothing points at. Nothing here attempts
 * to check that a title or description is accurate, for the same reason
 * `spec-coverage.test.ts` stays coarse: that would be prose matching with a
 * false positive on every rewording, and a guard that cries wolf gets deleted.
 *
 * The status column is checked against each record's own front matter, because
 * a `proposed` decision indexed as `accepted` is a correctness failure with real
 * consequences. An agent is told only accepted ADRs bind, so the index is what
 * makes that rule enforceable rather than advisory.
 *
 * The two indexes differ in id width, file extension and directory shape and in
 * nothing else, so one set of assertions covers both rather than the two blocks
 * being near-copies of each other.
 */

/** Rows of the `| ID | Title | Status | ... |` tables, keyed by their ID column. */
function indexRows(index: string): Map<string, string> {
	const rows = new Map<string, string>();
	const pattern = /^\|\s*(\d{3,4})\s*\|\s*(.*?)\s*\|\s*(\w+)\s*\|/gm;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(index)) !== null) {
		rows.set(match[1], match[3]);
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

/** ADR files on disk, by ID, with the path each one's status is read from. */
function adrRecords() {
	const records = readdirSync(ADR_DIR)
		.filter((name) => /^\d{4}-.+\.md$/.test(name) && name !== 'README.md')
		.sort()
		.map((name) => ({ id: name.slice(0, 4), path: join(ADR_DIR, name) }));

	return { index: readFileSync(join(ADR_DIR, 'README.md'), 'utf8'), records };
}

/** Specification directories on disk, by ID, with the path each status is read from. */
function specRecords() {
	const records = readdirSync(SPECS_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
		.map((entry) => entry.name)
		.sort()
		.map((name) => ({ id: name.slice(0, 3), path: join(SPECS_DIR, name, 'SPEC.md') }))
		.filter(({ path }) => statSync(path).isFile());

	return { index: readFileSync(join(SPECS_DIR, 'README.md'), 'utf8'), records };
}

/** The same guard, over whichever index shape is handed to it. */
function describeIndex(label: string, { index, records }: { index: string; records: { id: string; path: string }[] }) {
	const rows = indexRows(index);

	describe(label, () => {
		it('finds records and index rows, so the guard is not vacuous', () => {
			expect(records.length).toBeGreaterThan(10);
			expect(rows.size).toBeGreaterThan(10);
		});

		it('indexes every record that exists', () => {
			expect(records.filter(({ id }) => !rows.has(id)).map(({ id }) => id)).toEqual([]);
		});

		it('indexes nothing that does not exist', () => {
			expect([...rows.keys()].filter((id) => !records.some((record) => record.id === id))).toEqual([]);
		});

		it('gives every record an indexed status equal to its front matter', () => {
			const mismatched = records
				.map(({ id, path }) => ({ id, declared: frontMatterStatus(path), indexed: rows.get(id) }))
				.filter(({ declared, indexed }) => declared !== indexed);

			expect(mismatched).toEqual([]);
		});
	});
}

const adrs = adrRecords();
const specs = specRecords();

describeIndex('ADR index coverage', adrs);
describeIndex('spec index coverage', specs);

describe('ADR index coverage', () => {
	it('finds the two records the printed handbook feature adds', () => {
		// Without this the guard above would still pass with both records
		// missing from the directory entirely, and a renamed file would read as a
		// suite that never checked anything. It is the non-vacuity assertion for
		// the feature specifically.
		expect(adrRecords().records.map(({ id }) => id)).toEqual(
			expect.arrayContaining(['0019', '0020']),
		);
		expect(indexRows(adrRecords().index).get('0019')).toBe('accepted');
		// ADR-0020 was `proposed` until its spike ran; the index now carries the
		// status the record itself carries, and this fails if either drifts back.
		expect(indexRows(adrRecords().index).get('0020')).toBe('accepted');
	});
});