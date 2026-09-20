import { XMLParser } from 'fast-xml-parser';
import he from 'he';

export interface PassiveSkills {
  perception: number;
  investigation: number;
  insight: number;
}

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
  classes: Array<{ name: string; level: number; subclass?: string }>;
  abilities: Record<string, { score: number; bonus: number; save: number; saveprof: number }>;
  ac: number;
  hp: number;
  tempHp: number;
  speed: number;
  initiative: number;
  profBonus: number;
  skills: Array<{ name: string; total: number }>;
  passives: PassiveSkills;
  languages: string[];
  feats: string[];
  features: Array<{ level: number; name: string; source: string }>;
  powers: Array<{ level: number; name: string; group: string }>;
}

// Subclass naming patterns per class, used only for the level-1 feature-entry
// fallback (a granted feature whose name IS the subclass, e.g.
// <name>School of Transmutation</name><source>Wizard</source>).
const SUBCLASS_NAME_PATTERNS: Record<string, RegExp> = {
  Barbarian: /^Path of (?:the )?\S.*$|^(?:Ancestral Guardian|Storm Herald)$/,
  Bard: /^College of \S.*$/,
  Cleric: /^\S+ Domain$/,
  Druid: /^Circle of \S.*$/,
  Fighter: /^(?:Battle Master|Champion|Eldritch Knight|Purple Dragon Knight|Psi Warrior|Arcane Archer|Cavalier|Samurai)$/,
  Monk: /^Way of \S.*$|^(?:Sun Soul|Long Death|Four Elements|Kensei)$/,
  Paladin: /^Oath of \S.*$|^Oathbreaker$/,
  Ranger: /^\S+ Conclave$|^(?:Beast Master|Gloom Stalker|Horizon Walker|Monster Slayer|Fey Wanderer)$/,
  Rogue: /^(?:Thief|Assassin|Arcane Trickster|Scout|Swashbuckler|Inquisitive|Mastermind)$/,
  Sorcerer: /^(?:Draconic Bloodline|Wild Magic|Storm Sorcery|Shadow Magic|Divine Soul|Clockwork Soul|Aberrant Mind)$/,
  Warlock: /^The \S.*$/,
  Wizard: /^School of \S.*$|^Bladesinging$|^War Magic$/,
};

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
  // Subclass resolution order: class-node <specialization> -> feature entry
  // with <specialization> (matched via the feature's <source>) -> level-1
  // granted feature whose name is the subclass itself. Sheets rebuilt mid-play
  // can leave features of an older subclass behind; first featurelist match
  // wins.
  const featureEntries = getCollection(root.featurelist);
  const subclassBySource = new Map<string, string>();
  for (const f of featureEntries) {
    const fsource = getText(f, 'source');
    const fspecialization = getText(f, 'specialization');
    if (!fsource || !fspecialization || subclassBySource.has(fsource)) continue;
    subclassBySource.set(fsource, fspecialization);
  }
  for (const f of featureEntries) {
    const fsource = getText(f, 'source');
    if (!fsource || subclassBySource.has(fsource)) continue;
    if (Number(getText(f, 'level') || 0) !== 1) continue;
    if (Number(getText(f, 'locked') || 0) !== 1) continue;
    const pattern = SUBCLASS_NAME_PATTERNS[fsource];
    const fname = getText(f, 'name');
    if (pattern && pattern.test(fname)) subclassBySource.set(fsource, fname);
  }
  const classes: Array<{ name: string; level: number; subclass?: string }> = [];
  const rawClasses = root.classes ?? {};
  for (const key of Object.keys(rawClasses)) {
    if (!key.startsWith('id-')) continue;
    const cc = rawClasses[key];
    // Both name and level might be encoded/strings with entities
    const cname = typeof cc.name === 'string' ? he.decode(cc.name) : he.decode(cc.name?.['#text'] ?? '');
    const clevel = typeof cc.level === 'number' ? cc.level : Number(cc.level?.['#text'] ?? 0);
    const csubclass = getText(cc, 'specialization') || subclassBySource.get(cname) || '';
    if (cname) {
      classes.push({ name: cname, level: clevel, ...(csubclass ? { subclass: csubclass } : {}) });
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
  const tempHp = Number(getText(root.hp, 'temporary') || 0);
  const speed = Number(getText(root.speed, 'total') || 0);
  const initiative = Number(getText(root.initiative, 'total') || 0);
  // Prof bonus
  const profBonus = Number(root.profbonus?.['#text'] || 0);
  // Skills: the prof-only list (prof > 0) keeps its SPEC-003 shape, while
  // passives read every entry regardless of prof (a prof 0 skill still has a
  // passive value).
  const skillEntries = getCollection(root.skilllist).map((s) => ({
    name: getText(s, 'name'),
    total: Number(getText(s, 'total') || 0),
    prof: Number(getText(s, 'prof') || 0),
  }));
  const skills = skillEntries
    .filter((s) => s.prof > 0)
    .map(({ name, total }) => ({ name, total }));
  const passives: PassiveSkills = { perception: 10, investigation: 10, insight: 10 };
  for (const s of skillEntries) {
    const key = s.name.toLowerCase() as keyof PassiveSkills;
    if (key === 'perception' || key === 'investigation' || key === 'insight') {
      passives[key] = 10 + s.total;
    }
  }
  // Languages
  const languages = getCollection(root.languagelist).map((l) => getText(l, 'name'));
  // Feats
  const feats = getCollection(root.featlist).map((f) => getText(f, 'name'));
  // Features
  const features = featureEntries.map((f) => ({
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
    tempHp,
    speed,
    initiative,
    profBonus,
    skills,
    passives,
    languages,
    feats,
    features,
    powers,
  };
}

export const parseCharacterXml = parseCharacterXML;
