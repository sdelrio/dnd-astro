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
  // `:hover` sticks after a tap on iOS and never fires for a stylus, so the
  // tints are gated on a hover-capable pointer and coarse pointers press.
  it('gates hover tints behind a hover-capable pointer', () => {
    expect(partyView).toMatch(/@media \(hover: hover\)\s*\{[\s\S]*?\.r3-chip:hover/);
    expect(partyView).toMatch(/@media \(hover: none\)\s*\{[\s\S]*?\.r3-chip:active/);
  });

  it('keeps both themes covered by the pointer gating', () => {
    const hoverBlock = partyView.match(/@media \(hover: hover\)\s*\{[\s\S]*?\n {4}\}/)![0];
    expect(hoverBlock).toContain("[data-theme='dark']) .r3-chip:hover");
    const pressBlock = partyView.match(/@media \(hover: none\)\s*\{[\s\S]*?\n {4}\}/)![0];
    expect(pressBlock).toContain("[data-theme='dark']) .r3-chip:active");
  });

  it('separates 44px chips under a coarse pointer', () => {
    expect(partyView).toMatch(/@media \(pointer: coarse\)\s*\{[\s\S]*?gap: 8px/);
  });
});
