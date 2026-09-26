import { getViteConfig } from 'astro/config';
import { configDefaults } from 'vitest/config';

// `.impeccable-skill` is a vendored submodule, so exclude its own suite and
// keep the Vitest defaults.
export default getViteConfig({
  test: {
    exclude: [...configDefaults.exclude, '.impeccable-skill/**'],
  },
});
