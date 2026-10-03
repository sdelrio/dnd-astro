import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import XmlCard from './XmlCard.astro';
import type { CharacterData } from '@/utils/parse-character-xml';

const fixtureCharacter: CharacterData = {
  name: 'Snapshot Hero',
  race: 'Human',
  alignment: 'Lawful Good',
  background: 'Soldier',
  deity: 'Tempus',
  filename: 'snapshot-hero',
  avatarPath: '/fg/avatar/faceless.svg',
  classes: [{ name: 'Fighter', level: 3, subclass: 'Battle Master' }],
  abilities: {
    strength: { score: 18, bonus: 4, save: 6, saveprof: 1 },
    dexterity: { score: 12, bonus: 1, save: 1, saveprof: 0 },
    constitution: { score: 14, bonus: 2, save: 4, saveprof: 1 },
    intelligence: { score: 10, bonus: 0, save: 0, saveprof: 0 },
    wisdom: { score: 13, bonus: 1, save: 1, saveprof: 0 },
    charisma: { score: 8, bonus: -1, save: -1, saveprof: 0 },
  },
  ac: 18,
  hp: 28,
  tempHp: 5,
  speed: 30,
  initiative: 2,
  profBonus: 2,
  skills: [
    { name: 'Athletics', total: 7 },
    { name: 'Perception', total: 3 },
  ],
  allSkills: [
    { name: 'Athletics', total: 7, prof: 1, stat: 'strength' },
    { name: 'Acrobatics', total: 1, prof: 0, stat: 'dexterity' },
    { name: 'Perception', total: 5, prof: 2, stat: 'wisdom' },
    { name: 'Stealth', total: 1, prof: 1, stat: 'dexterity' },
    { name: 'Arcana', total: 0, prof: 0, stat: 'intelligence' },
    { name: 'Survival', total: 3, prof: 1, stat: 'wisdom' },
  ],
  passives: { perception: 15, investigation: 10, insight: 11 },
  languages: ['Common', 'Dwarvish'],
  feats: ['Alert', 'Great Weapon Master'],
  features: [
    { level: 1, name: 'Second Wind', source: 'Fighter' },
    { level: 2, name: 'Action Surge', source: 'Fighter' },
  ],
  powers: [
    {
      level: 3,
      name: 'Bless',
      group: 'Spells',
      prepared: 1,
      preparedDomain: 0,
    },
    {
      level: 1,
      name: 'Cure Wounds',
      group: 'Spells Domain (Life)',
      prepared: 1,
      preparedDomain: 1,
    },
    {
      level: 1,
      name: 'Rage',
      group: 'Barbarian Actions/Effects',
      prepared: 3,
      preparedDomain: 0,
    },
  ],
  weapons: [
    {
      name: 'Greatsword',
      attackbonus: 0,
      attackstat: '',
      properties: 'reroll 2',
      carried: 2,
      type: 0,
      damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
    },
    {
      name: 'Handaxe',
      attackbonus: 0,
      attackstat: '',
      properties: '',
      carried: 2,
      type: 2,
      damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'slashing' }],
    },
    {
      name: 'Longsword',
      attackbonus: 0,
      attackstat: '',
      properties: 'Versatile',
      carried: 1,
      type: 0,
      damage: [{ bonus: 0, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing' }],
    },
  ],
  // Two populated levels out of nine. The Spellcasting section renders one plate
  // per level with slots, so this is the only fixture in the repo that reaches
  // that code from a real parse: without it the drift guard would only ever see a
  // caster with no slots at all.
  spellSlots: [
    { level: 1, max: 4, used: 2 },
    { level: 2, max: 3, used: 1 },
    { level: 3, max: 0, used: 0 },
    { level: 4, max: 0, used: 0 },
    { level: 5, max: 0, used: 0 },
    { level: 6, max: 0, used: 0 },
    { level: 7, max: 0, used: 0 },
    { level: 8, max: 0, used: 0 },
    { level: 9, max: 0, used: 0 },
  ],
  inventory: [
    { name: 'Greatsword', count: 1, weight: 6, carried: 2 },
    { name: 'Handaxe', count: 2, weight: 2, carried: 2 },
    { name: 'Scale Mail', count: 1, weight: 45, carried: 2 },
    { name: 'Potion of Healing', count: 2, weight: 0.5, carried: 1 },
  ],
  coins: { pp: 0, gp: 57, ep: 0, sp: 28, cp: 92 },
};

/**
 * The panels in reading order, then the sections inside the Overview panel.
 *
 * The single-section panels are found by their `data-panel` hook rather than by a
 * heading, because they have no heading: the tab names them. Overview is the only
 * panel with sections of its own, so its inner sections are still marked by their
 * headings.
 *
 * The labels are the panel names, not the headings above them. `Weapons` rather
 * than `Equipped Weapons`: the panel takes one heading naming the section and an
 * `h4` per rendered table beneath it, and the old label here named a table where
 * the index means the panel.
 */
const SECTION_MARKERS: Array<[label: string, marker: string]> = [
  ['Overview', 'data-panel="overview"'],
  ['Vitals', '>Vitals</h3>'],
  ['Abilities', '>Abilities</h3>'],
  ['Passive Skills', '>Passive Skills</h3>'],
  ['Saving Throws', '>Saving Throws</h3>'],
  ['Languages', '>Languages</h3>'],
  ['Feats', '>Feats</h3>'],
  ['Skills', 'data-panel="skills"'],
  ['Spellcasting', 'data-panel="spellcasting"'],
  ['Inventory', 'data-panel="inventory"'],
  ['Weapons', 'data-panel="weapons"'],
  ['Features', 'data-panel="features"'],
  ['Powers', 'data-panel="powers"'],
];

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function renderLarge(): Promise<string> {
  return container.renderToString(XmlCard, {
    props: { character: fixtureCharacter, display: 'large' },
  });
}

function sectionOutline(html: string): string[] {
  return SECTION_MARKERS.map(([label, marker]) => ({ label, at: html.indexOf(marker) }))
    .filter((entry) => entry.at !== -1)
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.label);
}

function formatForSnapshot(html: string): string {
  return html.split('><').join('>\n<');
}

describe('XmlCard large-mode HTML snapshot', () => {
  it('keeps every large-mode section in document order', async () => {
    const html = await renderLarge();
    expect(
      sectionOutline(html),
      'large-mode section order drifted - update XmlCard.astro only if the new order is intentional, then refresh the snapshot'
    ).toEqual(SECTION_MARKERS.map(([label]) => label));
  });

  it('matches the golden large-mode markup for the fixture character', async () => {
    const html = await renderLarge();
    expect(formatForSnapshot(html)).toMatchSnapshot();
  });

  it('renders deterministic markup with no host paths or randomness', async () => {
    const [first, second] = [await renderLarge(), await renderLarge()];
    expect(first).toBe(second);
    expect(first).not.toContain(process.cwd());
  });
});
