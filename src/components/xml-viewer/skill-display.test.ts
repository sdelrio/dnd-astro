import { describe, it, expect } from 'vitest';
import { skillRank } from './skill-display';

describe('skillRank', () => {
  it('maps 0 to none', () => {
    expect(skillRank(0)).toBe('none');
  });

  it('maps 1 to proficient', () => {
    expect(skillRank(1)).toBe('proficient');
  });

  it('maps 2 to expertise', () => {
    expect(skillRank(2)).toBe('expertise');
  });

  it('maps 3 to half', () => {
    expect(skillRank(3)).toBe('half');
  });

  it('maps the fractional 0.5 spelling to half', () => {
    expect(skillRank(0.5)).toBe('half');
  });

  it('maps an unknown value to none', () => {
    expect(skillRank(4)).toBe('none');
  });
});
