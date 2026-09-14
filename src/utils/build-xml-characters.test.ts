import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { probeAvatarPath, buildXmlCharacters } from './build-xml-characters';

describe('build-xml-characters', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'build-xml-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('probeAvatarPath', () => {
    it('returns .jpg avatar path when .jpg exists', () => {
      const avatarDir = join(tempDir, 'avatars');
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(avatarDir, 'hero.jpg'), 'fake jpg');
      writeFileSync(join(avatarDir, 'hero.png'), 'fake png');

      expect(probeAvatarPath('hero', avatarDir)).toBe('/fg/avatar/hero.jpg');
    });

    it('returns .png avatar path when only .png exists', () => {
      const avatarDir = join(tempDir, 'avatars');
      mkdirSync(avatarDir, { recursive: true });
      writeFileSync(join(avatarDir, 'mage.png'), 'fake png');

      expect(probeAvatarPath('mage', avatarDir)).toBe('/fg/avatar/mage.png');
    });

    it('falls back to /fg/avatar/faceless.svg when no avatar file exists', () => {
      const avatarDir = join(tempDir, 'avatars');
      mkdirSync(avatarDir, { recursive: true });

      expect(probeAvatarPath('unknown', avatarDir)).toBe('/fg/avatar/faceless.svg');
    });
  });

  describe('buildXmlCharacters', () => {
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
  </character>
</root>`;

    it('parses XML, resolves avatar, and writes to both output targets', () => {
      const xmlDir = join(tempDir, 'sheets');
      const avatarDir = join(tempDir, 'avatars');
      const outputFile = join(tempDir, 'generated/characters.json');
      const astroOutputFile = join(tempDir, '.astro/generated/characters.json');

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
        astroOutputFile,
        logger,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Hero');
      expect(result[0].filename).toBe('testhero');
      expect(result[0].avatarPath).toBe('/fg/avatar/testhero.jpg');
      expect(warnings).toHaveLength(0);
      expect(logs).toContain('[xml-viewer] Parsed 1 character XML files');

      // Verify outputFile (src/generated/characters.json format)
      expect(existsSync(outputFile)).toBe(true);
      const generatedJson = JSON.parse(readFileSync(outputFile, 'utf8'));
      expect(generatedJson).toHaveLength(1);
      expect(generatedJson[0].filename).toBe('testhero');
      expect(generatedJson[0].avatarPath).toBe('/fg/avatar/testhero.jpg');
      expect(generatedJson[0].name).toBe('Test Hero');

      // Verify astroOutputFile (.astro/generated/characters.json format)
      expect(existsSync(astroOutputFile)).toBe(true);
      const astroJson = JSON.parse(readFileSync(astroOutputFile, 'utf8'));
      expect(astroJson).toHaveLength(1);
      expect(astroJson[0].filename).toBe('testhero');
      expect(astroJson[0].avatarPath).toBe('/fg/avatar/testhero.jpg');
      expect(astroJson[0].character.name).toBe('Test Hero');
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

  describe('real repository assets verification', () => {
    it('successfully processes all sheets in src/assets/fantasy-grounds-sheets', () => {
      const characters = buildXmlCharacters();
      expect(characters.length).toBe(111);

      const draknor = characters.find((c) => c.filename === 'draknor');
      expect(draknor).toBeDefined();
      expect(draknor?.name).toBe('Drakknor');
      expect(draknor?.avatarPath).toBe('/fg/avatar/faceless.svg');

      const antonidas = characters.find((c) => c.filename === 'antonidas');
      expect(antonidas).toBeDefined();
      expect(antonidas?.avatarPath).toBe('/fg/avatar/antonidas.png');

      const milo = characters.find((c) => c.filename === 'milo');
      expect(milo).toBeDefined();
      expect(milo?.name).toBe('Milo Cambarro (N)');
      expect(milo?.avatarPath).toBe('/fg/avatar/milo.jpg');

      const nameless = characters.find((c) => c.filename === 'non-existent');
      expect(nameless).toBeUndefined();

      // Check that .astro/generated/characters.json was created
      expect(existsSync('.astro/generated/characters.json')).toBe(true);
    });
  });
});
