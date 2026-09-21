import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import XmlCard from './XmlCard.astro';
import type { CharacterData } from '@/utils/parse-character-xml';

const baseCharacter: CharacterData = {
  name: 'Test Hero',
  race: 'Human',
  alignment: 'Neutral',
  background: 'Soldier',
  deity: '',
  classes: [{ name: 'Fighter', level: 3 }],
  abilities: {
    strength: { score: 16, bonus: 3, save: 5, saveprof: 1 },
    dexterity: { score: 12, bonus: 1, save: 1, saveprof: 0 },
    constitution: { score: 14, bonus: 2, save: 4, saveprof: 1 },
    intelligence: { score: 10, bonus: 0, save: 0, saveprof: 0 },
    wisdom: { score: 13, bonus: 1, save: 1, saveprof: 0 },
    charisma: { score: 8, bonus: -1, save: -1, saveprof: 0 },
  },
  ac: 18,
  hp: 28,
  tempHp: 0,
  speed: 30,
  initiative: 1,
  profBonus: 2,
  skills: [{ name: 'Perception', total: 3 }],
  allSkills: [{ name: 'Perception', total: 3, prof: 1, stat: 'wisdom' }],
  passives: { perception: 14, investigation: 11, insight: 10 },
  languages: ['Common'],
  feats: [],
  features: [],
  powers: [],
  weapons: [],
  inventory: [],
  coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  filename: 'testhero',
  avatarPath: '/fg/avatar/faceless.svg',
};

const testPageSource = readFileSync(
  join(__dirname, '../../content/docs/guides/xml-card-test.mdx'),
  'utf8'
);

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function renderCard(
  display: 'small' | 'medium' | 'large',
  overrides: Partial<CharacterData> = {}
): Promise<string> {
  return container.renderToString(XmlCard, {
    props: { character: { ...baseCharacter, ...overrides }, display },
  });
}

function passiveSection(html: string): string {
  const marker = html.indexOf('Passive Skills');
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function skillsSection(html: string): string {
  const marker = html.indexOf('>Skills</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function skillRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function skillRow(section: string, name: string): string {
  const matches = skillRows(section).filter((row) => row.includes(`>${name}<`));
  expect(matches).toHaveLength(1);
  return matches[0];
}

function rowNames(section: string): string[] {
  return [...section.matchAll(/<span class="truncate">([^<]+)<\/span>/g)].map(([, name]) => name);
}

function passiveSubcards(section: string): string[] {
  const starts: number[] = [];
  let marker = section.indexOf('rounded-[7px]');
  while (marker !== -1) {
    starts.push(section.lastIndexOf('<div', marker));
    marker = section.indexOf('rounded-[7px]', marker + 1);
  }
  return starts.map((start, i) => section.slice(start, starts[i + 1] ?? section.length));
}

function weaponsSection(html: string): string {
  const marker = html.indexOf('>Equipped Weapons</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function weaponRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function inventorySection(html: string): string {
  const marker = html.indexOf('>Inventory</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function inventoryRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function savesSection(html: string): string {
  const marker = html.indexOf('>Saving Throws</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function saveTables(section: string): string[] {
  return section.split('<table').slice(1);
}

function saveRows(table: string): string[] {
  return table.split('<tr').slice(1);
}

function saveRowShorts(table: string): string[] {
  return saveRows(table)
    .filter((row) => !row.includes('<th'))
    .map((row) => row.match(/<span>([A-Z]{3})<\/span>/)?.[1] ?? '');
}

function saveRow(table: string, short: string): string {
  const matches = saveRows(table).filter((row) => row.includes(`>${short}<`));
  expect(matches).toHaveLength(1);
  return matches[0];
}

describe('XmlCard Passive Skills section', () => {
  it('renders in large mode between Abilities and Saving Throws', async () => {
    const html = await renderCard('large');
    const abilities = html.indexOf('title="Abilities"');
    const passives = html.indexOf('Passive Skills');
    const saves = html.indexOf('Saving Throws');
    expect(abilities).toBeGreaterThan(-1);
    expect(passives).toBeGreaterThan(-1);
    expect(saves).toBeGreaterThan(-1);
    expect(passives).toBeGreaterThan(abilities);
    expect(saves).toBeGreaterThan(passives);
  });

  it('shows the three subcards with values from the parsed passives data', async () => {
    const section = passiveSection(await renderCard('large'));
    expect(section).toContain('Passive Perception');
    expect(section).toContain('Passive Investigation');
    expect(section).toContain('Passive Insight');
    expect(section).toContain('>14</div>');
    expect(section).toContain('>11</div>');
    expect(section).toContain('>10</div>');
  });

  it('renders the parser default of 10 for sheets lacking the skills', async () => {
    const section = passiveSection(
      await renderCard('large', { passives: { perception: 10, investigation: 10, insight: 10 } })
    );
    expect(section.match(/>10<\/div>/g)).toHaveLength(3);
  });

  it('never renders in small or medium mode at build time', async () => {
    expect(await renderCard('small')).not.toContain('Passive Skills');
    expect(await renderCard('medium')).not.toContain('Passive Skills');
  });

  it('renders the section title as a hover tooltip instead of a heading', async () => {
    const section = passiveSection(await renderCard('large'));
    expect(section).not.toContain('<h2');
    expect(section).toContain('opacity-0');
    expect(section).toContain('group-hover:opacity-100');
    expect(section).toContain('transition-opacity');
    expect(section).toContain('pointer-events-none');
    expect(section).toContain('>Passive Skills</span>');
  });

  it('lays each subcard out as a single label/value row', async () => {
    const section = passiveSection(await renderCard('large'));
    const labels = ['Passive Perception', 'Passive Investigation', 'Passive Insight'];
    const values = ['14', '11', '10'];
    const subcards = passiveSubcards(section);
    expect(subcards).toHaveLength(3);
    subcards.forEach((subcard, i) => {
      expect(subcard).toContain('flex');
      expect(subcard).toContain('justify-between');
      const labelIndex = subcard.indexOf(labels[i]);
      const valueIndex = subcard.indexOf(`>${values[i]}</div>`);
      expect(labelIndex).toBeGreaterThan(-1);
      expect(valueIndex).toBeGreaterThan(labelIndex);
    });
  });

  it('uses one uniform vitals-item radius on all four corners of each subcard', async () => {
    const section = passiveSection(await renderCard('large'));
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(3);
    expect(section).not.toContain('45%');
    expect(section.match(/uppercase tracking-wide/g)).toHaveLength(3);
    expect(section.match(/font-bold/g)).toHaveLength(3);
  });

});

describe('XmlCard All-skills section', () => {
  const fiveSkills = [
    { name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' },
    { name: 'Athletics', total: 5, prof: 1, stat: 'strength' },
    { name: 'Insight', total: 2, prof: 0, stat: 'wisdom' },
    { name: 'Perception', total: 3, prof: 1, stat: 'wisdom' },
    { name: 'Stealth', total: 4, prof: 1, stat: 'dexterity' },
  ];

  it('renders one card with two alphabetical tables in large mode only', async () => {
    const large = skillsSection(await renderCard('large', { allSkills: fiveSkills }));
    expect(large.match(/<table/g)).toHaveLength(2);
    expect(large).toContain('>Skill</th>');
    expect(large).toContain('>Abil</th>');
    expect(large).toContain('>Total</th>');
    expect(large.match(/rounded-\[7px\]/g)).toHaveLength(1);
    const secondTable = large.indexOf('<table', large.indexOf('<table') + 1);
    expect(rowNames(large.slice(0, secondTable))).toEqual([
      'Arcana',
      'Athletics',
      'Insight',
    ]);
    expect(rowNames(large.slice(secondTable))).toEqual(['Perception', 'Stealth']);

    expect(skillsSection(await renderCard('small', { allSkills: fiveSkills }))).not.toContain(
      '<table'
    );
    const medium = skillsSection(await renderCard('medium', { allSkills: fiveSkills }));
    expect(medium).not.toContain('<table');
    expect(medium).not.toContain('Abil');
  });

  it('marks proficiency with gold dots: none for prof 0, one for 1, two for 2', async () => {
    const allSkills = [
      { name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' },
      { name: 'Perception', total: 3, prof: 1, stat: 'wisdom' },
      { name: 'Sleight of Hand', total: 7, prof: 2, stat: 'dexterity' },
    ];
    const section = skillsSection(await renderCard('large', { allSkills }));

    const arcana = skillRow(section, 'Arcana');
    expect(arcana).not.toContain('bg-[#c68000]');
    expect(arcana).not.toContain('title=');

    const perception = skillRow(section, 'Perception');
    expect(perception.match(/bg-\[#c68000\]/g)).toHaveLength(1);
    expect(perception).toContain('title="Proficient"');

    const sleight = skillRow(section, 'Sleight of Hand');
    expect(sleight.match(/bg-\[#c68000\]/g)).toHaveLength(2);
    expect(sleight).toContain('title="Expertise"');

    expect(section).not.toContain('<button');
  });

  it('derives the ability abbreviation from stat, blank when missing', async () => {
    const allSkills = [
      { name: 'Thieves Tools (Traps)', total: 6, prof: 2, stat: 'intelligence' },
      { name: 'Mystery Skill', total: 1, prof: 0, stat: '' },
    ];
    const section = skillsSection(await renderCard('large', { allSkills }));
    expect(skillRow(section, 'Thieves Tools (Traps)')).toContain('>INT</td>');
    expect(skillRow(section, 'Mystery Skill')).toMatch(/>\s*<\/td>/);
  });

  it('renders the prof-only skills grid in medium mode but not in large mode', async () => {
    const medium = skillsSection(await renderCard('medium'));
    expect(medium).toContain('Perception');
    expect(medium).toContain('font-mono');
    expect(medium).not.toContain('<table');

    const large = skillsSection(await renderCard('large'));
    expect(large).not.toContain('justify-between');
    expect(large).toContain('<table');
  });
});

describe('XmlCard Equipped Weapons section', () => {
  const greatsword = {
    name: 'Greatsword',
    attackbonus: 0,
    attackstat: '',
    properties: 'reroll 2',
    carried: 2,
    type: 0,
    damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
  };
  const handaxe = {
    name: 'Handaxe',
    attackbonus: 0,
    attackstat: '',
    properties: '',
    carried: 2,
    type: 2,
    damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'slashing' }],
  };

  it('renders one equipped-weapons table with computed totals in large mode', async () => {
    const section = weaponsSection(await renderCard('large', { weapons: [greatsword, handaxe] }));
    expect(section).toContain('>ATK</th>');
    expect(section).toContain('>Weapon</th>');
    expect(section).toContain('>Properties</th>');
    expect(section).toContain('>Damage</th>');
    expect(section.match(/<table/g)).toHaveLength(1);
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    expect(section).not.toContain('<button');

    const greatswordRow = weaponRows(section).find((row) => row.includes('Greatsword'));
    expect(greatswordRow).toContain('>+5<');
    expect(greatswordRow).toContain('reroll 2');
    expect(greatswordRow).toContain('2d6+3 Slashing');

    const handaxeRow = weaponRows(section).find((row) => row.includes('Handaxe'));
    expect(handaxeRow).toContain('>d6+3 Slashing<');
    expect(handaxeRow).toContain('>-<');
  });

  it('hides the section in small and medium modes at build time', async () => {
    expect(await renderCard('small', { weapons: [greatsword] })).not.toContain('Equipped Weapons');
    expect(await renderCard('medium', { weapons: [greatsword] })).not.toContain('Equipped Weapons');
  });

  it('hides the section when no weapon is equipped', async () => {
    const stowed = { ...greatsword, carried: 1 };
    expect(await renderCard('large', { weapons: [stowed] })).not.toContain('Equipped Weapons');
    expect(await renderCard('large', { weapons: [] })).not.toContain('Equipped Weapons');
  });

  it('places the section after Feats and before Features in large mode', async () => {
    const html = await renderCard('large', {
      feats: ['Alert'],
      weapons: [greatsword],
      features: [{ level: 1, name: 'Second Wind', source: 'Fighter' }],
    });
    const feats = html.indexOf('>Feats</h2>');
    const weapons = html.indexOf('>Equipped Weapons</h2>');
    const features = html.indexOf('>Features</h2>');
    expect(feats).toBeGreaterThan(-1);
    expect(weapons).toBeGreaterThan(feats);
    expect(features).toBeGreaterThan(weapons);
  });
});

describe('XmlCard Inventory section', () => {
  const strongAbilities = {
    ...baseCharacter.abilities,
    strength: { score: 18, bonus: 4, save: 4, saveprof: 0 },
  };
  const alberichCoins = { pp: 0, gp: 57, ep: 0, sp: 28, cp: 92 };
  const alberichInventory = [
    { name: 'Greatsword', count: 1, weight: 6, carried: 2 },
    { name: 'Handaxe', count: 2, weight: 2, carried: 2 },
    { name: 'Scale Mail', count: 1, weight: 45, carried: 2 },
    { name: 'Rhodochrosite', count: 1, weight: 0.01, carried: 1 },
    { name: 'Potion of Healing', count: 0, weight: 0.5, carried: 1 },
    { name: '+2 Drowcraft Studded Leather', count: 1, weight: 13, carried: 1 },
    { name: 'Azurite', count: 1, weight: 0.01, carried: 1 },
    { name: 'Malachite', count: 1, weight: 0.01, carried: 1 },
  ];
  const droppedGem = { name: 'Sold Gem', count: 1, weight: 100, carried: 0 };

  async function renderInventory(
    overrides: Partial<CharacterData> = {}
  ): Promise<string> {
    return inventorySection(
      await renderCard('large', {
        abilities: strongAbilities,
        inventory: alberichInventory,
        coins: alberichCoins,
        ...overrides,
      })
    );
  }

  it('renders the items table with the specified columns and row values', async () => {
    const section = await renderInventory();
    expect(section).toContain('>Item</th>');
    expect(section).toContain('>Count</th>');
    expect(section).toContain('>Weight</th>');
    expect(section).toContain('>State</th>');
    expect(section.match(/<table/g)).toHaveLength(1);
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(2);
    expect(section).not.toContain('<button');

    const greatsword = inventoryRows(section).find((row) => row.includes('Greatsword'));
    expect(greatsword).toContain('6.0 lb.');
    expect(greatsword).toContain('>Equipped</td>');

    const handaxe = inventoryRows(section).find((row) => row.includes('Handaxe'));
    expect(handaxe).toContain('>2</td>');
    expect(handaxe).toContain('2.0 lb.');
    expect(handaxe).toContain('>Equipped</td>');

    const gem = inventoryRows(section).find((row) => row.includes('Rhodochrosite'));
    expect(gem).toContain('0.0 lb.');
    expect(gem).toContain('>Carried</td>');
  });

  it('shows the carried weight total against STR x 15 capacity', async () => {
    const section = await renderInventory();
    expect(section).toContain('68.0 / 270 lb. carried');
  });

  it('drops carried 0 items from the table and the weight total', async () => {
    const section = await renderInventory({ inventory: [...alberichInventory, droppedGem] });
    expect(section).not.toContain('Sold Gem');
    expect(section).toContain('68.0 / 270 lb. carried');
  });

  it('renders Current Wealth in fixed PP, GP, EP, SP, CP order', async () => {
    const section = await renderInventory();
    expect(section).toContain('Current Wealth');
    const positions = ['PP', 'GP', 'EP', 'SP', 'CP'].map((label) =>
      section.indexOf(`>${label}<`)
    );
    expect(positions.every((position) => position > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(section).toContain('>57</div>');
    expect(section).toContain('>28</div>');
    expect(section).toContain('>92</div>');
  });

  it('hides the section in small and medium modes at build time', async () => {
    expect(
      await renderCard('small', { inventory: alberichInventory, coins: alberichCoins })
    ).not.toContain('Current Wealth');
    expect(
      await renderCard('medium', { inventory: alberichInventory, coins: alberichCoins })
    ).not.toContain('Current Wealth');
  });

  it('hides the section when nothing is carried and all coins are zero', async () => {
    const html = await renderCard('large', { inventory: [droppedGem] });
    expect(html).not.toContain('>Inventory</h2>');
    expect(html).not.toContain('Current Wealth');
  });

  it('renders the wealth card alone when no items are carried but coins are non-zero', async () => {
    const section = await renderInventory({ inventory: [droppedGem] });
    expect(section).toContain('Current Wealth');
    expect(section).not.toContain('<table');
    expect(section).not.toContain('lb. carried');
    expect(section).not.toContain('Sold Gem');
  });

  it('places the section after Equipped Weapons and before Features in large mode', async () => {
    const html = await renderCard('large', {
      abilities: strongAbilities,
      inventory: alberichInventory,
      coins: alberichCoins,
      weapons: [{
        name: 'Greatsword',
        attackbonus: 0,
        attackstat: '',
        properties: 'reroll 2',
        carried: 2,
        type: 0,
        damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
      }],
      features: [{ level: 1, name: 'Second Wind', source: 'Fighter' }],
    });
    const weapons = html.indexOf('>Equipped Weapons</h2>');
    const inventory = html.indexOf('>Inventory</h2>');
    const features = html.indexOf('>Features</h2>');
    expect(weapons).toBeGreaterThan(-1);
    expect(inventory).toBeGreaterThan(weapons);
    expect(features).toBeGreaterThan(inventory);
  });
});

describe('XmlCard Saving Throws section', () => {
  const noProficiency = Object.fromEntries(
    Object.entries(baseCharacter.abilities).map(([key, ability]) => [
      key,
      { ...ability, saveprof: 0 },
    ])
  );

  it('renders the all-saves card in large mode only', async () => {
    const large = savesSection(await renderCard('large'));
    expect(large.match(/<table/g)).toHaveLength(2);
    expect(large).toContain('>Ability</th>');
    expect(large).toContain('>Save</th>');
    expect(large).not.toContain('justify-between');

    expect(savesSection(await renderCard('small'))).toBe('');
    const medium = savesSection(await renderCard('medium'));
    expect(medium).not.toContain('<table');
    expect(medium).not.toContain('Ability');
  });

  it('splits the six saves 3+3 in standard order inside one card', async () => {
    const section = savesSection(await renderCard('large'));
    const tables = saveTables(section);
    expect(tables).toHaveLength(2);
    expect(saveRowShorts(tables[0])).toEqual(['STR', 'DEX', 'CON']);
    expect(saveRowShorts(tables[1])).toEqual(['INT', 'WIS', 'CHA']);
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
  });

  it('marks a proficient save with exactly one gold dot and no others', async () => {
    const section = savesSection(await renderCard('large'));

    for (const short of ['STR', 'CON']) {
      const row = saveRow(section, short);
      expect(row.match(/bg-\[#c68000\]/g)).toHaveLength(1);
      expect(row).toContain('title="Proficient"');
    }

    for (const short of ['DEX', 'INT', 'WIS', 'CHA']) {
      const row = saveRow(section, short);
      expect(row).not.toContain('bg-[#c68000]');
      expect(row).not.toContain('title=');
    }

    expect(section).not.toContain('<button');
  });

  it('shows each signed save bonus right-aligned in mono', async () => {
    const section = savesSection(await renderCard('large'));
    const bonuses: Record<string, string> = {
      STR: '+5',
      DEX: '+1',
      CON: '+4',
      INT: '+0',
      WIS: '+1',
      CHA: '-1',
    };
    for (const [short, bonus] of Object.entries(bonuses)) {
      const row = saveRow(section, short);
      expect(row).toContain('font-mono');
      expect(row).toContain(`>${bonus}</td>`);
    }
  });

  it('renders the all-saves card for a save-less character in large mode only', async () => {
    const large = savesSection(await renderCard('large', { abilities: noProficiency }));
    expect(large.match(/<table/g)).toHaveLength(2);

    const medium = await renderCard('medium', { abilities: noProficiency });
    expect(medium).not.toContain('Saving Throws');
  });

  it('keeps the unchanged prof-only grid in medium mode', async () => {
    const medium = savesSection(await renderCard('medium'));
    expect(medium).toContain('Strength');
    expect(medium).toContain('Constitution');
    expect(medium).not.toContain('Dexterity');
    expect(medium).toContain('justify-between');
    expect(medium).toContain('font-mono');
    expect(medium).not.toContain('<table');
  });

  it('stays between Passive Skills and Skills', async () => {
    const html = await renderCard('large');
    const passives = html.indexOf('Passive Skills');
    const saves = html.indexOf('>Saving Throws</h2>');
    const skills = html.indexOf('>Skills</h2>');
    expect(passives).toBeGreaterThan(-1);
    expect(saves).toBeGreaterThan(passives);
    expect(skills).toBeGreaterThan(saves);
  });
});

describe('XmlCard display-mode toggle', () => {
  it('renders no S/M/L toggle in small, medium, or large mode', async () => {
    for (const display of ['small', 'medium', 'large'] as const) {
      const html = await renderCard(display);
      expect(html).not.toContain('aria-label="Display mode"');
      expect(html).not.toMatch(/>\s*S\s*<\/button>/);
      expect(html).not.toMatch(/>\s*M\s*<\/button>/);
      expect(html).not.toMatch(/>\s*L\s*<\/button>/);
    }
  });
});

describe('XmlCard visual test page', () => {
  it('documents the Passive Skills subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Passive Skills');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('display="large"');
    expect(body).not.toMatch(/S\/M/);
    expect(body).not.toMatch(/toggle/i);
    expect(body).toContain('build time');
    expect(body).toContain('tooltip');
    expect(body).toMatch(/single row/);
    expect(body).toContain('Passive Perception');
    expect(body).toContain('Passive Investigation');
    expect(body).toContain('Passive Insight');
  });

  it('documents the All-Skills Table subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### All-Skills Table');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('ethir');
    expect(body).toContain('tanadirian');
    expect(body).not.toMatch(/S\/M/);
    expect(body).not.toMatch(/toggle/i);
    expect(body).toContain('build time');
  });

  it('documents the Equipped Weapons subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Equipped Weapons');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('alberich');
    expect(body).toContain('display="large"');
    expect(body).not.toMatch(/S\/M/);
    expect(body).not.toMatch(/toggle/i);
    expect(body).toContain('build time');
    expect(body).toContain('ATK');
    expect(body).toContain('2d6+4 Slashing');
  });

  it('documents the Inventory subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Inventory');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('alberich');
    expect(body).toContain('display="large"');
    expect(body).not.toMatch(/S\/M/);
    expect(body).not.toMatch(/toggle/i);
    expect(body).toContain('build time');
    expect(body).toContain('68.0 / 270 lb. carried');
    expect(body).toContain('Current Wealth');
    expect(body).toContain('Item');
    expect(body).toContain('State');
  });

  it('documents the Saving Throws subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Saving Throws');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('alberich');
    expect(body).toContain('display="large"');
    expect(body).not.toMatch(/S\/M/);
    expect(body).not.toMatch(/toggle/i);
    expect(body).toContain('build time');
    expect(body).toContain('Ability');
    expect(body).toContain('Save');
    expect(body).toContain('Proficient');
  });
});
