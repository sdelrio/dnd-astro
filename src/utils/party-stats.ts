import { coerceNumber, roundAverage } from './numeric';

export interface PartyMemberStatInput {
  roles: string[];
  character: {
    hp: number;
    ac: number;
    initiative: number;
    classes: Array<{ level: number }>;
  };
}

export interface PartyStatsResult {
  totalHp: number;
  avgAc: number;
  avgInit: number;
  totalLevel: number;
  roleCounts: Record<string, number>;
}

/**
 * Calculates aggregate statistics for a party:
 * - totalHp: sum of character HP across all members
 * - avgAc: mean AC rounded to nearest integer (0 if empty)
 * - avgInit: mean initiative rounded to nearest integer (0 if empty)
 * - totalLevel: sum of all class levels across all members
 * - roleCounts: count of members holding each role (every role a member holds counts once)
 */
export function partyStats(members: PartyMemberStatInput[]): PartyStatsResult {
  const totalHp = members.reduce((sum, m) => sum + coerceNumber(m.character?.hp), 0);
  const avgAc = roundAverage(
    members.reduce((sum, m) => sum + coerceNumber(m.character?.ac), 0),
    members.length
  );
  // Rounded through roundAverage rather than Math.round: a mean that rounds to
  // negative zero stringifies as `+0`, which is how a party averaging a negative
  // initiative would be shown as having no modifier at all.
  const avgInit = roundAverage(
    members.reduce((sum, m) => sum + coerceNumber(m.character?.initiative), 0),
    members.length
  );
  const totalLevel = members.reduce(
    (sum, m) =>
      sum + (m.character?.classes ?? []).reduce((s, c) => s + coerceNumber(c.level), 0),
    0
  );
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    for (const role of m.roles ?? []) {
      if (role) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
    }
  }
  return { totalHp, avgAc, avgInit, totalLevel, roleCounts };
}

export const calculatePartyStats = partyStats;

/**
 * How the party view prints the average initiative.
 *
 * The view wants a signed modifier for a positive average, and it decided the
 * sign from the value with `avgInit >= 0`. That test is true for negative zero as
 * well, so a party whose average initiative rounded to `-0` - any mean between
 * -0.5 and 0, such as -1 over three members - was printed as `+0`: no modifier at
 * all, for a party that averages a penalty.
 *
 * The sign therefore goes on a POSITIVE average rather than on a
 * non-negative one, and a zero average prints as a bare `0`. `-0` and `0` are
 * indistinguishable to a reader, so nothing is lost by declining to sign the
 * boundary.
 */
export function averageInitiativeLabel(avgInit: number): string {
  const value = coerceNumber(avgInit);
  return value > 0 ? `+${value}` : `${value}`;
}
