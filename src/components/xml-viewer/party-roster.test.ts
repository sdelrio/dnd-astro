import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parsePartyRoster,
  readPartyRoster,
  resolvePartyMembers,
} from './party-roster';
import type { StoredCharacter } from '@/utils/build-xml-characters';

function fakeCharacter(filename: string): StoredCharacter {
  return {
    filename,
    name: filename,
    avatarPath: '/fg/avatar/faceless.svg',
    hp: 10,
    ac: 10,
    initiative: 0,
    classes: [{ name: 'Fighter', level: 1 }],
  } as unknown as StoredCharacter;
}

describe('parsePartyRoster', () => {
  it('returns an empty party with a warning for invalid JSON', () => {
    const result = parsePartyRoster('{ not json');
    expect(result.party).toEqual({ partyName: 'Party', members: [] });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/not valid JSON/);
  });

  it('warns when the roster root is not an object', () => {
    for (const raw of ['[1, 2, 3]', '"just a string"', '42']) {
      const result = parsePartyRoster(raw);
      expect(result.party.members).toEqual([]);
      expect(result.warnings[0]).toMatch(/must be a JSON object/);
    }
  });

  it('warns when members is not an array', () => {
    const result = parsePartyRoster('{"partyName":"X","members":{}}');
    expect(result.party.members).toEqual([]);
    expect(result.warnings[0]).toMatch(/"members" must be an array/);
  });

  it('defaults partyName with a warning when it is missing or invalid', () => {
    const result = parsePartyRoster('{"members":[]}');
    expect(result.party.partyName).toBe('Party');
    expect(result.warnings[0]).toMatch(/"partyName"/);

    const typed = parsePartyRoster('{"partyName":7,"members":[]}');
    expect(typed.party.partyName).toBe('Party');
    expect(typed.warnings[0]).toMatch(/"partyName"/);
  });

  it('drops malformed member entries with warnings and keeps valid ones', () => {
    const result = parsePartyRoster(
      JSON.stringify({
        partyName: 'Test',
        members: [
          42,
          { roles: ['tank'] },
          { filename: 'draknor', roles: ['tank'], notes: 'front line' },
        ],
      })
    );
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/not an object/);
    expect(result.warnings[1]).toMatch(/missing "filename"/);
    expect(result.party.members).toEqual([
      { filename: 'draknor', roles: ['tank'], notes: 'front line' },
    ]);
  });

  it('drops non-string role entries with a warning and keeps the rest', () => {
    const result = parsePartyRoster(
      JSON.stringify({
        partyName: 'Test',
        members: [{ filename: 'draknor', roles: [1, 'tank', null] }],
      })
    );
    expect(result.party.members[0].roles).toEqual(['tank']);
    expect(result.warnings[0]).toMatch(/non-string roles/);
  });

  it('treats a non-array roles value as no roles with a warning', () => {
    const result = parsePartyRoster(
      JSON.stringify({
        partyName: 'Test',
        members: [{ filename: 'draknor', roles: 'tank' }],
      })
    );
    expect(result.party.members[0].roles).toEqual([]);
    expect(result.warnings[0]).toMatch(/invalid roles/);
  });

  it('parses a well-formed roster without warnings', () => {
    const result = parsePartyRoster(
      JSON.stringify({
        partyName: 'Stats & Filters',
        members: [{ filename: 'draknor', roles: ['tank'] }],
      })
    );
    expect(result.warnings).toEqual([]);
    expect(result.party.partyName).toBe('Stats & Filters');
    expect(result.party.members).toHaveLength(1);
  });
});

describe('readPartyRoster', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'party-roster-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns an empty party with a warning when the file is missing', () => {
    const missing = join(tempDir, 'does-not-exist.json');
    const result = readPartyRoster(missing);
    expect(result.party.members).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/unable to read party roster/);
    expect(result.warnings[0]).toContain(missing);
  });

  it('returns an empty party with a warning when the file is corrupt', () => {
    const corrupt = join(tempDir, 'party.json');
    writeFileSync(corrupt, 'not json {{');
    const result = readPartyRoster(corrupt);
    expect(result.party.members).toEqual([]);
    expect(result.warnings[0]).toMatch(/not valid JSON/);
  });

  it('reads the real party roster without warnings', () => {
    const result = readPartyRoster(resolve(process.cwd(), 'public/fg/party.json'));
    expect(result.warnings).toEqual([]);
    expect(result.party.partyName).toBe('Stats & Filters');
    expect(result.party.members.length).toBeGreaterThan(0);
  });
});

describe('resolvePartyMembers', () => {
  it('joins members with their characters without warnings', () => {
    const { members, warnings } = resolvePartyMembers(
      { partyName: 'Test', members: [{ filename: 'draknor', roles: ['tank'] }] },
      (filename) => fakeCharacter(filename)
    );
    expect(warnings).toEqual([]);
    expect(members).toHaveLength(1);
    expect(members[0].roles).toEqual(['tank']);
    expect(members[0].character.filename).toBe('draknor');
  });

  it('drops unknown roles with a warning and keeps the member', () => {
    const { members, warnings } = resolvePartyMembers(
      { partyName: 'Test', members: [{ filename: 'draknor', roles: ['tank', 'bard'] }] },
      (filename) => fakeCharacter(filename)
    );
    expect(members).toHaveLength(1);
    expect(members[0].roles).toEqual(['tank']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/unknown role "bard"/);
  });

  it('drops members whose roles are all unknown with warnings', () => {
    const { members, warnings } = resolvePartyMembers(
      { partyName: 'Test', members: [{ filename: 'draknor', roles: ['bard'] }] },
      (filename) => fakeCharacter(filename)
    );
    expect(members).toEqual([]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/unknown role "bard"/);
    expect(warnings[1]).toMatch(/no valid roles/);
  });

  it('skips members with missing character data with a warning', () => {
    const { members, warnings } = resolvePartyMembers(
      {
        partyName: 'Test',
        members: [
          { filename: 'ghost', roles: ['tank'] },
          { filename: 'draknor', roles: ['tank'] },
        ],
      },
      (filename) => (filename === 'ghost' ? undefined : fakeCharacter(filename))
    );
    expect(members).toHaveLength(1);
    expect(members[0].character.filename).toBe('draknor');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/character data missing for "ghost"/);
  });

  it('joins against the real generated character loader by default', () => {
    const { members, warnings } = resolvePartyMembers({
      partyName: 'Test',
      members: [
        { filename: 'draknor', roles: ['tank'] },
        { filename: 'nonexistent-character', roles: ['healer'] },
      ],
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/character data missing for "nonexistent-character"/);
    expect(members).toHaveLength(1);
    expect(members[0].character.name).toBe('Drakknor');
  });
});
