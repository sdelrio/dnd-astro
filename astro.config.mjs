// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import alpinejs from '@astrojs/alpinejs';
import mermaid from 'astro-mermaid';
import tailwindcss from '@tailwindcss/vite';
import {
  buildXmlCharacters,
  shouldRebuildXmlCharacters,
  xmlCharacterArtifactsExist,
} from './src/utils/build-xml-characters.ts';

/** @type {() => import('astro').AstroIntegration} */
function xmlCharacterViewer() {
  return {
    name: 'xml-character-viewer',
    hooks: {
      // config:setup runs on every Astro startup. Render commands (dev,
      // build) always rebuild so pages get fresh sheet data. Non-render
      // commands (sync covers astro check/sync, plus preview) only rebuild
      // when artifacts are missing (fresh clone), otherwise skip.
      'astro:config:setup'({ command }) {
        if (shouldRebuildXmlCharacters(command, xmlCharacterArtifactsExist())) {
          buildXmlCharacters();
        }
      },
    },
  };
}

export default defineConfig({
  site: 'https://dnd-companion.lorien.cloud',
  integrations: [
    xmlCharacterViewer(),
    alpinejs({
      entrypoint: '/src/alpine.ts',
    }),
    mermaid({
      autoTheme: true,
    }),
    starlight({
      title: 'D&D Companion',
      description: 'D&D rules, Fantasy Grounds xml visualizer.',
      customCss: ['./src/styles/tailwind.css'],
      // ADR-0019: the display face is served from this repository, so the
      // head has no third-party font dependency left to warm up. The preload
      // replaces what the two preconnects used to do, and goes on the face
      // itself because the face is now the render-blocking request.
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/fonts/Cinzel.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous',
          },
        },
      ],
      components: {
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/sdelrio/dnd-astro' }
      ],
      sidebar: [
        {
          label: 'D&D rule fixes',
          items: [{ autogenerate: { directory: 'dnd' } }],
        },
        {
          label: 'D&D Tools',
          items: [{ autogenerate: { directory: 'dnd-tools' } }],
        },
        {
          label: 'Fantasy Grounds',
          items: [
            { label: 'FG Effects', slug: 'fantasy-grounds/fg-effects' },
            { label: 'Current Party', slug: 'fantasy-grounds/current-party' },
            { label: 'Character Search', slug: 'fantasy-grounds/character-search' },
          ],
        },
        // A group of its own rather than an entry in one of the three above: the
        // sidebar is global, so this is what makes the printed Handbook reachable
        // from every page of the site rather than from the homepage only. The
        // index page is contractually free of action buttons, so the download is
        // documented here instead of added there.
        {
          label: 'Handbook',
          items: [{ label: 'D&D House Rules Handbook', slug: 'handbook' }],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
