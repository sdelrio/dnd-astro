import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', '.astro/**', '.vitest/**', 'src/generated/**', 'tmp/**', '.scratch/**', '.agents/**', '.claude/**', '.opencode/**', '.devbox/**', '.impeccable-skill/**']),
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.astro', '**/*.astro/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.astro/*.{js,ts}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    ignores: ['**/*.astro/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: { globals: globals.worker },
  },
]);
