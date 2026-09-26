import { readFileSync } from 'node:fs';
import type { StoredCharacter } from '@/utils/build-xml-characters';
import { getCharacter } from '@/utils/generated-characters';

// Role icons use game-icons equivalents (user-confirmed deviation from the
// spec's mdi: names; IconifyIcon.astro now ships both sets).
//
// Each role carries a light and a dark hue step rather than one flat color.
// The hue is only ever used for the chip border and a 14% background tint -
// never as the text color - because a saturated hue on a tint of itself cannot
// reach 4.5:1 in either theme. Every pair below verifies at >=3:1 border
// (WCAG 1.4.11) and >=5.6:1 label text against its own tinted surface.
export const ROLE_CONFIG = {
  tank: { icon: 'game-icons:shield', label: 'Tank', light: '#a06e00', dark: '#d99a2b' },
  healer: { icon: 'game-icons:heart-plus', label: 'Healer', light: '#4a6b1f', dark: '#8fae5c' },
  damage: { icon: 'game-icons:crossed-swords', label: 'Damage Dealer', light: '#8f2f12', dark: '#c2603f' },
  support: { icon: 'game-icons:scroll-unfurled', label: 'Support', light: '#9a5410', dark: '#d08a4a' },
  utility: { icon: 'game-icons:monkey-wrench', label: 'Utility', light: '#6b2f4c', dark: '#b07a94' },
} as const;

export type Role = keyof typeof ROLE_CONFIG;

export const ALL_ROLES = Object.keys(ROLE_CONFIG) as Role[];

export interface PartyMember {
  filename: string;
  roles: string[];
  notes?: string;
}

export interface PartyJson {
  partyName: string;
  members: PartyMember[];
}

export interface PartyRosterLoad {
  /** False when the roster itself was unusable (unreadable or structurally invalid). */
  ok: boolean;
  party: PartyJson;
  warnings: string[];
}

export interface ResolvedPartyMember extends PartyMember {
  roles: Role[];
  character: StoredCharacter;
}

const EMPTY_PARTY: PartyJson = { partyName: 'Party', members: [] };

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Parses roster JSON without ever throwing. Structural problems (invalid JSON,
 * wrong root type, members not an array) yield an empty party plus a warning
 * so the build can print something actionable instead of crashing. Malformed
 * individual members are dropped with their own warnings; the rest survive.
 */
export function parsePartyRoster(raw: string): PartyRosterLoad {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      party: EMPTY_PARTY,
      warnings: [`party roster is not valid JSON: ${reasonOf(err)}`],
    };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, party: EMPTY_PARTY, warnings: ['party roster must be a JSON object'] };
  }

  const record = data as Record<string, unknown>;
  const warnings: string[] = [];

  if (!Array.isArray(record.members)) {
    return {
      ok: false,
      party: EMPTY_PARTY,
      warnings: ['party roster "members" must be an array'],
    };
  }

  let partyName = 'Party';
  if (typeof record.partyName === 'string' && record.partyName.trim().length > 0) {
    partyName = record.partyName;
  } else {
    warnings.push('party roster "partyName" is missing or not a non-empty string - using "Party"');
  }

  const members: PartyMember[] = [];
  for (const entry of record.members) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      warnings.push('party roster member entry is not an object - dropping it');
      continue;
    }
    const member = entry as Record<string, unknown>;
    if (typeof member.filename !== 'string' || member.filename.length === 0) {
      warnings.push('party roster member is missing "filename" - dropping it');
      continue;
    }

    const filename = member.filename;
    let roles: string[] = [];
    if (Array.isArray(member.roles)) {
      const dropped = member.roles.filter((role) => typeof role !== 'string');
      roles = member.roles.filter((role): role is string => typeof role === 'string');
      if (dropped.length > 0) {
        warnings.push(`party roster member "${filename}" has non-string roles - dropping them`);
      }
    } else if (member.roles !== undefined) {
      warnings.push(
        `party roster member "${filename}" has invalid roles (expected an array) - treating as no roles`
      );
    }

    const parsed: PartyMember = { filename, roles };
    if (typeof member.notes === 'string') {
      parsed.notes = member.notes;
    }
    members.push(parsed);
  }

  return { ok: true, party: { partyName, members }, warnings };
}

/**
 * Reads the roster file at `path` through `parsePartyRoster`. A missing or
 * unreadable file produces an empty party plus one warning - never a throw.
 */
export function readPartyRoster(path: string): PartyRosterLoad {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    return {
      ok: false,
      party: EMPTY_PARTY,
      warnings: [`unable to read party roster at ${path}: ${reasonOf(err)}`],
    };
  }
  return parsePartyRoster(raw);
}

/**
 * Joins roster members with character data. Unknown roles are dropped with a
 * warning (members with no roles left are then skipped), and members whose
 * character data is missing are skipped with a warning. `lookup` defaults to
 * the generated characters loader.
 */
export function resolvePartyMembers(
  party: PartyJson,
  lookup: (filename: string) => StoredCharacter | undefined = getCharacter
): { members: ResolvedPartyMember[]; warnings: string[] } {
  const warnings: string[] = [];
  const members: ResolvedPartyMember[] = [];

  for (const member of party.members) {
    const roles: Role[] = [];
    for (const role of member.roles) {
      if (Object.hasOwn(ROLE_CONFIG, role)) {
        roles.push(role as Role);
      } else {
        warnings.push(`unknown role "${role}" for "${member.filename}" - dropping`);
      }
    }
    if (roles.length === 0) {
      warnings.push(`party member "${member.filename}" has no valid roles - skipping`);
      continue;
    }

    const character = lookup(member.filename);
    if (!character) {
      warnings.push(`character data missing for "${member.filename}" - skipping member`);
      continue;
    }

    members.push({ ...member, roles, character });
  }

  return { members, warnings };
}
