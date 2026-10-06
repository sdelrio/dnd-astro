// Everything the card needs to print about spellcasting, and nothing else.
//
// The sheets record no casting ability at all - there is no node naming it - and
// they record neither the Save DC nor the spell attack bonus. All three are
// printed formulae over values the parser does read, so they live in one module
// rather than in the card's frontmatter: a derivation spread across a template is
// a derivation nothing can unit-test.
//
// This is the same argument `weapon-display.ts` and `proficiency-mark.ts` make. The
// weapon attack total and the proficiency coin each started inside a template, and
// each became impossible to test for anything except the whole card rendering. The
// card itself should decide *whether* a section exists; this module decides what
// the section says.
import type { CharacterData } from '@/utils/parse-character-xml';

type Abilities = CharacterData['abilities'];
type Classes = CharacterData['classes'];
type SpellSlots = CharacterData['spellSlots'];
type Powers = CharacterData['powers'];

/** The three abilities a caster can cast with, in the order the fallback prefers. */
export const CASTING_ABILITIES = ['wisdom', 'intelligence', 'charisma'] as const;

export type CastingAbility = (typeof CASTING_ABILITIES)[number];

/**
 * The two ways a card writes a casting ability: the three-letter form the
 * Abilities tiles already print, and the full name for a hover title.
 *
 * One map rather than two, because they are keyed by the same three abilities and
 * two maps are two things to keep in step - and a caller that passed an
 * abbreviation and a full name as separate arguments could pair them wrongly
 * without anything failing.
 */
export const CASTING_ABILITY_LABEL: Record<CastingAbility, { short: string; name: string }> = {
  wisdom: { short: 'WIS', name: 'Wisdom' },
  intelligence: { short: 'INT', name: 'Intelligence' },
  charisma: { short: 'CHA', name: 'Charisma' },
};

/**
 * Which ability a class casts with.
 *
 * Keyed lowercase because the sheets are exported from a tool rather than typed
 * by hand, and the same class arrives as `Wizard` in one file and `wizard` in
 * another. Paladin and Ranger are here on the printed rules' word rather than on
 * a class-table source: both are full casters, and leaving either out would hand
 * its character to the inferred fallback while the card showed the same shape of
 * figure.
 *
 * Blood Hunter and Anti Paladin are here for the same reason and with more force:
 * both are absent from the 2024 Player's Handbook, so a table kept to the printed
 * classes leaves them out by accident rather than by decision, and the fallback
 * then prints them a wrong Save DC. Blood Hunter is Intelligence on the printed
 * rule (the patron's blood magic is an arcane discipline studied rather than
 * granted), Anti Paladin is Charisma (it takes the Paladin's spellcasting and its
 * patron oath both). The corpus invariant in `casting-ability-corpus.test.ts` is
 * what keeps this table from drifting again: it fails on any corpus character who
 * has spell data and resolves as inferred.
 */
export const CASTING_CLASS_ABILITIES: Record<string, CastingAbility> = {
  wizard: 'intelligence',
  artificer: 'intelligence',
  'blood hunter': 'intelligence',
  cleric: 'wisdom',
  druid: 'wisdom',
  ranger: 'wisdom',
  bard: 'charisma',
  sorcerer: 'charisma',
  warlock: 'charisma',
  paladin: 'charisma',
  'anti paladin': 'charisma',
};

/**
 * Which ability a subclass casts with, for the half-casters.
 *
 * This table is the whole reason a Fighter with Eldritch Knight resolves at all:
 * the class name matches nothing, and without it the card would either guess or
 * show nothing to a character who casts three spells a day.
 *
 * The Blood Hunter patrons are here *as well as* the class, and that duplication
 * is the point rather than an oversight. Every patron resolves Intelligence
 * through the class name, so an unrecognised patron is not a gap; but a sheet
 * rebuilt mid-play can lose the class node and keep the patron, and a multiclass
 * sheet can carry the patron on an entry the class table would not recognise at
 * all. Naming them here makes the patron resolve on its own.
 *
 * Psi Warrior and Soulknife are the other two the class table cannot reach, both
 * Wisdom on the printed rule (the Psi Warrior's Psionic Energy is psionics rather
 * than spells, but its save DC and its attack are Wisdom either way), and
 * Oathbreaker is the Anti Paladin's patron oath.
 */
export const CASTING_SUBCLASS_ABILITIES: Record<string, CastingAbility> = {
  'eldritch knight': 'intelligence',
  'arcane trickster': 'intelligence',
  'psi warrior': 'wisdom',
  soulknife: 'wisdom',
  oathbreaker: 'charisma',
  'order of the profane soul': 'intelligence',
  'order of the ghostslayer': 'intelligence',
  'order of the lycanthropy': 'intelligence',
  'order of the mutant': 'intelligence',
  'order of profanity': 'intelligence',
};

export interface CastingAbilityResolution {
  ability: CastingAbility;
  /** The parsed ability bonus, which is what both formulae take. */
  modifier: number;
  /**
   * False only when the ability was guessed as the best of the three.
   *
   * The flag exists because the guess and the record look identical on the card
   * otherwise: a Fighter's Wisdom +3 and a Cleric's Wisdom +3 render the same way
   * once they are in the same plate, and one of them was chosen by arithmetic on
   * the other two stats. The card marks the guess rather than presenting it as
   * something the sheet said.
   */
  recorded: boolean;
}

/**
 * One candidate for the casting ability, and why it was a candidate.
 *
 * `fromClass` distinguishes a class name from a subclass so that a tie at the
 * same character level resolves to the class: the sheet wrote both, but the class
 * is what the character *is* and the subclass is the specialisation of it.
 */
interface Candidate {
  ability: CastingAbility;
  level: number;
  fromClass: boolean;
}

function candidatesFor(entry: Classes[number]): Candidate[] {
  const found: Candidate[] = [];
  const byClass = CASTING_CLASS_ABILITIES[entry.name.trim().toLowerCase()];
  if (byClass) found.push({ ability: byClass, level: entry.level, fromClass: true });
  const bySubclass = entry.subclass
    ? CASTING_SUBCLASS_ABILITIES[entry.subclass.trim().toLowerCase()]
    : undefined;
  if (bySubclass) found.push({ ability: bySubclass, level: entry.level, fromClass: false });
  return found;
}

/** The better of two candidates: more levels first, then the class name. */
function beats(candidate: Candidate, incumbent: Candidate): boolean {
  if (candidate.level !== incumbent.level) return candidate.level > incumbent.level;
  return candidate.fromClass && !incumbent.fromClass;
}

function abilityBonus(abilities: Abilities, ability: CastingAbility): number {
  return abilities[ability]?.bonus ?? 0;
}

/**
 * Which ability this character casts with, and whether the sheet said so.
 *
 * The order is: a casting class name, then a casting subclass, then the
 * highest-level class where more than one entry matched, then the best of Wisdom,
 * Intelligence and Charisma flagged as inferred. Class and subclass are collected
 * together rather than tried in sequence because the rule that decides between
 * two matches is level, not which table the match came from - a Fighter 10 (Eldritch
 * Knight) casting alongside a Cleric 3 is a level question, and resolving by table
 * order would answer Cleric.
 */
export function resolveCastingAbility(
  classes: Classes,
  abilities: Abilities
): CastingAbilityResolution {
  const candidates = classes.flatMap(candidatesFor);
  const best = candidates.reduce<Candidate | undefined>(
    (incumbent, candidate) =>
      incumbent === undefined || beats(candidate, incumbent) ? candidate : incumbent,
    undefined
  );
  if (best) {
    return { ability: best.ability, modifier: abilityBonus(abilities, best.ability), recorded: true };
  }
  // The fallback is the best of the three, not a fixed third one: a character
  // whose sheet names no casting class still casts with whatever is highest, and
  // naming the wrong one would put the wrong number on the Save DC.
  const ability = CASTING_ABILITIES.reduce((bestAbility, candidate) =>
    abilityBonus(abilities, candidate) > abilityBonus(abilities, bestAbility) ? candidate : bestAbility
  );
  return { ability, modifier: abilityBonus(abilities, ability), recorded: false };
}

/**
 * The printed spell Save DC: 8 plus proficiency plus the casting modifier.
 *
 * Computed rather than read because the sheet does not store it. The 8 is the
 * spell-save DC of a first-level caster with no proficiency and a +0 casting
 * ability, which is the constant the printed formula carries.
 */
export function spellSaveDc(profBonus: number, castingModifier: number): number {
  return 8 + profBonus + castingModifier;
}

/**
 * The printed spell attack bonus: proficiency plus the casting modifier.
 *
 * No +8: the +8 belongs to the save DC's constant, not to an attack.
 */
export function spellAttackBonus(profBonus: number, castingModifier: number): number {
  return profBonus + castingModifier;
}

export interface SpellSlotRow {
  level: number;
  /** `Level 3`, the plate's label. */
  label: string;
  /** `2/4`: slots already spent out of the level's total. */
  spent: string;
}

/**
 * One plate per spell level that has slots.
 *
 * A level with a maximum of zero is dropped rather than rendered as `0/0`: a grid
 * of zeroes is the first thing the panel would show a reader, and it says nothing
 * except that the sheet has nine nodes. The remaining levels are read as used out
 * of total so a full level and an empty one do not look alike - `4/4` and `0/4`
 * are different turns, and `4` alone cannot tell them apart.
 *
 * `used` is never clamped to `max`. A sheet that reports more spent than it has is
 * reporting its own state, and silently correcting it would put a number on the
 * card that the sheet in front of the player contradicts.
 */
export function toSpellSlotRows(spellSlots: SpellSlots): SpellSlotRow[] {
  return spellSlots
    .filter((slot) => slot.max > 0)
    .sort((a, b) => a.level - b.level)
    .map((slot) => ({
      level: slot.level,
      label: `Level ${slot.level}`,
      spent: `${slot.used}/${slot.max}`,
    }));
}

/**
 * Whether a power's group is one of the sheet's spell groups.
 *
 * The same test the prepared/always-prepared marks use, and the reason those two
 * marks exist: Fantasy Grounds writes a prepared spell into a group literally named
 * `Spells`, `Spells Domain (Life)` or `Cantrips`, while a class feature sits in a
 * group named after its class. It lives here rather than in the card because the
 * card's section gate and the card's prepared marks now both ask the same question,
 * and two answers to it is how a card starts marking a Fighter action as a spell.
 */
export function isSpellGroup(group: string): boolean {
  return /spell|cantrip/i.test(group);
}

/**
 * Whether this character can cast at all, and so whether the bar offers the section.
 *
 * Two ways in: a spell power on the sheet, or a class or subclass the casting
 * tables recognise. Either alone is enough, and the asymmetry is the point. A pure
 * martial character has neither, and an entry it cannot use is a bar entry that
 * opens an empty sheet. A half-caster has at least a subclass and often no spell
 * entries the sheet bothers to list, and the other rule would delete its spells.
 */
export function hasSpellcasting(classes: Classes, powers: Powers): boolean {
  if (classes.some((entry) => candidatesFor(entry).length > 0)) return true;
  return powers.some((power) => isSpellGroup(power.group));
}
