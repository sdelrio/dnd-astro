// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseCharacterXML } from './src/utils/parse-character-xml.ts';

const __dirname = join(fileURLToPath(import.meta.url), '..');

/** Build-time avatar probe: {filename}.jpg -> {filename}.png -> faceless.svg. */
function resolveAvatar(/** @type {string} */ filename) {
  const avatarDir = resolve(__dirname, 'public/fg/avatar');
  const jpgPath = join(avatarDir, `${filename}.jpg`);
  const pngPath = join(avatarDir, `${filename}.png`);

  if (existsSync(jpgPath)) return `${filename}.jpg`;
  if (existsSync(pngPath)) return `${filename}.png`;
  return 'faceless.svg';
}

function buildXmlCharacters() {
  const xmlDir = resolve(__dirname, 'src/assets/fantasy-grounds-sheets');
  const outputDir = resolve(__dirname, 'src/generated/characters');
  const charsIndexPath = resolve(__dirname, 'public/fg/chars/index.json');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const xmlFiles = readdirSync(xmlDir).filter((f) => f.endsWith('.xml'));
  const characters = [];
  const index = [];

  for (const xmlFile of xmlFiles) {
    const xmlPath = join(xmlDir, xmlFile);
    const xml = readFileSync(xmlPath, 'utf8');
    const parsed = parseCharacterXML(xml);

    if (parsed) {
      const filename = xmlFile.replace('.xml', '');
      const avatar = resolveAvatar(filename);
      const stored = { ...parsed, filename, avatar };

      characters.push(stored);

      index.push({
        filename,
        name: parsed.name,
        race: parsed.race,
        classes: parsed.classes.map((c) => c.name),
        level: parsed.classes.reduce((sum, c) => sum + c.level, 0),
      });

      writeFileSync(join(outputDir, `${filename}.json`), JSON.stringify(stored, null, 2));
    }
  }

  writeFileSync(charsIndexPath, JSON.stringify(index, null, 2));
  console.log(`[xml-viewer] Parsed ${characters.length} character XML files`);
}

export default defineConfig({
  integrations: [
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
            { label: 'Current Party', slug: 'fantasy-grounds/current-party' },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'xml-character-viewer',
        buildStart() {
          buildXmlCharacters();
        },
      },
    ],
  },
});