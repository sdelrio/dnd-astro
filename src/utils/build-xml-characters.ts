import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  renameSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tryParseCharacterXml, type CharacterData } from './parse-character-xml';
import { probeAvatarPath } from './avatar-path';

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
 * The fraction of the previous roster a rebuild has to reach to be believed.
 *
 * A sheet that stops parsing is skipped, which is right: one bad file is not a
 * reason to fail a build. But a run that comes back with less than half the
 * records the artifact already holds is not a few bad files either, it is an
 * upstream parser or export change, and writing it out turns a green build into
 * a silently empty site. Below this the previous records are kept and the log
 * says so.
 */
const MIN_ROSTER_RETENTION = 0.5;

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
 * True when the single generated characters.json artifact exists under rootDir
 * AND is a readable, non-empty roster.
 *
 * "Exists" is deliberately not the whole test. An artifact left empty or
 * half-written by an earlier build is the damage this module now prevents, and
 * an `existsSync` check accepts it as valid: `sync` (so `astro check`, so
 * `pnpm typecheck`) and `preview` would then skip the rebuild and build an empty
 * site with a green typecheck. A roster of zero records from a directory that
 * holds committed sheets is not a valid state, so it counts as missing and the
 * rebuild runs - where it either restores the roster or fails loudly.
 */
export function xmlCharacterArtifactsExist(rootDir: string = process.cwd()): boolean {
  const artifact = resolve(rootDir, 'src/generated/characters.json');
  if (!existsSync(artifact)) return false;
  try {
    const parsed: unknown = JSON.parse(readFileSync(artifact, 'utf8'));
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    // A file that cannot be parsed is the truncated-write case. Same answer:
    // treat it as missing so the rebuild replaces it rather than trusting it.
    return false;
  }
}

/**
 * The records already in the artifact, or an empty roster when there is nothing
 * readable there. Used to decide whether a rebuild is an improvement or a
 * regression; a corrupt previous artifact is treated as no previous records, so
 * it can never block a good rebuild.
 */
function readPreviousRoster(filePath: string): StoredCharacter[] {
  if (!existsSync(filePath)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as StoredCharacter[]) : [];
  } catch {
    return [];
  }
}

/**
 * Writes the artifact through a `.part` sibling and renames it into place, the
 * same staged write the handbook generator uses.
 *
 * A reader either sees the whole previous artifact or the whole new one, never a
 * half-written file: `rename` within a directory is atomic, so an interrupted
 * write leaves the previous artifact intact and readable and at worst a `.part`
 * sibling that is removed here.
 *
 * The bytes are also read back out of the file on disk and parsed, because the
 * thing a later command reads is the file rather than the string this process
 * assembled.
 */
function writeJsonAtomically(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) {
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  const staging = `${filePath}.part`;
  try {
    writeFileSync(staging, content);
    renameSync(staging, filePath);
  } catch (err) {
    rmSync(staging, { force: true });
    throw err;
  }

  const readBack: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!Array.isArray(readBack) || readBack.length !== (data as unknown[]).length) {
    throw new Error(
      `[xml-viewer] The written artifact at ${filePath} does not read back as a roster of ${
        (data as unknown[]).length
      } records. It has been left in place for inspection rather than believed.`
    );
  }
}

/**
 * Reads all XML character sheets, parses each using tryParseCharacterXml,
 * resolves avatar paths, and writes the single generated characters.json
 * artifact at src/generated/characters.json (consumed via
 * `./generated-characters.ts`).
 * Sheet order is sorted so output is deterministic across filesystems.
 * A sheet that cannot be read or parsed is skipped with a warning, and a roster
 * that still holds sheets keeps building. Three cases are NOT warnings:
 *
 * - A non-empty sheet directory in which ZERO sheets parse throws. A directory
 *   of nothing but corrupt files is an upstream change, not a roster, and
 *   continuing writes an empty artifact that every later command then treats as
 *   valid. The artifact on disk is left untouched.
 * - A rebuild that comes back with less than MIN_ROSTER_RETENTION of the records
 *   the artifact already holds keeps the previous records and says so. Skipping
 *   one bad sheet is right; replacing 111 with 3 is a regression.
 * - The write itself is staged and renamed, so an interrupted write cannot
 *   leave a truncated file where a reader looks for one.
 *
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
  const skipped: string[] = [];

  for (const xmlFile of xmlFiles) {
    const xmlPath = join(xmlDir, xmlFile);
    let xml: string;
    try {
      xml = readFileSync(xmlPath, 'utf8');
    } catch (err) {
      logger.warn(`[xml-viewer] Warning: Failed to read XML file ${xmlFile}:`, err);
      skipped.push(xmlFile);
      continue;
    }

    const parsed = tryParseCharacterXml(xml);
    if (!parsed.ok) {
      logger.warn(
        `[xml-viewer] Warning: Failed to parse character XML file: ${xmlFile}: ${parsed.reason}`
      );
      skipped.push(xmlFile);
      continue;
    }

    const filename = xmlFile.replace(/\.xml$/, '');
    const avatarPath = probeAvatarPath(filename, avatarDir);
    characters.push({ ...parsed.character, filename, avatarPath });
  }

  const previous = readPreviousRoster(outputFile);

  if (xmlFiles.length > 0 && characters.length === 0) {
    throw new Error(totalRegressionMessage({ xmlDir, outputFile, previous, skipped, logger }));
  }

  if (isRosterRegression(previous, characters)) {
    logger.warn(
      `[xml-viewer] This build parsed ${characters.length} character sheets but kept the previous ` +
        `${previous.length} records at ${outputFile}: a rebuild that shrinks the roster past ` +
        `${Math.round(MIN_ROSTER_RETENTION * 100)}% is an upstream change, not a few bad files. ` +
        `Fix the parser or the sheets rather than accepting the smaller roster. If the roster ` +
        `really did shrink, delete ${outputFile} and rebuild to write the new one.` +
        (skipped.length > 0
          ? ` Skipped ${skipped.length}: ${skipped.slice(0, 5).join(', ')}${
              skipped.length > 5 ? ', ...' : ''
            }.`
          : '')
    );
    removeLegacyAstroArtifact(legacyAstroOutputFile, logger);
    return previous;
  }

  writeJsonAtomically(outputFile, characters);
  removeLegacyAstroArtifact(legacyAstroOutputFile, logger);

  logger.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
  return characters;
}

/**
 * Whether a rebuild shrank the roster so far it cannot be a few corrupt files.
 * An empty rebuild over a non-empty previous roster is the sharpest case and is
 * covered by the same comparison.
 */
function isRosterRegression(previous: StoredCharacter[], next: StoredCharacter[]): boolean {
  if (previous.length === 0) return false;
  return next.length < previous.length * MIN_ROSTER_RETENTION;
}

/**
 * The thrown message for "a directory full of sheets, none of which parse".
 *
 * Actionable means it names the directory, the count, what is still on disk, and
 * where to look. It throws rather than warns because the alternative - writing
 * an empty artifact - is the failure this exists to stop: `sync` and `preview`
 * would then skip the rebuild, `getStaticPaths` would return nothing, and
 * `pnpm typecheck` would stay green over an empty site.
 */
function totalRegressionMessage({
  xmlDir,
  outputFile,
  previous,
  skipped,
  logger,
}: {
  xmlDir: string;
  outputFile: string;
  previous: StoredCharacter[];
  skipped: string[];
  logger: { log: (msg: string) => void; warn: (msg: string, ...args: unknown[]) => void };
}): string {
  const onDisk =
    previous.length > 0
      ? `The previous ${previous.length} records at ${outputFile} were kept untouched, so a reader still finds them.`
      : `There is no previous artifact at ${outputFile}, so there is nothing to fall back on.`;

  const detail = skipped
    .slice(0, 5)
    .map((file) => `  - ${file}`)
    .join('\n');

  const message =
    `[xml-viewer] 0 of ${skipped.length} character sheets in ${xmlDir} parsed, so the build is ` +
    `stopped rather than continued with an empty roster. ${onDisk}\n` +
    `A directory of nothing but corrupt sheets is an upstream change to the export or to ` +
    `parse-character-xml.ts, not a smaller party.\n` +
    (detail === '' ? '' : `Skipped:\n${detail}\n`) +
    `Warnings above name the parse reason for each file.`;

  logger.warn(message);
  return message;
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
