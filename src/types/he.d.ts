declare module 'he' {
  export function decode(encoded: string, options?: Record<string, unknown>): string;
  export const version: string;
}
