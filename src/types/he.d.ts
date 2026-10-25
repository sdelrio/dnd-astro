/**
 * `he` 2.x ships no type declarations, and its exports changed shape from
 * 1.2.0: the package is ESM-only and exposes named exports, with no default
 * export. `import he from 'he'` therefore fails at module load with
 * "does not provide an export named 'default'", which takes the Astro config
 * down with it because the XML build step is imported from there.
 *
 * This is the real 2.0.0 export surface, not the 1.2.0 one: `version` is gone.
 */
declare module 'he' {
  export interface DecodeOptions {
    isAttributeValue?: boolean;
    strict?: boolean;
  }

  export interface EncodeOptions {
    allowUnsafeSymbols?: boolean;
    decimal?: boolean;
    encodeEverything?: boolean;
    strict?: boolean;
    useNamedReferences?: boolean;
  }

  export function decode(encoded: string, options?: DecodeOptions): string;
  export function encode(decoded: string, options?: EncodeOptions): string;
  export function escape(string: string): string;
  export const unescape: typeof decode;
}
