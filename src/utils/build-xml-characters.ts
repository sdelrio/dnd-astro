import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parseCharacterXml, type CharacterData } from './parse-character-xml';

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
    warn: (msg: string, ...args: any[]) => void;
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
 * Reads all XML character sheets, parses each using parseCharacterXml,
 * resolves avatar paths, and writes generated characters.json artifacts.
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

  const xmlFiles = readdirSync(xmlDir).filter((f) => f.endsWith('.xml'));
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

    const parsed = parseCharacterXml(xml);
    if (!parsed) {
      logger.warn(`[xml-viewer] Warning: Failed to parse character XML file: ${xmlFile}`);
      continue;
    }

    const filename = xmlFile.replace(/\.xml$/, '');
    const avatarPath = probeAvatarPath(filename, avatarDir);
    const stored: StoredCharacter = {
      ...parsed,
      filename,
      avatarPath,
    };

    characters.push(stored);
    astroArtifact.push({
      filename,
      character: parsed,
      avatarPath,
    });
  }

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(characters, null, 2));
  }

  if (astroOutputFile) {
    mkdirSync(dirname(astroOutputFile), { recursive: true });
    writeFileSync(astroOutputFile, JSON.stringify(astroArtifact, null, 2));
  }

  logger.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
  return characters;
}
