/// <reference types="astro/client" />

declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  import type { GetStaticPathsOptions, GetStaticPathsResult } from 'astro';

  const component: AstroComponentFactory;
  export default component;
  export function getStaticPaths(
    options?: GetStaticPathsOptions
  ): Promise<GetStaticPathsResult> | GetStaticPathsResult;
}
