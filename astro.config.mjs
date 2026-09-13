// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = join(fileURLToPath(import.meta.url), '..');

function parseCharacterXML(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    allowBooleanAttributes: true,
  });
  const js = parser.parse(xml);
  const root = js?.root?.character || js?.character;
  if (!root) return null;

  function getCollection(obj) {
    if (!obj) return [];
    return Object.values(obj).filter((item) => typeof item === 'object');
  }

  function getText(obj, key) {
    return obj?.[key]?.['#text'] ?? '';
  }

  const classes = [];
  const rawClasses = root.classes ?? {};
  for (const key of Object.keys(rawClasses)) {
    if (!key.startsWith('id-')) continue;
    const cc = rawClasses[key];
    const cname = typeof cc.name === 'string' ? cc.name : cc.name?.['#text'] ?? '';
    const clevel = typeof cc.level === 'number' ? cc.level : Number(cc.level?.['#text'] ?? 0);
    if (cname) {
      classes.push({ name: cname, level: clevel });
    }
  }

  const abilitiesObj = root.abilities;
  const abilities = {};
  for (const stat of Object.keys(abilitiesObj || {})) {
    const s = abilitiesObj[stat];
    abilities[stat] = {
      score: Number(getText(s, 'score') || 0),
      bonus: Number(getText(s, 'bonus') || 0),
      save: Number(getText(s, 'save') || 0),
    };
  }

  const defenses = {
    ac: Number(getText(root.defenses?.ac, 'total') || 0),
    hp: Number(getText(root.hp, 'total') || 0),
    speed: Number(getText(root.speed, 'total') || 0),
    initiative: Number(getText(root.initiative, 'total') || 0),
  };

  const profBonus = Number(root.profbonus?.['#text'] || 0);

  const skills = getCollection(root.skilllist)
    .filter((s) => Number(getText(s, 'prof')) > 0)
    .map((s) => ({
      name: getText(s, 'name'),
      value: Number(getText(s, 'total') || 0),
    }));

  const languages = getCollection(root.languagelist).map((l) => getText(l, 'name'));
  const feats = getCollection(root.featlist).map((f) => getText(f, 'name'));

  const features = getCollection(root.featurelist).map((f) => ({
    level: Number(getText(f, 'level') || 0),
    name: getText(f, 'name'),
    source: getText(f, 'source'),
  }));

  const powersNode = root.powers;
  let powersRaw = [];
  if (powersNode) {
    powersRaw = Array.isArray(powersNode.power)
      ? powersNode.power
      : powersNode.power
        ? [powersNode.power]
        : [];
  }
  const powers = powersRaw.map((p) => ({
    level: Number(getText(p, 'level') || 0),
    name: getText(p, 'name'),
    group: getText(p, 'group'),
  }));

  return {
    name: getText(root, 'name'),
    race: getText(root, 'race'),
    alignment: getText(root, 'alignment'),
    background: getText(root, 'background'),
    deity: getText(root, 'deity'),
    classes,
    abilities,
    defenses,
    profBonus,
    skills,
    languages,
    feats,
    features,
    powers,
  };
}

function resolveAvatar(filename) {
  const avatarDir = resolve(__dirname, 'public/fg/avatar');
  const jpgPath = join(avatarDir, `${filename}.jpg`);
  const pngPath = join(avatarDir, `${filename}.png`);
  const fallbackPath = join(avatarDir, 'faceless.svg');

  if (existsSync(jpgPath)) return `${filename}.jpg`;
  if (existsSync(pngPath)) return `${filename}.png`;
  return 'faceless.svg';
}

function buildXmlCharacters() {
  const xmlDir = resolve(__dirname, 'src/assets/fantasy-grounds-sheets');
  const outputDir = resolve(__dirname, '.astro/generated');
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

      characters.push({ ...parsed, filename, avatar });

      index.push({
        filename,
        name: parsed.name,
        race: parsed.race,
        classes: parsed.classes.map((c) => c.name),
        level: parsed.classes.reduce((sum, c) => sum + c.level, 0),
      });

      writeFileSync(join(outputDir, `${filename}.json`), JSON.stringify(parsed, null, 2));
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
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Example Guide', slug: 'guides/example' },
          ],
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
    plugins: [
      {
        name: 'xml-character-viewer',
        buildStart() {
          buildXmlCharacters();
        },
      },
    ],
  },
});