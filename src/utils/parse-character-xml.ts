import { XMLParser } from 'fast-xml-parser';

export interface CharacterData {
  name: string;
  race: string;
  alignment: string;
  background: string;
  deity: string;
  /** XML base filename (e.g. "milo"). Set by the build hook, not the parser. */
  filename?: string;
  classes: Array<{ name: string; level: number }>;
  abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }>;
  defenses: {
    ac: number;
    hp: number;
    speed: number;
    initiative: number;
  };
  profBonus: number;
  skills: Array<{ name: string; value: number }>;
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
  function getCollection(obj: any): any[] {
    if (!obj) return [];
    return Object.values(obj).filter((item) => typeof item === 'object');
  }
  // Parse top-level values
  const getText = (obj: any, key: string) => obj?.[key]?.['#text'] ?? '';
  // Classes
  // Classes node may be <classes>.<id-XXXXX> for each class taken
  const classes: Array<{ name: string; level: number }> = [];
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
  // Defenses
  const defenses = {
    ac: Number(getText(root.defenses?.ac, 'total') || 0),
    hp: Number(getText(root.hp, 'total') || 0),
    speed: Number(getText(root.speed, 'total') || 0),
    initiative: Number(getText(root.initiative, 'total') || 0),
  };
  // Prof bonus
  const profBonus = Number(root.profbonus?.['#text'] || 0);
  // Skills (prof only, prof > 0)
  const skills = getCollection(root.skilllist).filter(s => Number(getText(s, 'prof')) > 0).map((s: any) => ({
    name: getText(s, 'name'),
    value: Number(getText(s, 'total') || 0),
  }));
  // Languages
  const languages = getCollection(root.languagelist).map((l: any) => getText(l, 'name'));
  // Feats
  const feats = getCollection(root.featlist).map((f: any) => getText(f, 'name'));
  // Features
  const features = getCollection(root.featurelist).map((f: any) => ({
    level: Number(getText(f, 'level') || 0),
    name: getText(f, 'name'),
    source: getText(f, 'source'),
  }));
  // Only powers direct under character, not nested
  const powersNode = root.powers;
  let powersRaw: any = [];
  if (powersNode) {
    powersRaw = Array.isArray(powersNode.power)
      ? powersNode.power
      : powersNode.power
        ? [powersNode.power]
        : [];
  }
  const powers = powersRaw.map((p: any) => ({
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
