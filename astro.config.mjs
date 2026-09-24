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
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: 'anonymous',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
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
          label: 'Guides',
          items: [{ autogenerate: { directory: 'guides' } }],
        },
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
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
