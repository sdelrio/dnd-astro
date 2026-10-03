import { describe, it, expect, beforeAll } from 'vitest';
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
  spellSlots: Array.from({ length: 9 }, (_, i) => ({ level: i + 1, max: 0, used: 0 })),
  inventory: [],
  coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  filename: 'testhero',
  avatarPath: '/fg/avatar/faceless.svg',
};

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

/**
 * The markup of one tab panel, by its `data-panel` hook.
 *
 * The card used to be one flat column of `<section>` elements, so each of these
 * sections could be sliced out by walking back from its heading to the nearest
 * `<section>` and forward to the next `</section>`. The tab bar made every
 * section its own panel, so the section is now found by its panel instead: the
 * old walk still terminates, it just stops at the wrong element and swallows the
 * panels after it - which is how a passing test can start asserting about the
 * neighbours. Slicing by panel also matches what the section now *is*: one tab,
 * one panel, one section.
 */
function panel(html: string, id: string): string {
  const open = html.indexOf(`data-panel="${id}"`);
  if (open === -1) return '';
  const start = html.lastIndexOf('<div', open);
  // Panels nest tables and cards several divs deep, so the closing tag has to be
  // matched by depth. A first-match `</div>` stops inside the first plate and
  // the slice comes back truncated.
  let depth = 0;
  for (let cursor = start; cursor < html.length; cursor += 1) {
    const nextOpen = html.indexOf('<div', cursor);
    const nextClose = html.indexOf('</div>', cursor);
    if (nextClose === -1) return html.slice(start);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + '<div'.length - 1;
    } else {
      depth -= 1;
      cursor = nextClose + '</div>'.length - 1;
      if (depth === 0) return html.slice(start, cursor + 1);
    }
  }
  return html.slice(start);
}

function passiveSection(html: string): string {
  const marker = html.indexOf('Passive Skills');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function skillsSection(html: string): string {
  return panel(html, 'skills');
}

/**
 * The Skills panel up to the pill sections that share it at medium.
 *
 * Languages and Feats ride this panel at medium (ADR-0017), so a count of the
 * panel's plates would count two plates this helper is not about. Slicing at the
 * first pill heading is what keeps the Skills table's own assertions about the
 * Skills table.
 */
function skillsTablePlate(section: string): string {
  const starts = ['>Languages</h3>', '>Feats</h3>']
    .map((marker) => section.indexOf(marker))
    .filter((at) => at > -1);
  return starts.length > 0 ? section.slice(0, Math.min(...starts)) : section;
}

function skillRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function skillRow(section: string, name: string): string {
  const matches = skillRows(section).filter((row) => row.includes(`>${name}<`));
  expect(matches).toHaveLength(1);
  const end = matches[0].indexOf('</tr>');
  return end === -1 ? matches[0] : matches[0].slice(0, end + '</tr>'.length);
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
  return panel(html, 'weapons');
}

function weaponRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function inventorySection(html: string): string {
  return panel(html, 'inventory');
}

function inventoryRows(section: string): string[] {
  return section.split('<tr').slice(1);
}

function featuresSection(html: string): string {
  return panel(html, 'features');
}

function powersSection(html: string): string {
  return panel(html, 'powers');
}

function abilitiesSection(html: string): string {
  const marker = html.indexOf('>Abilities</h3>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

/**
 * The six ability tiles, one markup slice each.
 *
 * The tile is the element that carries `border-t-[3px]`, so the marker is on the
 * tile's own opening tag and the nearest preceding `<div` is the tile rather than
 * a wrapper. Sliced rather than asserted through a helper's return value, because
 * what a reader can see on a tile - the abbreviation, the save figure, the coin -
 * is the whole of what this section has to get right.
 */
function abilityTiles(html: string): string[] {
  const section = abilitiesSection(html);
  const starts: number[] = [];
  let marker = section.indexOf('border-t-[3px]');
  while (marker !== -1) {
    starts.push(section.lastIndexOf('<div', marker));
    marker = section.indexOf('border-t-[3px]', marker + 1);
  }
  return starts.map((start, i) => section.slice(start, starts[i + 1] ?? section.length));
}

function savesSection(html: string): string {
  const marker = html.indexOf('>Saving Throws</h3>');
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

function powerPill(section: string, name: string): string {
  const nameIndex = section.indexOf(`>${name}`);
  expect(nameIndex).toBeGreaterThan(-1);
  const start = section.lastIndexOf('<span class="px-2', nameIndex);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  let cursor = start;
  while (cursor < section.length) {
    const open = section.indexOf('<span', cursor);
    const close = section.indexOf('</span>', cursor);
    if (close === -1) break;
    if (open !== -1 && open < close) {
      depth += 1;
      cursor = open + '<span'.length;
    } else {
      depth -= 1;
      cursor = close + '</span>'.length;
      if (depth === 0) return section.slice(start, cursor);
    }
  }
  return section.slice(start);
}

function powerPillNames(section: string): string[] {
  return [...section.matchAll(/<span class="px-2[^"]*"[^>]*>([^<]+)/g)].map(([, name]) =>
    name.trim()
  );
}

/**
 * One pill section by its heading.
 *
 * Both sections are the same markup at both display modes and differ only in
 * which panel holds them, so the heading is the stable marker and `panel()` is
 * how a test asks which panel it landed in.
 */
function languagesSection(html: string): string {
  const marker = html.indexOf('>Languages</h3>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

function featsSection(html: string): string {
  const marker = html.indexOf('>Feats</h3>');
  if (marker === -1) return '';
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  return html.slice(start, end === -1 ? undefined : end + '</section>'.length);
}

describe('XmlCard Abilities save proficiency mark', () => {
  // STR and CON are proficient in the fixture; the other four are not.
  const PROFICIENT = ['STR', 'CON'];
  const UNPROFICIENT = ['DEX', 'INT', 'WIS', 'CHA'];

  function tileFor(html: string, short: string): string {
    const tiles = abilityTiles(html);
    const matches = tiles.filter((tile) => tile.includes(`>${short}<`));
    expect(matches, `${short} tile`).toHaveLength(1);
    return matches[0];
  }

  for (const display of ['medium', 'large'] as const) {
    it(`marks a proficient save and leaves an untrained one unmarked at ${display}`, async () => {
      const html = await renderCard(display);
      for (const short of PROFICIENT) {
        const tile = tileFor(html, short);
        expect(tile, `${short} has no coin at ${display}`).toContain('rounded-full');
        expect(tile, `${short} has no screen-reader text at ${display}`).toContain(
          '>Proficient</span>'
        );
      }
      for (const short of UNPROFICIENT) {
        const tile = tileFor(html, short);
        expect(tile, `${short} is marked at ${display}`).not.toContain('rounded-full');
        expect(tile, `${short} has screen-reader text at ${display}`).not.toContain(
          '>Proficient</span>'
        );
      }
    });
  }

  it('keeps the mark beside the save figure, not beside the ability bonus', async () => {
    // The figure the mark qualifies is the save, so it has to read as part of the
    // save line. A coin above the bonus would claim the bonus is proficient.
    const tile = tileFor(await renderCard('large'), 'STR');
    expect(tile.indexOf('SAVE')).toBeLessThan(tile.indexOf('rounded-full'));
  });

  it('marks every proficient save the Saving Throws table marks, from one fixture', async () => {
    // The two tables are two renderings of the same `saveprof` flag, so a
    // character cannot look proficient on one and untrained on the other.
    const html = await renderCard('large');
    for (const short of PROFICIENT) {
      expect(tileFor(html, short)).toContain('rounded-full');
      expect(savesSection(html)).toContain(`>${short}</span>`);
    }
  });

  it('draws the coin with the same colour and shape as the Saving Throws table', async () => {
    // One legend covers both surfaces, so the class attribute on the two glyphs is
    // compared rather than trusted: they are the same rule at two call sites, and
    // a reader cannot learn a mark they see in two colours.
    const html = await renderCard('large');
    const coinClass = (markup: string) =>
      /class="([^"]*rounded-full[^"]*)"[^>]*aria-hidden/.exec(markup)?.[1];
    expect(coinClass(tileFor(html, 'STR'))).toBeDefined();
    expect(coinClass(tileFor(html, 'STR'))).toBe(coinClass(saveRow(saveTables(savesSection(html))[0], 'STR')));
  });

  it('does not change the small card, whose tiles are a different component', async () => {
    // The compact grid has no room for a mark and small is out of scope, so it
    // keeps printing the abbreviation, the bonus and the save in one line.
    const small = await renderCard('small');
    expect(small).not.toContain('>Proficient</span>');
    expect(small).toContain('+3 (+5)');
    expect(abilityTiles(small)).toHaveLength(6);
  });
});

describe('XmlCard Passive Skills section', () => {
  it('renders in large mode between Abilities and Saving Throws', async () => {
    const html = await renderCard('large');
    const abilities = html.indexOf('>Abilities</h3>');
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

  it('never renders in small mode at build time', async () => {
    expect(await renderCard('small')).not.toContain('Passive Skills');
  });

  it('renders the same three passive figures at medium as at large', async () => {
    // The section already sits inside the Overview panel and already owns three
    // plates, so promoting it through the section policy is a one-entry change
    // (ADR-0017). The values are read from the same parsed data at both modes, so
    // the two display modes cannot disagree about a character.
    const medium = passiveSection(await renderCard('medium'));
    expect(medium).toContain('Passive Perception');
    expect(medium).toContain('Passive Investigation');
    expect(medium).toContain('Passive Insight');
    expect(medium).toContain('>14</div>');
    expect(medium).toContain('>11</div>');
    expect(medium).toContain('>10</div>');
  });

  it('names itself at medium too, inside the Overview panel', async () => {
    // At medium the tab names the Overview panel, but Passive Skills is a section
    // inside it rather than the panel, so it keeps its h3 at both modes - the same
    // treatment Vitals and Abilities already get.
    const overview = panel(await renderCard('medium'), 'overview');
    expect(overview).toContain('>Passive Skills</h3>');
    expect(overview.indexOf('>Abilities</h3>')).toBeLessThan(overview.indexOf('>Passive Skills</h3>'));
  });

  it('renders the section title as an always-visible heading', async () => {
    // Was `opacity-0` until `group-hover`, which hid it from keyboard focus and
    // from touch entirely. P2 finding in the design audit.
    const section = passiveSection(await renderCard('large'));
    expect(section).toContain('>Passive Skills</h3>');
    expect(section).not.toContain('opacity-0');
    expect(section).not.toContain('group-hover:opacity-100');
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

  it('renders one card of two alphabetical tables in large mode', async () => {
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
  });

  it('renders the same card in medium mode, listing only the proficient skills', async () => {
    // Medium used to be a bare name/value grid with no plate, no ability column
    // and no dots, so the same section read as two different designs depending on
    // the display mode. It is now the large card with the untrained rows removed.
    const medium = skillsSection(
      await renderCard('medium', { allSkills: fiveSkills, languages: [], feats: [] })
    );
    expect(medium).toContain('>Skill</th>');
    expect(medium).toContain('>Abil</th>');
    expect(medium).toContain('>Total</th>');
    expect(medium.match(/rounded-\[7px\]/g)).toHaveLength(1);
    expect(rowNames(medium)).toEqual(['Athletics', 'Perception', 'Stealth']);
    // One table, not the large display's two-column split.
    expect(medium.match(/<table/g)).toHaveLength(1);
  });

  it('shares the medium panel with the two pill sections without losing the table', async () => {
    // The same panel, measured with the pill sections present: the Skills table
    // still leads, still carries one plate of its own, and the two pill plates
    // follow rather than replace it.
    const medium = skillsSection(
      await renderCard('medium', { allSkills: fiveSkills, languages: ['Common'] })
    );
    expect(medium.indexOf('>Skill</th>')).toBeLessThan(medium.indexOf('>Languages</h3>'));
    expect(skillsTablePlate(medium).match(/rounded-\[7px\]/g)).toHaveLength(1);
    expect(medium.match(/rounded-\[7px\]/g)).toHaveLength(2);
  });

  it('keeps the proficiency marks and the legend in medium mode', async () => {
    const medium = skillsSection(
      await renderCard('medium', {
        allSkills: [
          { name: 'Athletics', total: 5, prof: 1, stat: 'strength' },
          { name: 'Sleight of Hand', total: 7, prof: 2, stat: 'dexterity' },
          { name: 'Arcana', total: 1, prof: 3, stat: 'intelligence' },
        ],
      })
    );
    expect(skillRow(medium, 'Athletics')).toContain('data-prof-rank="proficient"');
    expect(skillRow(medium, 'Sleight of Hand')).toContain('data-prof-rank="expertise"');
    expect(skillRow(medium, 'Arcana')).toContain('data-prof-rank="half"');
    expect(medium).toContain('<span class="sr-only">Half proficiency</span>');
    expect(medium).toContain('>Expertise<');
  });

  it('omits the section in medium mode when no skill is proficient', async () => {
    // Languages and Feats count as content in this panel at medium, so "no
    // proficient skills" is not on its own enough to drop it. This character has
    // neither, so the panel genuinely has nothing in it.
    const untrained = await renderCard('medium', {
      allSkills: [
        { name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' },
        { name: 'Insight', total: 2, prof: 0, stat: 'wisdom' },
      ],
      languages: [],
      feats: [],
    });
    expect(skillsSection(untrained)).toBe('');
    // Large still lists them, since the untrained rows are the point there.
    expect(skillsSection(await renderCard('large', { allSkills: fiveSkills }))).not.toBe('');
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
    expect(arcana).not.toContain('data-prof-rank');

    const perception = skillRow(section, 'Perception');
    expect(perception.match(/bg-\[#c68000\]/g)).toHaveLength(1);
    expect(perception).toContain('<span class="sr-only">Proficient</span>');
    expect(perception).toContain('data-prof-rank="proficient"');

    const sleight = skillRow(section, 'Sleight of Hand');
    expect(sleight.match(/bg-\[#c68000\]/g)).toHaveLength(2);
    expect(sleight).toContain('<span class="sr-only">Expertise</span>');
    expect(sleight).toContain('data-prof-rank="expertise"');

    expect(section).not.toContain('<button');
  });

  it('marks half proficiency (prof 3) with one half-filled gold dot and a data-prof-rank hook', async () => {
    const allSkills = [
      { name: 'Arcana', total: 1, prof: 3, stat: 'intelligence' },
      { name: 'Medicine', total: 4, prof: 3, stat: 'wisdom' },
      { name: 'Perception', total: 3, prof: 1, stat: 'wisdom' },
    ];
    const section = skillsSection(await renderCard('large', { allSkills }));

    const arcana = skillRow(section, 'Arcana');
    expect(arcana.match(/data-prof-rank="half"/g)).toHaveLength(1);
    expect(arcana).toContain('<span class="sr-only">Half proficiency</span>');
    expect(arcana.match(/bg-\[#c68000\]/g)).toHaveLength(1);
    expect(arcana).toContain('border border-[#c68000]');
    expect(arcana).toContain('w-1/2');

    const medicine = skillRow(section, 'Medicine');
    expect(medicine).toContain('data-prof-rank="half"');

    const perception = skillRow(section, 'Perception');
    expect(perception).toContain('data-prof-rank="proficient"');
    expect(perception).not.toContain('data-prof-rank="half"');

    expect(section).not.toContain('<button');
  });

  it('lists the three markers in a legend when any skill is marked, absent when all are untrained', async () => {
    const marked = skillsSection(
      await renderCard('large', {
        allSkills: [
          { name: 'Athletics', total: 5, prof: 1, stat: 'strength' },
          { name: 'Sleight of Hand', total: 7, prof: 2, stat: 'dexterity' },
          { name: 'Arcana', total: 1, prof: 3, stat: 'intelligence' },
        ],
      })
    );
    const legendIndex = marked.lastIndexOf('mt-3 pt-2 border-t');
    expect(legendIndex).toBeGreaterThan(-1);
    const legend = marked.slice(legendIndex);
    expect(legend).toContain('Proficient');
    expect(legend).toContain('Expertise');
    expect(legend).toContain('Half proficiency');
    expect(legend).toContain('bg-[#c68000]');

    const untrained = skillsSection(
      await renderCard('large', {
        allSkills: [{ name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' }],
      })
    );
    expect(untrained).not.toContain('mt-3 pt-2 border-t');
    expect(untrained).not.toContain('Half proficiency');
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

  it('ignores the parser prof-only list, which cannot carry a rank or a stat', async () => {
    // Medium's rows come from allSkills now, because the card it renders is the
    // large one and needs `prof` to draw the dots and `stat` for the Abil column.
    // A `skills`-only sheet still renders every skill at large and only the
    // proficient ones at medium, so the two agree on what the character knows.
    const allSkills = [
      { name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' },
      { name: 'Perception', total: 3, prof: 1, stat: 'wisdom' },
    ];
    const medium = skillsSection(await renderCard('medium', { skills: [], allSkills }));
    expect(rowNames(medium)).toEqual(['Perception']);
  });
});

describe('XmlCard Weapons section', () => {
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
  const longsword = {
    name: 'Longsword',
    attackbonus: 0,
    attackstat: '',
    properties: 'Versatile',
    carried: 1,
    type: 0,
    damage: [{ bonus: 0, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing' }],
  };
  const wand = { ...greatsword, name: 'Wand', carried: 0 };

  /**
   * The weapon name in each body row of a table.
   *
   * The name is the second cell, and the properties cell after it repeats those
   * same words in a narrow card - so the cell is taken by position rather than by
   * matching text, and only the text before the properties span is read.
   */
  function tableNames(table: string): string[] {
    return weaponRows(table)
      .filter((row) => row.includes('<td'))
      .map((row) => {
        const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell]) => cell);
        return cells[1]?.split('<span')[0].trim() ?? '';
      });
  }

  function tablesFor(section: string, heading: string): string {
    const marker = section.indexOf(`>${heading}</`);
    expect(marker, `no ${heading} table in the panel`).toBeGreaterThan(-1);
    // The table that belongs to a heading is the first one after it, not the last
    // one before it: at large the equipped table sits between the two headings.
    const start = section.indexOf('<table', marker);
    const end = section.indexOf('</table>', start);
    return section.slice(start, end + '</table>'.length);
  }

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

  it('renders in medium mode too, since every section is a tab there', async () => {
    // Weapons was large-only until the tab bar. It is a tab panel now, so the
    // display mode decides how many columns the table uses and not whether the
    // table exists: a reader on a phone can reach the same section.
    expect(await renderCard('small', { weapons: [greatsword] })).not.toContain('>Weapons</h3>');
    expect(weaponsSection(await renderCard('medium', { weapons: [greatsword] }))).toContain(
      '>Greatsword<'
    );
  });

  it('shows the panel for carried-only, equipped-only and both', async () => {
    // ADR-0016's rule is that a menu entry exists only for a section with
    // something in it. A character holding nothing but carrying a longsword has
    // something in it, so the Weapons tab has to be there.
    for (const display of ['medium', 'large'] as const) {
      const carriedOnly = weaponsSection(
        await renderCard(display, { weapons: [longsword] })
      );
      expect(carriedOnly, `${display} carried-only`).toContain('data-panel="weapons"');
      expect(carriedOnly).toContain('>Longsword<');

      const equippedOnly = weaponsSection(
        await renderCard(display, { weapons: [greatsword] })
      );
      expect(equippedOnly, `${display} equipped-only`).toContain('data-panel="weapons"');
      expect(equippedOnly).toContain('>Greatsword<');

      const both = weaponsSection(
        await renderCard(display, { weapons: [greatsword, longsword] })
      );
      expect(both, `${display} both`).toContain('>Greatsword<');
      expect(both).toContain('>Longsword<');
    }
  });

  it('keeps the two sets in separate tables with no weapon in both', async () => {
    const section = weaponsSection(
      await renderCard('large', { weapons: [greatsword, handaxe, longsword, wand] })
    );
    expect(section.match(/<table/g)).toHaveLength(2);
    expect(tableNames(tablesFor(section, 'Equipped Weapons'))).toEqual(['Greatsword', 'Handaxe']);
    expect(tableNames(tablesFor(section, 'Carried Weapons'))).toEqual(['Longsword']);
    // The table each name sits in is the assertion that matters: the same weapon in
    // both tables is what "separate tables" rules out.
    expect(tablesFor(section, 'Equipped Weapons')).not.toContain('Longsword');
    expect(tablesFor(section, 'Carried Weapons')).not.toContain('Greatsword');
  });

  it('lists a stowed weapon in neither table', async () => {
    // The third `carried` value is not part of this character's kit, so it is not
    // in the pack either. The panel stays for the wand's owner only if they hold
    // or carry something.
    const section = weaponsSection(
      await renderCard('large', { weapons: [greatsword, longsword, wand] })
    );
    expect(section).not.toContain('Wand');
    expect(await renderCard('large', { weapons: [wand] })).not.toContain('data-panel="weapons"');
  });

  it('omits the carried table entirely when nothing is carried', async () => {
    // A section must not open onto an empty second sheet.
    const section = weaponsSection(await renderCard('large', { weapons: [greatsword, handaxe] }));
    expect(section.match(/<table/g)).toHaveLength(1);
    expect(section).not.toContain('Carried Weapons');
    expect(section).toContain('>Equipped Weapons<');
  });

  it('gives both tables the same columns and the same responsive column rule', async () => {
    // A stowed weapon is as usable as a held one, so the carried table is the same
    // table. Asserted by comparing the two rather than by pinning a class string:
    // ADR-0009's warning is that a test written against the markup you happened to
    // produce passes on the wrong markup, so the invariant is "the two tables agree
    // and Properties drops under the name", not "this literal class is present".
    const section = weaponsSection(
      await renderCard('large', { weapons: [greatsword, longsword] })
    );
    const equipped = tablesFor(section, 'Equipped Weapons');
    const carried = tablesFor(section, 'Carried Weapons');

    /** Each column's header cell class, keyed by its visible header. */
    function columnRules(table: string): Record<string, string> {
      return Object.fromEntries(
        [...table.matchAll(/<th class="([^"]*)"[^>]*>([^<]*)<\/th>/g)].map(([, cls, label]) => [
          label,
          cls,
        ])
      );
    }
    const equippedColumns = columnRules(equipped);
    expect(Object.keys(equippedColumns).sort()).toEqual(['ATK', 'Damage', 'Properties', 'Weapon']);
    expect(columnRules(carried)).toEqual(equippedColumns);

    // Properties is the column that gives: it leaves the row below `@lg` and rides
    // under the weapon name instead of forcing the card sideways.
    expect(equippedColumns.Properties).toContain('hidden');
    expect(equippedColumns.Properties).toContain('@lg:table-cell');
    // ATK and Damage keep their own columns at every width, because they are the
    // two figures a player reaches for mid-session.
    for (const kept of ['ATK', 'Damage']) {
      expect(equippedColumns[kept], `${kept} is hidden on a narrow card`).not.toContain('hidden');
    }
    expect(equipped).toContain('block @lg:hidden');
    expect(carried).toContain('block @lg:hidden');
  });

  it('names the section once and each table under it at large', async () => {
    // Two sibling headings claiming to be one section is not an outline, so the
    // section takes the h3 and each table an h4 beneath it.
    const both = weaponsSection(
      await renderCard('large', { weapons: [greatsword, longsword] })
    );
    expect(both.match(/<h3/g)).toHaveLength(1);
    expect(both).toContain('>Weapons</h3>');
    expect(both.match(/<h4/g)).toHaveLength(2);
    expect(both.indexOf('>Weapons</h3>')).toBeLessThan(both.indexOf('>Equipped Weapons</h4>'));
    expect(both.indexOf('>Equipped Weapons</h4>')).toBeLessThan(
      both.indexOf('>Carried Weapons</h4>')
    );

    // One subheading per *rendered* table, so the equipped-only case is not left
    // with a bare table under the section heading or a heading for a table that
    // is not there.
    const equippedOnly = weaponsSection(await renderCard('large', { weapons: [greatsword] }));
    expect(equippedOnly.match(/<h3/g)).toHaveLength(1);
    expect(equippedOnly.match(/<h4/g)).toHaveLength(1);
    expect(equippedOnly).toContain('>Equipped Weapons</h4>');
    expect(equippedOnly).not.toContain('Carried Weapons');
  });

  it('carries no heading at medium, where the tab names the panel', async () => {
    // ADR-0016: at medium the visible tab names the open panel, so a heading
    // inside it repeats a word the reader is already looking at. That is the rule
    // every other medium section already follows.
    const section = weaponsSection(
      await renderCard('medium', { weapons: [greatsword, longsword] })
    );
    expect(section).not.toContain('<h3');
    expect(section).not.toContain('<h4');
    expect(section).toContain('data-panel="weapons"');
  });

  it('still names the two tables for a screen reader where no heading is drawn', async () => {
    // The headings are large-only, so at medium the visible label is gone. The
    // tables keep an accessible name, so "what is in my hand" and "what is in my
    // bag" are never the same unlabelled grid twice.
    const section = weaponsSection(
      await renderCard('medium', { weapons: [greatsword, longsword] })
    );
    expect(section).toContain('aria-label="Equipped weapons"');
    expect(section).toContain('aria-label="Carried weapons"');
  });

  it('places the panel after Overview and before Features in large mode', async () => {
    // Tab order is the reading order of a printed character sheet: what the
    // character is, then what they can do, then what they carry.
    const html = await renderCard('large', {
      feats: ['Alert'],
      weapons: [greatsword],
      features: [{ level: 1, name: 'Second Wind', source: 'Fighter' }],
    });
    const overview = html.indexOf('data-panel="overview"');
    const weapons = html.indexOf('data-panel="weapons"');
    const features = html.indexOf('data-panel="features"');
    expect(overview).toBeGreaterThan(-1);
    expect(weapons).toBeGreaterThan(overview);
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

  it('renders the carried weight on the Inventory heading baseline at large', async () => {
    // The total annotates the contents, so it sits with them, and at large it
    // rides the heading's baseline again. It only ever rode it - the tab-name
    // arrangement removed the heading and nothing replaced the pairing, which
    // left a heading-shaped gap where a heading should be.
    const section = await renderInventory();
    expect(section).toContain('>Inventory</h3>');
    expect(section).toContain('68.0 / 270 lb. carried');
    // Same flex row as every other heading-plus-trailing-value pair on the card,
    // so the total sits on the baseline rather than wrapping under the label.
    expect(section).toContain('@md:items-baseline');
    const heading = section.indexOf('>Inventory</h3>');
    const weight = section.indexOf('68.0 / 270 lb. carried');
    expect(heading).toBeGreaterThan(-1);
    expect(weight).toBeGreaterThan(heading);
    expect(section.indexOf('>Item</th>')).toBeGreaterThan(weight);
  });

  it('leaves the Inventory heading to the tab at medium', async () => {
    // At medium the tab is the name the reader is looking at, so the heading is a
    // second copy of the same word twenty pixels below it. The total still leads
    // the section, just without a heading to ride.
    const html = await renderCard('medium', {
      abilities: strongAbilities,
      inventory: alberichInventory,
      coins: alberichCoins,
    });
    const section = inventorySection(html);
    expect(section).not.toContain('>Inventory</h3>');
    expect(section).toContain('68.0 / 270 lb. carried');
  });

  it('omits the carried weight entirely when nothing is carried', async () => {
    const section = await renderInventory({ inventory: [droppedGem] });
    expect(section).not.toContain('lb. carried');
    expect(section).toContain('Current Wealth');
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

  it('renders in medium mode too, since every section is a tab there', async () => {
    expect(
      await renderCard('small', { inventory: alberichInventory, coins: alberichCoins })
    ).not.toContain('Current Wealth');
    const medium = inventorySection(
      await renderCard('medium', { inventory: alberichInventory, coins: alberichCoins })
    );
    expect(medium).toContain('Current Wealth');
    // The base character's STR is 16, so the capacity is 240 rather than the
    // 270 the strong-STR fixture above carries. Both are the same assertion.
    expect(medium).toContain('68.0 / 240 lb. carried');
  });

  it('hides the section when nothing is carried and all coins are zero', async () => {
    const html = await renderCard('large', { inventory: [droppedGem] });
    expect(html).not.toContain('>Inventory</h3>');
    expect(html).not.toContain('Current Wealth');
  });

  it('renders the wealth card alone when no items are carried but coins are non-zero', async () => {
    const section = await renderInventory({ inventory: [droppedGem] });
    expect(section).toContain('Current Wealth');
    expect(section).not.toContain('<table');
    expect(section).not.toContain('lb. carried');
    expect(section).not.toContain('Sold Gem');
  });

  it('places the panel after Skills and before Equipped Weapons in large mode', async () => {
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
    const skills = html.indexOf('data-panel="skills"');
    const inventory = html.indexOf('data-panel="inventory"');
    const weapons = html.indexOf('data-panel="weapons"');
    const features = html.indexOf('data-panel="features"');
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

  it('labels the saves section with a heading at large, and renders it nowhere else', async () => {
    // ADR-0017: display mode decides which sections exist, and medium is a
    // glance rather than a sheet. A roster card spends its height on what a
    // reader recognises, and the saving throws are figures they compute with -
    // the character page and the large sheet print all six of them properly.
    const large = await renderCard('large');
    expect(large).toContain('>Saving Throws</h3>');
    expect(await renderCard('medium')).not.toContain('>Saving Throws</h3>');
    expect(await renderCard('small')).not.toContain('>Saving Throws</h3>');
  });

  it('renders no saves table at medium for any character', async () => {
    // Not a row-set reduction: the section is absent, heading and plate both.
    for (const abilities of [
      baseCharacter.abilities,
      Object.fromEntries(
        Object.entries(baseCharacter.abilities).map(([key, ability]) => [
          key,
          { ...ability, saveprof: 1 },
        ])
      ),
    ]) {
      const medium = await renderCard('medium', { abilities });
      expect(medium, 'medium still renders a saving-throws table').not.toContain('>Ability</th>');
      expect(medium, 'medium still renders a saves plate').not.toContain('Saving Throws');
    }
  });

  it('renders the all-saves card in large mode', async () => {
    const large = savesSection(await renderCard('large'));
    expect(large.match(/<table/g)).toHaveLength(2);
    expect(large).toContain('>Ability</th>');
    expect(large).toContain('>Save</th>');
    expect(large).not.toContain('>Strength<');

    expect(savesSection(await renderCard('small'))).toBe('');
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
      expect(row).toContain('<span class="sr-only">Proficient</span>');
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

  it('stays between Passive Skills and the Skills panel', async () => {
    const html = await renderCard('large');
    const passives = html.indexOf('Passive Skills');
    const saves = html.indexOf('>Saving Throws</h3>');
    const skills = html.indexOf('data-panel="skills"');
    expect(passives).toBeGreaterThan(-1);
    expect(saves).toBeGreaterThan(passives);
    expect(skills).toBeGreaterThan(saves);
  });
});

describe('XmlCard Overview group', () => {
  it('holds Vitals, Abilities and Passive Skills in the Overview panel', async () => {
    // The panel is named by its tab, so there is no `Overview` heading to be
    // above the three sections; what is asserted is that they are inside the
    // panel and in that order, which is what the group was for.
    const html = await renderCard('large');
    const overview = html.indexOf('data-panel="overview"');
    const vitals = html.indexOf('>Vitals</h3>');
    const abilities = html.indexOf('>Abilities</h3>');
    const passives = html.indexOf('Passive Skills');
    const saves = html.indexOf('>Saving Throws</h3>');
    const skills = html.indexOf('data-panel="skills"');
    expect(overview).toBeGreaterThan(-1);
    expect(vitals).toBeGreaterThan(overview);
    expect(abilities).toBeGreaterThan(vitals);
    expect(passives).toBeGreaterThan(abilities);
    expect(saves).toBeGreaterThan(passives);
    expect(skills).toBeGreaterThan(saves);
    expect(html).not.toContain('>Overview</h3>');
  });

  it('names the Overview panel through an always-visible menu entry, not a hover label', async () => {
    const html = await renderCard('large');
    expect(html).toContain('aria-label="Character sections"');
    expect(html).toContain('data-tab="overview"');
    expect(html).not.toContain('group-has-[section:hover]/overview:opacity-0!');
  });

  it('jumps to sections at large instead of hiding them, and ships no JavaScript for it', async () => {
    // A full sheet is already a long scroll, so hiding five of six sections behind
    // a click costs the reader their sense of the whole. At large the bar is a
    // table of contents: a real `href` to a real `id`, which is why it needs no
    // `x-data`, no `x-show` and no `x-cloak` to work.
    const html = await renderCard('large');
    expect(html).toContain('href="#xmlcard-testhero-overview"');
    expect(html).toContain('id="xmlcard-testhero-overview"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tabpanel"');
    expect(html).not.toContain('x-show');
    expect(html).not.toContain('x-data');
    // Every menu entry must point at something that exists, or it is a dead link.
    for (const href of html.match(/href="#(xmlcard-[^"]+)"/g) ?? []) {
      const target = href.slice('href="#'.length, -1);
      expect(html, `${target} is linked but never rendered`).toContain(`id="${target}"`);
    }
  });

  it('shows every section at large, so the jump bar replaces rather than adds', async () => {
    const html = await renderCard('large');
    expect(html).toContain('data-panel="overview"');
    expect(html).toContain('data-panel="skills"');
  });

  it('keeps medium a tablist that shows one section at a time', async () => {
    // The two modes are different instruments, not two settings of one. Medium
    // cards compete for a vertical column, so `role="tablist"` and the hidden
    // panels are correct there and only there.
    const html = await renderCard('medium');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('x-show="active === \'overview\'"');
    expect(html).not.toContain('<nav class="char-tabs"');
  });

  it('prints no counts on the menu, in either mode', async () => {
    // The count was a decision instrument for "is opening this worth the press".
    // Removed: it sat to the right of the label and broke the menu rhythm.
    expect(await renderCard('large')).not.toContain('char-tab-count');
    expect(await renderCard('medium')).not.toContain('char-tab-count');
  });

  it('leaves every panel visible to a reader without JavaScript', async () => {
    // `[x-cloak]` is `display: none !important`, so a cloaked panel is invisible
    // until Alpine boots - and a reader without JavaScript never boots it.
    // Cloaking all six would render a medium card as a header and nothing else,
    // which is strictly worse than the one-long-column layout the menu replaced.
    // The panels opt out with `data-no-cloak`; the bar keeps its cloak, because six
    // labels that do nothing are worse than no bar at all.
    const html = await renderCard('medium', {
      inventory: [{ name: 'Rope', count: 1, weight: 10, carried: 1 }],
      weapons: [
        {
          name: 'Longsword',
          attackbonus: 0,
          attackstat: '',
          properties: '',
          carried: 2,
          type: 0,
          damage: [{ bonus: 0, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing' }],
        },
      ],
      features: [{ level: 1, name: 'Rage', source: 'Barbarian' }],
      powers: [{ level: 1, name: 'Bless', group: 'Spells', prepared: 0, preparedDomain: 0 }],
    });
    expect(html, 'no panel declares the cloak opt-out').toMatch(/data-no-cloak="[^"]+"/);
    for (const id of ['overview', 'skills', 'inventory', 'weapons', 'features', 'powers']) {
      const open = html.indexOf(`data-panel="${id}"`);
      expect(open, `${id} panel is missing from the markup`).toBeGreaterThan(-1);
      const tag = html.slice(html.lastIndexOf('<div', open), html.indexOf('>', open));
      expect(tag, `${id} panel is cloaked, so a no-JS reader sees nothing`).not.toContain(
        'x-cloak',
      );
    }
    const barStart = html.indexOf('role="tablist"');
    expect(barStart, 'the tab bar is missing').toBeGreaterThan(-1);
    // The whole opening tag, not a slice ending at `role`: `x-cloak` is declared
    // after it, so a slice cut at the role would never see it.
    const barTag = html.slice(html.lastIndexOf('<div', barStart), html.indexOf('>', barStart));
    expect(barTag, 'the bar is not cloaked, so a no-JS reader gets six dead labels').toContain(
      'x-cloak',
    );
  });

  it('gives the overview and saving throws one half each at ultra-wide container widths', async () => {
    // Only the Overview panel still splits. It is the one panel holding two
    // independent groups - what the character is and what they can do - so the
    // split earns its place; a panel holding a single section has nothing to
    // put beside it.
    const html = await renderCard('large');
    expect(html).toContain('grid grid-cols-1 @6xl:grid-cols-2 gap-4');
    expect(html.split('grid grid-cols-1 @6xl:grid-cols-2 gap-4')).toHaveLength(2);
  });

  it('keeps the Overview panel a single column at medium, whatever it holds', async () => {
    // At medium the right-hand stack is gone: Languages and Feats moved to the
    // Skills panel and Saving Throws no longer renders at all, so there is
    // nothing that could sit beside the character at any container width. This
    // is true for the widest card medium is ever mounted in, not just the roster.
    const noProficiency = Object.fromEntries(
      Object.entries(baseCharacter.abilities).map(([key, ability]) => [
        key,
        { ...ability, saveprof: 0 },
      ])
    );
    for (const overrides of [
      {},
      { languages: [], feats: [] },
      { abilities: noProficiency, languages: [] },
      { languages: ['Common', 'Elvish'], feats: ['Alert'] },
    ]) {
      expect(
        pairingGridCount(await renderCard('medium', overrides)),
        `medium paired the Overview panel for ${JSON.stringify(overrides)}`
      ).toBe(0);
    }
    expect(pairingGridCount(await renderCard('small'))).toBe(0);
  });

  it('keeps the large Overview panel paired when there is something to pair', async () => {
    // Large still renders Saving Throws beside the character, so the split earns
    // its place there and is unchanged.
    expect(pairingGridCount(await renderCard('large', { languages: [], feats: [] }))).toBe(1);
    expect(pairingGridCount(await renderCard('large'))).toBe(1);
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
  const noProficiency = Object.fromEntries(
    Object.entries(baseCharacter.abilities).map(([key, ability]) => [
      key,
      { ...ability, saveprof: 0 },
    ])
  );

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
    // Large keeps them where they were: in the Overview panel, after Saving
    // Throws and before the Skills panel. Same document order as today.
    const html = await renderPaired();
    const saves = html.indexOf('>Saving Throws</h3>');
    const languages = html.indexOf('>Languages</h3>');
    const feats = html.indexOf('>Feats</h3>');
    const skills = html.indexOf('data-panel="skills"');
    expect(saves).toBeGreaterThan(-1);
    expect(languages).toBeGreaterThan(saves);
    expect(feats).toBeGreaterThan(languages);
    expect(skills).toBeGreaterThan(feats);
    expect(html).toContain('grid grid-cols-1 gap-2 @7xl:grid-cols-2 @7xl:gap-4');
    expect(html).toContain('<section class="@container relative group">');
    expect(html).toContain('<div class="space-y-2"><section class="relative group">');
  });

  it('gives Skills, Inventory, Weapons, Features and Powers a panel each, in tab order', async () => {
    // The card used to pair Skills beside Inventory and Features beside Powers at
    // `@6xl`. With a tab per section there is nothing beside a panel to pair
    // with, so each is full width and the pairing grids are gone: one remains,
    // for the Overview panel, which alone holds two independent groups.
    const html = await renderPaired();
    const order = ['overview', 'skills', 'inventory', 'weapons', 'features', 'powers'].map(
      (id) => html.indexOf(`data-panel="${id}"`)
    );
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(pairingGridCount(html)).toBe(1);
  });

  it('drops the pairing grid at medium, where nothing sits beside the overview', async () => {
    // The only pairing left is inside the Overview panel, and its right-hand
    // stack is Saving Throws with Languages and Feats. Medium renders none of
    // the three there any more - the saves are large-only and the two pill
    // sections ride the Skills panel - so the panel falls to a single column
    // rather than reserving half its width for nothing.
    const noRight = await renderCard('medium', {
      abilities: noProficiency,
      languages: [],
      feats: [],
    });
    expect(noRight).not.toContain('Saving Throws');
    expect(pairingGridCount(noRight)).toBe(0);
  });

  it('drops a panel entirely when the section has nothing in it', async () => {
    // The Inventory and Powers panels are absent here, and the tab bar does not
    // offer tabs for them: a tab that opens an empty sheet is worse than one
    // fewer tab.
    const html = await renderCard('large', {
      inventory: [],
      coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      powers: [],
    });
    expect(html).not.toContain('data-panel="inventory"');
    expect(html).not.toContain('data-panel="powers"');
    expect(html).not.toContain('data-tab="inventory"');
    expect(html).not.toContain('data-tab="powers"');
  });
});

describe('XmlCard Saving Throws group split', () => {
  const splitClass = '@7xl:grid-cols-2 @7xl:gap-4';

  it('splits Saving Throws from Languages and Feats at @7xl when pills are few', async () => {
    const html = await renderCard('large', { feats: ['Alert'] });
    expect(html).toContain(`grid grid-cols-1 gap-2 ${splitClass}`);
    expect(html).toContain('<section class="@container relative group">');
  });

  it('keeps the group in one column when there are too many Languages to fit', async () => {
    const html = await renderCard('large', {
      languages: ['Common', 'Draconic', 'Elvish', 'Dwarvish', 'Gnomish', 'Halfling', 'Orc'],
    });
    expect(html).toContain('Saving Throws');
    expect(html).not.toContain(splitClass);
  });

  it('keeps the group in one column when there are too many Feats to fit', async () => {
    const html = await renderCard('large', {
      feats: ['Alert', 'Sentinel', 'Lucky', 'Tough', 'Mobile'],
    });
    expect(html).not.toContain(splitClass);
  });

  it('never splits at medium, because medium renders no Saving Throws to split from', async () => {
    // The split arranges Saving Throws beside the pill stack in the Overview
    // panel. Medium puts the pills in the Skills panel and renders no saves, so
    // the arrangement has no subject there - it is large-only by construction
    // rather than by a mode check inside the split.
    for (const overrides of [
      { feats: ['Alert'] },
      { feats: ['Alert', 'Sentinel', 'Lucky', 'Tough', 'Mobile'] },
      { languages: ['Common', 'Elvish'], feats: ['Alert'] },
    ]) {
      const html = await renderCard('medium', overrides);
      expect(html, `medium built the saves split for ${JSON.stringify(overrides)}`).not.toContain(
        splitClass
      );
    }
    // The same character at large still gets it, which is what proves the split
    // is gated on the mode reaching Saving Throws rather than on the pill counts.
    expect(
      await renderCard('large', { feats: ['Alert', 'Sentinel', 'Lucky', 'Tough', 'Mobile'] })
    ).not.toContain(splitClass);
    expect(await renderCard('large', { feats: ['Alert'] })).toContain(splitClass);
  });

  it('keeps the group in one column when there are no Languages or Feats to place beside it', async () => {
    const html = await renderCard('large', { languages: [], feats: [] });
    expect(html).toContain('Saving Throws');
    expect(html).not.toContain(splitClass);
  });
});

describe('XmlCard Languages and Feats sections', () => {
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

  it('renders Languages as an h3 heading above one pill plate', async () => {
    const section = languagesSection(
      await renderCard('medium', { languages: manyLanguages })
    );
    expect(section).not.toContain('<h2');
    expect(section).toContain('>Languages</h3>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('rounded-[7px]');
    expect(section).toContain('border border-gray-300');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    for (const lang of manyLanguages) {
      expect(section).toContain(`>${lang}</span>`);
    }
  });

  it('renders Feats as an h3 heading above one pill plate', async () => {
    const section = featsSection(await renderCard('large', { feats: someFeats }));
    expect(section).not.toContain('<h2');
    expect(section).toContain('>Feats</h3>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('rounded-[7px]');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    for (const feat of someFeats) {
      expect(section).toContain(`>${feat}</span>`);
    }
  });

  it('drops the in-plate label, because the heading now carries the name', async () => {
    // The label was a 600-weight uppercase micro-label sitting side by side with
    // the pills at `@md`, so at 358px the section name was the part that wrapped
    // before the first pill did. Moving the name onto the heading takes it off
    // the plate's row and onto the gold rule, where every other section name is.
    for (const section of [
      languagesSection(await renderCard('medium', { languages: manyLanguages })),
      featsSection(await renderCard('large', { feats: someFeats })),
    ]) {
      expect(section).not.toContain('uppercase tracking-wide">Languages</div>');
      expect(section).not.toContain('uppercase tracking-wide">Feats</div>');
      expect(section).not.toContain('@md:justify-between');
      expect(section).not.toContain('@md:flex-row');
      // One pill wrapper, and nothing between it and the plate to space.
      expect(section.match(/flex flex-wrap gap-2/g)).toHaveLength(1);
      expect(section.indexOf('</h3>')).toBeLessThan(section.indexOf('flex flex-wrap gap-2'));
    }
  });

  it('puts the two sections in the Skills panel at medium, Languages then Feats', async () => {
    const html = await renderCard('medium', { languages: manyLanguages, feats: someFeats });
    const skills = panel(html, 'skills');
    expect(skills).toContain('>Languages</h3>');
    expect(skills).toContain('>Feats</h3>');
    expect(skills.indexOf('>Languages</h3>')).toBeLessThan(skills.indexOf('>Feats</h3>'));
    // And they are gone from the Overview panel, which at medium is abilities
    // and passives only: two pill plates in a panel named "Overview" are content
    // the reader scrolls past to reach the character sheet.
    const overview = panel(html, 'overview');
    expect(overview).not.toContain('>Languages</h3>');
    expect(overview).not.toContain('>Feats</h3>');
    // The Skills table leads the panel and the two sections follow it.
    expect(skills.indexOf('>Skill</th>')).toBeLessThan(skills.indexOf('>Languages</h3>'));
  });

  it('keeps both sections in the Overview panel at large, in the same order', async () => {
    const html = await renderCard('large', { languages: manyLanguages, feats: someFeats });
    const overview = panel(html, 'overview');
    expect(overview).toContain('>Languages</h3>');
    expect(overview).toContain('>Feats</h3>');
    expect(overview.indexOf('>Languages</h3>')).toBeLessThan(overview.indexOf('>Feats</h3>'));
    // The Skills panel at large is the table and the large-mode `Skills` heading,
    // with neither pill section in it.
    const skills = panel(html, 'skills');
    expect(skills).not.toContain('>Languages</h3>');
    expect(skills).not.toContain('>Feats</h3>');
  });

  it('renders the identical markup at both modes, differing only in the panel', async () => {
    // One shared component, one heading level. A second copy of the markup would
    // let the two drift, which is the failure ADR-0017 is written to prevent.
    const medium = languagesSection(
      await renderCard('medium', { languages: manyLanguages })
    );
    const large = languagesSection(await renderCard('large', { languages: manyLanguages }));
    expect(medium).not.toBe('');
    expect(medium).toBe(large);
  });

  it('renders both at medium and large and neither at small', async () => {
    for (const display of ['medium', 'large'] as const) {
      const html = await renderCard(display, { languages: manyLanguages, feats: someFeats });
      expect(html, `${display} dropped Languages`).toContain('>Languages</h3>');
      expect(html, `${display} dropped Feats`).toContain('>Feats</h3>');
    }
    const small = await renderCard('small', { languages: manyLanguages, feats: someFeats });
    expect(small).not.toContain('>Languages</h3>');
    expect(small).not.toContain('>Feats</h3>');
  });

  it('renders neither section for a character with neither, at either mode', async () => {
    for (const display of ['medium', 'large'] as const) {
      const html = await renderCard(display, { languages: [], feats: [] });
      expect(html).not.toContain('>Languages</h3>');
      expect(html).not.toContain('>Feats</h3>');
    }
  });

  it('keeps the Skills tab for a character with languages or feats and no proficiency', async () => {
    // ADR-0016's rule is that a menu entry exists only for a section with
    // content. Without this the two pill sections would ride a panel that does
    // not exist, and the tidy rule would delete the content instead of hiding an
    // empty sheet.
    const untrained = {
      allSkills: [
        { name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' },
        { name: 'Insight', total: 2, prof: 0, stat: 'wisdom' },
      ],
    };
    for (const overrides of [
      { ...untrained, feats: ['Alert'] },
      { ...untrained, languages: ['Common', 'Elvish'] },
    ]) {
      const html = await renderCard('medium', overrides);
      expect(html, `no Skills tab for ${JSON.stringify(overrides)}`).toContain('data-tab="skills"');
      const skills = panel(html, 'skills');
      expect(skills).not.toContain('>Skill</th>');
      expect(
        skills.includes('>Languages</h3>') || skills.includes('>Feats</h3>'),
        'the Skills panel has neither pill section'
      ).toBe(true);
    }
  });

  it('offers the Skills tab at medium only when there is something in the panel', async () => {
    const empty = await renderCard('medium', {
      allSkills: [{ name: 'Arcana', total: -1, prof: 0, stat: 'intelligence' }],
      languages: [],
      feats: [],
    });
    expect(empty).not.toContain('data-tab="skills"');
    expect(empty).not.toContain('data-panel="skills"');
  });

  it('uses the same heading level at both modes, since neither panel has a heading', async () => {
    const medium = languagesSection(await renderCard('medium', { languages: manyLanguages }));
    const large = languagesSection(await renderCard('large', { languages: manyLanguages }));
    for (const section of [medium, large]) {
      expect(section).toMatch(/<h3[^>]*>Languages<\/h3>/);
      expect(section).not.toMatch(/<h[245][^>]*>Languages<\/h/);
    }
  });
});

describe('XmlCard heading outline', () => {
  const everySection = {
    languages: ['Common', 'Elvish'],
    feats: ['Alert'],
    features: [{ level: 1, name: 'Second Wind', source: 'Fighter' }],
    powers: [{ level: 1, name: 'Bless', group: 'Spells', prepared: 0, preparedDomain: 0 }],
    weapons: [
      {
        name: 'Longsword',
        attackbonus: 0,
        attackstat: '',
        properties: '',
        carried: 2,
        type: 0,
        damage: [{ bonus: 0, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing' }],
      },
    ],
    inventory: [{ name: 'Rope', count: 1, weight: 10, carried: 1 }],
    coins: { pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 },
  };

  /** The heading levels in document order, which is the outline a reader gets. */
  function levels(html: string): number[] {
    return [...html.matchAll(/<h([1-6])[\s>]/g)].map((match) => Number(match[1]));
  }

  it('starts at the card name and never skips a level, in either mode', async () => {
    for (const display of ['medium', 'large'] as const) {
      const outline = levels(await renderCard(display, everySection));
      expect(outline[0], `${display} does not start at the card name`).toBe(2);
      for (let i = 1; i < outline.length; i += 1) {
        expect(
          outline[i] - outline[i - 1],
          `${display} skips a level in the outline ${outline.join(',')}`
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the card name above the two pill sections at both modes', async () => {
    // These are the only two sections whose level is fixed rather than derived
    // from the panel holding them, because neither panel has a heading at either
    // mode. The outline is still `h2` name then `h3` section at both.
    for (const display of ['medium', 'large'] as const) {
      const html = await renderCard(display, everySection);
      const outline = levels(html);
      for (const label of ['Languages', 'Feats']) {
        const at = html.indexOf(`>${label}</h3>`);
        expect(at, `${display} has no h3 ${label}`).toBeGreaterThan(-1);
        expect(html.slice(0, at)).toContain('<h2 class="char-name"');
        expect(outline[outline.length - 1], `${display} put ${label} above h2`).toBeGreaterThan(1);
      }
    }
  });

  it('leaves no heading inside a medium tab panel repeating that tab name', async () => {
    // At medium the visible tab names the open panel, so a heading repeating
    // that word inside it is the same name twice. The two pill sections are the
    // one pair that head themselves at medium, and neither is the tab's word.
    const html = await renderCard('medium', everySection);
    for (const [id, label] of [
      ['overview', 'Overview'],
      ['skills', 'Skills'],
      ['inventory', 'Inventory'],
      ['weapons', 'Weapons'],
      ['features', 'Features'],
      ['powers', 'Powers'],
    ]) {
      const markup = panel(html, id);
      expect(markup, `${id} panel is missing from the markup`).not.toBe('');
      expect(markup, `${id} panel repeats its own tab name`).not.toContain(`>${label}</h`);
    }
    expect(panel(html, 'skills')).toContain('>Languages</h3>');
    expect(panel(html, 'skills')).toContain('>Feats</h3>');
  });
});

describe('XmlCard Features pills card', () => {
  const sampleFeatures = [
    { level: 1, name: 'Second Wind', source: 'Fighter' },
    { level: 2, name: 'Action Surge', source: 'Fighter' },
  ];
  const pillClass =
    'px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300';
  const forbidden = [
    'role="button"',
    'tabindex',
    'aria-expanded',
    'aria-controls',
    '@click',
    '@keydown',
    'x-show',
    'x-transition',
    'cursor-pointer',
    'focus-visible',
  ];

  function featureCard(section: string): string {
    return section.slice(section.indexOf('rounded-[7px]'));
  }

  function featurePill(section: string, name: string): string {
    const marker = section.indexOf(`>${name}</span>`);
    expect(marker).toBeGreaterThan(-1);
    const start = section.lastIndexOf('<span', marker);
    return section.slice(start, marker + `>${name}</span>`.length);
  }

  it('wraps the Features content in one accent card under a heading at large', async () => {
    // At large the panel names itself: the bar is a row of identical-looking links
    // with no selection state, so a section that is only pills and no heading gives
    // the reader no way to tell where they have landed on a page-long scroll.
    const section = featuresSection(await renderCard('large', { features: sampleFeatures }));
    expect(section).toContain('>Features</h3>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('border border-gray-300');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    // The heading leads and the card follows it, rather than the card being the
    // panel's first element because there was no heading.
    expect(section.indexOf('>Features</h3>')).toBeGreaterThan(section.indexOf('data-panel="features"'));
    expect(section.indexOf('rounded-[7px]')).toBeGreaterThan(section.indexOf('>Features</h3>'));
  });

  it('leaves the Features heading to the tab at medium', async () => {
    const section = featuresSection(await renderCard('medium', { features: sampleFeatures }));
    expect(section).not.toContain('>Features</h3>');
    // No panel heading means the level groups step straight down from the card
    // name instead of nesting under one.
    expect(section).toContain('>Level 1</h3>');
  });

  it('renders every feature as a Languages/Feats-style pill inside the card', async () => {
    const section = featuresSection(await renderCard('large', { features: sampleFeatures }));
    const card = featureCard(section);
    // `Level N` is an h4 at large: the Features heading owns it, and two h3s in a
    // row here would claim Features and its first level group are siblings.
    expect(card).toContain('>Level 1</h4>');
    expect(card).toContain('>Level 2</h4>');
    for (const feature of sampleFeatures) {
      const pill = featurePill(card, feature.name);
      expect(pill).toContain(`class="${pillClass}"`);
      expect(pill).toContain(`title="Source: ${feature.source}"`);
    }
  });

  it('shows a Source tooltip only when the parsed source is non-empty', async () => {
    const section = featuresSection(
      await renderCard('large', {
        features: [
          { level: 1, name: 'Second Wind', source: 'Fighter' },
          { level: 1, name: 'Unattributed', source: '' },
        ],
      })
    );
    const withSource = featurePill(section, 'Second Wind');
    expect(withSource).toContain('title="Source: Fighter"');
    const withoutSource = featurePill(section, 'Unattributed');
    expect(withoutSource).toContain(`class="${pillClass}"`);
    expect(withoutSource).not.toContain('title=');
    expect(section).not.toContain('title="Source: "');
  });

  it('orders pills by level then name under the Level headings', async () => {
    const section = featuresSection(
      await renderCard('large', {
        features: [
          { level: 2, name: 'Bravo', source: 'X' },
          { level: 1, name: 'Zulu', source: 'X' },
          { level: 2, name: 'Alpha', source: 'X' },
          { level: 1, name: 'Alpha', source: 'X' },
        ],
      })
    );
    const order = [...section.matchAll(/>([^<>]+)<\/span>/g)].map(([, name]) => name);
    expect(order).toEqual(['Alpha', 'Zulu', 'Alpha', 'Bravo']);
  });

  it('leaves no disclosure or interactive binding in the Features card', async () => {
    const card = featureCard(
      featuresSection(await renderCard('large', { features: sampleFeatures }))
    );
    for (const marker of forbidden) {
      expect(card).not.toContain(marker);
    }
  });

  it('renders in medium mode too, since every section is a tab there', async () => {
    expect(await renderCard('small', { features: sampleFeatures })).not.toContain('Features');
    expect(featuresSection(await renderCard('medium', { features: sampleFeatures }))).toContain(
      '>Second Wind</span>'
    );
  });
});

describe('XmlCard Powers pills card', () => {
  const pillClass =
    'px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300';
  const forbidden = [
    'role="button"',
    'tabindex',
    'aria-expanded',
    'aria-controls',
    '@click',
    '@keydown',
    'x-show',
    'x-transition',
    'cursor-pointer',
    'focus-visible',
  ];

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
  const ungrouped = {
    level: 1,
    name: 'Unattributed',
    group: '',
    prepared: 0,
    preparedDomain: 0,
  };

  function powersCard(section: string): string {
    return section.slice(section.indexOf('rounded-[7px]'));
  }

  it('wraps the Powers content in one accent card under a heading at large', async () => {
    // At large the panel names itself, for the same reason Features does.
    const section = powersSection(
      await renderCard('large', { powers: [preparedSpell, nonSpell] })
    );
    expect(section).toContain('>Powers</h3>');
    expect(section).toContain('border-t-[3px]');
    expect(section).toContain('border-t-[#58180d]');
    expect(section).toContain('border border-gray-300');
    expect(section.match(/rounded-\[7px\]/g)).toHaveLength(1);
    expect(section.indexOf('rounded-[7px]')).toBeGreaterThan(section.indexOf('>Powers</h3>'));
    const card = powersCard(section);
    // Powers nests one level deeper than Features: a `Level N`, then the group
    // name inside it. Both step down from the new Powers heading.
    expect(card).toContain('>Level 3</h4>');
    expect(card).toContain('>Spells</h5>');
    expect(card).toContain('>Bless<');
    expect(card).toContain('flex flex-wrap gap-2');
  });

  it('leaves the Powers heading to the tab at medium', async () => {
    const section = powersSection(
      await renderCard('medium', { powers: [preparedSpell, nonSpell] })
    );
    expect(section).not.toContain('>Powers</h3>');
    const card = powersCard(section);
    expect(card).toContain('>Level 3</h3>');
    expect(card).toContain('>Spells</h4>');
  });

  it('renders every power as a Languages/Feats-style pill with no disclosure', async () => {
    const card = powersCard(
      powersSection(await renderCard('large', { powers: [preparedSpell, nonSpell] }))
    );
    const bless = powerPill(card, 'Bless');
    expect(bless).toContain(`class="${pillClass}`);
    expect(bless).toContain('title="Group: Spells"');
    const rage = powerPill(card, 'Rage');
    expect(rage).toContain(`class="${pillClass}`);
    expect(rage).toContain('title="Group: Barbarian Actions/Effects"');
    for (const marker of forbidden) {
      expect(card).not.toContain(marker);
    }
  });

  it('shows a Group tooltip only when the parsed group is non-empty', async () => {
    const section = powersSection(
      await renderCard('large', { powers: [ungrouped, preparedSpell] })
    );
    const ungroupedPill = powerPill(section, 'Unattributed');
    expect(ungroupedPill).not.toContain('title="Group:');
    expect(section).not.toContain('title="Group: "');
    expect(powerPill(section, 'Bless')).toContain('title="Group: Spells"');
  });

  it('renders an empty-group power under the Other fallback heading', async () => {
    // `Other` is a group name inside a `Level N`, so it follows both down a step
    // from the Powers heading at large.
    const section = powersSection(await renderCard('large', { powers: [ungrouped] }));
    expect(section).toContain('>Other</h5>');
  });

  it('orders pills by level then group then name under the headings', async () => {
    const section = powersSection(
      await renderCard('large', {
        powers: [
          { level: 2, name: 'Bravo', group: 'Beta', prepared: 0, preparedDomain: 0 },
          { level: 2, name: 'Alpha', group: 'Alpha', prepared: 0, preparedDomain: 0 },
          { level: 2, name: 'Zulu', group: 'Alpha', prepared: 0, preparedDomain: 0 },
          { level: 1, name: 'Yankee', group: 'Alpha', prepared: 0, preparedDomain: 0 },
        ],
      })
    );
    expect(powerPillNames(section)).toEqual(['Yankee', 'Alpha', 'Zulu', 'Bravo']);
  });

  it('leaves no expand/collapse affordance inside the Powers card', async () => {
    // The card itself carries Alpine state now - the tab bar is one component -
    // so this asserts on the Powers panel's own contents rather than the whole
    // card. What it is protecting is that a power pill stays a pill: no
    // disclosure, no nested expansion, nothing to open inside the section.
    const html = await renderCard('large', { powers: [preparedSpell, nonSpell] });
    const card = powersCard(powersSection(html));
    for (const marker of forbidden) {
      expect(card).not.toContain(marker);
    }
    for (const stale of ['expandedSections', 'toggleSection', 'isExpanded']) {
      expect(html).not.toContain(stale);
    }
  });

  it('marks a prepared spell with a filled gold dot and a Prepared text alternative', async () => {
    const section = powersSection(await renderCard('large', { powers: [preparedOnlySpell] }));
    const pill = powerPill(section, 'Aid');
    expect(pill).toContain('bg-[#c68000]');
    expect(pill).toContain('<span class="sr-only">Prepared</span>');
    expect(pill).not.toContain('Always prepared');
  });

  it('marks an always-prepared spell with a hollow accent-ring dot and a class text alternative', async () => {
    const section = powersSection(
      await renderCard('large', {
        powers: [{ ...domainSpell, prepared: 0, preparedDomain: 1 }],
      })
    );
    const pill = powerPill(section, 'Cure Wounds');
    expect(pill).toContain('border border-[#c68000]');
    expect(pill).toContain('<span class="sr-only">Always prepared (class/subclass)</span>');
    expect(pill).not.toContain('bg-[#c68000]');
    expect(pill).not.toContain('<span class="sr-only">Prepared</span>');
  });

  it('shows only the always-prepared dot when a spell has both flags', async () => {
    const section = powersSection(await renderCard('large', { powers: [domainSpell] }));
    const pill = powerPill(section, 'Cure Wounds');
    expect(pill).toContain('<span class="sr-only">Always prepared (class/subclass)</span>');
    expect(pill).not.toContain('<span class="sr-only">Prepared</span>');
    expect(pill).not.toContain('bg-[#c68000]');
  });

  it('shows no mark on non-spell powers even when prepared is non-zero', async () => {
    const section = powersSection(
      await renderCard('large', { powers: [nonSpell, unpreparedSpell] })
    );
    const rage = powerPill(section, 'Rage');
    expect(rage).not.toContain('bg-[#c68000]');
    expect(rage).not.toContain('border border-[#c68000]');
    expect(rage).not.toContain('title="Prepared"');
    expect(rage).not.toContain('title="Always prepared');
    const guiding = powerPill(section, 'Guiding Bolt');
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
    expect(legend).toContain('aria-hidden="true"');
    expect(legend).toContain('aria-hidden="true"');

    const noMarks = powersSection(
      await renderCard('large', { powers: [unpreparedSpell, nonSpell] })
    );
    expect(noMarks).not.toContain('title="Prepared"');
    expect(noMarks).not.toContain('Always prepared (class/subclass)');
  });

  it('renders in medium mode too, since every section is a tab there', async () => {
    expect(await renderCard('small', { powers: [preparedSpell] })).not.toContain('Powers');
    expect(powersSection(await renderCard('medium', { powers: [preparedSpell] }))).toContain(
      '>Bless<'
    );
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

describe('XmlCard Spellcasting section', () => {
  // A Wizard 5: Intelligence 18 (+4), proficiency +3. Every figure below is a
  // printed formula over those two parsed values, worked out here rather than
  // recomputed by the test, because the whole point of the section is that the
  // sheet stores neither figure.
  const casterAbilities = {
    ...baseCharacter.abilities,
    intelligence: { score: 18, bonus: 4, save: 2, saveprof: 0 },
    wisdom: { score: 12, bonus: 1, save: 1, saveprof: 0 },
    charisma: { score: 8, bonus: -1, save: -1, saveprof: 0 },
  };
  const caster: Partial<CharacterData> = {
    classes: [{ name: 'Wizard', level: 5 }],
    abilities: casterAbilities,
    profBonus: 3,
    powers: [
      { level: 1, name: 'Fire Bolt', group: 'Spells', prepared: 1, preparedDomain: 0 },
    ],
    spellSlots: [
      { level: 1, max: 4, used: 2 },
      { level: 2, max: 3, used: 2 },
      { level: 3, max: 2, used: 0 },
      { level: 4, max: 0, used: 0 },
      { level: 5, max: 0, used: 0 },
      { level: 6, max: 0, used: 0 },
      { level: 7, max: 0, used: 0 },
      { level: 8, max: 0, used: 0 },
      { level: 9, max: 0, used: 0 },
    ],
  };

  function spellcastingSection(html: string): string {
    return panel(html, 'spellcasting');
  }

  function tabIds(html: string): string[] {
    return [...html.matchAll(/data-tab="([a-z]+)"/g)].map(([, id]) => id);
  }

  /**
   * The label and figure of every plate in the panel, in render order.
   *
   * What a reader of the card gets from a plate is its uppercase label above a
   * bold figure, so that is what this returns. Sliced by the plate's own data
   * hook rather than by its class list, so a restyle of the plate does not turn
   * every assertion here into a rewrite - the Weapons column test makes the same
   * argument about pinning a class string.
   */
  function plates(section: string): Array<{ label: string; figure: string }> {
    return [...section.matchAll(/data-plate="[a-z-]+"[\s\S]*?<div[^>]*uppercase[^>]*>([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/g)].map(
      ([, label, figure]) => ({ label: label.trim(), figure: figure.trim() })
    ).filter((plate) => plate.label !== '');
  }

  /** The slot plates only, keyed by the level they label. */
  function slotPlates(section: string): Array<[level: string, figure: string]> {
    return [...section.matchAll(/data-slot="(\d)"[\s\S]*?<div[^>]*uppercase[^>]*>([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/g)].map(
      ([, level, label, figure]) => [level, `${label.trim()} ${figure.trim()}`]
    );
  }

  it('offers a Spellcasting entry and panel for a caster at medium and large', async () => {
    for (const display of ['medium', 'large'] as const) {
      const html = await renderCard(display, caster);
      expect(tabIds(html), `${display} tab`).toContain('spellcasting');
      const section = spellcastingSection(html);
      expect(section, `${display} panel`).toContain('data-panel="spellcasting"');
      expect(section).toContain('>INT +4<');
    }
  });

  it('gives the large card a jump link to the section, as a fragment identifier', async () => {
    // The large sheet's whole navigation is `href="#..."` and needs no JavaScript,
    // so the anchor has to be in the server-rendered HTML with the id it targets.
    const html = await renderCard('large', { ...caster, filename: 'caster' });
    expect(html).toContain('href="#xmlcard-caster-spellcasting"');
    expect(html).toContain('id="xmlcard-caster-spellcasting"');
  });

  it('renders in the markup for a reader without JavaScript', async () => {
    // The panels are deliberately not `x-cloak`ed, because `[x-cloak]` is
    // `display: none !important` and a cloaked panel would delete the card for
    // anyone the script never runs on.
    const html = await renderCard('medium', caster);
    expect(html).toContain('data-no-cloak="no-js-reader-loses-the-card"');
    expect(html).not.toMatch(/data-panel="spellcasting"[^>]*x-cloak/);
  });

  it('leaves the entry out for a martial character with no spell powers', async () => {
    // ADR-0016's rule: a menu entry exists only for a section with something in
    // it. A Fighter who casts nothing has nothing to open.
    const martial: Partial<CharacterData> = {
      classes: [{ name: 'Fighter', level: 3, subclass: 'Champion' }],
      powers: [{ level: 1, name: 'Rage', group: 'Fighter Actions', prepared: 0, preparedDomain: 0 }],
    };
    for (const display of ['medium', 'large'] as const) {
      const html = await renderCard(display, martial);
      expect(tabIds(html), `${display} tab`).not.toContain('spellcasting');
      expect(spellcastingSection(html)).toBe('');
    }
  });

  it('keeps the entry for a half-caster whose only casting class is a subclass', async () => {
    // An Eldritch Knight whose sheet lists no spell entries at all still casts.
    // The gate has to be satisfied by the subclass alone, or these spells become
    // the one thing the card cannot account for.
    const halfCaster: Partial<CharacterData> = {
      classes: [{ name: 'Fighter', level: 3, subclass: 'Eldritch Knight' }],
      powers: [{ level: 1, name: 'Second Wind', group: 'Fighter Actions', prepared: 0, preparedDomain: 0 }],
    };
    const section = spellcastingSection(await renderCard('medium', halfCaster));
    expect(section).toContain('data-panel="spellcasting"');
    expect(section).toContain('>INT +0<');
  });

  it('keeps the entry for a character whose only casting evidence is one spell power', async () => {
    const cantripCaster: Partial<CharacterData> = {
      classes: [{ name: 'Fighter', level: 3, subclass: 'Champion' }],
      powers: [{ level: 3, name: 'Shillelagh', group: 'Spells', prepared: 1, preparedDomain: 0 }],
    };
    expect(tabIds(await renderCard('medium', cantripCaster))).toContain('spellcasting');
  });

  it('shows the three figures in one row of plates, laid out like the Vitals row', async () => {
    const section = spellcastingSection(await renderCard('large', caster));
    const row = plates(section).filter((p) => !/Level \d/.test(p.label));
    expect(row.map((p) => p.label)).toEqual(['Casting Ability', 'Save DC', 'Attack Bonus']);
    // Same plate treatment as Vitals: three across, one label above one figure.
    expect(section).toContain('grid grid-cols-3 gap-2 text-center');
    expect(section.match(/rounded-\[7px\]/g)?.length).toBe(6);
  });

  it.each([
    [
      'a Wizard',
      { classes: [{ name: 'Wizard', level: 5 }], abilities: casterAbilities, profBonus: 3 },
      'INT +4',
      '15',
      '+7',
    ],
    [
      'a Cleric with Wisdom 16 and proficiency 3',
      {
        classes: [{ name: 'Cleric', level: 5 }],
        abilities: {
          ...casterAbilities,
          intelligence: { score: 12, bonus: 1, save: 1, saveprof: 0 },
          wisdom: { score: 16, bonus: 3, save: 5, saveprof: 1 },
        },
        profBonus: 3,
      },
      'WIS +3',
      '14',
      '+6',
    ],
    [
      'a Paladin with Charisma 18 and proficiency 2',
      {
        classes: [{ name: 'Paladin', level: 5 }],
        abilities: {
          ...casterAbilities,
          charisma: { score: 18, bonus: 4, save: 6, saveprof: 1 },
        },
        profBonus: 2,
      },
      'CHA +4',
      '14',
      '+6',
    ],
  ])('matches the printed formulae for %s', async (_name, overrides, ability, dc, attack) => {
    const section = spellcastingSection(await renderCard('large', { ...caster, ...overrides }));
    expect(plates(section).map((p) => p.figure).slice(0, 3)).toEqual([ability, dc, attack]);
  });

  it('takes the casting ability from the higher-level class in a multiclass character', async () => {
    // Fighter 12 / Wizard 2: the Wizard is the lower-level class and the one that
    // casts, so the card shows Intelligence rather than the Fighter's Strength.
    const section = spellcastingSection(
      await renderCard('large', {
        ...caster,
        classes: [
          { name: 'Fighter', level: 12 },
          { name: 'Wizard', level: 2 },
        ],
      })
    );
    expect(section).toContain('>INT +4<');
  });

  it('marks an unresolvable casting ability as inferred rather than as recorded', async () => {
    // The sheet names no casting class, so the card picked the best of the three.
    // Saying so is the difference between a number the reader can check and a
    // number they have to trust. The spell power is what opens the entry: the
    // character casts something the sheet recorded as a spell, but no class or
    // subclass of theirs says which ability it came from.
    const martial: Partial<CharacterData> = {
      classes: [{ name: 'Fighter', level: 3, subclass: 'Champion' }],
      powers: [{ level: 3, name: 'Shillelagh', group: 'Cantrips', prepared: 1, preparedDomain: 0 }],
      abilities: {
        ...casterAbilities,
        intelligence: { score: 10, bonus: 0, save: 0, saveprof: 0 },
        wisdom: { score: 14, bonus: 2, save: 2, saveprof: 0 },
      },
    };
    const section = spellcastingSection(await renderCard('large', martial));
    expect(section).toContain('>WIS +2<');
    expect(section).toContain('Inferred');
    expect(section).toContain('best of Wisdom, Intelligence and Charisma');
  });

  it('does not mark a resolved casting ability as inferred', async () => {
    const section = spellcastingSection(await renderCard('large', caster));
    expect(section).not.toContain('Inferred');
  });

  it('renders one slot plate per level with slots, labelled by level and used out of total', async () => {
    const section = spellcastingSection(await renderCard('large', caster));
    expect(slotPlates(section)).toEqual([
      ['1', 'Level 1 2/4'],
      ['2', 'Level 2 2/3'],
      ['3', 'Level 3 0/2'],
    ]);
  });

  it('leaves out a level with no slots rather than showing it as zeroes', async () => {
    const section = spellcastingSection(await renderCard('large', caster));
    expect(section).not.toContain('Level 4');
    expect(section).not.toContain('0/0');
  });

  it('renders no slot plates at all for a character with no slots', async () => {
    // An empty plate grid is the first thing a panel shows, and it says nothing
    // except that the sheet has nine nodes.
    const section = spellcastingSection(
      await renderCard('large', {
        ...caster,
        spellSlots: caster.spellSlots?.map((slot) => ({ ...slot, max: 0, used: 0 })),
      })
    );
    expect(slotPlates(section)).toEqual([]);
    expect(section).toContain('>Casting Ability<');
  });

  it('names the section once at large and not at all at medium', async () => {
    // The same heading rule every other section follows: at medium the visible tab
    // names the open panel, so a heading repeats a word the reader is already
    // looking at.
    const large = spellcastingSection(await renderCard('large', caster));
    expect(large).toContain('>Spellcasting</h3>');
    expect(large.match(/<h3/g)).toHaveLength(1);
    const medium = spellcastingSection(await renderCard('medium', caster));
    expect(medium).not.toContain('<h3');
    expect(medium).toContain('data-panel="spellcasting"');
  });

  it('places the panel directly after Skills, where a printed sheet puts it', async () => {
    // The index is ordered as a printed sheet reads: what the character is made
    // of, then what it can do. Spellcasting is an ability-derived summary, so it
    // belongs with Skills rather than down among the carried things.
    const html = await renderCard('large', {
      ...caster,
      filename: 'caster',
      inventory: [{ name: 'Rope', count: 1, weight: 10, carried: 1 }],
      weapons: [
        {
          name: 'Quarterstaff',
          attackbonus: 0,
          attackstat: '',
          properties: 'Versatile',
          carried: 2,
          type: 0,
          damage: [{ bonus: 0, dice: 'd6', stat: 'base', statmult: 1, type: 'bludgeoning' }],
        },
      ],
      features: [{ level: 1, name: 'Arcane Recovery', source: 'Wizard' }],
    });
    expect(tabIds(html)).toEqual([
      'overview',
      'skills',
      'spellcasting',
      'inventory',
      'weapons',
      'features',
      'powers',
    ]);
    expect(html.indexOf('data-panel="spellcasting"')).toBeGreaterThan(
      html.indexOf('data-panel="skills"')
    );
    expect(html.indexOf('data-panel="spellcasting"')).toBeLessThan(
      html.indexOf('data-panel="inventory"')
    );
  });
});

