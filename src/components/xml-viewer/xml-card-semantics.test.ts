import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Saving Throws and Skills tables moved into their own components when medium
// gained the same card as large, the Languages and Feats pill sections moved into
// a third when they began to ride different panels per display mode (ADR-0017),
// and the Spellcasting plates moved into a fourth when the section arrived. These
// guards are about what the card renders, so they read the card and the four
// components it delegates to as one source.
const source = [
  'XmlCard.astro',
  'SavesTable.astro',
  'SkillsTable.astro',
  'LanguagesFeats.astro',
  'SpellcastingPanel.astro',
]
  .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
  .join('\n');

/**
 * Structural guards for the card's semantics.
 *
 * These exist because the regressions they cover are invisible in a render
 * snapshot: a heading that is `opacity-0` until hover still renders identically,
 * a `title` attribute renders identically to no attribute at all, and a `+0 temp`
 * line renders as text. Each was a real finding from
 * `docs/audits/2026-09-26-design-audit.md`.
 */
describe('XmlCard section semantics', () => {
  it('renders section labels as real headings, not hover-only spans', () => {
    // `hoverLabelClass` was `opacity-0` until `group-hover`, which hid every
    // label from keyboard focus and from touch entirely.
    expect(source, 'hoverLabelClass still exists').not.toContain('hoverLabelClass');
    // Overview is not here: the menu entry names its panel at both modes, and a
    // heading repeating that word below the bar would be the same name twice.
    for (const label of ['Vitals', 'Passive Skills', 'Saving Throws', 'Languages', 'Feats']) {
      expect(source, `${label} is not a heading`).toMatch(
        new RegExp(`<h3[^>]*>${label}</h3>`),
      );
    }
    expect(source, 'the Overview panel has a heading repeating its menu entry').not.toContain(
      '>Overview</h3>',
    );
    // The five other sections name themselves only at large, where the bar is a
    // row of identical links with no selection state and the page is one long
    // scroll. This guard cannot tell the two modes apart from source alone, so it
    // checks the guard rather than the absence: a bare `<h3>Skills</h3>` with no
    // `jumping &&` in front of it would repeat the tab at medium, which is the
    // regression this rule exists to prevent. The rendered per-mode behaviour is
    // asserted in `xml-card-passives.test.ts`.
    for (const label of ['Skills', 'Spellcasting', 'Weapons', 'Features', 'Powers']) {
      expect(source, `${label} has a heading that is not gated on large`).toMatch(
        new RegExp(`\\{jumping && <h3[^>]*>${label}</h3`),
      );
    }
    // The Weapons section holds two tables now, so it takes one heading naming the
    // section and an `h4` per rendered table beneath it. Two sibling headings
    // claiming to be one section is not an outline, and the level matters as much:
    // `h2 > h3 > h4 > h5` has to stay contiguous, so a table's own name is a step
    // below the section rather than a second `h3`.
    for (const label of ['Equipped Weapons', 'Carried Weapons']) {
      expect(source, `${label} has a subheading that is not gated on large`).toMatch(
        new RegExp(`\\{jumping && \\(?\\s*<h4[^>]*>${label}</h4`),
      );
    }
    expect(source, 'a weapon table names itself at the section level').not.toMatch(
      /<h3[^>]*>(Equipped|Carried) Weapons</,
    );
    // Spellcasting's slot plates label themselves with their level, so the section
    // takes no subheading. An `h4` per slot would claim the panel has as many
    // subsections as it has figures, which is the outline mistake the Weapons
    // restructure was made to fix rather than repeat.
    expect(source, 'a spell slot plate carries a heading of its own').not.toMatch(
      /<h[45][^>]*>Level \d/,
    );
    // Inventory's is inside a flex row rather than a bare h3, because it carries
    // the carried-weight total on its baseline.
    expect(source, 'Inventory has an ungated heading').toMatch(
      /jumping \? \([\s\S]*?<h3 class=\{sectionHeadingClass\}>Inventory<\/h3>/,
    );
    // Medium is the mode where the tab is the name, so the headings must not leak
    // across: the medium branch of each one has to exist and carry no heading.
    expect(source, 'the medium branch still renders a section heading').not.toMatch(
      /\) : \([\s\S]{0,80}<h3 class=\{`\$\{sectionHeadingClass\} mb-2`\}>/,
    );
  });

  it('fixes Languages and Feats at h3, in one place, with no in-plate copy of the name', () => {
    // ADR-0017: the two pill sections ride the Skills panel at medium and the
    // Overview panel at large, from one component. Two copies would be two
    // heading treatments to keep in step, and the heading is the thing this
    // decision changes - so the markup is asserted to exist exactly once across
    // the card and the three components it delegates to.
    for (const label of ['Languages', 'Feats']) {
      const headings = [...source.matchAll(new RegExp(`<h[2-6][^>]*>${label}</h`, 'g'))];
      expect(headings.length, `${label} is headed in more than one place`).toBe(1);
      // The in-plate uppercase label used to sit beside the pills at `@md`, so at
      // the 358px a roster card measures the section name was the part that
      // wrapped before the first pill did. The heading replaces it, so the copy is
      // gone rather than hidden.
      expect(source, `${label} still has an in-plate uppercase label`).not.toContain(
        `uppercase tracking-wide">${label}</div>`
      );
    }
    // The level is literal, not one of the mode-dependent bindings. Neither panel
    // carrying these two has a heading at either mode, so there is nothing above
    // them to derive a level from and the two modes agree - which is the point of
    // the exception, so it is spelled out rather than left to be inferred.
    for (const label of ['Languages', 'Feats']) {
      expect(source, `${label} is not a literal h3 in sectionHeadingClass`).toContain(
        '<h3 class={`${sectionHeadingClass} mb-2`}>' + label + '</h3>'
      );
    }
  });

  it('mounts the shared pill sections once per panel, not once per mode copy', () => {
    // One mount in the Overview panel for large and one in the Skills panel for
    // medium. A third, or a duplicated block inside either panel, is the second
    // implementation ADR-0017 rules out.
    const card = readFileSync(new URL('XmlCard.astro', import.meta.url), 'utf8');
    expect([...card.matchAll(/<LanguagesFeats /g)]).toHaveLength(2);
    expect([...card.matchAll(/import LanguagesFeats from/g)]).toHaveLength(1);
  });

  it('steps the heading levels down from the card name', () => {
    // The card name is the top-level heading on the page (Starlight's frontmatter
    // supplies the h1), so everything under it steps down from there. Sections
    // at h2 made each one an ancestor of the name in the outline.
    expect(source, 'the card name is not an h2').toMatch(/<h2 class="char-name"/);
    // The margin is appended at the call site, so the class is a template
    // expression rather than the bare constant.
    expect(source, 'a section label is not an h3').toMatch(
      /<h3 class=\{`\$\{sectionHeadingClass\} mb-2`\}>/,
    );
    expect(source, 'a section label is still an h2').not.toMatch(
      /<h2 class=\{`\$\{sectionHeadingClass\} mb-2`\}>/,
    );
    // No level is skipped on the way down, in either mode. The deepest heading is
    // now an h5 rather than an h4, because at large a section names itself and its
    // power groups genuinely nest beneath it: h2 card name, h3 section, h4 Level N,
    // h5 group. At medium the same groups sit directly under the card name at
    // h3/h4. Both are contiguous, which is the property being guarded - the h5 is
    // not a skip, it is a fourth step.
    expect(source, 'a heading level was skipped on the way down').not.toMatch(/<h6[ >]/);
    // The four levels are bound in one place, so the tags are literals only there.
    // A literal h3/h4/h5 elsewhere in the card would mean a level decided outside
    // the one place that documents why it differs by mode.
    expect(source, 'h2 is unused').toMatch(/<h2 class="char-name"/);
    // The card name is a literal h2, so the bound levels start at h3 and run down
    // to the group name one step below whatever owns it at that mode.
    expect(source, 'the Level N heading level is not bound').toContain(
      "jumping ? 'h4' : 'h3'",
    );
    expect(source, 'the power group heading level is not bound').toContain(
      "jumping ? 'h5' : 'h4'",
    );
    expect(source, 'the Level N heading is not bound through the shared tag').not.toMatch(
      /<h3 class=\{`\$\{sectionSubheadingClass\} mt-3 mb-1`\}>/,
    );
  });

  it('does not put conflicting margin utilities in one heading', () => {
    // `sectionHeadingClass` used to carry `mb-2` and SectionHeader's flex-row
    // variant appended `mb-0` to cancel it, so the rendered attribute read
    // `... mb-2 ... mb-0`. Which one won was a function of stylesheet order, not
    // markup order, which is not a thing to rely on for a heading's rhythm.
    const headings = [...source.matchAll(/<h[2345][^>]*class="([^"]*)"/g)].map((m) => m[1]);
    expect(headings.length).toBeGreaterThan(0);
    for (const className of headings) {
      const margins = [...className.matchAll(/\bmb-(?!x|y)/g)].map((m) => m[0]);
      expect(new Set(margins).size, `two bottom margins: ${className}`).toBe(margins.length);
    }
  });

  it('truncates the name to one line, like the meta line beneath it', () => {
    // The name used to wrap deliberately (`overflow-wrap: break-word`), which
    // gave it a second line in a two-column roster and cost the header its
    // shape. That decision is reversed: the name now truncates with an
    // ellipsis, exactly as the meta line does. A truncation rule produces
    // byte-identical HTML whether it is present or absent, so no render
    // snapshot can catch a reversion here.
    const rule = /\.char-name\s*\{([^}]*)\}/.exec(source)?.[1] ?? '';
    for (const declaration of ['white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis']) {
      expect(rule, `.char-name is missing "${declaration}"`).toContain(declaration);
    }
    expect(rule, '.char-name still wraps').not.toContain('overflow-wrap');
  });

  it('leaves the card subdivisions unnamed, so they are not landmarks', () => {
    // The party page renders six cards. Naming every subdivision produced
    // "Vitals" as a landmark once per card - a landmark list no screen reader
    // user can navigate. A <section> maps to `region` only when it has an
    // accessible name; unnamed, it is a plain container. The heading carries
    // the navigation, which is what the heading is for.
    const named = [...source.matchAll(/<section([^>]*)>/g)]
      .map((m) => m[1])
      .filter((a) => /aria-label|aria-labelledby/.test(a));
    expect(named, `named <section>: ${named.join(' | ')}`).toEqual([]);
    expect(source, 'a <section> still uses title=').not.toMatch(/<section[^>]*\stitle=/);
  });
});

describe('XmlCard proficiency and preparation marks', () => {
  // A coloured dot with a `title` is not announced reliably, and a player who
  // cannot distinguish gold-on-bark from bark-on-bark cannot tell which saves or
  // spells are prepared at all.
  const SOLO_MARKS = [
    ['Prepared', "mark === 'prepared'"],
    ['Always prepared (class/subclass)', "mark === 'always'"],
  ] as const;

  it.each(SOLO_MARKS)('gives the %s mark a text alternative', (text) => {
    expect(source, `no sr-only "${text}"`).toContain(`<span class="sr-only">${text}</span>`);
  });

  it('draws the Proficient mark from one shared definition, so one legend covers both places', () => {
    // The Abilities tiles and the Saving Throws table both mark a proficient save,
    // and a reader learns that legend once. Two call sites each holding a gold hex
    // is a legend that survives only until one of them is edited, so the colour,
    // the shape and the screen-reader word live in `proficiency-mark.ts` and both
    // call sites reference them.
    const mark = readFileSync(new URL('proficiency-mark.ts', import.meta.url), 'utf8');
    expect(mark, 'the coin lost its gold').toMatch(/proficiencyCoinClass = '[^']*bg-\[#c68000\]/);
    expect(mark, 'the coin lost its shape').toContain('rounded-full');
    expect(mark, 'the mark lost its screen-reader word').toContain(
      "proficiencyMarkLabel = 'Proficient'"
    );
    for (const file of ['XmlCard.astro', 'SavesTable.astro']) {
      const callSite = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(callSite, `${file} does not use the shared coin`).toContain('proficiencyCoinClass');
      expect(callSite, `${file} does not use the shared label`).toContain('proficiencyMarkLabel');
    }
    // The glyph is decorative on both surfaces, because the sr-only word is what
    // carries the meaning to assistive tech.
    expect(source, 'a proficiency coin is announced as well as labelled').not.toMatch(
      /class=\{proficiencyCoinClass\}(?![^>]*aria-hidden)/,
    );
  });

  it('hides the mark glyphs from assistive tech, since the text carries meaning', () => {
    const decorative = [...source.matchAll(/class="[^"]*rounded-full[^"]*"([^>]*)>/g)].map((m) => m[1]);
    const unmarked = decorative.filter((a) => !/aria-hidden/.test(a));
    expect(unmarked, `dot without aria-hidden: ${unmarked.join(' | ')}`).toEqual([]);
  });

  it('gives the per-skill rank mark a text alternative', () => {
    // The skills table interpolates the label, so it cannot be matched literally
    // like the three static marks above.
    expect(source, 'no sr-only skill rank label').toMatch(
      /<span class="sr-only">\{SKILL_RANK_LABEL\[rank\]\}<\/span>/,
    );
    expect(source, 'skill rank still relies on a title attribute').not.toMatch(
      /data-prof-rank=\{rank\}[\s\S]{0,80}title=/,
    );
  });

  it('does not rely on title attributes for any proficiency state', () => {
    for (const state of ['Proficient', 'Prepared', 'Expertise', 'Half proficiency', 'Always prepared']) {
      expect(source, `still uses title="${state}"`).not.toContain(`title="${state}"`);
    }
  });
});

describe('XmlCard hit points plate', () => {
  it('omits the temp line when there are no temporary hit points', () => {
    // Every card rendered "+0 temp" next to the number players read mid-session.
    expect(source).toMatch(/\{tempHp > 0 && <span class="char-hp-temp">/);
  });

  it('keeps a dark-theme step for the micro-labels', () => {
    // The plate is near-black in dark, so the light-theme step does not transfer.
    expect(source).toMatch(/\[data-theme='dark'\] \.char-hp-label/);
    expect(source).toMatch(/\[data-theme='dark'\] \.char-hp-temp/);
  });
});
