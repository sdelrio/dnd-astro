import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./XmlCard.astro', import.meta.url), 'utf8');

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
    for (const label of ['Overview', 'Vitals', 'Passive Skills', 'Saving Throws']) {
      expect(source, `${label} is not a heading`).toMatch(
        new RegExp(`<h3[^>]*>${label}</h3>`),
      );
    }
  });

  it('steps the heading levels down from the card name', () => {
    // The card name is the top-level heading on the page (Starlight's frontmatter
    // supplies the h1), so everything under it steps down from there. Sections
    // at h2 made each one an ancestor of the name in the outline.
    expect(source, 'the card name is not an h2').toMatch(/<h2 class="char-name"/);
    expect(source, 'a section label is not an h3').toMatch(/<h3 class=\{sectionHeadingClass\}>/);
    expect(source, 'a section label is still an h2').not.toMatch(/<h2 class=\{sectionHeadingClass\}>/);
    // No level is skipped on the way down.
    for (const level of [2, 3, 4, 5]) {
      expect(source, `h${level} is unused`).toMatch(new RegExp(`<h${level}[ >]`));
    }
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
    ['Proficient', 'saveprof > 0'],
    ['Prepared', "mark === 'prepared'"],
    ['Always prepared (class/subclass)', "mark === 'always'"],
  ] as const;

  it.each(SOLO_MARKS)('gives the %s mark a text alternative', (text) => {
    expect(source, `no sr-only "${text}"`).toContain(`<span class="sr-only">${text}</span>`);
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
