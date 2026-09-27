import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./FeatExplorer.astro', import.meta.url), 'utf8');

describe('FeatExplorer phone adaptation', () => {
  // Four stacked full-width controls put the first result card below the fold
  // on a phone. Search stays visible; the three selects collapse behind a
  // toggle that reports how many are set.
  it('collapses the three selects behind a toggle below sm', () => {
    expect(source).toContain('id="fx-panel"');
    expect(source).toContain('x-show="filtersOpen"');
    expect(source).toContain('x-show="!filtersOpen"');
    expect(source).toContain('aria-controls="fx-panel"');
  });

  // Alpine's x-show reveals by *removing* its own inline display rather than
  // setting one, so a class-based display:none on the panel would win again
  // once filtersOpen went true and the toggle would do nothing on a phone.
  // Visibility below sm has to come from x-show alone; x-cloak covers pre-boot.
  it('leaves the panel hidden below sm only via x-show, never via a class', () => {
    const panel = source.match(/<div[^>]*\bid="fx-panel"[^>]*>/)![0];
    expect(panel).toContain('x-show="filtersOpen"');
    expect(panel).toContain('x-cloak');
    expect(panel).not.toMatch(/\bclass="[^"]*\bhidden\b/);
  });

  // The 40rem media query is what reveals the panel again, and it has to be
  // !important: x-show's own inline display:none outranks a plain declaration,
  // so at sm+ the three selects would stay collapsed without it.
  it('reopens the panel at sm and above, and hides the toggle there', () => {
    const sm = source.match(/@media \(min-width:40rem\)\{\s*\[data-fx\] \.fx-panel\{[^}]*\}/)![0];
    expect(sm).toContain('display:flex !important');
    expect(sm).toContain('flex-direction:row');

    const toggle = source.match(/\.fx-filters-toggle\{ display:none !important; \}/);
    expect(toggle).not.toBeNull();
  });

  it('reports the active select count on the toggle', () => {
    expect(source).toContain('activeFilterCount()');
    expect(source).toContain('filtersOpen: false');
  });

  // The clear control is on the filter line, not on its own row and not inside
  // the collapsible panel. Below sm the panel is collapsed, so a clear control
  // inside it would be unreachable until the user opened the filters - a
  // regression in a control that is currently always one tap away.
  it('keeps the clear control outside the collapsible panel, at the trailing edge', () => {
    const panel = source.match(/<div[^>]*\bid="fx-panel"[\s\S]*?<\/div>\s*<\/div>/)![0];
    expect(panel).not.toContain('fx-clear');

    // Document order: it follows the panel, so at sm+ it lands to the right of
    // the Level select rather than before it.
    expect(source.indexOf('id="fx-panel"')).toBeLessThan(source.indexOf('class="fx-clear"'));

    // And it is a child of the filter line, not a sibling of it, so the row
    // that holds the search, the toggle and the panel also holds the clear.
    const line = source.match(/<div class="fx-filters">[\s\S]*?fx-clear[\s\S]*?<\/svg>\s*<\/button>/)![0];
    expect(line).toContain('aria-label="Clear all filters"');
  });

  // `py-2 text-sm` is a 38px control, and a sub-16px input font makes iOS
  // Safari zoom the whole page on focus - both fatal for a phone at the table.
  //
  // What the count protects is "one search and three selects, no more": a fifth
  // stacked control is the thing that pushed the first result card below the
  // fold. The disclosure toggle is a button and is asserted separately, since a
  // `button` in the same row as the panel would be a fourth stacked control.
  it('gives every control a 44px target and a 16px base font', () => {
    const controls = [...source.matchAll(/<(?:input|select)\b[\s\S]*?>/g)].map((m) => m[0]);
    expect(controls).toHaveLength(4);

    for (const control of controls) {
      expect(control).toContain('min-h-11');
      expect(control).toContain('text-base sm:text-sm');
    }

    const toggles = [...source.matchAll(/<button\b[\s\S]*?>/g)].map((m) => m[0]);
    const filterToggle = toggles.filter((b) => b.includes('fx-filters-toggle'));
    expect(filterToggle).toHaveLength(1);
    expect(filterToggle[0]).toContain('min-h-11');
    expect(filterToggle[0]).toContain('text-base');

    // The clear control is a 44px square via CSS, not a utility.
    const clear = source.match(/\.fx-clear\{[^}]*\}/)![0];
    expect(clear).toContain('width:44px');
    expect(clear).toContain('height:44px');
  });

  // x-show needs x-cloak, or the panel paints before Alpine initialises.
  it('cloaks every x-show region outside a template', () => {
    for (const div of source.matchAll(/<div([^>]*\bx-show=[^>]*)>/g)) {
      if (div[1].includes('x-for')) continue;
      expect(div[1]).toContain('x-cloak');
    }
  });
});

describe('FeatExplorer card composition', () => {
  // The prerequisite is a second line under the name, never a fifth column of
  // a grid. A grid column is what forced the long strings - the worst case in
  // the dataset is a 130-character prerequisite - into a narrow track, and a
  // narrow track plus a long unbreakable run is how a phone page ends up
  // scrolling sideways.
  it('renders the prerequisite on its own line beneath the name, not a column', () => {
    const prereq = source.match(/<template x-if="feat\.prerequisite">[\s\S]*?<\/template>/)![0];
    expect(prereq).toContain('class="fx-prereq"');
    expect(prereq).toContain('x-text="feat.prerequisite"');

    // It must sit between the head and the ability chips, in document order.
    const head = source.indexOf('class="fx-head"');
    const prereqAt = source.indexOf('x-if="feat.prerequisite"');
    const abil = source.indexOf('x-if="feat.abilityIncrease');
    expect(head).toBeLessThan(prereqAt);
    expect(prereqAt).toBeLessThan(abil);

    // The card is a single-column flex flow, not a grid. If it ever becomes a
    // grid the prereq would be a column again, which is what this forbids.
    const card = source.match(/\.fx-card\{[^}]*\}/)![0];
    expect(card).toContain('flex-direction:column');
    expect(card).not.toContain('grid-template-columns');
  });

  // Long unbroken runs are the actual overflow risk; the line has to be allowed
  // to break inside them, and the card column has to be able to shrink.
  it('lets a long prerequisite wrap instead of widening the card', () => {
    const prereq = source.match(/\.fx-prereq\{[^}]*\}/)![0];
    expect(prereq).toContain('overflow-wrap:anywhere');
    expect(prereq).toContain('line-height:1.45');

    // The grid's min track is `min(100%, 17rem)`, so at 320px the track is the
    // container width rather than a 17rem floor that would overflow.
    const grid = source.match(/\.fx-grid\{[^}]*\}/)![0];
    expect(grid).toContain('minmax(min(100%, 17rem), 1fr)');
  });

  // x-if, not x-show: a feat with no prerequisite must leave no gap in the
  // card's flex-column flow, and must not be present for a screen reader as
  // empty markup reading as a bare "Requires".
  it('omits the prerequisite line entirely when there is none', () => {
    expect(source).toContain('<template x-if="feat.prerequisite">');
    expect(source).not.toContain('x-show="feat.prerequisite"');
  });
});

describe('FeatExplorer surface', () => {
  const style = source.match(/<style is:global>([\s\S]*?)<\/style>/)![1];

  // The two token blocks, captured whole. `\[data-fx\]\{` followed by a newline
  // is what keeps these off `[data-fx]::before{`, which is a different rule.
  const lightBlock = () => style.match(/\[data-fx\]\{\n([\s\S]*?)\n {2}\}/)![1];
  const darkBlock = () => style.match(/:root\[data-theme="dark"\] \[data-fx\]\{([\s\S]*?)\n {2}\}/)![1];

  // Themed-Surface Rule: a tool surface is made of the ramps the rest of the
  // system uses. A private hex on this surface is what the Ledger Panel does
  // not do, and the contrast between the two tools open side by side is exactly
  // that private vocabulary.
  it('holds no private hex: every colour is a shared token or a mix over one', () => {
    const hexes = [...style.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hexes).toEqual([]);

    // Every declaration in the two token blocks has to resolve to something in
    // the system: either a shared token, a mix over one, or another `--fx-*`
    // that is itself one of those.
    for (const block of [lightBlock(), darkBlock()]) {
      for (const decl of [...block.matchAll(/(--fx-[\w-]+):([^;]+)/g)]) {
        const value = decl[2].trim();
        if (value.startsWith('var(--fx-')) continue;
        expect(value).toMatch(/var\(--(color|sl-color)-/);
      }
    }
  });

  // The other half of the rule: the surface inverts. A value declared once and
  // never re-declared holds its paper fixed across both modes, which is the
  // outcome a theme toggle exists to prevent.
  it('re-declares its palette under the dark theme', () => {
    const dark = style.match(/:root\[data-theme="dark"\] \[data-fx\]\{([\s\S]*?)\}/)![1];
    for (const token of ['--fx-page', '--fx-card', '--fx-field', '--fx-ink', '--fx-ink-soft', '--fx-rule', '--fx-rule-strong', '--fx-heading', '--fx-focus', '--fx-chip']) {
      expect(dark).toContain(`${token}:`);
    }
    // The three seal inks are the exception the dark theme has to restate too:
    // they are the one place two of the three seals change step, because a dark
    // seal on a dark page is not a seal.
    for (const token of ['--fx-seal-origin', '--fx-seal-general', '--fx-seal-epic']) {
      expect(dark).toContain(`${token}:`);
    }
  });

  // The head's bracket: the Ledger Panel's 3px cap over the top edge and the
  // 2px rule closing the head. Neither carries colour alone.
  it('adopts the cap and the 2px head rule', () => {
    const cap = style.match(/\[data-fx\]::before\{[^}]*\}/)![0];
    expect(cap).toContain('height:3px');
    expect(cap).toContain('background: var(--fx-heading)');
    expect(cap).toContain('inset-inline:-1px');

    expect(style).toMatch(/\.fx-title\{[^}]*border-bottom:2px solid var\(--fx-rule-strong\)/);
  });

  // The cap is the only accent on this surface, which is a stronger claim than
  // "the cap exists": it is the only pseudo-element the *root* draws. A stitched
  // spine and a wax ribbon have each come off this root; neither was a Tool
  // Panel feature, and each read as a doubled border rather than as furniture.
  // If a second one ever comes back, the surface has two accents and the bracket
  // stops bracketing.
  //
  // Matching on `[data-fx]::` alone would let a root written `[data-fx] > div::after`
  // walk straight past, so this asserts the whole inventory of pseudo-elements in
  // the component instead. That is a whitelist: a new one anywhere - on the root
  // or on any descendant - has to be added here deliberately, and the two that
  // are on the list are control furniture (a caret glyph and a 6px chip dot),
  // not accents. "One accent" is a claim about what is coloured, not about what
  // has a generated box.
  it('draws the cap as the only pseudo-element on the root', () => {
    const bare = style.replace(/\/\*[\s\S]*?\*\//g, '');
    const pseudos = [...bare.matchAll(/([^{}\n]*::(?:before|after))\s*\{/g)].map((m) => m[1].trim());

    // Sorted, so a cosmetic reorder of the stylesheet is not a failure but a
    // fourth pseudo-element still is.
    expect([...pseudos].sort()).toEqual(['.fx-chip::before', '.fx-control::after', '[data-fx]::before']);
    expect(pseudos.filter((selector) => selector.startsWith('[data-fx]::'))).toEqual([
      '[data-fx]::before',
    ]);
  });

  // This surface is the Tool Panel, not a themed copy of it. It used to be a
  // parchment page with a 25% Parchment mix over Bark 100, a three-tile mottle
  // background and a fibre layer; the mix is gone, the mottle is gone, and what
  // is left has to be the panel's own values or the resemblance is accidental.
  it('is the Tool Panel rather than a themed copy of it', () => {
    const light = lightBlock();
    const dark = darkBlock();

    // `--pb-surface` and `--pb-raised`, named in the shared ramps Point Buy
    // uses, and the card one step off the page so it still reads as a leaf.
    expect(light).toContain('--fx-page: var(--color-bark-100);');
    expect(light).toContain('--fx-card: var(--color-bark-200);');
    expect(dark).toContain('--fx-page: var(--color-bark-800);');
    expect(dark).toContain('--fx-card: var(--color-bark-700);');

    expect(light).toContain('border:1px solid var(--fx-rule-strong); border-radius: 8px;');
    expect(light).toContain('box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);');
    expect(dark).toContain('box-shadow: none;');

    // No painted background at all: a plain surface takes a `background`, and
    // the moment a `background-image` comes back the panel is a picture of a
    // material again rather than the material.
    expect(style).not.toMatch(/background-(image|size|position|repeat)/);
    expect(light).toMatch(/background: var\(--fx-page\)/);
  });

  // A removed ornament leaves its reservation behind unless the reservation is
  // removed with it. The right padding was 2rem against 1.75rem on the left to
  // clear the wax ribbon's 24px reach; the ribbon is gone, so the two sides have
  // to match, and a silent asymmetry on a panel is a visible misalignment.
  it('reserves nothing on either edge, and pads both sides the same', () => {
    const sides = (declaration: string) => {
      const values = declaration.match(/[\d.]+rem/g)!.map((v) => parseFloat(v));
      // 1 value: all four. 2: vertical, then horizontal. 4: each side.
      const horizontal = values.length === 1 ? [values[0], values[0]] : values.length === 2 ? [values[1], values[1]] : [values[3], values[1]];
      return { left: horizontal[0], right: horizontal[1] };
    };

    const base = sides(style.match(/position:relative; padding:([^;]+);/)![1]);
    expect(base.left).toBe(base.right);

    const narrow = sides(style.match(/@media \(max-width:39\.999rem\)\{ \[data-fx\]\{ padding:([^;]+); \}/)![1]);
    expect(narrow.left).toBe(narrow.right);
    // Tighter on a phone because 320px cannot spend 28px on both sides, and
    // looser than nothing - the panel is a panel, not an edge-to-edge sheet.
    expect(narrow.left).toBeLessThan(base.left);
    expect(narrow.left).toBeGreaterThan(0);
  });

  // Nothing may be declared and left unreferenced: an undefined custom property
  // does not error, it silently drops the declaration that used it, so the
  // tokens that went with the removed ornaments have to go too.
  it('declares no custom property it does not use', () => {
    const style = source.match(/<style is:global>([\s\S]*?)<\/style>/)![1].replace(/\/\*[\s\S]*?\*\//g, '');
    const declared = new Set([...style.matchAll(/(--fx-[\w-]+):/g)].map((m) => m[1]));
    const used = new Set([...style.matchAll(/var\((--fx-[\w-]+)\)/g)].map((m) => m[1]));

    expect([...declared].filter((token) => !used.has(token))).toEqual([]);
    expect([...used].filter((token) => !declared.has(token))).toEqual([]);
  });
});

describe('FeatExplorer count and tier key', () => {
  // Two live regions on one component is an accessibility defect: a screen
  // reader announces the count twice on every filter change. The head's line is
  // the one that survived, and it says the same thing in one place - the count
  // and the size of the collection - rather than being split with a bar.
  it('announces the count from exactly one live region', () => {
    // Comments are stripped first: this file explains the two-live-region
    // defect it forbids, and the explanation must not trip its own assertion.
    const markup = source.replace(/<!--[\s\S]*?-->/g, '');
    expect([...markup.matchAll(/aria-live=/g)]).toHaveLength(1);
    expect([...markup.matchAll(/role="status"/g)]).toHaveLength(1);
    expect(markup).not.toContain('feats found');
  });

  // The seal monograms are two letters with no key anywhere on the page, so the
  // key is real text - a dl, not a tooltip and not an image - and it is not
  // hidden from a screen reader, which needs the same three mappings a reader
  // gets. It sits outside the collapsible panel so it is on the page at 320 as
  // well as at 1440.
  it('keys the tier seals in visible text, outside the collapsible panel', () => {
    const legend = source.match(/<div class="fx-legend">[\s\S]*?<\/dl>\s*<\/div>/)![0];
    expect(legend).toContain('aria-labelledby="fx-legend-label"');
    expect(legend).not.toContain('aria-hidden');

    for (const [mono, name] of [['OR', 'Origin'], ['GE', 'General'], ['EB', 'Epic Boon']]) {
      expect(legend).toContain(`>${mono}</span>`);
      expect(legend).toContain(`<dd>${name}</dd>`);
      expect(legend).toContain(`data-tier="${name === 'Origin' ? 'origin' : name === 'General' ? 'general' : 'epic'}"`);
    }

    // The marks are the seals themselves, at key size: one class, so the legend
    // reads off the same three declarations the medallions use.
    expect([...legend.matchAll(/class="fx-seal fx-seal-key"/g)]).toHaveLength(3);
    expect(source.indexOf('id="fx-panel"')).toBeLessThan(source.indexOf('class="fx-legend"'));
  });
});
