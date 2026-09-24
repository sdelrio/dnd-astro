import { describe, it, expect } from 'vitest';
import { getStaticPaths } from './[slug].astro';
import { getCharacters } from '@/utils/generated-characters';
import type { StoredCharacter } from '@/utils/build-xml-characters';

type CharacterPath = {
  params: { slug: string };
  props: { character: StoredCharacter };
};

const characters = getCharacters();

describe('character page getStaticPaths', () => {
  it('returns one path per generated character, with slug equal to filename', () => {
    const paths = getStaticPaths() as CharacterPath[];

    expect(paths).toHaveLength(characters.length);
    expect(paths.map((path) => path.params.slug).sort()).toEqual(
      characters.map((character) => character.filename).sort()
    );
  });

  it('passes the matching character entry as props', () => {
    const paths = getStaticPaths() as CharacterPath[];

    for (const path of paths) {
      const character = characters.find((entry) => entry.filename === path.params.slug);
      expect(character).toBeDefined();
      expect(path.props.character).toEqual(character);
    }
  });
});
