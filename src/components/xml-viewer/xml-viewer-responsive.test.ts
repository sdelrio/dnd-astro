import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const charSearch = readFileSync(
  new URL('./CharSearch.astro', import.meta.url),
  'utf8'
);
const partyView = readFileSync(new URL('./PartyView.astro', import.meta.url), 'utf8');

describe('CharSearch phone adaptation', () => {
  it('collapses the two selects behind a toggle below sm', () => {
    expect(charSearch).toContain('id="char-filter-panel"');
    expect(charSearch).toContain('x-show="filtersOpen"');
    expect(charSearch).toContain('class="sm:flex! sm:flex-row sm:items-start gap-4"');
    expect(charSearch).toContain('aria-controls="char-filter-panel"');
  });

  // Alpine's x-show reveals by removing its own inline display, so a
  // class-based display:none on the panel would win again once filtersOpen
  // went true and the toggle would be dead on a phone.
  it('leaves the panel hidden below sm only via x-show, never via a class', () => {
    const panel = charSearch.match(/<div\s+id="char-filter-panel"[\s\S]*?>/)![0];
    expect(panel).toContain('x-show="filtersOpen"');
    expect(panel).toContain('x-cloak');
    expect(panel).not.toMatch(/\bclass="[^"]*\bhidden\b/);
  });

  // `py-2 text-sm` is a 38px control, and a sub-16px input font makes iOS
  // Safari zoom the whole page on focus.
  it('gives every control a 44px target and a 16px base font', () => {
    const controls = [...charSearch.matchAll(/<(?:input|select)\b[\s\S]*?>/g)].map((m) => m[0]);
    expect(controls).toHaveLength(3);
    for (const control of controls) {
      expect(control).toContain('min-h-11');
      expect(control).toContain('text-base sm:text-sm');
    }
  });
});

describe('PartyView touch behaviour', () => {
  // The stylesheet's comments quote the constructs they explain, so assertions
  // about what is or is not present have to look at CSS, not prose.
  const css = partyView.replace(/\/\*[\s\S]*?\*\//g, '');

  // `:hover` sticks after a tap on iOS and never fires for a stylus, so the
  // tints are gated on a hover-capable pointer.
  it('gates hover tints behind a hover-capable pointer', () => {
    expect(css).toMatch(/@media \(hover: hover\)\s*\{[\s\S]*?\.r3-chip:hover/);
  });

  // A hybrid touchscreen laptop reports `hover: hover` *and* `pointer: fine`,
  // because the trackpad is the primary device. Gating the press on
  // `hover: none` therefore never matches there, so the press must stand
  // ungated: it is correct for a mouse held down and for a finger alike.
  it('leaves press feedback ungated so a hybrid laptop is not left out', () => {
    expect(css).toMatch(/\n {4}\.r3-chip:active\s*\{/);
    expect(css).not.toMatch(/@media \(hover: none\)/);
  });

  it('keeps both themes covered by the pointer gating', () => {
    expect(css).toMatch(
      /@media \(hover: hover\)\s*\{[\s\S]*?\[data-theme='dark'\]\) \.r3-chip:hover/
    );
    expect(css).toMatch(/:global\(\[data-theme='dark'\]\) \.r3-chip:active/);
  });

  // `pointer: coarse` describes the primary device, so a hybrid reports `fine`
  // and never picks up the wider gap despite being tappable by finger.
  it('widens chip spacing on any-pointer coarse, not the primary pointer', () => {
    expect(css).toMatch(/@media \(any-pointer: coarse\)\s*\{[\s\S]*?gap: 8px/);
    expect(css).not.toMatch(/@media \(pointer: coarse\)/);
  });
});
