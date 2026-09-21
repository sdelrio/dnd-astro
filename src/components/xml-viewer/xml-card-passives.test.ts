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
});
