import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./FeatExplorer.astro', import.meta.url), 'utf8');

describe('FeatExplorer phone adaptation', () => {
  // Four stacked full-width controls put the first result card below the fold
  // on a phone. Search stays visible; the three selects collapse behind a
  // toggle that reports how many are set.
  it('collapses the three selects behind a toggle below sm', () => {
    expect(source).toContain('id="feat-filter-panel"');
    expect(source).toContain('x-show="filtersOpen"');
    expect(source).toContain('class="sm:flex! sm:flex-row sm:items-start gap-4"');
    expect(source).toContain('x-show="!filtersOpen"');
    expect(source).toContain('aria-controls="feat-filter-panel"');
  });

  // Alpine's x-show reveals by *removing* its own inline display rather than
  // setting one, so a class-based display:none on the panel would win again
  // once filtersOpen went true and the toggle would do nothing on a phone.
  // Visibility below sm has to come from x-show alone; x-cloak covers pre-boot.
  it('leaves the panel hidden below sm only via x-show, never via a class', () => {
    const panel = source.match(/<div\s+id="feat-filter-panel"[\s\S]*?>/)![0];
    expect(panel).toContain('x-show="filtersOpen"');
    expect(panel).toContain('x-cloak');
    expect(panel).not.toMatch(/\bclass="[^"]*\bhidden\b/);
  });

  it('reports the active select count on the toggle', () => {
    expect(source).toContain('activeFilterCount()');
    expect(source).toContain('filtersOpen: false');
  });

  // `py-2 text-sm` is a 38px control, and a sub-16px input font makes iOS
  // Safari zoom the whole page on focus - both fatal for a phone at the table.
  it('gives every control a 44px target and a 16px base font', () => {
    const controls = [...source.matchAll(/<(?:input|select)\b[\s\S]*?>/g)].map((m) => m[0]);
    expect(controls).toHaveLength(4);
    for (const control of controls) {
      expect(control).toContain('min-h-11');
      expect(control).toContain('text-base sm:text-sm');
    }
  });

  // x-show needs x-cloak, or the panel paints before Alpine initialises.
  it('cloaks every x-show region outside a template', () => {
    for (const div of source.matchAll(/<div([^>]*\bx-show=[^>]*)>/g)) {
      if (div[1].includes('x-for')) continue;
      expect(div[1]).toContain('x-cloak');
    }
  });
});
