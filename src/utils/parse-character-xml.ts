import { XMLParser } from 'fast-xml-parser';
import he from 'he';
import { coerceNumber } from './numeric';

export interface PassiveSkills {
  perception: number;
  investigation: number;
  insight: number;
}

export interface WeaponDamageData {
  bonus: number;
  dice: string;
  stat: string;
  statmult: number;
  type: string;
}

export interface WeaponData {
  name: string;
  attackbonus: number;
  attackstat: string;
  properties: string;
  carried: number;
  /** Fantasy Grounds weapon type: 0 = melee, 1 = ranged, 2 = thrown. */
  type: number;
  damage: WeaponDamageData[];
}

export interface InventoryItem {
  name: string;
  count: number;
  weight: number;
  carried: number;
}

export interface Coins {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

/**
 * One spell level's slot pool, as the sheet records it.
 *
 * `max` is the level's total and `used` is how many of them are spent, which is
 * the pair a caster reads mid-turn: "2 of 4" and "4 of 4" are different turns.
 * `used > max` is representable and is not corrected here - a sheet that says so
 * is reporting its own state, and clamping it would silently disagree with the
 * printed character sheet.
 */
export interface SpellSlotData {
  /** 1 through 9, the spell level this block describes. */
  level: number;
  max: number;
  used: number;
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
  allSkills: Array<{ name: string; total: number; prof: number; stat: string }>;
  passives: PassiveSkills;
  languages: string[];
  feats: string[];
  features: Array<{ level: number; name: string; source: string }>;
  powers: Array<{ level: number; name: string; group: string; prepared: number; preparedDomain: number }>;
  weapons: WeaponData[];
  spellSlots: SpellSlotData[];
  inventory: InventoryItem[];
  coins: Coins;
}

const COIN_DENOMINATIONS: Record<string, keyof Coins> = {
  PP: 'pp',
  GP: 'gp',
  EP: 'ep',
  SP: 'sp',
  CP: 'cp',
};

// The spell levels a sheet can carry slots for. Nine, because that is how many the
// node names, and a fixed list rather than "whichever blocks were found" so that a
// missing block reads as zero slots rather than as an absent level.
const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Subclass naming patterns per class, used only for the level-1 feature-entry
// fallback (a granted feature whose name IS the subclass, e.g.
// <name>School of Transmutation</name><source>Wizard</source>).
//
// Keys are the class name exactly as the sheet writes it in `<source>`, which for
// a two-word class carries the space (`Blood Hunter`, not `BloodHunter`).
//
// These are reconciled with the casting tables in `spellcasting-display.ts`, and
// the two lists answer different questions about the same names: a pattern here
// recognises a *feature name* that stands in for a subclass the sheet's class node
// no longer carries, while a casting entry maps a *subclass name* to the ability it
// casts with. A subclass only reaches a card if the parser can recover it and the
// casting table can read it, so a name taught to one and not the other is a name
// half the pipeline cannot use. `casting-ability-corpus.test.ts` is what catches
// the case where a class is missing from the casting side.
const SUBCLASS_NAME_PATTERNS: Record<string, RegExp> = {
  Barbarian: /^Path of (?:the )?\S.*$|^(?:Ancestral Guardian|Storm Herald)$/,
  Bard: /^College of \S.*$/,
  'Blood Hunter': /^Order of (?:the )?\S.*$/,
  Cleric: /^\S+ Domain$/,
  Druid: /^Circle of \S.*$/,
  'Anti Paladin': /^Oathbreaker$/,
  Fighter:
    /^(?:Battle Master|Champion|Eldritch Knight|Purple Dragon Knight|Psi Warrior|Soulknife|Arcane Archer|Cavalier|Samurai)$/,
  Monk: /^Way of \S.*$|^(?:Sun Soul|Long Death|Four Elements|Kensei)$/,
  Paladin: /^Oath of \S.*$|^Oathbreaker$/,
  Ranger: /^\S+ Conclave$|^(?:Beast Master|Gloom Stalker|Horizon Walker|Monster Slayer|Fey Wanderer)$/,
  Rogue: /^(?:Thief|Assassin|Arcane Trickster|Scout|Swashbuckler|Inquisitive|Mastermind)$/,
  Sorcerer: /^(?:Draconic Bloodline|Wild Magic|Storm Sorcery|Shadow Magic|Divine Soul|Clockwork Soul|Aberrant Mind)$/,
  Warlock: /^The \S.*$/,
  Wizard: /^School of \S.*$|^Bladesinging$|^War Magic$/,
};

/**
 * A collection key the parser could not read as a record and did not
 * deliberately exclude. The parse still succeeds; this is what lets the build
 * hook say which keys a sheet dropped and from where.
 */
export interface UnrecognisedCollection {
  /** The Fantasy Grounds collection node the keys were found in, e.g. "skilllist". */
  collection: string;
  /** The non-attribute object keys the parser dropped, in document order. */
  keys: string[];
}

interface ParsedCharacter {
  character: CharacterData;
  unrecognised: UnrecognisedCollection[];
}

function parseCharacterXmlUnsafe(xml: string): ParsedCharacter | null {
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
  interface XmlNode {
    '#text'?: string;
    [key: string]: XmlField | undefined;
  }
  // A field is a node object when the sheet tags carry attributes, and a bare
  // text value when they do not (e.g. a top-level <profbonus>). Both shapes
  // carry the same characters, so read whichever one is there.
  type XmlField = XmlNode | string | number;
  // The unrecognised keys this parse dropped, accumulated as each collection is
  // read. `CharacterData` is unchanged: the report travels beside it so the
  // generated artifact keeps its shape.
  const unrecognised: UnrecognisedCollection[] = [];
  /**
   * Whether a non-record key's value is itself a collection of records.
   *
   * This is the distinction between the two kinds of key the record filter
   * drops, and it is the whole reason the filter is load-bearing rather than
   * defensive. Fantasy Grounds nests a look-alike collection inside an unrelated
   * one - a `<powers>` block carried by an inventory item, whose own children are
   * `id-NNNNN` records. Such a node is deliberately excluded, never a record, so
   * it is not worth a warning. A key whose value has no record children is a
   * record the parser cannot read (renumbered `id-` keys, a hand-added sheet),
   * and that is the quiet loss this makes observable.
   */
  function isNestedCollection(value: XmlField, prefixes: readonly string[]): boolean {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some((key) => prefixes.some((prefix) => key.startsWith(prefix)));
  }
  // Helper for extracting collections by id keys
  /**
   * Fantasy Grounds collections are keyed by generated record identifiers
   * (`id-NNNNN`). Filter to those keys. Two kinds of key are dropped, and the
   * difference between them is the whole point:
   *
   * - A nested look-alike collection - a `<powers/>` block carried by an
   *   inventory item, whose own children are `id-NNNNN` records - is rejected on
   *   purpose. Collecting it as a record invents a phantom entry with a blank
   *   name. It is never reported.
   * - A bare sibling key with no record children (a `<language/>` inside
   *   `<languagelist>`, or a sheet whose records were renumbered) cannot be told
   *   apart from a record the parser should have read, so it is collected onto
   *   `unrecognised` and the caller reports it.
   *
   * Field-less records (`<id-00004 />`) parse to a bare string rather than a
   * node, so keep the object check too: they have nothing to read.
   *
   * `prefix` defaults to `id-` because that is how every Fantasy Grounds
   * collection is keyed. One node keys its records differently - `<coins>`, which
   * also writes the same records out as `slot1..slot6` - so it names its own.
   * `acceptedPrefixes` names the record prefixes a collection legitimately
   * carries but does not read here (the purse's two representations), so the
   * alternate is not mistaken for an unrecognised key.
   */
  function getCollection(
    obj: XmlField | undefined,
    {
      prefix = 'id-',
      label,
      acceptedPrefixes = [prefix],
    }: { prefix?: string; label: string; acceptedPrefixes?: readonly string[] }
  ): XmlNode[] {
    if (!obj || typeof obj !== 'object') return [];
    const entries = Object.entries(obj);
    const records = entries
      .filter(([key, item]) => key.startsWith(prefix) && item !== null && typeof item === 'object')
      .map(([, item]) => item as XmlNode);
    const unknown = entries
      .filter(([key, item]) => {
        if (key === '#text' || key.startsWith('@_')) return false;
        if (acceptedPrefixes.some((accepted) => key.startsWith(accepted))) return false;
        if (item === null || typeof item !== 'object') return false;
        return !isNestedCollection(item, acceptedPrefixes);
      })
      .map(([key]) => key);
    if (unknown.length > 0) unrecognised.push({ collection: label, keys: unknown });
    return records;
  }
  // Patch: decode entities in all text output
  // Parse top-level values
  const getText = (obj: XmlField | undefined, key: string) => {
    const field = obj && typeof obj === 'object' ? obj[key] : undefined;
    const val = typeof field === 'object' && field !== null ? field['#text'] : field;
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
  const featureEntries = getCollection(root.featurelist, { label: 'featurelist' });
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
    if (coerceNumber(getText(f, 'level')) !== 1) continue;
    if (coerceNumber(getText(f, 'locked')) !== 1) continue;
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
    const clevel = coerceNumber(
      typeof cc.level === 'number' ? cc.level : cc.level?.['#text']
    );
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
      score: coerceNumber(getText(s, 'score')),
      bonus: coerceNumber(getText(s, 'bonus')),
      save: coerceNumber(getText(s, 'save')),
      saveprof: coerceNumber(getText(s, 'saveprof')),
    };
  }
  // Defenses (flat, per SPEC-003 Step 2 output shape)
  const ac = coerceNumber(getText(root.defenses?.ac, 'total'));
  const hp = coerceNumber(getText(root.hp, 'total'));
  const tempHp = coerceNumber(getText(root.hp, 'temporary'));
  const speed = coerceNumber(getText(root.speed, 'total'));
  const initiative = coerceNumber(getText(root.initiative, 'total'));
  // Prof bonus: read like every other defensive total, so an encoded value is
  // decoded and coerced rather than parsed from raw text.
  const profBonus = coerceNumber(getText(root, 'profbonus'));
  // Skills: the prof-only list (prof > 0) keeps its SPEC-003 shape, allSkills
  // exposes every entry, and passives read every entry regardless of prof (a
  // prof 0 skill still has a passive value).
  const skillEntries = getCollection(root.skilllist, { label: 'skilllist' }).map((s) => ({
    name: getText(s, 'name'),
    total: coerceNumber(getText(s, 'total')),
    prof: coerceNumber(getText(s, 'prof')),
    stat: getText(s, 'stat'),
  }));
  const skills = skillEntries
    .filter((s) => s.prof > 0)
    .map(({ name, total }) => ({ name, total }));
  const allSkills = skillEntries.map(({ name, total, prof, stat }) => ({
    name,
    total,
    prof,
    stat,
  }));
  const passives: PassiveSkills = { perception: 10, investigation: 10, insight: 10 };
  for (const s of skillEntries) {
    const key = s.name.toLowerCase();
    if (key === 'perception' || key === 'investigation' || key === 'insight') {
      passives[key] = 10 + s.total;
    }
  }
  // Languages
  const languages = getCollection(root.languagelist, { label: 'languagelist' }).map((l) =>
    getText(l, 'name')
  );
  // Feats
  const feats = getCollection(root.featlist, { label: 'featlist' }).map((f) =>
    getText(f, 'name')
  );
  // Features
  const features = featureEntries.map((f) => ({
    level: coerceNumber(getText(f, 'level')),
    name: getText(f, 'name'),
    source: getText(f, 'source'),
  }));
  // Powers: direct children of <character> only (root.powers is already the
  // direct node, so nested <powers/> inside inventory items never reach here).
  // Entries use id-NNNNN keys like every other FG collection.
  const powers = getCollection(root.powers, { label: 'powers' }).map((p) => ({
    level: coerceNumber(getText(p, 'level')),
    name: getText(p, 'name'),
    group: getText(p, 'group'),
    prepared: coerceNumber(getText(p, 'prepared')),
    preparedDomain: coerceNumber(getText(p, 'preparedDomain')),
  }));
  const weapons = getCollection(root.weaponlist, { label: 'weaponlist' }).map((w) => ({
    name: getText(w, 'name'),
    attackbonus: coerceNumber(getText(w, 'attackbonus')),
    attackstat: getText(w, 'attackstat'),
    properties: getText(w, 'properties'),
    carried: coerceNumber(getText(w, 'carried')),
    type: coerceNumber(getText(w, 'type')),
    damage: getCollection(w.damagelist, { label: 'damagelist' }).map((d) => ({
      bonus: coerceNumber(getText(d, 'bonus')),
      dice: getText(d, 'dice'),
      stat: getText(d, 'stat'),
      statmult: coerceNumber(getText(d, 'statmult'), 1),
      type: getText(d, 'type'),
    })),
  }));
  // Spell slots: the nine per-level blocks a sheet carries under <powermeta>, each
  // a `max` and a `used`. Fantasy Grounds writes all nine on every sheet, zeroed
  // where the character has none, and a hand-written sheet may carry the node
  // nowhere near it - so every level is emitted whether or not the block is there.
  // A level the sheet does not describe and a level it describes as empty are the
  // same fact to a reader ("no slots here"), and giving them two shapes is how the
  // card ends up filtering one and rendering the other.
  //
  // Only `spellslots1`..`spellslots9` is read. The `pactmagicslots` blocks sit
  // beside them with the same shape and belong to a Warlock's pact magic rather
  // than to the spell slot table the card renders.
  const powerMeta = (root.powermeta ?? {}) as Record<string, XmlField>;
  const spellSlots: SpellSlotData[] = SPELL_SLOT_LEVELS.map((level) => {
    const block = powerMeta[`spellslots${level}`];
    return {
      level,
      max: coerceNumber(getText(block, 'max')),
      used: coerceNumber(getText(block, 'used')),
    };
  });
  const inventory = getCollection(root.inventorylist, { label: 'inventorylist' }).map((item) => ({
    name: getText(item, 'name'),
    count: coerceNumber(getText(item, 'count')),
    weight: coerceNumber(getText(item, 'weight')),
    carried: coerceNumber(getText(item, 'carried')),
  }));
  const coinsNode = root.coins;
  // Fantasy Grounds writes the purse twice inside one <coins> node: once as
  // id-NNNNN records and again as slot1..slot6 blocks, and the two need not agree.
  // The slots are what the sheet last drew into its coin boxes, the records are
  // what it stores, so reading every child and adding them reports a purse twice
  // as large as the one on the page: lothiriel's own SP 13 / CP 7 came out as
  // 14 / 8. Read ONE representation rather than summing: the id records when the
  // node carries any, the slots when it does not, and assign rather than
  // accumulate so a denomination is counted once or not at all. Both go through
  // the collection filter, which is what keeps a look-alike node beside the purse
  // from being read as a coin.
  const hasIdRecords =
    !!coinsNode &&
    typeof coinsNode === 'object' &&
    Object.entries(coinsNode).some(
      ([key, item]) => key.startsWith('id-') && item !== null && typeof item === 'object'
    );
  const representation = hasIdRecords ? 'id-' : 'slot';
  const purse = new Map<keyof Coins, number>();
  for (const entry of getCollection(coinsNode, {
    prefix: representation,
    label: 'coins',
    acceptedPrefixes: ['id-', 'slot'],
  })) {
    const denomination = COIN_DENOMINATIONS[getText(entry, 'name').toUpperCase()];
    if (!denomination) continue;
    const amount = coerceNumber(getText(entry, 'amount'));
    const seen = purse.get(denomination);
    // Two records claiming one denomination with different amounts is a sheet the
    // parser cannot read honestly: either number is a guess and their sum is
    // neither, which is the defect this replaced. Fail the sheet and name the
    // denomination rather than publish a purse the sheet never wrote. Two records
    // that agree (viktor carries SP in slot2 and slot3, both zero) are one
    // denomination written twice, not two purses, and there is nothing to add.
    if (seen !== undefined && seen !== amount) {
      throw new Error(
        `<coins> records ${denomination} twice with different amounts (${seen} and ${amount})`
      );
    }
    purse.set(denomination, amount);
  }
  const coins: Coins = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
  for (const [denomination, amount] of purse) coins[denomination] = amount;

  return {
    character: {
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
      allSkills,
      passives,
      languages,
      feats,
      features,
      powers,
      weapons,
      spellSlots,
      inventory,
      coins,
    },
    unrecognised,
  };
}

export function parseCharacterXML(xml: string): CharacterData | null {
  try {
    return parseCharacterXmlUnsafe(xml)?.character ?? null;
  } catch {
    return null;
  }
}

export const parseCharacterXml = parseCharacterXML;

export type ParseCharacterXmlResult =
  | { ok: true; character: CharacterData; unrecognised: UnrecognisedCollection[] }
  | { ok: false; reason: string };

/**
 * Total parser: never throws. fast-xml-parser throws on severely malformed
 * input (e.g. unterminated CDATA); that is reported as `{ ok: false, reason }`
 * so callers can skip the sheet with a warning instead of failing the build.
 * Missing <character> nodes are also failures with a reason.
 */
export function tryParseCharacterXml(xml: string): ParseCharacterXmlResult {
  try {
    const parsed = parseCharacterXmlUnsafe(xml);
    if (!parsed) {
      return { ok: false, reason: 'no <character> node found' };
    }
    return { ok: true, character: parsed.character, unrecognised: parsed.unrecognised };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}
