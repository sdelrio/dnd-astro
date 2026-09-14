import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { partyStats } from './party-stats';
import { parseCharacterXML } from './parse-character-xml';

describe('partyStats', () => {
  it('handles empty members array gracefully', () => {
    const stats = partyStats([]);
    expect(stats).toEqual({
      totalHp: 0,
      avgAc: 0,
      avgInit: 0,
      totalLevel: 0,
      roleCounts: {},
    });
  });

  it('calculates aggregate stats accurately for mock members', () => {
    const mockMembers = [
      {
        role: 'tank',
        character: {
          hp: 100,
          ac: 20,
          initiative: 1,
          classes: [{ level: 5 }, { level: 3 }],
        },
      },
      {
        role: 'damage',
        character: {
          hp: 50,
          ac: 15,
          initiative: 4,
          classes: [{ level: 7 }],
        },
      },
      {
        role: 'damage',
        character: {
          hp: 60,
          ac: 16,
          initiative: 3,
          classes: [{ level: 7 }],
        },
      },
    ];

    const stats = partyStats(mockMembers);
    expect(stats.totalHp).toBe(210);
    // (20 + 15 + 16) / 3 = 51 / 3 = 17
    expect(stats.avgAc).toBe(17);
    // (1 + 4 + 3) / 3 = 8 / 3 = 2.666... -> rounded to 3
    expect(stats.avgInit).toBe(3);
    // (5 + 3) + 7 + 7 = 22
    expect(stats.totalLevel).toBe(22);
    expect(stats.roleCounts).toEqual({
      tank: 1,
      damage: 2,
    });
  });

  it('matches manual calculation from raw XML data for current party (acceptance criteria)', () => {
    const partyJsonPath = resolve(__dirname, '../../public/fg/party.json');
    const partyJson = JSON.parse(readFileSync(partyJsonPath, 'utf8'));

    const members = partyJson.members.map((member: { filename: string; role: string }) => {
      const xmlPath = resolve(
        __dirname,
        `../../src/assets/fantasy-grounds-sheets/${member.filename}.xml`
      );
      const xml = readFileSync(xmlPath, 'utf8');
      const character = parseCharacterXML(xml);
      if (!character) {
        throw new Error(`Failed to parse XML for ${member.filename}`);
      }
      return {
        role: member.role,
        character,
      };
    });

    // Manual calculation per character from raw XML:
    // draknor: HP 93, AC 20, Init 2, Lvl 8 (Fighter 8), Role tank
    // elarion: HP 51, AC 16, Init 2, Lvl 5 (Ranger 5), Role damage
    // melbick: HP 32, AC 17, Init 2, Lvl 6 (Wizard 6), Role support
    // valkian: HP 58, AC 17, Init 4, Lvl 6 (Rogue 6), Role damage
    // vogun: HP 57, AC 20, Init 2, Lvl 6 (Cleric 6), Role healer
    // zephyrion: HP 75, AC 17, Init 5, Lvl 8 (Ranger 8), Role damage

    const stats = partyStats(members);

    expect(stats.totalHp).toBe(366);
    // (20 + 16 + 17 + 17 + 20 + 17) / 6 = 107 / 6 = 17.833... -> 18
    expect(stats.avgAc).toBe(18);
    // (2 + 2 + 2 + 4 + 2 + 5) / 6 = 17 / 6 = 2.833... -> 3
    expect(stats.avgInit).toBe(3);
    // 8 + 5 + 6 + 6 + 6 + 8 = 39
    expect(stats.totalLevel).toBe(39);
    expect(stats.roleCounts).toEqual({
      tank: 1,
      damage: 3,
      support: 1,
      healer: 1,
    });
  });
});
