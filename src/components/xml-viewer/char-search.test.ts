import { beforeAll, describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CharSearch from './CharSearch.astro';
import { getCharacters } from '@/utils/generated-characters';

const characters = getCharacters();

let container: AstroContainer;
let html: string;

beforeAll(async () => {
  container = await AstroContainer.create();
  html = await container.renderToString(CharSearch);
});

function cardWrapperTags(): string[] {
  return [...html.matchAll(/<div[^>]*:hidden="!matches\(\d+\)"[^>]*>/g)].map((match) => match[0]);
}

function openingTagContaining(marker: string): string {
  const markerIndex = html.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<', markerIndex);
  const tag = html.slice(start).match(/^<[a-z]+(?:[^">]|"[^"]*")*>/);
  expect(tag).not.toBeNull();
  return tag?.[0] ?? '';
}

function countSentence(): string {
  const countIndex = html.indexOf('x-text="matchCount"');
  expect(countIndex).toBeGreaterThan(-1);
  const foundIndex = html.indexOf(' found', countIndex);
  expect(foundIndex).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<', countIndex);
  return html.slice(start, foundIndex + ' found'.length);
}

describe('CharSearch without JavaScript', () => {
  it('renders every character card visible instead of shipping it hidden', () => {
    const wrappers = cardWrapperTags();
    expect(wrappers).toHaveLength(characters.length);
    const indices = wrappers.map((tag) => Number(tag.match(/!matches\((\d+)\)/)?.[1]));
    expect(indices).toEqual(characters.map((_, index) => index));
    for (const tag of wrappers) {
      expect(tag).not.toMatch(/<div\s+hidden[\s>]/);
    }
  });

  it('server-renders the total character count instead of an empty span', () => {
    expect(countSentence()).toContain(`x-text="matchCount">${characters.length}</span>`);
  });

  it('server-renders the plural "s" to match the total count', () => {
    const sentence = countSentence();
    expect(sentence).toContain(`>${characters.length}</span>`);
    expect(sentence).toContain('character');
    if (characters.length === 1) {
      expect(sentence).not.toContain('s</span> found');
    } else {
      expect(sentence).toContain('s</span> found');
    }
    expect(sentence.slice(sentence.indexOf('character'))).not.toMatch(/\shidden[\s>]/);
  });

  it('keeps the empty-state message hidden until filters match nothing', () => {
    const tag = openingTagContaining('No characters match your filters.');
    expect(tag).toMatch(/\shidden[\s>]/);
    expect(tag).toContain(':hidden="matchCount !== 0"');
  });

  it('keeps the clear-filters button hidden until a filter is active', () => {
    const tag = openingTagContaining('aria-label="Clear all filters"');
    expect(tag).toMatch(/\shidden[\s>]/);
    expect(tag).toContain(':hidden="!(search || selectedClass || selectedRace)"');
  });
});

describe('CharSearch with JavaScript', () => {
  it('wires the charSearch component and its filterable payload', () => {
    expect(html).toContain('x-data="charSearch"');
    expect(html).toContain('data-characters="');
  });

  it('keeps the Alpine bindings that narrow the server-rendered list', () => {
    expect(html).toContain('x-text="matchCount"');
    expect(html).toContain('x-model="search"');
    expect(html).toContain('x-model="selectedClass"');
    expect(html).toContain('x-model="selectedRace"');
    expect(cardWrapperTags()).toHaveLength(characters.length);
  });
});
