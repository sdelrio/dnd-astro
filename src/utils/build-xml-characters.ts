import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tryParseCharacterXml, type CharacterData } from './parse-character-xml';

export interface StoredCharacter extends CharacterData {
  filename: string;
  avatarPath: string;
}

export interface CharacterArtifactEntry {
  filename: string;
  character: CharacterData;
  avatarPath: string;
}

export interface BuildXmlCharactersOptions {
  rootDir?: string;
  xmlDir?: string;
  avatarDir?: string;
  outputFile?: string;
  astroOutputFile?: string;
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
 * True when both generated characters.json artifacts already exist under rootDir.
 */
export function xmlCharacterArtifactsExist(rootDir: string = process.cwd()): boolean {
  const outputFile = resolve(rootDir, 'src/generated/characters.json');
  const astroOutputFile = resolve(rootDir, '.astro/generated/characters.json');
  return existsSync(outputFile) && existsSync(astroOutputFile);
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
 * resolves avatar paths, and writes generated characters.json artifacts.
 * Sheet order is sorted so output is deterministic across filesystems.
 * Corrupt sheets are skipped with a warning; they never fail the build.
 */
export function buildXmlCharacters(options: BuildXmlCharactersOptions = {}): StoredCharacter[] {
  const rootDir = options.rootDir ?? process.cwd();
  const xmlDir = options.xmlDir ?? resolve(rootDir, 'src/assets/fantasy-grounds-sheets');
  const avatarDir = options.avatarDir ?? resolve(rootDir, 'public/fg/avatar');
  const outputFile = options.outputFile ?? resolve(rootDir, 'src/generated/characters.json');
  const astroOutputFile =
    options.astroOutputFile ?? resolve(rootDir, '.astro/generated/characters.json');
  const logger = options.logger ?? console;

  if (!existsSync(xmlDir)) {
    logger.warn(`[xml-viewer] Warning: XML directory does not exist: ${xmlDir}`);
    return [];
  }

  const xmlFiles = readdirSync(xmlDir)
    .filter((f) => f.endsWith('.xml'))
    .sort();
  const characters: StoredCharacter[] = [];
  const astroArtifact: CharacterArtifactEntry[] = [];

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
    const stored: StoredCharacter = {
      ...parsed.character,
      filename,
      avatarPath,
    };

    characters.push(stored);
    astroArtifact.push({
      filename,
      character: parsed.character,
      avatarPath,
    });
  }

  writeJsonIfChanged(outputFile, characters);
  writeJsonIfChanged(astroOutputFile, astroArtifact);

  logger.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
  return characters;
}
