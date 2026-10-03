import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const CONTENT_ROOT = join(__dirname, 'docs');
const pageSource = readFileSync(join(CONTENT_ROOT, 'dnd/weapon-properties.mdx'), 'utf8');

/**
 * #415: the net that would have caught #415 before it was filed.
 *
 * Six rows of the weapon property tables carried a bare `^` where the author had
 * relied on an editor extension to merge that cell with the one above it. Nothing
 * in the build resolved the marker, so the published page rendered `^` in place of
 * the property, and the file read wrong for every consumer of the content, not just
 * the rendered site.
 *
 * The assertions are made against the page source's tables rather than against a
 * rendered card, because the source is what every consumer reads: Starlight's
 * Markdown renderer for the published page, an editor for the author, and any
 * future consumer that parses the tables. A fix that resolved the marker at render
 * time would leave the source holding a value that is not a property, which is the
 * half of the defect this issue is about.
 */

/** One row of a Markdown table, as its cells read once trimmed. */
type TableRow = string[];

function cells(line: string): TableRow {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());
}

function isRow(line: string): boolean {
	return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparator(row: TableRow): boolean {
	return row.length > 0 && row.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/**
 * Every data row of every table in a Markdown source, header and separator rows
 * dropped. Tables inside fenced code blocks are left alone.
 */
function tableRows(source: string): TableRow[] {
	const rows: TableRow[] = [];
	const lines = source.split('\n');
	let fenced = false;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];

		if (/^\s*```/.test(line)) {
			fenced = !fenced;
			continue;
		}

		if (fenced || !isRow(line)) {
			continue;
		}

		const row = cells(line);
		const next = lines[index + 1];

		// A header row is the one immediately followed by the alignment row.
		if (isSeparator(row) || (next !== undefined && isSeparator(cells(next)))) {
			continue;
		}

		rows.push(row);
	}

	return rows;
}

/** Every Markdown and MDX file the site publishes. */
function contentFiles(dir = CONTENT_ROOT): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);

		return entry.isDirectory() ? contentFiles(full) : [full];
	});
}

function readContent(file: string): string {
	return readFileSync(file, 'utf8');
}

/** The Weapon Properties page's weapon-to-property mapping, as a reader meets it. */
function propertyByWeapon(): Map<string, string> {
	const byWeapon = new Map<string, string>();

	for (const row of tableRows(pageSource)) {
		if (row.length !== 3) continue;
		const [weapon, , property] = row;
		byWeapon.set(weapon, property);
	}

	return byWeapon;
}

describe('Weapon Properties page', () => {
	it('lists a property for every weapon, never a placeholder', () => {
		const byWeapon = propertyByWeapon();

		// The page has to exist for the assertion to mean anything, and it has to
		// have rows to check, so the guard cannot pass by reading an empty file.
		expect(byWeapon.size).toBe(11);

		for (const [weapon, property] of byWeapon) {
			expect(property, `${weapon} has no property`).not.toBe('^');
			expect(property, `${weapon} has an empty property`).not.toBe('');
		}
	});

	it('gives the placeholder rows the property of the nearest row above them', () => {
		const byWeapon = propertyByWeapon();

		// The transitive and non-adjacent cases are the point. Flail does not read
		// from the row two above it (Battleaxe) but from Morningstar, and Greataxe
		// reaches Handaxe through Battleaxe, so a literal one-row look-up would
		// resolve neither correctly.
		expect(byWeapon.get('Light Hammer')).toBe('Exploding');
		expect(byWeapon.get('Mace')).toBe('Exploding');
		expect(byWeapon.get('Flail')).toBe('Exploding');
		expect(byWeapon.get('Battleaxe')).toBe('Maximum damage on critical damage dice');
		expect(byWeapon.get('Greataxe')).toBe('Maximum damage on critical damage dice');
		expect(byWeapon.get('Pistol')).toBe('Critical range +1');
	});

	it('leaves the rows that already stated a property alone', () => {
		const byWeapon = propertyByWeapon();

		expect(byWeapon.get('Greatclub')).toBe('Exploding');
		expect(byWeapon.get('Sickle')).toBe('Reroll 1 on the damage dice');
		expect(byWeapon.get('Handaxe')).toBe('Maximum damage on critical damage dice');
		expect(byWeapon.get('Morningstar')).toBe('Exploding');
		expect(byWeapon.get('Musket')).toBe('Critical range +1');
	});

	it('keeps every weapon in the tables the page names', () => {
		expect([...propertyByWeapon().keys()]).toEqual([
			'Greatclub',
			'Light Hammer',
			'Mace',
			'Sickle',
			'Handaxe',
			'Battleaxe',
			'Greataxe',
			'Morningstar',
			'Flail',
			'Musket',
			'Pistol',
		]);
	});
});

describe('site content tables', () => {
	it('holds no placeholder cell anywhere the site publishes', () => {
		const files = contentFiles();
		expect(files.length).toBeGreaterThan(5);

		const placeholders: string[] = [];

		for (const file of files) {
			for (const row of tableRows(readContent(file))) {
				for (const cell of row) {
					if (cell === '^') {
						placeholders.push(`${relative(CONTENT_ROOT, file).split(sep).join('/')}: ${row.join(' | ')}`);
					}
				}
			}
		}

		expect(placeholders).toEqual([]);
	});

	it('keeps footnote references resolvable, so they still render as footnotes', () => {
		// A footnote reference with no definition does not render as a footnote:
		// Markdown leaves the `[^name]` in place as literal text. The caret is the
		// character that opens a footnote reference, so a resolver that treated it
		// as a placeholder would have to walk the content to tell the two apart.
		// Asserting that every reference has a definition is what keeps the
		// distinction honest, and it fails if a definition is dropped while editing
		// the tables that use the markers.
		const unreferenced: string[] = [];
		const undefinedReferences: string[] = [];

		for (const file of contentFiles()) {
			const source = readContent(file);
			const path = relative(CONTENT_ROOT, file).split(sep).join('/');
			const definitions = new Set(
				[...source.matchAll(/^\[\^([^\]]+)\]:/gm)].map((match) => match[1]),
			);

			for (const [, name] of source.matchAll(/\[\^([^\]]+)\](?!:)/g)) {
				if (!definitions.has(name)) {
					undefinedReferences.push(`${path}: [^${name}]`);
				}
			}

			for (const name of definitions) {
				const uses = [...source.matchAll(new RegExp(`\\[\\^${name}\\](?!:)`, 'g'))].length;
				if (uses === 0) {
					unreferenced.push(`${path}: [^${name}]`);
				}
			}
		}

		expect(undefinedReferences).toEqual([]);
		expect(unreferenced).toEqual([]);
	});

	it('keeps the house-rule footnotes in the skills and armour tables', () => {
		// These two tables are the only content that footnotes, and both carry the
		// markers inside table headers, which is why they were the ones at risk from
		// a caret sweep. Each of their footnotes is named rather than numbered so a
		// reader can tell which column it explains.
		const armor = readContent(join(CONTENT_ROOT, 'dnd/master-armor-table.md'));
		const skills = readContent(join(CONTENT_ROOT, 'dnd/skills.md'));

		expect(armor).toContain('[^AC]: Armor Class Bonus');
		expect(armor).toContain('[^DEX]: Maximum Dex Bonus');
		expect(armor).toMatch(/\|\s*Armor\s*\|\s*AC\[\^AC\]\s*\|\s*Dex\[\^DEX\]\s*\|/);

		expect(skills).toContain('[^1]: Elixirs require twice this time');
		expect(skills).toContain('Brewing Time[^1]');
	});
});