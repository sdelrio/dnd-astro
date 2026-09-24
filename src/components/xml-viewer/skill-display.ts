export type SkillRank = 'none' | 'proficient' | 'expertise' | 'half';

export function skillRank(prof: number): SkillRank {
  switch (prof) {
    case 1:
      return 'proficient';
    case 2:
      return 'expertise';
    case 3:
    case 0.5:
      return 'half';
    default:
      return 'none';
  }
}
