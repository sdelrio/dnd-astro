import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { toWeaponRows, type WeaponSet } from '@/components/xml-viewer/weapon-display';
import {
  resolveCastingAbility,
  isSpellGroup,
} from '@/components/xml-viewer/spellcasting-display';
import { getCharacters } from './generated-characters';
import type { StoredCharacter } from './build-xml-characters';
import type { Coins } from './parse-character-xml';

/**
 * The one corpus-level guard for the card, from #454.
 *
 * The suite is thorough per component, but almost every test builds its own
 * fixture, so a function that is correct in isolation and a corpus that is wrong
 * together pass unnoticed. Three confirmed defects were exactly that shape - the
 * coin purse (#444), the damage stat (#445) and the casting ability (#447) - and
 * each is invisible to a unit test of the function involved. This file walks the
 * artifact every card is actually rendered from, `src/generated/characters.json`,
 * and asserts the invariants the card depends on over all 111 characters at once.
 *
 * Each invariant is a pure function from one character to a list of violations,
 * and every one is proven live by a seeded mutation below: a guard that cannot go
 * red is not a guard.
 *
 * The damaged and casting relations are read through the same display functions
 * the card calls, rather than re-derived from the raw record, because the defects
 * lived in those functions and a re-derivation would be a second opinion that
 * agrees with itself.
 */
const SHEETS_DIR = join(process.cwd(), 'src/assets/fantasy-grounds-sheets');

const roster: StoredCharacter[] = getCharacters();

/**
 * The six Ability Scores the card indexes by name.
 *
 * The card never iterates the parsed ability key set - it reads each of these six
 * by fixed lowercase name - so an extra key is invisible today. It is pinned here
 * because that is incidental rather than structural: one render path that
 * iterated the parsed set would put a bogus tile on a card.
 */
const CORE_ABILITIES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

/**
 * The sheets that carry abilities beside the six, and which ones they carry.
 *
 * Six characters hold `honor` and `sanity` at a score of zero, and nothing
 * renders them - every consumer indexes by a fixed lowercase name. Their bonuses
 * are not uniform (five carry -5, kristof carries 0), so only the key set is
 * pinned. This is a closed list on purpose: a new sheet with a different shape
 * must be named here, and a listed sheet whose shape changes must be corrected
 * here, so the shape is a deliberate record rather than an accident the card
 * tolerates.
 */
const PSEUDO_ABILITIES: Record<string, readonly string[]> = {
  candise: ['honor', 'sanity'],
  karas: ['honor', 'sanity'],
  kristof: ['honor', 'sanity'],
  orfeo: ['honor', 'sanity'],
  radamantis: ['honor', 'sanity'],
  tanadirian: ['honor', 'sanity'],
};

const COIN_DENOMINATIONS = ['pp', 'gp', 'ep', 'sp', 'cp'] as const;

describe('the card corpus from #454', () => {
  it('reads a roster, or every guard below it is vacuous', () => {
    expect(roster.length).toBeGreaterThan(100);
  });
});

/**
 * Invariant 1: the six Ability Scores, and only the documented extras.
 *
 * A missing core score is a card that reads a field the sheet never stated; an
 * unexpected key is the pseudo-ability leak this pins. Both are reported by name
 * against the expected set rather than only flagged as "extra".
 */
function abilityShapeViolations(character: StoredCharacter): string[] {
  const expected = [...CORE_ABILITIES, ...(PSEUDO_ABILITIES[character.filename] ?? [])].sort();
  const actual = Object.keys(character.abilities ?? {}).sort();
  if (expected.join(',') === actual.join(',')) return [];
  return [
    `${character.filename} carries abilities [${actual.join(', ')}], expected [${expected.join(', ')}]`,
  ];
}

describe('the ability-score shape of every character', () => {
  it('pins the six core scores plus the six documented pseudo-ability sheets', () => {
    const violations = roster.flatMap(abilityShapeViolations);
    expect(violations).toEqual([]);
  });

  it('reports a new pseudo-ability by name rather than absorbing it', () => {
    const seeded = { ...roster[0], abilities: { ...roster[0].abilities, luck: { score: 0, bonus: -5, save: 0, saveprof: 0 } } };
    expect(abilityShapeViolations(seeded)).not.toEqual([]);
  });

  it('reports a listed sheet that drops one of its pinned abilities', () => {
    const candise = roster.find((character) => character.filename === 'candise');
    expect(candise).toBeDefined();
    const withoutHonor = { ...candise!.abilities };
    delete withoutHonor.honor;
    expect(abilityShapeViolations({ ...candise!, abilities: withoutHonor })).not.toEqual([]);
  });
});

/**
 * Invariant 2: no rendered damage part omits a stat bonus its weapon applies.
 *
 * The defect (#445) was that a damage part with a blank stat lost its Strength or
 * Dexterity bonus while the attack line - and a sibling part spelled `base` -
 * kept it. The rule is now stated once, but a re-derivation here would just agree
 * with itself, so the check observes the rendered row instead: it renders the
 * weapon twice, once with the character's real bonuses and once with every ability
 * bonus replaced by a sentinel, and requires each part's damage string to change.
 * A part that ignores its stat (the defect) renders identically both times.
 *
 * Parts with a zero multiplier are exempt: `statmult: 0` is how a sheet says a
 * part carries no ability contribution, so a part that does not move is honest.
 */
const SENTINEL_BONUS = 999;

function withSentinelBonuses(abilities: StoredCharacter['abilities']) {
  return Object.fromEntries(
    Object.entries(abilities ?? {}).map(([name, ability]) => [
      name,
      { ...ability, bonus: SENTINEL_BONUS },
    ])
  );
}

/** One weapon's rendered damage, split into one string per damage part. */
function renderedDamageParts(
  character: StoredCharacter,
  weapon: StoredCharacter['weapons'][number],
  abilities: StoredCharacter['abilities'],
  weaponSet: WeaponSet
): string[] | undefined {
  return toWeaponRows([weapon], abilities, character.profBonus, weaponSet)[0]?.damage
    .split('; ')
    .filter(Boolean);
}

function damageStatViolations(character: StoredCharacter): string[] {
  const abilities = character.abilities ?? {};
  const sentinel = withSentinelBonuses(abilities);
  const violations: string[] = [];

  for (const weapon of character.weapons ?? []) {
    // Carried 0 is the weapon left behind or sold; it renders nowhere, so it is
    // not this invariant's business.
    if (weapon.carried !== 1 && weapon.carried !== 2) continue;
    // A weapon the parser read from an inventory line can carry no damage parts
    // at all; there is no part to omit a bonus, so it is out of scope.
    if (weapon.damage.length === 0) continue;
    const weaponSet: WeaponSet = weapon.carried === 2 ? 'equipped' : 'carried';
    const real = renderedDamageParts(character, weapon, abilities, weaponSet);
    const high = renderedDamageParts(character, weapon, sentinel, weaponSet);
    if (!real || !high) {
      violations.push(`${character.filename}/${weapon.name} does not render at carried ${weapon.carried}`);
      continue;
    }
    if (real.length !== weapon.damage.length || high.length !== weapon.damage.length) {
      violations.push(`${character.filename}/${weapon.name} renders ${real.length} parts for ${weapon.damage.length}`);
      continue;
    }
    weapon.damage.forEach((part, index) => {
      if (part.statmult === 0) return;
      if (real[index] === high[index]) {
        violations.push(
          `${character.filename}/${weapon.name} part ${index + 1} ignores its stat bonus ("${real[index]}")`
        );
      }
    });
  }
  return violations;
}

describe('the damage stat of every rendered weapon part', () => {
  it('lets no part omit the stat bonus its weapon applies', () => {
    const violations = roster.flatMap(damageStatViolations);
    expect(violations).toEqual([]);
  });

  it('fails on a seeded part whose stat the character does not have', () => {
    // The exact render-time symptom #445 described: a part that carries a stat
    // multiplier but no ability to read it from renders without the bonus its
    // sibling applies. Naming an ability the sheet does not hold is the mutation;
    // the same detector catches the blank-stat spelling the fix repaired.
    const teoride = roster.find((character) => character.filename === 'teoride');
    expect(teoride).toBeDefined();
    const staff = teoride!.weapons.find((weapon) => weapon.name === 'Staff');
    expect(staff).toBeDefined();
    const seeded: StoredCharacter = {
      ...teoride!,
      weapons: teoride!.weapons.map((weapon) =>
        weapon.name !== 'Staff'
          ? weapon
          : { ...weapon, damage: weapon.damage.map((part, i) => (i === 1 ? { ...part, stat: 'luck' } : part)) }
      ),
    };
    expect(damageStatViolations(seeded)).not.toEqual([]);
  });
});

/**
 * Invariant 3: no character with spell data resolves its casting ability as
 * inferred, except the sheets whose spell data is not a caster's.
 *
 * The defect (#447) was four caster classes the tables did not name, so a real
 * caster's Save DC and attack printed a plausible wrong number wearing an
 * Inferred label. The two ways in are the same two the Spellcasting bar gates on:
 * a spell power in a spell group, or a non-empty slot pool.
 */
function hasSpellData(character: StoredCharacter): boolean {
  if ((character.powers ?? []).some((power) => isSpellGroup(power.group))) return true;
  return (character.spellSlots ?? []).some((slot) => slot.max > 0);
}

function inferCasting(character: StoredCharacter): boolean {
  return (
    hasSpellData(character) &&
    !resolveCastingAbility(character.classes ?? [], character.abilities ?? {}).recorded
  );
}

/**
 * The characters with spell data who are genuinely not casters, each with the
 * sheet evidence that says so. This mirrors the closed list in
 * `casting-ability-corpus.test.ts`, which covers the same ground in more detail;
 * a new exception fails both, so the two cannot drift silently.
 */
const NOT_A_CASTER: Record<string, string> = {
  draknor: 'adventuring gear in a Spells group',
  khalid: 'Magic Initiate, whose chosen casting class the sheet does not record',
  maeth: 'Magic Initiate, whose chosen casting class the sheet does not record',
  naharis: 'Magic Initiate, whose chosen casting class the sheet does not record',
  seamorn: 'a Sneak Attack power written into a Spells group, which is not a spell',
  valkian: 'elven lineage spells, whose spellcasting ability the player chooses',
};

describe('the casting ability of every character with spell data', () => {
  it('resolves a recorded ability for every character, except the closed list', () => {
    const unexplained = roster
      .filter(inferCasting)
      .filter((character) => !(character.filename in NOT_A_CASTER))
      .map((character) => `${character.filename} (${character.name})`);
    expect(unexplained).toEqual([]);
  });

  it('names every exception, so a fixed sheet is noticed rather than absorbed', () => {
    const stillInferred = roster
      .filter(inferCasting)
      .map((character) => character.filename)
      .sort();
    expect(stillInferred).toEqual(Object.keys(NOT_A_CASTER).sort());
  });

  it('fails on a seeded caster class the tables do not know', () => {
    const gromash = roster.find((character) => character.filename === 'gromash');
    expect(gromash).toBeDefined();
    const seeded: StoredCharacter = {
      ...gromash!,
      classes: [{ name: 'Fighter', level: 3, subclass: 'Psionic Scout' }],
    };
    expect(inferCasting(seeded)).toBe(true);
    expect(seeded.filename in NOT_A_CASTER).toBe(false);
  });
});

/**
 * Invariant 4: no numeric field of any committed sheet reads as non-finite.
 *
 * The defect (#448) was a `Number(value || 0)` idiom that passed `NaN` and
 * `Infinity` straight to the card. One hand-edited sheet is a green build with
 * `+Infinity` printed, so the whole record is walked rather than a hand-listed set
 * of fields - a new numeric field is covered the day it is added.
 */
function nonFinitePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [path || '<root>'];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => nonFinitePaths(entry, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      nonFinitePaths(entry, path ? `${path}.${key}` : key)
    );
  }
  return [];
}

describe('the numeric fields of every committed sheet', () => {
  it('reads as finite everywhere in the artifact', () => {
    const nonFinite = roster.flatMap((character) =>
      nonFinitePaths(character).map((path) => `${character.filename}.${path}`)
    );
    expect(nonFinite).toEqual([]);
  });

  it('reports a seeded infinity and a seeded NaN by path', () => {
    const seeded = structuredClone(roster[0]);
    seeded.hp = Number.POSITIVE_INFINITY;
    seeded.profBonus = Number.NaN;
    const paths = nonFinitePaths(seeded);
    expect(paths).toContain('hp');
    expect(paths).toContain('profBonus');
  });
});

/**
 * Invariant 5: no coin denomination is counted twice.
 *
 * The defect (#444) was a `<coins>` node read in full: Fantasy Grounds writes the
 * purse twice over - once as `id-NNNNN` records and again as `slot1..slot6`
 * blocks - and summing both published a purse twice the size of the one on the
 * sheet. lothiriel's SP 13 / CP 7 came out 14 / 8.
 *
 * The artifact cannot express a double count on its own, so the guard re-derives
 * both representations from the source and requires the artifact to be ONE of
 * them, and never their sum. It only parses sheets that carry both, which is the
 * only shape where a double count is possible, so the run stays cheap.
 */
type Purse = Partial<Coins>;

const DENOMINATION_BY_NAME: Record<string, keyof Coins> = {
  PP: 'pp',
  GP: 'gp',
  EP: 'ep',
  SP: 'sp',
  CP: 'cp',
};

function nodeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return nodeText((value as Record<string, unknown>)['#text']);
  }
  return String(value);
}

function purseFromEntries(entries: unknown[]): Purse {
  const purse: Purse = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const denomination = DENOMINATION_BY_NAME[nodeText(record.name).toUpperCase()];
    if (!denomination) continue;
    purse[denomination] = (purse[denomination] ?? 0) + Number(nodeText(record.amount) || 0);
  }
  return purse;
}

interface CoinPurses {
  id: Purse;
  slot: Purse;
}

function coinPursesFromSource(xml: string): CoinPurses | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    allowBooleanAttributes: true,
  });
  const parsed = parser.parse(xml) as {
    root?: { character?: { coins?: Record<string, unknown> } };
    character?: { coins?: Record<string, unknown> };
  };
  const coinsNode = (parsed.root?.character ?? parsed.character)?.coins;
  if (!coinsNode || typeof coinsNode !== 'object') return null;
  const entriesFor = (prefix: string) =>
    Object.entries(coinsNode)
      .filter(([key, value]) => key.startsWith(prefix) && value !== null && typeof value === 'object')
      .map(([, value]) => value);
  return { id: purseFromEntries(entriesFor('id-')), slot: purseFromEntries(entriesFor('slot')) };
}

function zeroPurse(purse: Purse): Coins {
  return { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0, ...purse };
}

function addPurses(a: Purse, b: Purse): Coins {
  return {
    pp: (a.pp ?? 0) + (b.pp ?? 0),
    gp: (a.gp ?? 0) + (b.gp ?? 0),
    ep: (a.ep ?? 0) + (b.ep ?? 0),
    sp: (a.sp ?? 0) + (b.sp ?? 0),
    cp: (a.cp ?? 0) + (b.cp ?? 0),
  };
}

function sameCoins(a: Coins, b: Coins): boolean {
  return COIN_DENOMINATIONS.every((denomination) => a[denomination] === b[denomination]);
}

function purseViolations(coins: Coins, purses: CoinPurses): string[] {
  // One representation is not two, so there is nothing to count twice.
  if (Object.keys(purses.id).length === 0 || Object.keys(purses.slot).length === 0) return [];
  const violations: string[] = [];
  // The id records are what the parser reads when both exist; the slots are what
  // the sheet last drew into its boxes. The artifact must match the records.
  const stated = zeroPurse(purses.id);
  if (!sameCoins(coins, stated)) {
    violations.push(`reads ${JSON.stringify(coins)}, the records state ${JSON.stringify(stated)}`);
  }
  // Only a sum that differs from the one representation is a double count. A slot
  // block that is empty or agrees adds nothing, and flagging it would report a
  // correct purse as a defect.
  const doubled = addPurses(purses.id, purses.slot);
  if (!sameCoins(doubled, stated) && sameCoins(coins, doubled)) {
    violations.push(`counts both representations: ${JSON.stringify(doubled)}`);
  }
  return violations;
}

describe('the coin purse of every character', () => {
  it('has exactly the five denominations, each a finite number', () => {
    const violations = roster.flatMap((character) => {
      const keys = Object.keys(character.coins ?? {}).sort();
      const expected = [...COIN_DENOMINATIONS].sort();
      if (keys.join(',') !== expected.join(',')) {
        return [`${character.filename} holds denominations [${keys.join(', ')}]`];
      }
      return COIN_DENOMINATIONS.filter(
        (denomination) => !Number.isFinite(character.coins[denomination])
      ).map((denomination) => `${character.filename}.${denomination} is not finite`);
    });
    expect(violations).toEqual([]);
  });

  it('is one representation of the sheet, never the sum of both', () => {
    const violations: string[] = [];
    for (const character of roster) {
      const xml = readFileSync(join(SHEETS_DIR, `${character.filename}.xml`), 'utf8');
      const block = /<coins>([\s\S]*?)<\/coins>/.exec(xml)?.[1];
      // Only a sheet that carries both shapes can be double counted.
      if (!block || !/\bid-\d+/.test(block) || !/<slot\d/.test(block)) continue;
      const purses = coinPursesFromSource(xml);
      if (!purses) continue;
      violations.push(
        ...purseViolations(character.coins, purses).map(
          (violation) => `${character.filename} ${violation}`
        )
      );
    }
    expect(violations).toEqual([]);
  });

  it('fails on a seeded purse that sums both representations', () => {
    const purses = { id: { gp: 5, sp: 2 }, slot: { sp: 7, cp: 3 } };
    // The sum is the defect: gp 5 once, but sp counted in both shapes.
    expect(purseViolations(addPurses(purses.id, purses.slot), purses)).not.toEqual([]);
    // One representation is the honest answer, and passes.
    expect(purseViolations(zeroPurse(purses.id), purses)).toEqual([]);
    // A slot block of zeros adds nothing, so the records are not a double count.
    const zeros = { id: { gp: 5 }, slot: { sp: 0, cp: 0 } };
    expect(purseViolations(zeroPurse(zeros.id), zeros)).toEqual([]);
  });
});
