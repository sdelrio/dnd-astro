/**
 * The URL space character sheets live in.
 *
 * The prerendered route at `src/pages/fantasy-grounds/characters/[slug].astro`
 * owns the same prefix, and it takes the sheet basename as its `slug` parameter.
 * The card builds its portrait link through `characterSheetPath`, so the route
 * and the link consume one value from one place.
 *
 * `build-xml-characters.ts` rejects any sheet whose basename is not a safe URL
 * slug (`SAFE_SLUG_PATTERN`), which is what lets this join stay unescaped: a
 * safe basename needs no percent-encoding, so the path the link builds and the
 * path the route serves are byte-for-byte the same.
 */
export const CHARACTER_SHEET_PATH = '/fantasy-grounds/characters';

/** The path of a character sheet page, from the sheet's URL slug. */
export function characterSheetPath(slug: string): string {
  return `${CHARACTER_SHEET_PATH}/${slug}`;
}
