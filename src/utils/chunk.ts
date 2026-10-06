// Split a list into a fixed number of contiguous, near-equal columns.
//
// Both card tables need it: the large display lays its rows out as two
// side-by-side tables, the medium display as one. A trailing remainder goes to
// the earlier column, so five skills split 3/2 and six split 3/3 - which is what
// the golden large-mode snapshot records.
//
// The per-column width rounds up, so a list shorter than the requested column
// count leaves empty columns at the end. Both tables render one `<table>` per
// column, header and all, so an empty trailing column would become a header with
// no rows - the empty sheet ADR-0016 exists to prevent. Those columns are
// dropped here rather than guarded at every call site.
//
// It was defined identically in SavesTable.astro and SkillsTable.astro. Two
// copies of a layout rule is one copy too many: change one and the two tables
// silently disagree about where a column ends.
export function chunk<T>(list: T[], count: number): T[][] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`chunk: count must be a positive integer, received ${count}`);
  }
  if (list.length === 0) return [];
  const perColumn = Math.ceil(list.length / count);
  return Array.from({ length: count }, (_, i) => list.slice(i * perColumn, (i + 1) * perColumn)).filter(
    (column) => column.length > 0,
  );
}
