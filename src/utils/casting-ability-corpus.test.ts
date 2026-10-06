import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveCastingAbility,
  isSpellGroup,
  CASTING_CLASS_ABILITIES,
  CASTING_SUBCLASS_ABILITIES,
} from '@/components/xml-viewer/spellcasting-display';
import type { StoredCharacter } from './build-xml-characters';

/**
 * The corpus-wide guard for #447: no character who has spell data may resolve
 * its casting ability as inferred.
 *
 * Every other test of the resolver builds its own classes and abilities, so all of
 * them are satisfied by a table that is correct about the classes they name and
 * silent about the rest. That is how four real caster classes (Blood Hunter, Anti
 * Paladin, Psi Warrior, Soulknife) stayed out of the tables while 48 unit tests
 * passed: the defect lives in the corpus, not in the function. `XmlCard.astro`
 * derives the Save DC and the attack bonus from this resolution, so the failure
 * mode is not a red build but a plate carrying a plausible wrong number - which is
 * exactly what Gromash and Lyvie were sent, wearing an Inferred label.
 *
 * So the assertion is made against the real roster rather than against fixtures:
 * the artifact every card is rendered from, read off disk. A new sheet that
 * introduces a caster class the tables do not know fails here by name.
 */
const roster: StoredCharacter[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src/generated/characters.json'), 'utf8')
);

/**
 * Whether the sheet gives this character spell data to be wrong about.
 *
 * Two ways in, and the same two the Spellcasting bar gates its section on: a
 * spell power in a spell group, or a level with spell slots in it. A character
 * with neither cannot be shown a wrong Save DC, so it is not this test's business
 * - which is why a martial character with no casting class is out of scope here
 * and in scope for the unit tests instead.
 */
function hasSpellData(character: StoredCharacter): boolean {
  if ((character.powers ?? []).some((power) => isSpellGroup(power.group))) return true;
  return (character.spellSlots ?? []).some((slot) => slot.max > 0);
}

function castingFor(character: StoredCharacter) {
  return resolveCastingAbility(character.classes ?? [], character.abilities ?? {});
}

/**
 * The corpus characters who have spell data and are genuinely not casters, each
 * with the sheet evidence that says so.
 *
 * This is a closed list, and that is the property that makes it a guard rather
 * than a concession. Every character with spell data is either resolved from a
 * class or subclass the tables name, or named here with a reason the sheets
 * support. Anything else - including a sheet added tomorrow, and including one of
 * these six if it later gains a casting class - fails the build by name.
 *
 * Each reason cites the sheet, not the card:
 *
 * - `draknor`, `khalid`, `maeth`, `naharis`: Magic Initiate. The feat's own text
 *   says the casting ability "depends on the class you chose" and the sheet
 *   records no choice, so each of them has a Mage Hand, a Mending or a
 *   Prestidigitation in a `Spells` group and no class that casts at all. The
 *   ability is a player decision this artifact does not hold, and any recorded
 *   value would be the same guess wearing the other label.
 * - `draknor`: also two "Rations (1 day)" inventory powers that Fantasy Grounds
 *   wrote into the `Spells` group. Adventuring gear, not magic.
 * - `seamorn`: a Rogue whose sheet wrote the Sneak Attack power twice, once into
 *   the `Rogue Special Abilities` group and once into `Spells`. Nothing in it is
 *   a spell.
 * - `valkian`: a Wood Elf's elven lineage spells (Druidcraft, Longstrider, Pass
 *   without Trace) in a `Spells (Elf)` group. The printed rule makes the
 *   spellcasting ability a choice made when the lineage is chosen, so again the
 *   sheet holds a spell and no record of which ability casts it.
 */
const NOT_A_CASTER: Record<string, string> = {
  draknor: 'adventuring gear in a Spells group',
  khalid: 'Magic Initiate, whose chosen casting class the sheet does not record',
  maeth: 'Magic Initiate, whose chosen casting class the sheet does not record',
  naharis: 'Magic Initiate, whose chosen casting class the sheet does not record',
  seamorn: 'a Sneak Attack power written into a Spells group, which is not a spell',
  valkian: 'elven lineage spells, whose spellcasting ability the player chooses',
};

describe('the corpus casting-ability invariant from #447', () => {
  it('reads a roster, or the guard below it is vacuous', () => {
    expect(roster.length).toBeGreaterThan(100);
  });

  it('resolves a recorded casting ability for every corpus character with spell data', () => {
    const spellcasters = roster.filter(hasSpellData);
    // If the sheet set ever empties of spell data this assertion stops meaning
    // anything, so pin that it is still reaching a real population.
    expect(spellcasters.length).toBeGreaterThan(20);

    const inferred = spellcasters
      .filter((character) => !castingFor(character).recorded)
      .filter((character) => !(character.filename in NOT_A_CASTER))
      .map(
        (character) =>
          `${character.filename} (${character.name}): ` +
          `${(character.classes ?? []).map((entry) => entry.name).join(', ')}`
      );

    expect(inferred).toEqual([]);
  });

  it('lists every exception by name, so a fixed sheet is noticed rather than absorbed', () => {
    // Both directions. A new exception has to be written down with its reason, and
    // an exception that stops being one has to be removed: the list cannot quietly
    // become a place where anything goes.
    const stillInferred = roster
      .filter(hasSpellData)
      .filter((character) => !castingFor(character).recorded)
      .map((character) => character.filename)
      .sort();
    expect(stillInferred).toEqual(Object.keys(NOT_A_CASTER).sort());
  });

  it('resolves the six exceptions from no casting class at all, so no exception hides a caster', () => {
    // The exception list says these characters are not casters. This is what
    // makes that claim checkable rather than asserted: every one of them carries a
    // class name and a subclass name the tables do not name, so adding one to a
    // table cannot quietly leave a real caster sitting in the exception list.
    for (const filename of Object.keys(NOT_A_CASTER)) {
      const character = roster.find((entry) => entry.filename === filename);
      expect(character, `${filename} is not in the roster`).toBeDefined();
      const names = (character?.classes ?? []).flatMap((entry) =>
        [entry.name, entry.subclass].filter((name): name is string => Boolean(name))
      );
      for (const name of names) {
        const key = name.trim().toLowerCase();
        expect(CASTING_CLASS_ABILITIES[key], `${filename} names a known class: ${name}`).toBeUndefined();
        expect(
          CASTING_SUBCLASS_ABILITIES[key],
          `${filename} names a known subclass: ${name}`
        ).toBeUndefined();
      }
    }
  });

  it('marks the martial exceptions as inferred rather than presenting the guess as a record', () => {
    // The fallback is the honest answer for a character with no casting class, and
    // the card's own flag is what tells the reader so. If the flag were dropped the
    // six above would be showing a guessed Save DC as though the sheet recorded
    // it, which is the failure this whole issue is about.
    for (const filename of Object.keys(NOT_A_CASTER)) {
      const character = roster.find((entry) => entry.filename === filename);
      expect(castingFor(character!).recorded, filename).toBe(false);
    }
  });

  it('catches a caster class the tables do not know, which is what the guard is for', () => {
    // Proven by mutation rather than by inspection: the assertion above is only a
    // guard if it goes red on the defect it was written for. This is that defect,
    // injected - a Rogue subclass from a class that does not exist yet.
    const unknownCaster: StoredCharacter = {
      ...roster.find((entry) => entry.filename === 'gromash')!,
      classes: [{ name: 'Fighter', level: 3, subclass: 'Psionic Scout' }],
    };
    expect(hasSpellData(unknownCaster)).toBe(true);
    expect(castingFor(unknownCaster).recorded).toBe(false);
    expect(unknownCaster.filename in NOT_A_CASTER).toBe(false);
  });
});

describe('the casting tables cover the classes the corpus actually uses', () => {
  it.each([
    ['gromash', 'Blood Hunter', 'Order of the Profane Soul', 'intelligence', 12, 4],
    ['lyvie', 'Blood Hunter', 'Order of the Profane Soul', 'intelligence', 10, 2],
    ['nergal', 'Blood Hunter', 'Order of the Ghostslayer', 'intelligence', 14, 6],
    ['lance', 'Anti Paladin', 'Oathbreaker', 'charisma', 14, 6],
  ])(
    '%s prints %s with a Save DC of %i and an attack of +%i',
    (filename, className, subclass, ability, saveDc, attack) => {
      // The two figures the issue named, checked end to end: read the character off
      // the committed artifact, resolve, and run the two printed formulae. Gromash
      // and Lyvie were the demonstrably wrong pair - both printed Wisdom, a Save DC
      // of 13 and an attack of +5, where Intelligence gives the figures here.
      const character = roster.find((entry) => entry.filename === filename);
      expect(character).toBeDefined();
      expect(character?.classes[0].name).toBe(className);
      expect(character?.classes[0].subclass).toBe(subclass);

      const resolved = castingFor(character!);
      expect(resolved.ability).toBe(ability);
      expect(resolved.recorded).toBe(true);

      const profBonus = character?.profBonus ?? 0;
      // 8 is the Save DC's own constant; an attack is proficiency plus casting
      // modifier with no +8, which is why these two are not each other plus eight.
      expect(8 + profBonus + resolved.modifier).toBe(saveDc);
      expect(profBonus + resolved.modifier).toBe(attack);
    }
  );
});