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
});
