import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getCharacters, getCharacter } from './generated-characters';

describe('generated-characters loader', () => {
  it('exposes exactly the contents of the single src/generated artifact', () => {
    const raw = JSON.parse(readFileSync('src/generated/characters.json', 'utf8')) as unknown[];
    expect(getCharacters()).toEqual(raw);
  });

  it('returns typed StoredCharacter entries with filename and avatarPath', () => {
    const characters = getCharacters();
    expect(characters.length).toBeGreaterThan(0);
    for (const character of characters) {
      expect(typeof character.filename).toBe('string');
      expect(character.avatarPath.startsWith('/fg/avatar/')).toBe(true);
      expect(typeof character.name).toBe('string');
    }
  });

  it('looks up a character by filename', () => {
    const [first] = getCharacters();
    expect(getCharacter(first.filename)).toEqual(first);
  });

  it('returns undefined for an unknown filename', () => {
    expect(getCharacter('non-existent-character')).toBeUndefined();
  });
});
