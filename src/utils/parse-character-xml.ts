import { XMLParser } from 'fast-xml-parser';
import he from 'he';

export interface CharacterData {
  name: string;
  race: string;
  alignment: string;
  background: string;
  deity: string;
  /** XML base filename (e.g. "milo"). Set by the build hook, not the parser. */
  filename?: string;
  /** Build-time resolved avatar path (e.g. "/fg/avatar/milo.jpg"). Set by the build hook, not the parser. */
  avatarPath?: string;
  classes: Array<{ name: string; level: number }>;
  abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }>;
  ac: number;
  hp: number;
  speed: number;
  initiative: number;
  profBonus: number;
  skills: Array<{ name: string; total: number }>;
  languages: string[];
  feats: string[];
  features: Array<{ level: number; name: string; source: string }>;
  powers: Array<{ level: number; name: string; group: string }>;
}

export function parseCharacterXML(xml: string): CharacterData | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    allowBooleanAttributes: true,
  });
  const js = parser.parse(xml);
  // Defensive: Find <character> node
  const root = js?.root?.character || js?.character;
  if (!root) return null;
  // Helper for extracting collections by id keys
  type XmlFields = Record<string, { '#text'?: string }>;
  function getCollection(obj: Record<string, XmlFields> | undefined): XmlFields[] {
    if (!obj) return [];
    return Object.values(obj).filter((item) => typeof item === 'object');
  }
  // Patch: decode entities in all text output
  // Parse top-level values
  const getText = (obj: XmlFields | undefined, key: string) => {
  const val = obj?.[key]?.['#text'];
  if (typeof val === 'string') return he.decode(val);
  if (val == null) return '';
  // handle numbers or other (should not happen for text fields, but guard for tests)
  return he.decode(String(val));
};
  // Classes
  // Classes node may be <classes>.<id-XXXXX> for each class taken
  const classes: Array<{ name: string; level: number }> = [];
  const rawClasses = root.classes ?? {};
  for (const key of Object.keys(rawClasses)) {
    if (!key.startsWith('id-')) continue;
    const cc = rawClasses[key];
    // Both name and level might be encoded/strings with entities
    const cname = typeof cc.name === 'string' ? he.decode(cc.name) : he.decode(cc.name?.['#text'] ?? '');
    const clevel = typeof cc.level === 'number' ? cc.level : Number(cc.level?.['#text'] ?? 0);
    if (cname) {
      classes.push({ name: cname, level: clevel });
    }
  }
  // Abilities
  const abilitiesObj = root.abilities;
  const abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }> = {};
  for (const stat of Object.keys(abilitiesObj || {})) {
    const s = abilitiesObj[stat];
    abilities[stat] = {
      score: Number(getText(s, 'score') || 0),
      bonus: Number(getText(s, 'bonus') || 0),
      save: Number(getText(s, 'save') || 0),
      saveprof: Number(getText(s, 'saveprof') || 0),
    };
  }
  // Defenses (flat, per SPEC-003 Step 2 output shape)
  const ac = Number(getText(root.defenses?.ac, 'total') || 0);
  const hp = Number(getText(root.hp, 'total') || 0);
  const speed = Number(getText(root.speed, 'total') || 0);
  const initiative = Number(getText(root.initiative, 'total') || 0);
  // Prof bonus
  const profBonus = Number(root.profbonus?.['#text'] || 0);
  // Skills (prof only, prof > 0)
  const skills = getCollection(root.skilllist).filter(s => Number(getText(s, 'prof')) > 0).map((s) => ({
    name: getText(s, 'name'),
    total: Number(getText(s, 'total') || 0),
  }));
  // Languages
  const languages = getCollection(root.languagelist).map((l) => getText(l, 'name'));
  // Feats
  const feats = getCollection(root.featlist).map((f) => getText(f, 'name'));
  // Features
  const features = getCollection(root.featurelist).map((f) => ({
    level: Number(getText(f, 'level') || 0),
    name: getText(f, 'name'),
    source: getText(f, 'source'),
  }));
  // Powers: direct children of <character> only (root.powers is already the
  // direct node, so nested <powers/> inside inventory items never reach here).
  // Entries use id-NNNNN keys like every other FG collection.
  const powersNode = root.powers ?? {};
  const powers = Object.keys(powersNode)
    .filter((key) => key.startsWith('id-'))
    .map((key) => powersNode[key])
    .map((p) => ({
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
    ac,
    hp,
    speed,
    initiative,
    profBonus,
    skills,
    languages,
    feats,
    features,
    powers,
  };
}

export const parseCharacterXml = parseCharacterXML;
