// Split a list into a fixed number of contiguous, near-equal columns.
//
// Both card tables need it: the large display lays its rows out as two
// side-by-side tables, the medium display as one. A trailing remainder goes to
// the earlier column, so five skills split 3/2 and six split 3/3 - which is what
// the golden large-mode snapshot records.
//
// It was defined identically in SavesTable.astro and SkillsTable.astro. Two
// copies of a layout rule is one copy too many: change one and the two tables
// silently disagree about where a column ends.
export function chunk<T>(list: T[], count: number): T[][] {
  if (count < 1) return [list];
  const perColumn = Math.ceil(list.length / count);
  return Array.from({ length: count }, (_, i) => list.slice(i * perColumn, (i + 1) * perColumn));
}
