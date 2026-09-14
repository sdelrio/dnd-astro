/**
 * Generic groupBy helper that groups an array of items by a key derived from each item.
 * Preserves the encounter order of groups and items within each group.
 */
export interface GroupResult<K, T> {
  key: K;
  items: T[];
}

export function groupBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K
): GroupResult<K, T>[] {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return Array.from(map.entries(), ([key, items]) => ({ key, items }));
}
