import { describe, it, expect } from 'vitest';
import { getCharacters } from './generated-characters';
import { isSafeSlug } from './build-xml-characters';
import { CHARACTER_SHEET_PATH, characterSheetPath } from './character-route';

describe('character-route', () => {
  it('builds a character sheet path from a slug', () => {
    expect(characterSheetPath('milo')).toBe('/fantasy-grounds/characters/milo');
    expect(CHARACTER_SHEET_PATH).toBe('/fantasy-grounds/characters');
  });

  it('keeps the route slug and the card link in agreement for every kept sheet', () => {
    const characters = getCharacters();
    expect(characters.length).toBeGreaterThan(0);

    for (const character of characters) {
      const href = characterSheetPath(character.filename);
      // The route takes `character.filename` as its `slug` parameter, so the
      // last path segment the link builds has to be that same value.
      expect(href.slice(CHARACTER_SHEET_PATH.length + 1)).toBe(character.filename);
      // And the value has to survive both unescaped joins unchanged, which is
      // what a safe slug buys.
      expect(isSafeSlug(character.filename)).toBe(true);
      expect(encodeURI(href)).toBe(href);
    }
  });
});
