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
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildXmlCharacters,
  shouldRebuildXmlCharacters,
  xmlCharacterArtifactsExist,
} from './build-xml-characters';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readdirSync: vi.fn(actual.readdirSync),
  };
});

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
    it('is true when the single src/generated artifact exists', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), '[]');

      expect(xmlCharacterArtifactsExist(tempDir)).toBe(true);
    });

    it('is false when the artifact is missing', () => {
      expect(xmlCharacterArtifactsExist(tempDir)).toBe(false);
    });

    it('is true from the src artifact alone even when a legacy .astro copy is missing', () => {
      mkdirSync(join(tempDir, 'src/generated'), { recursive: true });
      writeFileSync(join(tempDir, 'src/generated/characters.json'), '[]');

      expect(existsSync(join(tempDir, '.astro/generated/characters.json'))).toBe(false);
      expect(xmlCharacterArtifactsExist(tempDir)).toBe(true);
    });
  });
});
