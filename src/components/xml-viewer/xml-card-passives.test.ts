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
  filename: 'testhero',
  avatarPath: '/fg/avatar/faceless.svg',
};

const cardSource = readFileSync(join(__dirname, 'XmlCard.astro'), 'utf8');
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

function parseStaticPolicy(): Record<string, number> {
  const rankByMode: Record<string, number> = { small: 0, medium: 1, large: 2 };
  const body = cardSource.match(/const sectionPolicy = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
  const policy: Record<string, number> = {};
  for (const [, key, mode] of body.matchAll(/(\w+):\s*'(small|medium|large)'/g)) {
    policy[key] = rankByMode[mode];
  }
  return policy;
}

function parseLivePolicy(html: string): Record<string, number> {
  const body = html.match(/sectionPolicy:\s*\{([^}]*)\}/)?.[1] ?? '';
  const policy: Record<string, number> = {};
  for (const [, key, rank] of body.matchAll(/(\w+):\s*(\d+)/g)) {
    policy[key] = Number(rank);
  }
  return policy;
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

  it('keeps the build-time and live rank policy maps in sync', async () => {
    const live = parseLivePolicy(await renderCard('large'));
    const stat = parseStaticPolicy();
    expect(stat.passives).toBe(2);
    expect(live).toEqual(stat);
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

  it('keeps the build-time and live rank policy maps in sync', async () => {
    const live = parseLivePolicy(await renderCard('large'));
    const stat = parseStaticPolicy();
    expect(stat.allSkills).toBe(2);
    expect(live).toEqual(stat);
  });

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

  it('live-hides the medium prof-only grid in large mode but keeps it in medium', async () => {
    const large = skillsSection(await renderCard('large'));
    expect(large).toContain(`x-show="!canShow('allSkills')"`);

    const medium = skillsSection(await renderCard('medium'));
    expect(medium).toContain(`x-show="!canShow('allSkills')"`);
    expect(medium).toContain('Perception');
    expect(medium).toContain('font-mono');
    expect(medium).not.toContain('<table');
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
    expect(body).toMatch(/S\/M/);
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
    expect(body).toMatch(/S\/M/);
  });
});
