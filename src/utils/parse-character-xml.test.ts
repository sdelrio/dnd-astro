import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
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
    // id-00003 is a field-less record: Fantasy Grounds writes it as a placeholder
    // and it has nothing to read, so it must not become a blank inventory entry.
    expect(result?.inventory).toEqual([
      { name: 'Rope', count: 2, weight: 10, carried: 1 },
      { name: 'Torch', count: 0, weight: 0, carried: 0 },
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

  it('reads the nine per-level spell slot blocks from a real caster sheet', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/antonidas.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    // A Wizard 5 in the repository's sheets: three populated levels and six empty
    // ones, which is the shape the Spellcasting section filters down to.
    expect(result?.spellSlots).toEqual([
      { level: 1, max: 4, used: 2 },
      { level: 2, max: 3, used: 2 },
      { level: 3, max: 2, used: 2 },
      { level: 4, max: 0, used: 0 },
      { level: 5, max: 0, used: 0 },
      { level: 6, max: 0, used: 0 },
      { level: 7, max: 0, used: 0 },
      { level: 8, max: 0, used: 0 },
      { level: 9, max: 0, used: 0 },
    ]);
  });

  it('defaults every spell slot level to zero where the sheet omits a block', () => {
    // A martial sheet carries the blocks but zeroes them; a hand-written sheet may
    // carry none at all. Either way there are always nine levels, so a level that
    // is absent and a level that is empty cannot be told apart downstream.
    const withoutBlocks = parseCharacterXML(
      `<root><character><name type="string">Fighter</name></character></root>`
    );
    const withSomeBlocks = parseCharacterXML(`
      <root>
        <character>
          <name type="string">Fighter</name>
          <powermeta>
            <spellslots1><max type="number">2</max><used type="number">1</used></spellslots1>
            <spellslots4><max type="number">1</max><used type="number">0</used></spellslots4>
          </powermeta>
        </character>
      </root>
    `);
    const zeroed = Array.from({ length: 9 }, (_, i) => ({ level: i + 1, max: 0, used: 0 }));
    expect(withoutBlocks?.spellSlots).toEqual(zeroed);
    expect(withSomeBlocks?.spellSlots).toEqual([
      { level: 1, max: 2, used: 1 },
      { level: 2, max: 0, used: 0 },
      { level: 3, max: 0, used: 0 },
      { level: 4, max: 1, used: 0 },
      { level: 5, max: 0, used: 0 },
      { level: 6, max: 0, used: 0 },
      { level: 7, max: 0, used: 0 },
      { level: 8, max: 0, used: 0 },
      { level: 9, max: 0, used: 0 },
    ]);
  });

  it('reads nothing from the pact magic slot blocks beside the spell slots', () => {
    // A Warlock's pact magic slots sit next to the spell slots with the same shape
    // and a different name. The Spellcasting section is a caster's slot tracker, and
    // a pact slot shown as a spell slot would be a number the sheet contradicts.
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/antonidas.xml'), 'utf8');
    const pactSlots = readFileSync(
      join(__dirname, '../assets/fantasy-grounds-sheets/antonidas.xml'),
      'utf8'
    ).match(/<pactmagicslots1>[\s\S]*?<\/pactmagicslots1>/);
    expect(pactSlots).not.toBeNull();
    expect(parseCharacterXML(xml)?.spellSlots[0]).toEqual({ level: 1, max: 4, used: 2 });
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

  it('reads the id records when a sheet carries both representations of one purse', () => {
    // Fantasy Grounds writes <coins> twice over: once as id-NNNNN records and again
    // as slot1..slot6 blocks, and the two do not agree - the slots are what the
    // sheet last rendered into its coin boxes, the records are what it stores.
    // Adding both gives a purse twice as large as the one on the page.
    const xml = `
      <root>
        <character>
          <coins>
            <id-00001><amount type="number">5</amount><name type="string">GP</name></id-00001>
            <id-00002><amount type="number">2</amount><name type="string">SP</name></id-00002>
            <slot1><amount type="number">9</amount><name type="string">RATIONS</name></slot1>
            <slot2><amount type="number">7</amount><name type="string">GP</name></slot2>
            <slot3><amount type="number">3</amount></slot3>
            <slot4 />
            <slot5><amount type="number">4</amount><name type="string">SP</name></slot5>
            <slot6><amount type="number">11</amount><name type="string">CP</name></slot6>
          </coins>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.coins).toEqual({ pp: 0, gp: 5, ep: 0, sp: 2, cp: 0 });
  });

  it('reads the slot blocks when a sheet carries no id records at all', () => {
    // The other shape is the whole node on its own, and a sheet that has only it
    // must still be read rather than treated as an empty purse.
    const xml = `
      <root>
        <character>
          <coins>
            <slot1><amount type="number">5</amount><name type="string">gp</name></slot1>
            <slot2><amount type="number">9</amount><name type="string">RATIONS</name></slot2>
            <slot3><amount type="number">3</amount></slot3>
            <slot4 />
            <slot5><amount type="number">2</amount><name type="string">SP</name></slot5>
          </coins>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.coins).toEqual({ pp: 0, gp: 5, ep: 0, sp: 2, cp: 0 });
  });

  it("reports lothiriel's purse as its sheet states it, not as both copies added", () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/lothiriel.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.coins).toEqual({ pp: 0, gp: 105, ep: 0, sp: 13, cp: 7 });
  });

  it("reads viktor's purse, whose slots name the same denomination twice", () => {
    // viktor carries SP in both slot2 and slot3, both zero. Two records for one
    // denomination are a sheet that cannot say which is which, but they agree, so
    // there is nothing to add: the denomination is read once.
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/viktor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result).not.toBeNull();
    expect(result?.coins).toEqual({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
  });

  it('fails the sheet rather than adding two records for one denomination', () => {
    // Two records claiming the same denomination with different amounts is a purse
    // the parser cannot read honestly: either number is a guess and their sum is
    // neither. Answering with the sum is the defect, so the sheet is refused and
    // named rather than published with a purse nobody wrote.
    const xml = `
      <root>
        <character>
          <coins>
            <id-00001><amount type="number">5</amount><name type="string">gp</name></id-00001>
            <id-00002><amount type="number">7</amount><name type="string">GP</name></id-00002>
          </coins>
        </character>
      </root>
    `;
    const result = tryParseCharacterXml(xml);
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toContain('gp');
    expect(parseCharacterXML(xml)).toBeNull();
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

  describe('the subclass-name patterns the casting table relies on', () => {
    // The casting tables name a Blood Hunter's patron and an Anti Paladin's oath,
    // and the corpus guard in `casting-ability-corpus.test.ts` resolves the
    // casting ability through them. A patron name the parser can never recover is a
    // patron the card cannot resolve, so the two lists are reconciled rather than
    // left to drift: this covers the level-1 granted-feature fallback, the path
    // that recovers a subclass on a sheet whose class node lost its
    // <specialization>.
    const sheetWith = (className: string, featureName: string) => `
      <root>
        <character>
          <classes>
            <id-00001>
              <name type="string">${className}</name>
              <level type="number">3</level>
            </id-00001>
          </classes>
          <featurelist>
            <id-00001>
              <level type="number">1</level>
              <locked type="number">1</locked>
              <name type="string">${featureName}</name>
              <source type="string">${className}</source>
            </id-00001>
          </featurelist>
        </character>
      </root>
    `;

    it.each([
      ['Blood Hunter', 'Order of the Profane Soul'],
      ['Blood Hunter', 'Order of the Ghostslayer'],
      ['Anti Paladin', 'Oathbreaker'],
      ['Fighter', 'Psi Warrior'],
      ['Fighter', 'Soulknife'],
    ])('recovers the %s subclass from a level-1 feature named %s', (className, featureName) => {
      const result = parseCharacterXML(sheetWith(className, featureName));
      expect(result?.classes[0].subclass).toBe(featureName);
    });

    it('still ignores a level-1 feature that is not a subclass name', () => {
      // The pattern is what keeps this from reading every level-1 feature as a
      // subclass: Gromash's Blood Hunter sheet has `Hunter's Bane` and
      // `Crimson Rite` at level 1, and neither is a patron.
      const result = parseCharacterXML(sheetWith('Blood Hunter', "Hunter's Bane"));
      expect(result?.classes[0].subclass).toBeUndefined();
    });
  });

  it('entity-decodes and number-coerces an encoded proficiency bonus', () => {
    const xml = `
      <root>
        <character>
          <profbonus>&#43;3</profbonus>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.profBonus).toBe(3);
  });

  it('reads a real sheet proficiency bonus unchanged', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    // Entity decoding must not disturb an already-plain prof bonus.
    expect(parseCharacterXML(xml)?.profBonus).toBe(3);
  });

  it('does not collect a nested look-alike node under the language list', () => {
    const xml = `
      <root>
        <character>
          <languagelist>
            <id-00001><name type="string">Common</name></id-00001>
            <language><name type="string">Dwarvish</name></language>
          </languagelist>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.languages).toEqual(['Common']);
  });

  it('does not collect a nested look-alike node under the feat list', () => {
    const xml = `
      <root>
        <character>
          <featlist>
            <id-00001><name type="string">Alert</name></id-00001>
            <feat><name type="string">Lucky</name></feat>
          </featlist>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.feats).toEqual(['Alert']);
  });

  it('does not collect a nested look-alike node under the feature list', () => {
    const xml = `
      <root>
        <character>
          <featurelist>
            <id-00001>
              <name type="string">Second Wind</name>
              <source type="string">Fighter</source>
            </id-00001>
            <feature><name type="string">Extra Attack</name></feature>
          </featurelist>
        </character>
      </root>
    `;
    expect(parseCharacterXML(xml)?.features).toEqual([
      { level: 0, name: 'Second Wind', source: 'Fighter' },
    ]);
  });

  describe('unrecognised collection keys', () => {
    it('reports a record key the parser cannot read, naming the collection and the key', () => {
      const xml = `
        <root>
          <character>
            <skilllist>
              <id-00001>
                <name type="string">Perception</name>
                <total type="number">5</total>
                <prof type="number">1</prof>
                <stat type="string">wisdom</stat>
              </id-00001>
              <skill-002>
                <name type="string">Arcana</name>
                <total type="number">3</total>
                <prof type="number">1</prof>
                <stat type="string">intelligence</stat>
              </skill-002>
            </skilllist>
          </character>
        </root>
      `;
      const result = tryParseCharacterXml(xml);
      expect(result.ok).toBe(true);
      expect(result.ok && result.unrecognised).toEqual([
        { collection: 'skilllist', keys: ['skill-002'] },
      ]);
      // The recognised record still parses; the drop is reported, not fatal.
      expect(result.ok && result.character.skills).toEqual([
        { name: 'Perception', total: 5 },
      ]);
    });

    it('does not report a nested collection node as an unrecognised key', () => {
      const xml = `
        <root>
          <character>
            <languagelist>
              <id-00001><name type="string">Common</name></id-00001>
              <powers>
                <id-00001><name type="string">Entrench</name></id-00001>
              </powers>
            </languagelist>
          </character>
        </root>
      `;
      const result = tryParseCharacterXml(xml);
      expect(result.ok).toBe(true);
      expect(result.ok && result.unrecognised).toEqual([]);
    });

    it('does not report the powers block nested inside an inventory item', () => {
      const xml = `
        <root>
          <character>
            <inventorylist>
              <id-00001>
                <name type="string">Entrenching Mattock</name>
                <powers>
                  <id-00001><name type="string">Entrench</name></id-00001>
                </powers>
              </id-00001>
            </inventorylist>
          </character>
        </root>
      `;
      const result = tryParseCharacterXml(xml);
      expect(result.ok).toBe(true);
      expect(result.ok && result.unrecognised).toEqual([]);
    });

    it('reports nothing for the well-formed committed corpus', () => {
      const dir = join(__dirname, '../assets/fantasy-grounds-sheets');
      const files = readdirSync(dir).filter((f) => f.endsWith('.xml'));
      expect(files).toHaveLength(111);
      const reported = files
        .map((file) => {
          const result = tryParseCharacterXml(readFileSync(join(dir, file), 'utf8'));
          return { file, result };
        })
        .filter(({ result }) => result.ok && result.unrecognised.length > 0);
      expect(reported).toEqual([]);
    });
  });

  describe('the non-finite coercion invariant from #448', () => {
    /** One sheet carrying one junk HP total, and nothing else. */
    const hpSheet = (total: string) =>
      `<root><character><hp><total type="number">${total}</total></hp></character></root>`;

    it.each([
      ['a non-numeric total', 'abc'],
      ['an exponential literal', '1e999'],
    ])('resolves %s to the fallback rather than a non-finite number', (_label, total) => {
      const result = parseCharacterXML(hpSheet(total));
      expect(result?.hp).toBe(0);
      expect(Number.isFinite(result?.hp)).toBe(true);
    });

    it('reads a thousand-separated total, junk and an exponential each, on one sheet', () => {
      const xml = `
        <root>
          <character>
            <hp><total type="number">1,000</total><temporary type="number">abc</temporary></hp>
            <profbonus type="number">1e999</profbonus>
          </character>
        </root>
      `;
      const result = parseCharacterXML(xml);
      expect(result?.hp).toBe(1000);
      expect(result?.tempHp).toBe(0);
      expect(result?.profBonus).toBe(0);
    });

    it('resolves every numeric field the parser reads to a finite number', () => {
      const junkSheet = `
        <root>
          <character>
            <hp><total type="number">abc</total><temporary type="number">1e999</temporary></hp>
            <speed><total type="number">abc</total></speed>
            <initiative><total type="number">1e999</total></initiative>
            <defenses><ac><total type="number">abc</total></ac></defenses>
            <profbonus type="number">1e999</profbonus>
            <abilities>
              <strength><score type="number">abc</score><bonus type="number">1e999</bonus><save type="number">abc</save><saveprof type="number">1e999</saveprof></strength>
            </abilities>
            <skilllist>
              <id-00001><name type="string">Perception</name><total type="number">abc</total><prof type="number">1e999</prof></id-00001>
            </skilllist>
            <classes><id-00001><name type="string">Fighter</name><level type="number">abc</level></id-00001></classes>
            <featurelist><id-00001><level type="number">1e999</level><name type="string">X</name><source type="string">Fighter</source></id-00001></featurelist>
            <powers><id-00001><level type="number">abc</level><name type="string">Y</name><group type="string">Spells</group><prepared type="number">1e999</prepared><preparedDomain type="number">abc</preparedDomain></id-00001></powers>
            <weaponlist>
              <id-00001>
                <name type="string">Sword</name>
                <attackbonus type="number">abc</attackbonus>
                <carried type="number">1e999</carried>
                <type type="number">abc</type>
                <damagelist><id-00001><bonus type="number">1e999</bonus><dice type="dice">1d6</dice><stat type="string">base</stat><statmult type="number">abc</statmult></id-00001></damagelist>
              </id-00001>
            </weaponlist>
            <powermeta><spellslots1><max type="number">abc</max><used type="number">1e999</used></spellslots1></powermeta>
            <inventorylist><id-00001><name type="string">Rope</name><count type="number">abc</count><weight type="number">1e999</weight><carried type="number">abc</carried></id-00001></inventorylist>
            <coins><id-00001><name type="string">GP</name><amount type="number">1e999</amount></id-00001></coins>
          </character>
        </root>
      `;
      const result = parseCharacterXML(junkSheet);
      expect(result).not.toBeNull();
      const nonFinite: string[] = [];
      const check = (label: string, value: unknown) => {
        if (typeof value === 'number' && !Number.isFinite(value)) nonFinite.push(label);
      };
      check('hp', result?.hp);
      check('tempHp', result?.tempHp);
      check('speed', result?.speed);
      check('initiative', result?.initiative);
      check('ac', result?.ac);
      check('profBonus', result?.profBonus);
      for (const [stat, ability] of Object.entries(result?.abilities ?? {})) {
        check(`${stat}.score`, ability.score);
        check(`${stat}.bonus`, ability.bonus);
        check(`${stat}.save`, ability.save);
        check(`${stat}.saveprof`, ability.saveprof);
      }
      for (const entry of result?.allSkills ?? []) check(`skill ${entry.name}.total`, entry.total);
      for (const entry of result?.classes ?? []) check(`class ${entry.name}.level`, entry.level);
      for (const entry of result?.features ?? []) check(`feature ${entry.name}.level`, entry.level);
      for (const entry of result?.powers ?? []) {
        check(`power ${entry.name}.level`, entry.level);
        check(`power ${entry.name}.prepared`, entry.prepared);
        check(`power ${entry.name}.preparedDomain`, entry.preparedDomain);
      }
      for (const weapon of result?.weapons ?? []) {
        check(`weapon ${weapon.name}.attackbonus`, weapon.attackbonus);
        check(`weapon ${weapon.name}.carried`, weapon.carried);
        check(`weapon ${weapon.name}.type`, weapon.type);
        for (const damage of weapon.damage) {
          check(`weapon ${weapon.name}.damage.bonus`, damage.bonus);
          check(`weapon ${weapon.name}.damage.statmult`, damage.statmult);
        }
      }
      for (const slot of result?.spellSlots ?? []) {
        check(`slot ${slot.level}.max`, slot.max);
        check(`slot ${slot.level}.used`, slot.used);
      }
      for (const item of result?.inventory ?? []) {
        check(`item ${item.name}.count`, item.count);
        check(`item ${item.name}.weight`, item.weight);
        check(`item ${item.name}.carried`, item.carried);
      }
      for (const [denomination, amount] of Object.entries(result?.coins ?? {})) {
        check(`coin ${denomination}`, amount);
      }
      check('passives.perception', result?.passives.perception);
      expect(nonFinite).toEqual([]);
    });

    it('falls back to a multiplier of 1 for an unparseable damage statmult', () => {
      const xml = `
        <root>
          <character>
            <weaponlist>
              <id-00001>
                <name type="string">Sword</name>
                <damagelist>
                  <id-00001><bonus type="number">0</bonus><dice type="dice">1d6</dice><stat type="string">base</stat><statmult type="number">abc</statmult></id-00001>
                </damagelist>
              </id-00001>
            </weaponlist>
          </character>
        </root>
      `;
      expect(parseCharacterXML(xml)?.weapons[0].damage[0].statmult).toBe(1);
    });
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
