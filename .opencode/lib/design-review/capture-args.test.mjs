import { describe, expect, it } from 'vitest';

import { DEFAULTS, parseArgs } from './capture.mjs';

describe('parseArgs', () => {
  it('defaults to the contract pair and the documented dev server URL', () => {
    const options = parseArgs([]);

    expect(options.url).toBe('http://localhost:4321/');
    expect(options.captures).toBe('desktop=1440x900,mobile=390x844');
    expect(options.outDir).toBe('.impeccable/review');
    expect(options.font).toBe('Cinzel');
  });

  it('does not start a dev server unless asked', () => {
    expect(parseArgs([]).startDevServer).toBe(false);
  });

  it('starts the documented server only behind the explicit opt-in', () => {
    expect(parseArgs(['--start-dev-server']).startDevServer).toBe(true);
  });

  it('reads the font CDN outage self-test flag', () => {
    expect(parseArgs(['--simulate-font-cdn-outage']).simulateFontCdnOutage).toBe(true);
  });

  it('rejects an unknown option rather than ignoring it', () => {
    expect(() => parseArgs(['--full-page'])).toThrow(/--full-page/);
  });

  it('rejects an option with no value instead of capturing nothing', () => {
    expect(() => parseArgs(['--url'])).toThrow(/--url needs a value/);
  });

  it('keeps the review directory overridable', () => {
    expect(parseArgs(['--out-dir', 'tmp/review']).outDir).toBe('tmp/review');
    expect(DEFAULTS.outDir).toBe('.impeccable/review');
  });

  // Every surface on this site inverts per theme, so a capture set pinned to one
  // theme reviews half of nothing. Light is the default because ThemeProvider
  // resolves to it when no preference is stored, so a capture that seeds nothing
  // lands there anyway - but it is a decision the flag makes explicit rather
  // than an accident of the default.
  it('captures light by default and dark on request', () => {
    expect(parseArgs([]).theme).toBe('light');
    expect(parseArgs(['--theme', 'dark']).theme).toBe('dark');
    expect(parseArgs(['--theme', 'light']).theme).toBe('light');
  });

  // The full-page default is what the review contract wants, so scoping down to
  // the first screen has to be asked for rather than inferred.
  it('captures the whole page unless viewport-only is asked for', () => {
    expect(parseArgs([]).viewportOnly).toBe(false);
    expect(parseArgs(['--viewport-only']).viewportOnly).toBe(true);
  });
});
