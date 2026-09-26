/**
 * Unit tests for the measurement command's argument parsing.
 *
 * The parse is the seam between a person typing a flag in a shell and a browser
 * being launched, so it is where a typo has to be caught. Every case here is one
 * that would otherwise cost a browser launch, or produce a measurement of
 * something the reader did not ask for.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_CONTRAST_SELECTORS, DEFAULT_WIDTHS, parseArgs } from './measure.mjs';

describe('parseArgs', () => {
  it('answers --help and a bare invocation with the help command, not an error', () => {
    expect(parseArgs([]).command).toBe('help');
    expect(parseArgs(['--help']).command).toBe('help');
  });

  it('defaults overflow to the widths ADR-0009 committed to', () => {
    expect(parseArgs(['overflow']).widths).toBe(DEFAULT_WIDTHS);
    expect(DEFAULT_WIDTHS).toBe('320,360,390,640');
  });

  it('defaults contrast to the documented selector set, which is a list not a string', () => {
    const options = parseArgs(['contrast']);
    expect(options.selectors).toBeUndefined();
    expect(DEFAULT_CONTRAST_SELECTORS).toContain('.r3-chip');
    expect(DEFAULT_CONTRAST_SELECTORS).toContain('.char-hp-label');
  });

  it('defaults to a phone width, because the site is read at the table', () => {
    expect(parseArgs(['overflow']).width).toBe(390);
  });

  it('refuses an unknown command and names the ones it has', () => {
    expect(() => parseArgs(['screenshot'])).toThrow(/overflow/);
  });

  it('refuses an unknown flag rather than ignoring it, which would measure the wrong thing', () => {
    expect(() => parseArgs(['overflow', '--widht', '360'])).toThrow(/--widht/);
  });

  it('refuses a flag with no value', () => {
    expect(() => parseArgs(['overflow', '--widths'])).toThrow(/needs a value/);
  });

  it('refuses a tap with no selector, because there is nothing to tap', () => {
    expect(() => parseArgs(['tap'])).toThrow(/--selector/);
  });

  it('refuses a width that is not a number', () => {
    expect(() => parseArgs(['contrast', '--width', 'phone'])).toThrow(/needs a number/);
    expect(() => parseArgs(['contrast', '--width', '0'])).toThrow(/at least 1/);
  });

  it('rounds a viewport width and leaves a tolerance fractional', () => {
    const options = parseArgs(['contrast', '--width', '360.6', '--tolerance', '0.5']);
    expect(options.width).toBe(361);
    expect(options.tolerance).toBe(0.5);
  });

  it('does not start a dev server unless asked', () => {
    expect(parseArgs(['overflow']).startDevServer).toBe(false);
    expect(parseArgs(['overflow', '--start-dev-server']).startDevServer).toBe(true);
  });

  it('fails on a finding by default, so a run can be a gate', () => {
    expect(parseArgs(['overflow']).fail).toBe(true);
    expect(parseArgs(['overflow', '--no-fail']).fail).toBe(false);
  });

  it('validates the width list before any browser is launched', () => {
    expect(() => parseArgs(['overflow', '--widths', 'phone'])).toThrow(/width/i);
  });
});
