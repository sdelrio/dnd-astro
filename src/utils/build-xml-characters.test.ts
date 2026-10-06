import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  statSync,
  utimesSync,
  readdirSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildXmlCharacters,
  shouldRebuildXmlCharacters,
  xmlCharacterArtifactsExist,
} from './build-xml-characters';

/**
 * The real `node:fs` functions, captured before the spies below wrap them.
 *
 * A test that makes one call fail still has to let every other call through, so it
 * needs the unwrapped function. Capturing it here rather than reading it back out of
 * a spy's mock implementation keeps the fallback working whatever the installed spy
 * does with its own configuration.
 */
const realFs = await vi.importActual<typeof import('node:fs')>('node:fs');

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readdirSync: vi.fn(actual.readdirSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    renameSync: vi.fn(actual.renameSync),
  };
});

/**
 * One Fantasy Grounds sheet, small enough to keep the fixture readable and complete
 * enough for the parser to produce a real CharacterData record.
 */
const validXmlSample = `<?xml version="1.0" encoding="utf-8"?>
<root version="4.5">
  <character>
    <name type="string">Test Hero</name>
    <race type="string">Human</race>
    <classes>
      <id-00001>
        <name type="string">Fighter</name>
        <level type="number">3</level>
      </id-00001>
    </classes>
    <abilities>
      <strength>
        <score type="number">16</score>
        <bonus type="number">3</bonus>
        <save type="number">5</save>
        <saveprof type="number">1</saveprof>
      </strength>
    </abilities>
    <defenses>
      <ac>
        <total type="number">18</total>
      </ac>
    </defenses>
    <hp>
      <total type="number">28</total>
    </hp>
    <inventorylist>
      <id-00001>
        <name type="string">Longsword</name>
        <count type="number">1</count>
        <weight type="number">3</weight>
        <carried type="number">2</carried>
      </id-00001>
    </inventorylist>
    <coins>
      <slot1>
        <amount type="number">15</amount>
        <name type="string">gp</name>
      </slot1>
    </coins>
  </character>
</root>`;

describe('build-xml-characters', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'build-xml-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('buildXmlCharacters', () => {
    const noopLogger = { log: () => {}, warn: () => {} };

    it('parses XML, resolves avatar, and writes the single artifact', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'testhero.xml'), validXmlSample);
      writeFileSync(join(avatarDir, 'testhero.jpg'), 'image content');

      const logs: string[] = [];
      const warnings: string[] = [];
      const logger = {
        log: (msg: string) => logs.push(msg),
        warn: (msg: string) => warnings.push(msg),
      };

      const result = buildXmlCharacters({
        xmlDir,
        avatarDir,
        outputFile,
        logger,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Hero');
      expect(result[0].filename).toBe('testhero');
      expect(result[0].avatarPath).toBe('/fg/avatar/testhero.jpg');
      expect(warnings).toHaveLength(0);
      expect(logs).toContain('[xml-viewer] Parsed 1 character XML files');

      expect(existsSync(outputFile)).toBe(true);
      const generatedJson = JSON.parse(readFileSync(outputFile, 'utf8'));
      expect(generatedJson).toHaveLength(1);
      expect(generatedJson[0].filename).toBe('testhero');
      expect(generatedJson[0].avatarPath).toBe('/fg/avatar/testhero.jpg');
      expect(generatedJson[0].name).toBe('Test Hero');
      expect(generatedJson[0].inventory).toEqual([
        { name: 'Longsword', count: 1, weight: 3, carried: 2 },
      ]);
      expect(generatedJson[0].coins).toEqual({ pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 });
    });

    it('writes no second artifact under .astro/generated', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'testhero.xml'), validXmlSample);

      buildXmlCharacters({ rootDir: tempDir, xmlDir, avatarDir, outputFile, logger: noopLogger });

      expect(existsSync(outputFile)).toBe(true);
      expect(existsSync(join(tempDir, '.astro/generated/characters.json'))).toBe(false);
    });

    it('removes a stale legacy .astro/generated artifact from the old dual-write', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');
      const legacyFile = join(tempDir, '.astro/generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      mkdirSync(join(tempDir, '.astro/generated'), { recursive: true });
      writeFileSync(join(xmlDir, 'testhero.xml'), validXmlSample);
      writeFileSync(legacyFile, '[]');

      const logs: string[] = [];
      const result = buildXmlCharacters({
        rootDir: tempDir,
        xmlDir,
        avatarDir,
        outputFile,
        logger: { log: (msg: string) => logs.push(msg), warn: () => {} },
      });

      expect(result).toHaveLength(1);
      expect(existsSync(outputFile)).toBe(true);
      expect(existsSync(legacyFile)).toBe(false);
      expect(logs.some((msg) => msg.includes('legacy'))).toBe(true);
    });

    it('skips unparseable or corrupted XML files with warnings', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'valid.xml'), validXmlSample);
      writeFileSync(join(xmlDir, 'invalid.xml'), '<not-a-character></not-a-character>');

      const warnings: string[] = [];
      const logger = {
        log: () => {},
        warn: (msg: string) => warnings.push(msg),
      };

      const result = buildXmlCharacters({
        xmlDir,
        avatarDir,
        outputFile,
        logger,
      });

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('valid');
      expect(warnings.some((w) => w.includes('invalid.xml'))).toBe(true);
    });

    it('skips malformed XML that makes the parser throw, with a warning, and does not fail the build', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'valid.xml'), validXmlSample);
      writeFileSync(join(xmlDir, 'broken.xml'), '<root><character><![CDATA[unterminated</root>');

      const warnings: string[] = [];
      const logger = {
        log: () => {},
        warn: (msg: string) => warnings.push(msg),
      };

      let result: ReturnType<typeof buildXmlCharacters> = [];
      expect(() => {
        result = buildXmlCharacters({
          xmlDir,
          avatarDir,
          outputFile,
          logger,
        });
      }).not.toThrow();

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('valid');
      expect(warnings.some((w) => w.includes('broken.xml'))).toBe(true);
      expect(existsSync(outputFile)).toBe(true);
    });

    it('processes sheets in deterministic sorted order even when readdir returns unsorted names', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      for (const name of ['charlie', 'alpha', 'bravo']) {
        writeFileSync(join(xmlDir, `${name}.xml`), validXmlSample);
      }

      const logger = {
        log: () => {},
        warn: () => {},
      };

      vi.mocked(readdirSync).mockReturnValueOnce([
        'charlie.xml',
        'alpha.xml',
        'bravo.xml',
      ] as never);

      const result = buildXmlCharacters({
        xmlDir,
        avatarDir,
        outputFile,
        logger,
      });

      expect(result.map((c) => c.filename)).toEqual(['alpha', 'bravo', 'charlie']);

      const generatedJson = JSON.parse(readFileSync(outputFile, 'utf8'));
      expect(generatedJson.map((c: { filename: string }) => c.filename)).toEqual([
        'alpha',
        'bravo',
        'charlie',
      ]);
    });

    it('does not rewrite output files when generated content is unchanged', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'valid.xml'), validXmlSample);

      const options = { xmlDir, avatarDir, outputFile, logger: noopLogger };

      buildXmlCharacters(options);
      const ancient = new Date('2000-01-01T00:00:00Z');
      utimesSync(outputFile, ancient, ancient);
      const beforeOutput = statSync(outputFile).mtimeMs;

      buildXmlCharacters(options);

      expect(statSync(outputFile).mtimeMs).toBe(beforeOutput);
    });

    it('keeps the previous records when a rebuild sharply shrinks the roster', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
        writeFileSync(join(xmlDir, `${name}.xml`), validXmlSample);
      }

      buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });
      const healthy = JSON.parse(readFileSync(outputFile, 'utf8'));
      expect(healthy).toHaveLength(4);

      // An upstream parser change that loses three of the four sheets. One sheet
      // still parses, so the run is not a total regression, but replacing four
      // records with one is not a roster anyone voted for either.
      rmSync(join(xmlDir, 'bravo.xml'));
      rmSync(join(xmlDir, 'charlie.xml'));
      rmSync(join(xmlDir, 'delta.xml'));
      for (const name of ['bravo', 'charlie', 'delta']) {
        writeFileSync(join(xmlDir, `${name}.xml`), '<not-a-character></not-a-character>');
      }

      const logs: string[] = [];
      const warnings: string[] = [];
      const result = buildXmlCharacters({
        xmlDir,
        avatarDir,
        outputFile,
        logger: { log: (msg: string) => logs.push(msg), warn: (msg: string) => warnings.push(msg) },
      });

      expect(JSON.parse(readFileSync(outputFile, 'utf8'))).toHaveLength(4);
      expect(result.map((c) => c.filename)).toEqual(['alpha', 'bravo', 'charlie', 'delta']);
      const said = [...logs, ...warnings].join('\n');
      expect(said).toContain('kept the previous');
      expect(said).toContain('4');
      expect(said).toContain('1');
    });

    it('stages the artifact on a .part sibling and renames it into place', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'valid.xml'), validXmlSample);

      const writes: string[] = [];
      const renames: Array<[string, string]> = [];
      const writeFileSyncMock = vi.mocked(writeFileSync);
      const renameSyncMock = vi.mocked(renameSync);
      writeFileSyncMock.mockImplementation((path: Parameters<typeof writeFileSync>[0], ...rest) => {
        writes.push(String(path));
        (realFs.writeFileSync as (...a: unknown[]) => void)(path, ...rest);
      });
      renameSyncMock.mockImplementation((from: Parameters<typeof renameSync>[0], to) => {
        renames.push([String(from), String(to)]);
        (realFs.renameSync as (...a: unknown[]) => void)(from, to);
      });
      try {
        buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });
      } finally {
        writeFileSyncMock.mockReset();
        renameSyncMock.mockReset();
      }

      // The artifact itself is never written in place: the bytes go to the
      // sibling and a rename puts them where a reader looks.
      expect(writes).toContain(`${outputFile}.part`);
      expect(writes).not.toContain(outputFile);
      expect(renames).toContainEqual([`${outputFile}.part`, outputFile]);
      expect(existsSync(`${outputFile}.part`)).toBe(false);
      expect(JSON.parse(readFileSync(outputFile, 'utf8'))).toHaveLength(1);
    });

    it('leaves the previous artifact intact and readable when the write is interrupted', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'alpha.xml'), validXmlSample);

      buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });
      const healthy = readFileSync(outputFile, 'utf8');

      writeFileSync(join(xmlDir, 'bravo.xml'), validXmlSample);

      // The write to the staging sibling throws, standing in for the process
      // being killed (or the disk filling) part way through the write. A reader
      // must still find the previous artifact, whole and parseable, and must not
      // find a truncated file where it looks for the artifact.
      const writeFileSyncMock = vi.mocked(writeFileSync);
      writeFileSyncMock.mockImplementation((path: Parameters<typeof writeFileSync>[0], ...rest) => {
        if (String(path).endsWith('.part')) {
          throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
        }
        (realFs.writeFileSync as (...a: unknown[]) => void)(path, ...rest);
      });
      try {
        expect(() =>
          buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger })
        ).toThrow();
      } finally {
        writeFileSyncMock.mockReset();
      }

      expect(readFileSync(outputFile, 'utf8')).toBe(healthy);
      expect(JSON.parse(readFileSync(outputFile, 'utf8'))).toHaveLength(1);
      expect(existsSync(`${outputFile}.part`)).toBe(false);
    });

    it('fails the build when a non-empty sheet directory yields zero characters', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(xmlDir, 'alpha.xml'), validXmlSample);

      buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });
      const healthy = readFileSync(outputFile, 'utf8');

      rmSync(join(xmlDir, 'alpha.xml'));
      writeFileSync(join(xmlDir, 'alpha.xml'), '<not-a-character></not-a-character>');

      const logs: string[] = [];
      let thrown: unknown;
      try {
        buildXmlCharacters({
          xmlDir,
          avatarDir,
          outputFile,
          logger: { log: (msg: string) => logs.push(msg), warn: (msg: string) => logs.push(msg) },
        });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toContain(xmlDir);
      expect(message).toContain('alpha.xml');
      // Actionable: it says what the directory was, that nothing parsed, that the
      // artifact was left alone, and where to look.
      expect(message).toMatch(/0 of 1/);
      expect(message).toMatch(/previous 1 records .* kept untouched/);
      expect(message).toMatch(/parse-character-xml|fantasy-grounds-sheets/);
      expect(readFileSync(outputFile, 'utf8')).toBe(healthy);
    });

    it('does not fail when the sheet directory is empty, and writes an empty artifact', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });

      const result = buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });

      expect(result).toEqual([]);
      expect(JSON.parse(readFileSync(outputFile, 'utf8'))).toEqual([]);
    });

    it('still builds when healthy and corrupt sheets are mixed', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');

      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
        writeFileSync(join(xmlDir, `${name}.xml`), validXmlSample);
      }

      buildXmlCharacters({ xmlDir, avatarDir, outputFile, logger: noopLogger });

      writeFileSync(join(xmlDir, 'bravo.xml'), '<not-a-character></not-a-character>');
      writeFileSync(join(xmlDir, 'charlie.xml'), '<root><character><![CDATA[unterminated</root>');

      const logs: string[] = [];
      const warnings: string[] = [];
      const result = buildXmlCharacters({
        xmlDir,
        avatarDir,
        outputFile,
        logger: { log: (msg: string) => logs.push(msg), warn: (msg: string) => warnings.push(msg) },
      });

      expect(result.map((c) => c.filename)).toEqual(['alpha', 'delta']);
      expect(JSON.parse(readFileSync(outputFile, 'utf8')).map((c: { filename: string }) => c.filename)).toEqual([
        'alpha',
        'delta',
      ]);
      expect([...logs, ...warnings].join('\n')).not.toContain('kept the previous');
      expect(warnings.some((w) => w.includes('bravo.xml'))).toBe(true);
      expect(warnings.some((w) => w.includes('charlie.xml'))).toBe(true);
    });

    it('warns gracefully when xmlDir does not exist', () => {
      const xmlDir = join(tempDir, 'non-existent-dir');
      const warnings: string[] = [];
      const logger = {
        log: () => {},
        warn: (msg: string) => warnings.push(msg),
      };

      const result = buildXmlCharacters({
        xmlDir,
        logger,
      });

      expect(result).toEqual([]);
      expect(warnings.some((w) => w.includes('XML directory does not exist'))).toBe(true);
    });
  });

  describe('shouldRebuildXmlCharacters', () => {
    it('always rebuilds for render commands even when artifacts exist', () => {
      expect(shouldRebuildXmlCharacters('dev', true)).toBe(true);
      expect(shouldRebuildXmlCharacters('build', true)).toBe(true);
      expect(shouldRebuildXmlCharacters('dev', false)).toBe(true);
      expect(shouldRebuildXmlCharacters('build', false)).toBe(true);
    });

    it('skips non-render rebuilds when artifacts already exist', () => {
      expect(shouldRebuildXmlCharacters('sync', true)).toBe(false);
      expect(shouldRebuildXmlCharacters('preview', true)).toBe(false);
    });

    it('still builds non-render commands when artifacts are missing', () => {
      expect(shouldRebuildXmlCharacters('sync', false)).toBe(true);
      expect(shouldRebuildXmlCharacters('preview', false)).toBe(true);
    });
  });

  describe('real repository assets verification', () => {
    it('successfully processes all sheets in src/assets/fantasy-grounds-sheets', () => {
      const characters = buildXmlCharacters();
      expect(characters.length).toBe(111);

      const draknor = characters.find((c) => c.filename === 'draknor');
      expect(draknor).toBeDefined();
      expect(draknor?.name).toBe('Drakknor');
      expect(draknor?.avatarPath).toBe('/fg/avatar/draknor.png');
      expect(draknor?.weapons.length).toBeGreaterThan(0);
      expect(draknor?.weapons[0].damage.length).toBeGreaterThan(0);

      const generatedJson = JSON.parse(readFileSync('src/generated/characters.json', 'utf8'));
      const draknorJson = generatedJson.find(
        (c: { filename: string }) => c.filename === 'draknor'
      );
      expect(draknorJson.weapons.length).toBeGreaterThan(0);
      expect(draknorJson.inventory).toHaveLength(22);
      expect(draknorJson.coins).toEqual({ pp: 0, gp: 378, ep: 0, sp: 583, cp: 0 });

      const antonidas = characters.find((c) => c.filename === 'antonidas');
      expect(antonidas).toBeDefined();
      expect(antonidas?.avatarPath).toBe('/fg/avatar/antonidas.png');
      // A Wizard 5, so the generated artifact carries the slot data the
      // Spellcasting section reads. Checked here because this is the only place a
      // real sheet reaches the artifact: a parser test proves the node was read,
      // and this proves the nine levels survived the build.
      expect(antonidas?.spellSlots).toHaveLength(9);
      expect(antonidas?.spellSlots.slice(0, 3)).toEqual([
        { level: 1, max: 4, used: 2 },
        { level: 2, max: 3, used: 2 },
        { level: 3, max: 2, used: 2 },
      ]);
      expect(antonidas?.spellSlots.slice(3)).toEqual(
        Array.from({ length: 6 }, (_, i) => ({ level: i + 4, max: 0, used: 0 }))
      );

      // The nine blocks are always emitted, so a sheet with no spellcasting at all
      // carries nine zeroed levels rather than an absent list. A character whose
      // levels are missing would otherwise be indistinguishable from one whose
      // levels are empty, which is the same fact.
      const draknorSlots = draknor?.spellSlots ?? [];
      expect(draknorSlots).toHaveLength(9);
      expect(draknorSlots.every((slot) => slot.max === 0 && slot.used === 0)).toBe(true);

      const milo = characters.find((c) => c.filename === 'milo');
      expect(milo).toBeDefined();
      expect(milo?.name).toBe('Milo Cambarro (N)');
      expect(milo?.avatarPath).toBe('/fg/avatar/milo.jpg');

      const nameless = characters.find((c) => c.filename === 'non-existent');
      expect(nameless).toBeUndefined();

      // No dual-write: the legacy .astro copy must not exist after a rebuild
      expect(existsSync('.astro/generated/characters.json')).toBe(false);
    });
  });

  describe('xmlCharacterArtifactsExist', () => {
    const roster = JSON.stringify([{ filename: 'alpha', name: 'Alpha' }]);

    it('is true when the single src/generated artifact holds a roster', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), roster);

      expect(xmlCharacterArtifactsExist(tempDir)).toBe(true);
    });

    it('is false when the artifact is missing', () => {
      expect(xmlCharacterArtifactsExist(tempDir)).toBe(false);
    });

    it('is true from the src artifact alone even when a legacy .astro copy is missing', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), roster);

      expect(existsSync(join(tempDir, '.astro/generated/characters.json'))).toBe(false);
      expect(xmlCharacterArtifactsExist(tempDir)).toBe(true);
    });

    it('is false for an empty roster, so sync and preview rebuild over the damage', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), '[]');

      expect(xmlCharacterArtifactsExist(tempDir)).toBe(false);
      expect(shouldRebuildXmlCharacters('sync', xmlCharacterArtifactsExist(tempDir))).toBe(true);
      expect(shouldRebuildXmlCharacters('preview', xmlCharacterArtifactsExist(tempDir))).toBe(
        true
      );
    });

    it('is false for a truncated artifact, so nothing trusts a half-written file', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), '[{"filename":"alp');

      expect(xmlCharacterArtifactsExist(tempDir)).toBe(false);
    });

    it('is false for an artifact that is not a roster', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), '{"alpha":{}}');

      expect(xmlCharacterArtifactsExist(tempDir)).toBe(false);
    });
  });

  describe('the sticky-damage loop from #446', () => {
    const noop = { log: () => {}, warn: () => {} };

    /**
     * The reproduction, end to end and at the seam the Astro config uses: start
     * from a healthy artifact under a real rootDir, run the hook over sheets that
     * no longer parse, then ask the two questions `astro check` and `preview` ask.
     */
    it('does not leave typecheck and preview accepting an empty roster after a total regression', () => {
      const rootDir = join(tempDir, 'repo');
      const xmlDir = join(rootDir, 'src/assets/fantasy-grounds-sheets');
      const avatarDir = join(rootDir, 'public/fg/avatar');
      mkdirSync(xmlDir, { recursive: true });
      mkdirSync(avatarDir, { recursive: true });
      for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
        writeFileSync(join(xmlDir, `${name}.xml`), validXmlSample);
      }

      const options = { rootDir, xmlDir, avatarDir, logger: noop };
      expect(buildXmlCharacters(options)).toHaveLength(4);
      expect(shouldRebuildXmlCharacters('sync', xmlCharacterArtifactsExist(rootDir))).toBe(false);

      // The sheets stop parsing upstream.
      for (const name of ['alpha', 'bravo', 'charlie', 'delta']) {
        writeFileSync(join(xmlDir, `${name}.xml`), '<not-a-character></not-a-character>');
      }

      // The hook refuses, loudly, and the artifact still holds the roster.
      expect(() => buildXmlCharacters(options)).toThrow(/0 of 4/);

      // This is the assertion the issue turns on: both non-render commands still
      // see a valid artifact, because it was never degraded. The old behaviour
      // returned [] here, and then `sync`/`preview` skipped the rebuild forever
      // and an empty site typechecked green.
      expect(xmlCharacterArtifactsExist(rootDir)).toBe(true);
      expect(shouldRebuildXmlCharacters('sync', xmlCharacterArtifactsExist(rootDir))).toBe(false);
      expect(shouldRebuildXmlCharacters('preview', xmlCharacterArtifactsExist(rootDir))).toBe(
        false
      );
      expect(
        JSON.parse(readFileSync(join(rootDir, 'src/generated/characters.json'), 'utf8'))
      ).toHaveLength(4);
    });
  });
});
