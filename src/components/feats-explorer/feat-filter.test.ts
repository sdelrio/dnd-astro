import { describe, it, expect } from 'vitest';
import {
  levenshtein,
  fuzzyMatch,
  matchesLevel,
  filterFeats,
  LEVEL_BUCKETS,
  type Feat,
  type FeatFilterState,
} from './feat-filter';
import { FEATS } from './feat-data';

const feats: Feat[] = [
  { name: 'Alert', level: 0, book: 'phb' },
  { name: 'Lucky', level: 0, book: 'phb', abilityIncrease: [] },
  { name: 'Active Alchemy', level: 4, book: 'echh', abilityIncrease: ['Wisdom', 'Intelligence'] },
  { name: 'Mage Slayer', level: 4, book: 'phb', abilityIncrease: ['Strength'] },
  { name: 'Epic Boon of Combat Prowess', level: 19, book: 'phb' },
  { name: 'Boon of True Soul', level: 21, book: 'hof' },
];

const noFilters: FeatFilterState = {
  search: '',
  ability: 'All',
  book: 'All',
  level: 'All',
};

function names(state: FeatFilterState): string[] {
  return filterFeats(feats, state).map((f) => f.name);
}

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('alert', 'alert')).toBe(0);
  });

  it('counts single-character edits', () => {
    expect(levenshtein('alrt', 'alert')).toBe(1);
    expect(levenshtein('aler', 'alert')).toBe(1);
    expect(levenshtein('alert', 'alerts')).toBe(1);
  });

  it('is symmetric', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(levenshtein('sitting', 'kitten'));
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('fuzzyMatch', () => {
  it('matches everything when the query is empty', () => {
    expect(fuzzyMatch('', 'Alert')).toBe(true);
  });

  it('matches substrings case-insensitively', () => {
    expect(fuzzyMatch('aler', 'Alert')).toBe(true);
    expect(fuzzyMatch('ALERT', 'Alert')).toBe(true);
    expect(fuzzyMatch('cra', 'Crafter')).toBe(true);
  });

  it('matches typos within the levenshtein tolerance', () => {
    expect(fuzzyMatch('alrt', 'Alert')).toBe(true);
    expect(fuzzyMatch('luckly', 'Lucky')).toBe(true);
  });

  it('rejects strings outside the tolerance', () => {
    expect(fuzzyMatch('zzzz', 'Alert')).toBe(false);
    expect(fuzzyMatch('fireball', 'Magic Initiate')).toBe(false);
  });
});

describe('matchesLevel', () => {
  it('matches every feat when All is selected', () => {
    expect(matchesLevel(0, 'All')).toBe(true);
    expect(matchesLevel(4, 'All')).toBe(true);
    expect(matchesLevel(19, 'All')).toBe(true);
    expect(matchesLevel(21, 'All')).toBe(true);
  });

  it('matches only level 0 for the 0 bucket', () => {
    expect(matchesLevel(0, '0')).toBe(true);
    expect(matchesLevel(4, '0')).toBe(false);
    expect(matchesLevel(19, '0')).toBe(false);
  });

  it('matches the inclusive 4-18 range', () => {
    expect(matchesLevel(4, '4-18')).toBe(true);
    expect(matchesLevel(10, '4-18')).toBe(true);
    expect(matchesLevel(18, '4-18')).toBe(true);
    expect(matchesLevel(3, '4-18')).toBe(false);
    expect(matchesLevel(19, '4-18')).toBe(false);
  });

  it('matches only level 19 for the 19 bucket', () => {
    expect(matchesLevel(19, '19')).toBe(true);
    expect(matchesLevel(18, '19')).toBe(false);
    expect(matchesLevel(21, '19')).toBe(false);
  });

  it('matches only level 21 for the 21 bucket', () => {
    expect(matchesLevel(21, '21')).toBe(true);
    expect(matchesLevel(19, '21')).toBe(false);
    expect(matchesLevel(20, '21')).toBe(false);
  });
});

describe('LEVEL_BUCKETS', () => {
  it('exposes unique option values', () => {
    const values = LEVEL_BUCKETS.map((b) => b.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('drives matchesLevel for every bucket value', () => {
    for (const bucket of LEVEL_BUCKETS) {
      expect(matchesLevel(4, bucket.value)).toBe(bucket.matches(4));
      expect(matchesLevel(0, bucket.value)).toBe(bucket.matches(0));
      expect(matchesLevel(21, bucket.value)).toBe(bucket.matches(21));
    }
  });

  it('covers every level present in FEATS so no feat is unreachable', () => {
    const dataLevels = [...new Set(FEATS.map((f) => f.level))];
    for (const level of dataLevels) {
      expect(
        LEVEL_BUCKETS.some((b) => b.matches(level)),
        `no LEVEL_BUCKETS entry matches data level ${level}`,
      ).toBe(true);
    }
  });

  it('has no dead buckets: every bucket matches at least one data level', () => {
    const dataLevels = [...new Set(FEATS.map((f) => f.level))];
    for (const bucket of LEVEL_BUCKETS) {
      expect(
        dataLevels.some((level) => bucket.matches(level)),
        `LEVEL_BUCKETS entry ${bucket.value} matches no level in FEATS`,
      ).toBe(true);
    }
  });
});

describe('filterFeats', () => {
  it('returns every feat when no filters are set', () => {
    expect(names(noFilters)).toHaveLength(feats.length);
  });

  it('filters by search against feat names', () => {
    expect(names({ ...noFilters, search: 'luck' })).toEqual(['Lucky']);
    expect(names({ ...noFilters, search: 'BOON' })).toEqual([
      'Epic Boon of Combat Prowess',
      'Boon of True Soul',
    ]);
  });

  it('filters by ability when the feat grants it', () => {
    expect(names({ ...noFilters, ability: 'Strength' })).toEqual(['Mage Slayer']);
    expect(names({ ...noFilters, ability: 'Wisdom' })).toEqual(['Active Alchemy']);
  });

  it('excludes feats with no abilityIncrease when an ability is selected', () => {
    expect(names({ ...noFilters, ability: 'Charisma' })).toEqual([]);
  });

  it('filters by book code', () => {
    expect(names({ ...noFilters, book: 'hof' })).toEqual(['Boon of True Soul']);
    expect(names({ ...noFilters, book: 'echh' })).toEqual(['Active Alchemy']);
  });

  it('filters by level bucket', () => {
    expect(names({ ...noFilters, level: '0' })).toEqual(['Alert', 'Lucky']);
    expect(names({ ...noFilters, level: '4-18' })).toEqual([
      'Active Alchemy',
      'Mage Slayer',
    ]);
    expect(names({ ...noFilters, level: '19' })).toEqual(['Epic Boon of Combat Prowess']);
    expect(names({ ...noFilters, level: '21' })).toEqual(['Boon of True Soul']);
  });

  it('combines all filters', () => {
    expect(
      names({ search: 'slayer', ability: 'Strength', book: 'phb', level: '4-18' }),
    ).toEqual(['Mage Slayer']);
    expect(
      names({ search: 'alert', ability: 'Strength', book: 'phb', level: 'All' }),
    ).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [...feats];
    filterFeats(input, { ...noFilters, level: '0' });
    expect(input).toHaveLength(feats.length);
  });
});
