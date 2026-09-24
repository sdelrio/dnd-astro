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
  overrides: Partial<CharacterData> = {},
  extraProps: { link?: boolean; image?: string } = {}
): Promise<string> {
  return container.renderToString(XmlCard, {
    props: { character: { ...baseCharacter, ...overrides }, display, ...extraProps },
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

function featuresSection(html: string): string {
  const marker = html.indexOf('>Features</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function powersSection(html: string): string {
  const marker = html.indexOf('>Powers</h2>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function powerRow(section: string, name: string): string {
  const marker = section.indexOf(`>${name}`);
  expect(marker).toBeGreaterThan(-1);
  const start = section.lastIndexOf('<div class="py-2', marker);
  const end = section.indexOf('</div>', section.indexOf('x-transition', marker));
  return section.slice(start, end === -1 ? undefined : end + '</div>'.length);
}

function languagesSection(html: string): string {
  const marker = html.indexOf('>Languages</div>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function featsSection(html: string): string {
  const marker = html.indexOf('>Feats</div>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
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

  it('stacks label over value on narrow cards and restores the row at @md', async () => {
    const section = passiveSection(await renderCard('large'));
    const subcards = passiveSubcards(section);
    expect(subcards).toHaveLength(3);
    subcards.forEach((subcard) => {
      expect(subcard).toContain('flex-col');
      expect(subcard).toContain('items-center');
      expect(subcard).toContain('text-center');
      expect(subcard).toContain('@md:flex-row');
      expect(subcard).toContain('@md:items-baseline');
      expect(subcard).toContain('@md:justify-between');
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
    const profOnly = { name: 'Prof Only Skill', total: 9 };
    const medium = skillsSection(await renderCard('medium', { skills: [profOnly] }));
    expect(medium).toContain('Prof Only Skill');
    expect(medium).toContain('font-mono');
    expect(medium).not.toContain('<table');

    const large = skillsSection(await renderCard('large', { skills: [profOnly] }));
    expect(large).not.toContain('Prof Only Skill');
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
    const feats = html.indexOf('>Feats</div>');
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

  it('places the section after Skills and before Equipped Weapons in large mode', async () => {
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
    const skills = html.indexOf('>Skills</h2>');
    const inventory = html.indexOf('>Inventory</h2>');
    const weapons = html.indexOf('>Equipped Weapons</h2>');
    const features = html.indexOf('>Features</h2>');
    expect(skills).toBeGreaterThan(-1);
    expect(inventory).toBeGreaterThan(skills);
    expect(weapons).toBeGreaterThan(inventory);
    expect(features).toBeGreaterThan(weapons);
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
    expect(large).not.toContain('>Strength<');

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

describe('XmlCard Overview group', () => {
  it('groups Vitals, Abilities, and Passive Skills under one large-mode heading', async () => {
    const html = await renderCard('large');
    const overview = html.indexOf('>Overview</h2>');
    const abilities = html.indexOf('title="Abilities"');
    const passives = html.indexOf('Passive Skills');
    const saves = html.indexOf('>Saving Throws</h2>');
    expect(overview).toBeGreaterThan(-1);
    expect(abilities).toBeGreaterThan(overview);
    expect(passives).toBeGreaterThan(abilities);
    expect(saves).toBeGreaterThan(passives);
  });

  it('omits the Overview heading from small and medium cards', async () => {
    expect(await renderCard('small')).not.toContain('>Overview</h2>');
    expect(await renderCard('medium')).not.toContain('>Overview</h2>');
  });

  it('gives the overview and saving throws one half each at ultra-wide container widths', async () => {
    const html = await renderCard('large');
    expect(html).toContain('grid grid-cols-1 @6xl:grid-cols-2 gap-4');
    expect(html).toContain('@6xl:border-t-0');
    expect(html).toContain('@6xl:pt-0');
  });

  it('keeps one full-width column when the right-hand stack is empty', async () => {
    const noProficiency = Object.fromEntries(
      Object.entries(baseCharacter.abilities).map(([key, ability]) => [
        key,
        { ...ability, saveprof: 0 },
      ])
    );
    const emptyRight = await renderCard('medium', { abilities: noProficiency, languages: [] });
    expect(emptyRight).not.toContain('Saving Throws');
    expect(emptyRight).not.toContain('@6xl:grid-cols-2');
    expect(await renderCard('small')).not.toContain('@6xl:grid-cols-2');
  });
});

function pairingGridCount(html: string): number {
  return html.split('grid grid-cols-1 @6xl:grid-cols-2 gap-4').length - 1;
}

describe('XmlCard ultra-wide section pairing', () => {
  const equippedSword = {
    name: 'Greatsword',
    attackbonus: 0,
    attackstat: '',
    properties: '',
    carried: 2,
    type: 0,
    damage: [{ bonus: 0, dice: 'd6,d6', stat: 'base', statmult: 1, type: 'slashing' }],
  };
  const carriedItem = { name: 'Rope', count: 1, weight: 10, carried: 1 };
  const feature = { level: 1, name: 'Second Wind', source: 'Fighter' };
  const power = { level: 1, name: 'Bless', group: 'Cleric', prepared: 1, preparedDomain: 0 };
  const someCoins = { pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 };

  async function renderPaired(): Promise<string> {
    return renderCard('large', {
      feats: ['Alert'],
      weapons: [equippedSword],
      inventory: [carriedItem],
      coins: someCoins,
      features: [feature],
      powers: [power],
    });
  }

  it('stacks Languages and Feats under Saving Throws to the right of Overview', async () => {
    const html = await renderPaired();
    const saves = html.indexOf('>Saving Throws</h2>');
    const languages = html.indexOf('>Languages</div>');
    const feats = html.indexOf('>Feats</div>');
    const skills = html.indexOf('>Skills</h2>');
    expect(saves).toBeGreaterThan(-1);
    expect(languages).toBeGreaterThan(saves);
    expect(feats).toBeGreaterThan(languages);
    expect(skills).toBeGreaterThan(feats);
    expect(html.indexOf('<div class="space-y-4"><section class="border-t')).toBeGreaterThan(-1);
  });

  it('pairs Skills with Inventory and leaves Equipped Weapons full width', async () => {
    const html = await renderPaired();
    const skills = html.indexOf('>Skills</h2>');
    const inventory = html.indexOf('>Inventory</h2>');
    const wealth = html.indexOf('Current Wealth');
    const weapons = html.indexOf('>Equipped Weapons</h2>');
    expect(skills).toBeGreaterThan(-1);
    expect(inventory).toBeGreaterThan(skills);
    expect(wealth).toBeGreaterThan(inventory);
    expect(weapons).toBeGreaterThan(wealth);
  });

  it('pairs Features with Powers', async () => {
    const html = await renderPaired();
    const features = html.indexOf('>Features</h2>');
    const powers = html.indexOf('>Powers</h2>');
    expect(features).toBeGreaterThan(-1);
    expect(powers).toBeGreaterThan(features);
  });

  it('renders three ultra-wide pairing grids for a full large card', async () => {
    expect(pairingGridCount(await renderPaired())).toBe(3);
  });

  it('drops the pairing grid when the right-hand section is absent', async () => {
    const noRight = await renderCard('large', {
      inventory: [],
      coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      powers: [],
    });
    expect(pairingGridCount(noRight)).toBe(1);
  });

  it('gives every paired section a borderless top at ultra-wide widths', async () => {
    const html = await renderPaired();
    const borderless = 'pt-4 @6xl:border-t-0 @6xl:pt-0';
    expect(html.split(borderless).length - 1).toBe(6);
  });
});

describe('XmlCard Languages and Feats accent cards', () => {
  const manyLanguages = [
    'Common',
    'Draconic',
    'Elvish',
    'Dwarvish',
    'Gnomish',
    'Halfling',
    'Orc',
  ];
  const someFeats = ['Alert', 'Sentinel'];

  it('renders Languages as one accent card with an uppercase label and pills', async () => {
    const section = languagesSection(
      await renderCard('medium', { languages: manyLanguages })
    );
    expect(section).not.toContain('<h2');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('rounded-[7px]');
    expect(section).toContain('border border-gray-300');
    expect(section).toContain('uppercase tracking-wide">Languages</div>');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    for (const lang of manyLanguages) {
      expect(section).toContain(`>${lang}</span>`);
    }
  });

  it('renders Feats as one accent card with a Feats label', async () => {
    const section = featsSection(await renderCard('large', { feats: someFeats }));
    expect(section).not.toContain('<h2');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('rounded-[7px]');
    expect(section).toContain('uppercase tracking-wide">Feats</div>');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    for (const feat of someFeats) {
      expect(section).toContain(`>${feat}</span>`);
    }
  });

  it('puts the label left and the wrapping pill list right, stacking on narrow containers', async () => {
    for (const section of [
      languagesSection(await renderCard('medium', { languages: manyLanguages })),
      featsSection(await renderCard('large', { feats: someFeats })),
    ]) {
      expect(section).toContain('flex flex-col');
      expect(section).toContain('flex-wrap');
      expect(section).toContain('@md:flex-row');
      expect(section).toContain('@md:justify-between');
      const labelIndex = section.indexOf('uppercase tracking-wide">');
      const pillsIndex = section.indexOf('flex flex-wrap gap-2');
      expect(labelIndex).toBeGreaterThan(-1);
      expect(pillsIndex).toBeGreaterThan(labelIndex);
    }
  });

  it('omits Languages in small mode and Feats below large mode', async () => {
    expect(await renderCard('small', { languages: manyLanguages })).not.toContain(
      'uppercase tracking-wide">Languages</div>'
    );
    const medium = await renderCard('medium', { feats: someFeats });
    expect(medium).not.toContain('uppercase tracking-wide">Feats</div>');
  });
});

describe('XmlCard Features accent card', () => {
  const sampleFeatures = [
    { level: 1, name: 'Second Wind', source: 'Fighter' },
    { level: 2, name: 'Action Surge', source: 'Fighter' },
  ];

  it('wraps the Features content in one accent card below the heading', async () => {
    const section = featuresSection(await renderCard('large', { features: sampleFeatures }));
    expect(section).toContain('>Features</h2>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('border border-gray-300');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    const headingIndex = section.indexOf('>Features</h2>');
    const cardIndex = section.indexOf('rounded-[7px]');
    expect(cardIndex).toBeGreaterThan(headingIndex);
  });

  it('keeps level sub-headings and per-feature accordions inside the card', async () => {
    const section = featuresSection(await renderCard('large', { features: sampleFeatures }));
    const cardStart = section.indexOf('rounded-[7px]');
    expect(cardStart).toBeGreaterThan(-1);
    const card = section.slice(cardStart);
    expect(card).toContain('>Level 1</h3>');
    expect(card).toContain('>Level 2</h3>');
    expect(card).toContain('>Second Wind</span>');
    expect(card).toContain('>Action Surge</span>');
    expect(card).toContain("toggleSection('feature-0-0')");
    expect(card).toContain("isExpanded('feature-0-0')");
    expect(card).toContain('role="button"');
    expect(card).toContain('cursor-pointer');
    expect(card).toContain('x-transition');
  });

  it('hides the section in small and medium modes at build time', async () => {
    expect(await renderCard('small', { features: sampleFeatures })).not.toContain('Features');
    expect(await renderCard('medium', { features: sampleFeatures })).not.toContain('Features');
  });

  it('documents the Features accent card subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Features');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expectFixedModeCopy(body);
    expect(body).toContain('accent card');
    expect(body).toContain('Features');
    expect(body).toContain('display="large"');
  });
});

describe('XmlCard Powers accent card and prepared marks', () => {
  const preparedSpell = {
    level: 3,
    name: 'Bless',
    group: 'Spells',
    prepared: 1,
    preparedDomain: 0,
  };
  const domainSpell = {
    level: 1,
    name: 'Cure Wounds',
    group: 'Spells Domain (Life)',
    prepared: 1,
    preparedDomain: 1,
  };
  const preparedOnlySpell = {
    level: 2,
    name: 'Aid',
    group: 'Spells',
    prepared: 1,
    preparedDomain: 0,
  };
  const unpreparedSpell = {
    level: 1,
    name: 'Guiding Bolt',
    group: 'Spells',
    prepared: 0,
    preparedDomain: 0,
  };
  const nonSpell = {
    level: 1,
    name: 'Rage',
    group: 'Barbarian Actions/Effects',
    prepared: 3,
    preparedDomain: 0,
  };

  it('wraps the Powers content in one accent card below the heading', async () => {
    const section = powersSection(
      await renderCard('large', { powers: [preparedSpell, nonSpell] })
    );
    expect(section).toContain('>Powers</h2>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('border border-gray-300');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    const headingIndex = section.indexOf('>Powers</h2>');
    const cardIndex = section.indexOf('rounded-[7px]');
    expect(cardIndex).toBeGreaterThan(headingIndex);
    const card = section.slice(cardIndex);
    expect(card).toContain('>Level 3</h3>');
    expect(card).toContain('>Spells</h4>');
    expect(card).toContain('>Bless<span');
    expect(card).toContain("toggleSection('power-1-0-0')");
    expect(card).toContain("isExpanded('power-1-0-0')");
    expect(card).toContain('role="button"');
    expect(card).toContain('cursor-pointer');
    expect(card).toContain('x-transition');
  });

  it('marks a prepared spell with a filled gold dot and Prepared tooltip', async () => {
    const section = powersSection(await renderCard('large', { powers: [preparedOnlySpell] }));
    const row = powerRow(section, 'Aid');
    expect(row).toContain('bg-[#c68000]');
    expect(row).toContain('title="Prepared"');
    expect(row).not.toContain('Always prepared');
  });

  it('marks an always-prepared spell with a hollow accent-ring dot and class tooltip', async () => {
    const section = powersSection(
      await renderCard('large', {
        powers: [{ ...domainSpell, prepared: 0, preparedDomain: 1 }],
      })
    );
    const row = powerRow(section, 'Cure Wounds');
    expect(row).toContain('border border-[#c68000]');
    expect(row).toContain('title="Always prepared (class/subclass)"');
    expect(row).not.toContain('bg-[#c68000]');
    expect(row).not.toContain('title="Prepared"');
  });

  it('shows only the always-prepared dot when a spell has both flags', async () => {
    const section = powersSection(await renderCard('large', { powers: [domainSpell] }));
    const row = powerRow(section, 'Cure Wounds');
    expect(row).toContain('title="Always prepared (class/subclass)"');
    expect(row).not.toContain('title="Prepared"');
    expect(row).not.toContain('bg-[#c68000]');
  });

  it('shows no mark on non-spell powers even when prepared is non-zero', async () => {
    const section = powersSection(
      await renderCard('large', { powers: [nonSpell, unpreparedSpell] })
    );
    const rage = powerRow(section, 'Rage');
    expect(rage).not.toContain('bg-[#c68000]');
    expect(rage).not.toContain('border border-[#c68000]');
    expect(rage).not.toContain('title=');
    const guiding = powerRow(section, 'Guiding Bolt');
    expect(guiding).not.toContain('bg-[#c68000]');
    expect(guiding).not.toContain('border border-[#c68000]');
  });

  it('renders the bottom legend with the same dot markup only when at least one mark exists', async () => {
    const withMarks = powersSection(
      await renderCard('large', { powers: [preparedOnlySpell, domainSpell] })
    );
    expect(withMarks).toContain('Prepared');
    expect(withMarks).toContain('Always prepared (class/subclass)');
    const legendIndex = withMarks.lastIndexOf('mt-3 pt-2 border-t');
    expect(legendIndex).toBeGreaterThan(-1);
    const legend = withMarks.slice(legendIndex);
    expect(legend).toContain('bg-[#c68000]');
    expect(legend).toContain('border border-[#c68000]');
    expect(legend).toContain('title="Prepared"');
    expect(legend).toContain('title="Always prepared (class/subclass)"');

    const noMarks = powersSection(
      await renderCard('large', { powers: [unpreparedSpell, nonSpell] })
    );
    expect(noMarks).not.toContain('title="Prepared"');
    expect(noMarks).not.toContain('Always prepared (class/subclass)');
  });

  it('hides the section in small and medium modes at build time', async () => {
    expect(await renderCard('small', { powers: [preparedSpell] })).not.toContain('Powers');
    expect(await renderCard('medium', { powers: [preparedSpell] })).not.toContain('Powers');
  });

  it('documents the Powers Marks subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Powers Marks');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expectFixedModeCopy(body);
    expect(body).toContain('accent card');
    expect(body).toContain('display="large"');
    expect(body).toContain('Prepared');
    expect(body).toContain('Always prepared');
    expect(body).toContain('legend');
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

function portraitImg(html: string): string {
  const match = html.match(/<img\b[^>]*alt="Test Hero portrait"[^>]*>/);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

function portraitAnchor(html: string): string {
  return html.match(/<a\b[^>]*>\s*<img\b[^>]*alt="Test Hero portrait"/)?.[0] ?? '';
}

describe('XmlCard portrait link', () => {
  it('wraps the portrait in a link to the character page by default', async () => {
    const html = await renderCard('large');
    const anchor = portraitAnchor(html);
    expect(anchor).toContain('href="/fantasy-grounds/characters/testhero"');
    expect(anchor).toContain('aria-label="View Test Hero character sheet"');
    expect(portraitImg(html)).toContain('title="Test Hero"');
    expect(portraitImg(html)).toContain('src="/fg/avatar/faceless.svg"');
  });

  it('renders no anchor around the portrait when link is false', async () => {
    const html = await renderCard('large', {}, { link: false });
    expect(portraitAnchor(html)).toBe('');
    expect(html).not.toContain('href="/fantasy-grounds/characters/testhero"');
    expect(html).not.toContain('aria-label="View Test Hero character sheet"');
    expect(portraitImg(html)).toContain('title="Test Hero"');
  });

  it('renders no anchor around the portrait when the character has no filename', async () => {
    const html = await renderCard('large', { filename: undefined });
    expect(portraitAnchor(html)).toBe('');
    expect(html).not.toContain('href="/fantasy-grounds/characters/testhero"');
    expect(html).not.toContain('aria-label="View Test Hero character sheet"');
    expect(portraitImg(html)).toContain('title="Test Hero"');
  });
});

describe('XmlCard avatar resolution', () => {
  it('uses an explicit image prop when the avatar file exists', async () => {
    const html = await renderCard('large', {}, { image: 'antonidas.png' });
    expect(portraitImg(html)).toContain('src="/fg/avatar/antonidas.png"');
  });

  it('falls back to faceless.svg when the explicit image file is missing', async () => {
    const html = await renderCard('large', {}, { image: 'dontexists.jpg' });
    expect(portraitImg(html)).toContain('src="/fg/avatar/faceless.svg"');
  });

  it('uses the stored build-pipeline path when no image prop is given', async () => {
    const html = await renderCard('large', { avatarPath: '/fg/avatar/milo.jpg' });
    expect(portraitImg(html)).toContain('src="/fg/avatar/milo.jpg"');
  });

  it('probes the filename slug when neither image prop nor stored path exists', async () => {
    const html = await renderCard('large', { avatarPath: undefined, filename: 'antonidas' });
    expect(portraitImg(html)).toContain('src="/fg/avatar/antonidas.png"');
  });
});

function expectFixedModeCopy(body: string): void {
  expect(body).not.toMatch(/S\/M/);
  expect(body).not.toMatch(/toggle/i);
  expect(body).toContain('build time');
}

describe('XmlCard visual test page', () => {
  it('documents that card portraits link to character pages', () => {
    const display = testPageSource.indexOf('## Display: Small');
    const linkNote = testPageSource.indexOf('Card portraits link to character pages');
    expect(linkNote).toBeGreaterThan(-1);
    expect(linkNote).toBeLessThan(display);
    const body = testPageSource.slice(linkNote, display);
    expect(body).toContain('/fantasy-grounds/characters/');
    expect(body).toContain('real character page');
    expect(body).toContain('link={false}');
  });

  it('documents the Passive Skills subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Passive Skills');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expect(body).toContain('display="large"');
    expectFixedModeCopy(body);
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
    expectFixedModeCopy(body);
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
    expectFixedModeCopy(body);
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
    expectFixedModeCopy(body);
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
    expectFixedModeCopy(body);
    expect(body).toContain('Ability');
    expect(body).toContain('Save');
    expect(body).toContain('Proficient');
  });

  it('documents the Languages accent card subsection', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const subsection = testPageSource.indexOf('### Languages');
    expect(large).toBeGreaterThan(-1);
    expect(subsection).toBeGreaterThan(large);
    expect(subsection).toBeLessThan(notes);
    const body = testPageSource.slice(subsection, notes);
    expectFixedModeCopy(body);
    expect(body).toContain('accent card');
    expect(body).toContain('Languages');
  });

  it('documents the Feats accent card subsection under Display: Large', () => {
    const large = testPageSource.indexOf('## Display: Large');
    const notes = testPageSource.indexOf('## Notes');
    const languages = testPageSource.indexOf('### Languages');
    const feats = testPageSource.indexOf('### Feats');
    expect(large).toBeGreaterThan(-1);
    expect(languages).toBeGreaterThan(large);
    expect(feats).toBeGreaterThan(languages);
    expect(feats).toBeLessThan(notes);
    const body = testPageSource.slice(feats, notes);
    expect(body).toContain('display="large"');
    expectFixedModeCopy(body);
    expect(body).toContain('accent card');
    expect(body).toContain('Feats');
  });
});
