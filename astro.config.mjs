// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import alpinejs from '@astrojs/alpinejs';
import intersect from '@alpinejs/intersect';
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
      plugins: [intersect],
    }),
    starlight({
      title: 'DnD Companion',
      description: 'D&D rules, Fantasy Grounds xml visualizer.',
      customCss: ['./src/styles/tailwind.css'],
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
          label: 'Tools',
          items: [
            { label: 'Dice Roller', slug: 'tools/dice-roller' },
            { label: 'Feat Explorer', slug: 'tools/feat-explorer' },
          ],
        },
        {
          label: 'Fantasy Grounds',
          items: [
            { label: 'Current Party', slug: 'dnd/fantasy-grounds/current-party' },
            { label: 'Character Browser', slug: 'dnd/fantasy-grounds/character-search' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});