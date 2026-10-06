/**
 * The one place a sheet's number is turned into a JavaScript number.
 *
 * Every numeric field the parser reads arrives as text, and `Number(value || 0)`
 * was the idiom that read it. That idiom only catches the EMPTY STRING: a
 * non-numeric string passes straight through `||` and `Number()` returns `NaN`,
 * and an exponential literal such as `1e999` returns `Infinity`. Nothing
 * downstream guards either - the signed formatter stringifies `NaN` verbatim,
 * and the Spellcasting plates print whatever they are handed - so one hand-edited
 * sheet or one Fantasy Grounds export change is enough to put `NaN` or
 * `+Infinity` on a card with a green build either way.
 *
 * The rule is therefore stated once, here, and every numeric read goes through it.
 *
 * Two shapes are READ rather than rejected, because both occur in real sheets and
 * a coercion that refused them would report a real value as junk:
 *
 * - Thousands separators (`1,000` is a hit point total on a real sheet), and
 * - surrounding whitespace and a leading `+` (an entity-encoded `&#43;3`).
 *
 * The documented fallback is the `fallback` argument, which defaults to `0` - the
 * same value the old idiom produced for an absent field, so nothing that parsed
 * before changes. The one read with a different default is weapon damage
 * `statmult`, which falls back to `1` because a multiplier of zero is a different
 * claim from an absent multiplier.
 */
export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== 'string') return fallback;
  // Strip the separators a sheet writes for readability, and the whitespace an
  // export leaves around the text.
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '') return fallback;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * A mean, rounded to the nearest integer, with negative zero normalised away.
 *
 * `Math.round` of a slightly negative mean is `-0`, which satisfies `>= 0` and so
 * the signed formatter prints it as `+0`: a party averaging a negative initiative
 * would be shown `+0`, which reads as no modifier at all rather than as the
 * negative average it is. `-0 === 0` is true, so the value has to be normalised
 * rather than compared.
 *
 * An empty party averages to zero rather than dividing by nothing.
 */
export function roundAverage(total: number, count: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return 0;
  const rounded = Math.round(total / count);
  return rounded === 0 ? 0 : rounded;
}