import { describe, expect, it } from 'vitest';

import { STARLIGHT_BASE_STYLESHEETS, starlightBaseCss } from './starlight-base-css';

/**
 * The print routes load Starlight's own stylesheets rather than restyling the
 * content, because the Handbook is a rendering of the house rules and not a
 * second set of pages. These assertions are about that being true and about the
 * one stylesheet being left out.
 *
 * Starlight's print stylesheet is the interesting exclusion. It re-declares the
 * site's whole colour ramp to a cool blue at hue 224, and the warm bark ramp
 * survives on the website only because the site's own stylesheet loads later in
 * the cascade. ADR-0020's spike is about not depending on that ordering in a
 * second place, so a print document that carried it would be relying on it.
 */

describe('starlight base css', () => {
  it('carries the content styles the house rules are written against', () => {
    const css = starlightBaseCss();

    // One marker per stylesheet, each a rule only that file could have.
    expect({
      markdown: css.includes('.sl-markdown-content'),
      reset: css.includes('@layer starlight.reset'),
      props: css.includes('--sl-color-hairline-shade'),
      asides: css.includes('.starlight-aside--caution'),
      utilities: css.includes('.sr-only'),
      layerOrder: css.includes('@layer starlight.base, starlight.reset'),
    }).toEqual({
      markdown: true,
      reset: true,
      props: true,
      asides: true,
      utilities: true,
      layerOrder: true,
    });
  });

  it('loads the layer order first, so the layer order is the one Starlight declares', () => {
    // The layers are declared by the first stylesheet that mentions them, so an
    // order that differs from Starlight's would silently change which of two
    // rules wins.
    const css = starlightBaseCss();

    expect(css.startsWith('/* layers.css */')).toBe(true);
    expect(css.slice('/* layers.css */'.length).trimStart().startsWith('@layer starlight.base,')).toBe(
      true
    );
  });

  it('leaves out Starlight print stylesheet', () => {
    expect(starlightBaseCss()).not.toContain('@media print');
    expect(STARLIGHT_BASE_STYLESHEETS).not.toContain('print.css');
  });

  it('names every stylesheet it loads, in Starlight order', () => {
    // `layers.css` first is load-bearing; the rest follow `Page.astro`, which is
    // the order they are meant to cascade in.
    expect(STARLIGHT_BASE_STYLESHEETS).toEqual([
      'layers.css',
      'props.css',
      'reset.css',
      'asides.css',
      'util.css',
      'markdown.css',
    ]);
  });
});