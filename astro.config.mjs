// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import alpinejs from '@astrojs/alpinejs';
import mermaid from 'astro-mermaid';
import tailwindcss from '@tailwindcss/vite';
import { buildXmlCharacters } from './src/utils/build-xml-characters.ts';

function xmlCharacterViewer() {
  return {
    name: 'xml-character-viewer',
    hooks: {
      // config:setup runs on every Astro startup (dev and build), so the
      // generated JSON exists before any page renders in both modes.
      'astro:config:setup'() {
        buildXmlCharacters();
      },
    },
  };
}

export default defineConfig({
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
        { icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }
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
          label: 'Reference',
          items: [{ autogenerate: { directory: 'reference' } }],
        },
        {
          label: 'Fantasy Grounds',
          items: [
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
