import { readFileSync } from 'node:fs';
import type { StoredCharacter } from '@/utils/build-xml-characters';
import { getCharacter } from '@/utils/generated-characters';
// The role data itself lives in `party-roles`, which has no imports of its own
// so a client component can hold it without dragging the file read below into
// the browser. It is imported here, not re-exported: a client component that
// reaches for the roster module should be a visibly wrong import, not one that
// quietly works.
import { ROLE_CONFIG } from './party-roles';
import type { Role } from './party-roles';

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
  const seen = new Set<string>();

  for (const member of party.members) {
    const roles: Role[] = [];
    for (const role of member.roles) {
      // The own-property check keeps a role named `constructor` or `__proto__`
      // from being read off the prototype chain and accepted as a real role.
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

    // One character is one member. A roster that names the same sheet twice
    // disagrees with itself, so the duplicate is named and dropped rather than
    // counted again - otherwise the party view renders it twice and the
    // statistics count its hit points twice.
    if (seen.has(member.filename)) {
      warnings.push(`duplicate party member "${member.filename}" - skipping duplicate entry`);
      continue;
    }
    seen.add(member.filename);

    members.push({ ...member, roles, character });
  }

  return { members, warnings };
}
