import charactersJson from '@/generated/characters.json';
import type { StoredCharacter } from './build-xml-characters';

/**
 * Single typed entry point for build-time character data.
 *
 * The build hook (`buildXmlCharacters` in `./build-xml-characters.ts`) writes
 * exactly one artifact, `src/generated/characters.json`. Every consumer -
 * Party View, Char Search, character pages, and tests - reads it through this
 * module so the shapes cannot drift apart.
 */
export function getCharacters(): StoredCharacter[] {
  return charactersJson as StoredCharacter[];
}

export function getCharacter(filename: string): StoredCharacter | undefined {
  return getCharacters().find((character) => character.filename === filename);
}
