export interface PartyMemberStatInput {
  role: string;
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
 * - roleCounts: count of members per role
 */
export function partyStats(members: PartyMemberStatInput[]): PartyStatsResult {
  const totalHp = members.reduce((sum, m) => sum + (m.character?.hp ?? 0), 0);
  const avgAc =
    members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + (m.character?.ac ?? 0), 0) / members.length)
      : 0;
  const avgInit =
    members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + (m.character?.initiative ?? 0), 0) / members.length)
      : 0;
  const totalLevel = members.reduce(
    (sum, m) => sum + (m.character?.classes ?? []).reduce((s, c) => s + (c.level ?? 0), 0),
    0
  );
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    if (m.role) {
      roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
    }
  }
  return { totalHp, avgAc, avgInit, totalLevel, roleCounts };
}

export const calculatePartyStats = partyStats;
