import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tryParseCharacterXml, type CharacterData } from './parse-character-xml';

export interface StoredCharacter extends CharacterData {
  filename: string;
  avatarPath: string;
}

export interface BuildXmlCharactersOptions {
  rootDir?: string;
  xmlDir?: string;
  avatarDir?: string;
  outputFile?: string;
  logger?: {
    log: (msg: string) => void;
    warn: (msg: string, ...args: unknown[]) => void;
  };
}

/**
 * Probe for an avatar image matching the base filename in the avatar directory.
 * Resolution priority: .jpg -> .png -> faceless.svg
 */
export function probeAvatarPath(base: string, avatarDir: string): string {
  if (existsSync(join(avatarDir, `${base}.jpg`))) {
    return `/fg/avatar/${base}.jpg`;
  }
  if (existsSync(join(avatarDir, `${base}.png`))) {
    return `/fg/avatar/${base}.png`;
  }
  return '/fg/avatar/faceless.svg';
}

/**
 * Whether the XML character rebuild should run for this Astro config command.
 * Render commands (dev, build) always rebuild so pages get fresh sheet data.
 * Non-render commands (sync covers `astro check`/`astro sync`, plus preview)
 * rebuild only when artifacts are missing (e.g. a fresh clone).
 */
export function shouldRebuildXmlCharacters(
  command: 'dev' | 'build' | 'preview' | 'sync',
  artifactsExist: boolean
): boolean {
  if (command === 'dev' || command === 'build') return true;
  return !artifactsExist;
}

/**
 * True when the single generated characters.json artifact exists under rootDir.
 */
export function xmlCharacterArtifactsExist(rootDir: string = process.cwd()): boolean {
  return existsSync(resolve(rootDir, 'src/generated/characters.json'));
}

function writeJsonIfChanged(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) {
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

/**
 * Reads all XML character sheets, parses each using tryParseCharacterXml,
 * resolves avatar paths, and writes the single generated characters.json
 * artifact at src/generated/characters.json (consumed via
 * `./generated-characters.ts`).
 * Sheet order is sorted so output is deterministic across filesystems.
 * Corrupt sheets are skipped with a warning; they never fail the build.
 * A stale legacy copy under .astro/generated from the old dual-write is
 * removed so it cannot drift.
 */
export function buildXmlCharacters(options: BuildXmlCharactersOptions = {}): StoredCharacter[] {
  const rootDir = options.rootDir ?? process.cwd();
  const xmlDir = options.xmlDir ?? resolve(rootDir, 'src/assets/fantasy-grounds-sheets');
  const avatarDir = options.avatarDir ?? resolve(rootDir, 'public/fg/avatar');
  const outputFile = options.outputFile ?? resolve(rootDir, 'src/generated/characters.json');
  const legacyAstroOutputFile = resolve(rootDir, '.astro/generated/characters.json');
  const logger = options.logger ?? console;

  if (!existsSync(xmlDir)) {
    logger.warn(`[xml-viewer] Warning: XML directory does not exist: ${xmlDir}`);
    return [];
  }

  const xmlFiles = readdirSync(xmlDir)
    .filter((f) => f.endsWith('.xml'))
    .sort();
  const characters: StoredCharacter[] = [];

  for (const xmlFile of xmlFiles) {
    const xmlPath = join(xmlDir, xmlFile);
    let xml: string;
    try {
      xml = readFileSync(xmlPath, 'utf8');
    } catch (err) {
      logger.warn(`[xml-viewer] Warning: Failed to read XML file ${xmlFile}:`, err);
      continue;
    }

    const parsed = tryParseCharacterXml(xml);
    if (!parsed.ok) {
      logger.warn(
        `[xml-viewer] Warning: Failed to parse character XML file: ${xmlFile}: ${parsed.reason}`
      );
      continue;
    }

    const filename = xmlFile.replace(/\.xml$/, '');
    const avatarPath = probeAvatarPath(filename, avatarDir);
    characters.push({ ...parsed.character, filename, avatarPath });
  }

  writeJsonIfChanged(outputFile, characters);
  removeLegacyAstroArtifact(legacyAstroOutputFile, logger);

  logger.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
  return characters;
}

function removeLegacyAstroArtifact(
  legacyPath: string,
  logger: { log: (msg: string) => void; warn: (msg: string, ...args: unknown[]) => void }
): void {
  if (!existsSync(legacyPath)) return;
  try {
    rmSync(legacyPath);
    logger.log('[xml-viewer] Removed legacy dual-write artifact: .astro/generated/characters.json');
  } catch (err) {
    logger.warn('[xml-viewer] Warning: Failed to remove legacy artifact:', err);
  }
}
