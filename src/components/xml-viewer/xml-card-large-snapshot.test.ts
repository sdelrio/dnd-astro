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
  ],
  inventory: [
    { name: 'Greatsword', count: 1, weight: 6, carried: 2 },
    { name: 'Handaxe', count: 2, weight: 2, carried: 2 },
    { name: 'Scale Mail', count: 1, weight: 45, carried: 2 },
    { name: 'Potion of Healing', count: 2, weight: 0.5, carried: 1 },
  ],
  coins: { pp: 0, gp: 57, ep: 0, sp: 28, cp: 92 },
};

const SECTION_MARKERS: Array<[label: string, marker: string]> = [
  ['Overview', '>Overview</h3>'],
  ['Saving Throws', '>Saving Throws</h3>'],
  ['Languages', '>Languages</div>'],
  ['Feats', '>Feats</div>'],
  ['Skills', '>Skills</h3>'],
  ['Inventory', '>Inventory</h3>'],
  ['Equipped Weapons', '>Equipped Weapons</h3>'],
  ['Features', '>Features</h3>'],
  ['Powers', '>Powers</h3>'],
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
