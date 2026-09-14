import { describe, it, expect } from 'vitest';
import { groupBy } from './group-by';

describe('groupBy', () => {
  it('returns an empty array when given an empty list', () => {
    const result = groupBy([], (x: { id: number }) => x.id);
    expect(result).toEqual([]);
  });

  it('groups items by numeric key preserving order', () => {
    const items = [
      { id: 1, level: 1, name: 'A' },
      { id: 2, level: 2, name: 'B' },
      { id: 3, level: 1, name: 'C' },
    ];
    const result = groupBy(items, (x) => x.level);
    expect(result).toEqual([
      {
        key: 1,
        items: [
          { id: 1, level: 1, name: 'A' },
          { id: 3, level: 1, name: 'C' },
        ],
      },
      {
        key: 2,
        items: [{ id: 2, level: 2, name: 'B' }],
      },
    ]);
  });

  it('groups items by string key', () => {
    const items = [
      { name: 'Fireball', group: 'Spells' },
      { name: 'Action Surge', group: 'Features' },
      { name: 'Magic Missile', group: 'Spells' },
    ];
    const result = groupBy(items, (x) => x.group);
    expect(result).toEqual([
      {
        key: 'Spells',
        items: [
          { name: 'Fireball', group: 'Spells' },
          { name: 'Magic Missile', group: 'Spells' },
        ],
      },
      {
        key: 'Features',
        items: [{ name: 'Action Surge', group: 'Features' }],
      },
    ]);
  });

  it('supports hierarchical multi-level grouping', () => {
    const powers = [
      { level: 1, group: 'Fighter', name: 'Second Wind' },
      { level: 1, group: 'Other', name: 'Punch' },
      { level: 2, group: 'Fighter', name: 'Action Surge' },
    ];
    const grouped = groupBy(powers, (p) => p.level).map((lg) => ({
      level: lg.key,
      groups: groupBy(lg.items, (p) => p.group).map((gg) => ({
        name: gg.key,
        items: gg.items,
      })),
    }));

    expect(grouped).toEqual([
      {
        level: 1,
        groups: [
          {
            name: 'Fighter',
            items: [{ level: 1, group: 'Fighter', name: 'Second Wind' }],
          },
          {
            name: 'Other',
            items: [{ level: 1, group: 'Other', name: 'Punch' }],
          },
        ],
      },
      {
        level: 2,
        groups: [
          {
            name: 'Fighter',
            items: [{ level: 2, group: 'Fighter', name: 'Action Surge' }],
          },
        ],
      },
    ]);
  });
});
