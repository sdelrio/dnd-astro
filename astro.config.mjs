// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCharacterXML } from './src/utils/parse-character-xml.ts';

const __dirname = join(fileURLToPath(import.meta.url), '..');

function buildXmlCharacters() {
  const xmlDir = resolve(__dirname, 'src/assets/fantasy-grounds-sheets');
  const outputFile = resolve(__dirname, 'src/generated/characters.json');

  mkdirSync(dirname(outputFile), { recursive: true });

  const xmlFiles = readdirSync(xmlDir).filter((f) => f.endsWith('.xml'));
  const characters = [];

  for (const xmlFile of xmlFiles) {
    const xmlPath = join(xmlDir, xmlFile);
    const xml = readFileSync(xmlPath, 'utf8');
    const parsed = parseCharacterXML(xml);

    if (parsed) {
      characters.push({ ...parsed, filename: xmlFile.replace('.xml', '') });
    }
  }

  writeFileSync(outputFile, JSON.stringify(characters, null, 2));
  console.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
}

function xmlCharacterViewer() {
  return {
    name: 'xml-character-viewer',
    hooks: {
      // config:setup runs on every Astro startup (dev and build), so the
      // generated JSON exists before any page renders in both modes.
      'astro:config:setup'() {
        buildXmlCharacters();
      },
      'astro:build:start'() {
        buildXmlCharacters();
      },
    },
  };
}

export default defineConfig({
  integrations: [
    xmlCharacterViewer(),
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
          label: 'Fantasy Grounds',
          items: [
            { label: 'Current Party', slug: 'dnd/fantasy-grounds/current-party' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});