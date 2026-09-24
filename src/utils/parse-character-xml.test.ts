import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCharacterXML, tryParseCharacterXml } from './parse-character-xml';

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

  it('exposes prepared and preparedDomain on powers from a real sheet', () => {
    const lothirielXml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/lothiriel.xml'), 'utf8');
    const lothiriel = parseCharacterXML(lothirielXml);
    const preparedSpell = lothiriel?.powers.find((p) => p.name === 'Lightning Bolt');
    expect(preparedSpell).toEqual({
      level: 3,
      name: 'Lightning Bolt',
      group: 'Spells',
      prepared: 1,
      preparedDomain: 0,
    });
    const alwaysPrepared = lothiriel?.powers.find((p) => p.name === "Melf's Slumber Arrows");
    expect(alwaysPrepared).toEqual({
      level: 3,
      name: "Melf's Slumber Arrows",
      group: 'Spells',
      prepared: 0,
      preparedDomain: 1,
    });

    const tarrulonXml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/tarrulon.xml'), 'utf8');
    const tarrulon = parseCharacterXML(tarrulonXml);
    const rage = tarrulon?.powers.find((p) => p.name === 'Rage');
    expect(rage).toEqual({
      level: 0,
      name: 'Rage',
      group: 'Features',
      prepared: 4,
      preparedDomain: 0,
    });
  });

  it('defaults missing power prepared fields to zero', () => {
    const xml = `
      <root>
        <character>
          <powers>
            <id-00001>
              <group type="string">Spells</group>
              <level type="number">1</level>
              <name type="string">Mystic Arcana</name>
            </id-00001>
          </powers>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.powers).toEqual([
      { level: 1, name: 'Mystic Arcana', group: 'Spells', prepared: 0, preparedDomain: 0 },
    ]);
  });

  it('parses weapons from the id-keyed weaponlist collection', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.weapons.length).toBeGreaterThan(0);
    const battleaxe = result?.weapons.find((w) => w.name === 'Battleaxe, +1');
    expect(battleaxe).toEqual({
      name: 'Battleaxe, +1',
      attackbonus: 1,
      attackstat: '',
      properties: 'Versatile (1d10), magic, crit range 18',
      carried: 2,
      type: 0,
      damage: [
        { bonus: 1, dice: 'd8', stat: 'base', statmult: 1, type: 'slashing,magic,brutal' },
      ],
    });
  });

  it('handles multi-part weapon damage and missing weapon fields with defaults', () => {
    const xml = `
      <root>
        <character>
          <weaponlist>
            <id-00001>
              <attackbonus type="number">2</attackbonus>
              <attackstat type="string">strength</attackstat>
              <carried type="number">2</carried>
              <damagelist>
                <id-00001>
                  <bonus type="number">3</bonus>
                  <dice type="dice">2d6</dice>
                  <stat type="string">strength</stat>
                  <statmult type="number">2</statmult>
                  <type type="string">slashing</type>
                </id-00001>
                <id-00002>
                  <bonus type="number">1</bonus>
                  <dice type="dice">d6</dice>
                  <stat type="string">base</stat>
                  <type type="string">fire</type>
                </id-00002>
              </damagelist>
              <name type="string">Flametongue</name>
              <type type="number">1</type>
            </id-00001>
            <id-00002>
              <damagelist>
                <id-00001>
                  <stat type="string">base</stat>
                  <type type="string">piercing</type>
                </id-00001>
              </damagelist>
              <name type="string">Improvised Rock</name>
            </id-00002>
          </weaponlist>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.weapons).toEqual([
      {
        name: 'Flametongue',
        attackbonus: 2,
        attackstat: 'strength',
        properties: '',
        carried: 2,
        type: 1,
        damage: [
          { bonus: 3, dice: '2d6', stat: 'strength', statmult: 2, type: 'slashing' },
          { bonus: 1, dice: 'd6', stat: 'base', statmult: 1, type: 'fire' },
        ],
      },
      {
        name: 'Improvised Rock',
        attackbonus: 0,
        attackstat: '',
        properties: '',
        carried: 0,
        type: 0,
        damage: [{ bonus: 0, dice: '', stat: 'base', statmult: 1, type: 'piercing' }],
      },
    ]);
  });

  it('yields an empty weapons array when weaponlist is missing or empty', () => {
    const withoutWeaponlist = parseCharacterXML(`
      <root>
        <character>
          <name type="string">Unarmed</name>
        </character>
      </root>
    `);
    const emptyWeaponlist = parseCharacterXML(`
      <root>
        <character>
          <name type="string">Unarmed</name>
          <weaponlist />
        </character>
      </root>
    `);
    expect(withoutWeaponlist?.weapons).toEqual([]);
    expect(emptyWeaponlist?.weapons).toEqual([]);
  });

  it('parses inventory items from the id-keyed inventorylist collection', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.inventory).toHaveLength(22);
    expect(result?.inventory[0]).toEqual({
      name: 'Plate Armor, +1',
      count: 1,
      weight: 65,
      carried: 2,
    });
    expect(result?.inventory[4]).toEqual({
      name: "Clothes, Traveler's",
      count: 1,
      weight: 4,
      carried: 0,
    });
  });

  it('defaults missing inventory fields to zero and yields an empty array without inventorylist', () => {
    const xml = `
      <root>
        <character>
          <name type="string">Pack Rat</name>
          <inventorylist>
            <id-00001>
              <name type="string">Rope</name>
              <count type="number">2</count>
              <weight type="number">10</weight>
              <carried type="number">1</carried>
            </id-00001>
            <id-00002>
              <name type="string">Torch</name>
            </id-00002>
            <id-00003 />
          </inventorylist>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.inventory).toEqual([
      { name: 'Rope', count: 2, weight: 10, carried: 1 },
      { name: 'Torch', count: 0, weight: 0, carried: 0 },
      { name: '', count: 0, weight: 0, carried: 0 },
    ]);
    const withoutInventorylist = parseCharacterXML(`
      <root><character><name type="string">Empty</name></character></root>
    `);
    const emptyInventorylist = parseCharacterXML(`
      <root><character><name type="string">Empty</name><inventorylist /></character></root>
    `);
    expect(withoutInventorylist?.inventory).toEqual([]);
    expect(emptyInventorylist?.inventory).toEqual([]);
  });

  it('parses coins from the slot-keyed shape', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/flint.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.coins).toEqual({ pp: 0, gp: 40, ep: 0, sp: 0, cp: 0 });
  });

  it('parses coins from the id-keyed shape', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.coins).toEqual({ pp: 0, gp: 378, ep: 0, sp: 583, cp: 0 });
  });

  it('ignores coin names that are not a denomination', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/karas.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    // slot6 holds 7 RATIONS, which is not a coin denomination and is dropped.
    expect(result?.coins).toEqual({ pp: 4, gp: 468, ep: 22, sp: 22, cp: 52 });
  });

  it('sums amounts that share a denomination and ignores empty coin entries', () => {
    const xml = `
      <root>
        <character>
          <coins>
            <slot1><amount type="number">5</amount><name type="string">gp</name></slot1>
            <slot2><amount type="number">7</amount><name type="string">GP</name></slot2>
            <slot3><amount type="number">9</amount><name type="string">RATIONS</name></slot3>
            <slot4><amount type="number">3</amount></slot4>
            <slot5 />
            <slot6><amount type="number">2</amount><name type="string">SP</name></slot6>
          </coins>
        </character>
      </root>
    `;
    const result = parseCharacterXML(xml);
    expect(result?.coins).toEqual({ pp: 0, gp: 12, ep: 0, sp: 2, cp: 0 });
  });

  it('defaults missing or empty coins to all zeros', () => {
    const withoutCoins = parseCharacterXML(`
      <root><character><name type="string">Empty</name></character></root>
    `);
    const emptyCoins = parseCharacterXML(`
      <root><character><name type="string">Empty</name><coins /></character></root>
    `);
    expect(withoutCoins?.coins).toEqual({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
    expect(emptyCoins?.coins).toEqual({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
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

  it('preserves half-proficiency entries on akinori.xml (prof 3)', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/akinori.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.allSkills.find((s) => s.name === 'Arcana')).toEqual({
      name: 'Arcana',
      total: 1,
      prof: 3,
      stat: 'intelligence',
    });
    expect(result?.allSkills.find((s) => s.name === 'Medicine')).toEqual({
      name: 'Medicine',
      total: 4,
      prof: 3,
      stat: 'wisdom',
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

  it('returns null instead of throwing on severely malformed XML', () => {
    const malformed = '<root><character><![CDATA[unterminated</root>';
    expect(() => parseCharacterXML(malformed)).not.toThrow();
    expect(parseCharacterXML(malformed)).toBeNull();
  });

  it('tryParseCharacterXml reports a failure reason instead of throwing', () => {
    const malformed = '<root><character><![CDATA[unterminated</root>';
    const result = tryParseCharacterXml(malformed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('CDATA');
    }
  });

  it('tryParseCharacterXml reports a missing character node as a failure reason', () => {
    const result = tryParseCharacterXml('<root><foo>bar</foo></root>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('character');
    }
  });

  it('tryParseCharacterXml returns the character on valid input', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = tryParseCharacterXml(xml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.character.name).toBeDefined();
    }
  });
});
