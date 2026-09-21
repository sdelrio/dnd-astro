import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCharacterXML } from './parse-character-xml';

describe('parseCharacterXML', () => {
  it('parses draknor.xml correctly', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result).not.toBeNull();
    // Add minimal essential field checks (expand assert coverage in later cycles)
    expect(result?.name).toBeDefined();
    expect(result?.classes.length).toBeGreaterThan(0);
  });

  it('captures save proficiency flags for proficient-only saving throws', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.abilities?.strength?.saveprof).toBe(1);
    expect(result?.abilities?.constitution?.saveprof).toBe(1);
    expect(result?.abilities?.dexterity?.saveprof).toBe(0);
  });

  it('parses direct-child powers from id-keyed collections', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.powers.length).toBeGreaterThan(0);
    const secondWind = result?.powers.find((p) => p.name === 'Second Wind');
    expect(secondWind).toBeDefined();
    expect(secondWind?.group).toContain('Fighter');
  });

  it('exposes flat vitals and skill totals per SPEC-003', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.ac).toBeGreaterThan(0);
    expect(result?.hp).toBeGreaterThan(0);
    for (const skill of result?.skills ?? []) {
      expect(skill.total).toBeDefined();
    }
  });

  it('computes passive Perception, Investigation, and Insight from skill totals', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.passives).toEqual({ perception: 13, investigation: 9, insight: 10 });
  });

  it('counts a non-proficient skill toward its passive', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    // draknor Investigation has prof 0 and total -1, so its passive is 9, not the 10 default.
    expect(result?.passives.investigation).toBe(9);
  });

  it('keeps the prof-only skills output unchanged', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    const names = result?.skills.map((s) => s.name) ?? [];
    // Perception (prof 1) stays; Investigation and Insight (both prof 0) do not.
    expect(names).toContain('Perception');
    expect(names).not.toContain('Investigation');
    expect(names).not.toContain('Insight');
  });

  it('exposes every skilllist entry as allSkills in XML order', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    const all = result?.allSkills ?? [];
    expect(all.map((s) => s.name)).toEqual([
      'Perception',
      'Athletics',
      'Arcana',
      'Persuasion',
      'Nature',
      'Medicine',
      'Survival',
      'Performance',
      'Acrobatics',
      'Religion',
      'Sleight of Hand',
      'Insight',
      'Intimidation',
      'Deception',
      'Investigation',
      'Stealth',
      'History',
      'Animal Handling',
      "Tools: Carpenter's Tools",
    ]);
  });

  it('keeps each allSkills entry total, prof, and stat', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.allSkills[0]).toEqual({
      name: 'Perception',
      total: 3,
      prof: 1,
      stat: 'wisdom',
    });
    expect(result?.allSkills[2]).toEqual({
      name: 'Arcana',
      total: -1,
      prof: 0,
      stat: 'intelligence',
    });
    expect(result?.allSkills[14]).toEqual({
      name: 'Investigation',
      total: -1,
      prof: 0,
      stat: 'intelligence',
    });
    expect(result?.allSkills[18]).toEqual({
      name: "Tools: Carpenter's Tools",
      total: 8,
      prof: 1,
      stat: 'strength',
    });
  });

  it('preserves expertise entries on ethir.xml (prof 2)', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/ethir.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.allSkills).toHaveLength(20);
    expect(result?.allSkills[10]).toEqual({
      name: 'Sleight of Hand',
      total: 7,
      prof: 2,
      stat: 'dexterity',
    });
    expect(result?.allSkills[18]).toEqual({
      name: 'Thieves Tools (locks)',
      total: 7,
      prof: 2,
      stat: 'dexterity',
    });
  });

  it('includes custom skills with their governing stat', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/ethir.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    const traps = result?.allSkills.find((s) => s.name === 'Thieves Tools (Traps)');
    expect(traps).toEqual({
      name: 'Thieves Tools (Traps)',
      total: 6,
      prof: 2,
      stat: 'intelligence',
    });
  });

  it('degrades gracefully when skill entry fields are missing', () => {
    const xml = `
      <root>
        <character>
          <skilllist>
            <id-00001>
              <name type="string">Perception</name>
              <total type="number">4</total>
              <prof type="number">1</prof>
            </id-00001>
            <id-00002>
              <name type="string">Odd Skill</name>
            </id-00002>
          </skilllist>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.allSkills).toEqual([
      { name: 'Perception', total: 4, prof: 1, stat: '' },
      { name: 'Odd Skill', total: 0, prof: 0, stat: '' },
    ]);
  });

  it('defaults a missing skill entry to passive 10', () => {
    const xml = `
      <root>
        <character>
          <skilllist>
            <id-00001>
              <name type="string">Perception</name>
              <prof type="number">1</prof>
              <total type="number">4</total>
            </id-00001>
            <id-00002>
              <name type="string">Investigation</name>
              <prof type="number">0</prof>
              <total type="number">1</total>
            </id-00002>
          </skilllist>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.passives).toEqual({ perception: 14, investigation: 11, insight: 10 });
  });

  it('matches passive skill names case-insensitively', () => {
    const xml = `
      <root>
        <character>
          <skilllist>
            <id-00001>
              <name type="string">PERCEPTION</name>
              <prof type="number">0</prof>
              <total type="number">4</total>
            </id-00001>
            <id-00002>
              <name type="string">insight</name>
              <prof type="number">0</prof>
              <total type="number">2</total>
            </id-00002>
          </skilllist>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.passives).toEqual({ perception: 14, investigation: 10, insight: 12 });
  });

  it('parses elarion.xml correctly & yields multiclass info', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/elarion.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result).not.toBeNull();
    expect(result?.classes.length).toBe(1); // only 1 class present in input
    expect(result?.classes[0].name.toLowerCase()).toContain('warlock');
  });

  it('keeps the class-node specialization as primary subclass source', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/darlo.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.classes[0].subclass).toBe('Oath of Vengeance');
  });

  it('derives the subclass from feature <specialization> entries when the class node lacks one', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/antonidas.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.classes[0].name).toBe('Wizard');
    expect(result?.classes[0].subclass).toBe('School of Transmutation');
  });

  it('derives the subclass from a level-1 subclass-named feature entry', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/ethir.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.classes[0].name).toBe('Rogue');
    expect(result?.classes[0].subclass).toBe('Arcane Trickster');
  });

  it('omits the subclass for characters below their subclass level', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/sarnoth.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.classes[0].name).toBe('Barbarian');
    expect(result?.classes[0].subclass).toBeUndefined();
  });

  it('returns null if no <character> node', () => {
    const xml = `<root><foo>bar</foo></root>`;
    const result = parseCharacterXML(xml);
    expect(result).toBeNull();
  });
});
