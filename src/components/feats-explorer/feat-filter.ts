export interface Feat {
  name: string;
  level: number;
  book?: string;
  abilityIncrease?: readonly string[];
}

export interface FeatFilterState {
  search?: string;
  ability?: string;
  book?: string;
  level?: string;
}

export interface LevelBucket {
  value: string;
  label: string;
  matches: (level: number) => boolean;
}

export const LEVEL_BUCKETS: LevelBucket[] = [
  { value: '0', label: 'Level 0', matches: (level) => level === 0 },
  { value: '4-18', label: 'Level 4-18', matches: (level) => level >= 4 && level <= 18 },
  { value: '19', label: 'Level 19', matches: (level) => level === 19 },
  { value: '21', label: 'Level 21', matches: (level) => level === 21 },
];

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  if (lowerText.includes(lowerQuery)) return true;
  const distance = levenshtein(lowerQuery, lowerText);
  return distance <= Math.floor(query.length / 3);
}

export function matchesLevel(featLevel: number, selectedLevel: string): boolean {
  if (selectedLevel === 'All') return true;
  const bucket = LEVEL_BUCKETS.find((b) => b.value === selectedLevel);
  return bucket ? bucket.matches(featLevel) : true;
}

export function filterFeats<T extends Feat>(
  feats: readonly T[],
  state: FeatFilterState = {},
): T[] {
  const search = state.search ?? '';
  const ability = state.ability ?? 'All';
  const book = state.book ?? 'All';
  const level = state.level ?? 'All';

  return feats.filter((feat) => {
    const matchesSearch = !search || fuzzyMatch(search, feat.name);
    const matchesAbility =
      ability === 'All' ||
      (feat.abilityIncrease !== undefined && feat.abilityIncrease.includes(ability));
    const matchesBook = book === 'All' || feat.book === book;
    const matchesLevelFilter = matchesLevel(feat.level, level);
    return matchesSearch && matchesAbility && matchesBook && matchesLevelFilter;
  });
}
