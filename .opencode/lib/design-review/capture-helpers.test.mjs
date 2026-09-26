import { describe, expect, it } from 'vitest';

import {
  PNG_SIGNATURE,
  assessFontReadiness,
  browserCandidates,
  clearStaleCapture,
  formatBrowserNotFound,
  formatDevServerHint,
  formatFontGateFailure,
  formatNoUsableBrowser,
  parseCaptureSet,
  parseViewport,
  readPngDimensions,
  validateCapture,
} from './capture-helpers.mjs';

/** A minimal but structurally valid PNG: signature, IHDR with the given size. */
function pngBytes(width, height, { padTo = 0 } = {}) {
  const bytes = new Uint8Array(8 + 25 + padTo);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); // IHDR data length
  bytes[12] = 0x49; // 'I'
  bytes[13] = 0x48; // 'H'
  bytes[14] = 0x44; // 'D'
  bytes[15] = 0x52; // 'R'
  view.setUint32(16, width);
  view.setUint32(20, height);
  view.setUint8(24, 8); // bit depth
  view.setUint8(25, 6); // colour type
  return bytes;
}

describe('parseViewport', () => {
  it('reads a width and a height', () => {
    expect(parseViewport('1440x900')).toEqual({ width: 1440, height: 900 });
  });

  it('rejects a viewport with no height', () => {
    expect(() => parseViewport('1440')).toThrow(/1440/);
  });

  it('rejects a non-numeric width', () => {
    expect(() => parseViewport('wide x 900')).toThrow(/wide x 900/);
  });

  it('rejects a zero width, which would silently capture nothing', () => {
    expect(() => parseViewport('0x900')).toThrow(/0x900/);
  });

  it('rejects an absurd width rather than handing it to the browser', () => {
    expect(() => parseViewport('99999x900')).toThrow(/99999x900/);
  });
});

describe('parseCaptureSet', () => {
  it('reads the contract pair, desktop full page and mobile', () => {
    expect(parseCaptureSet('desktop=1440x900,mobile=390x844')).toEqual([
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]);
  });

  it('rejects a name that is not a plain file stem', () => {
    expect(() => parseCaptureSet('../escape=1440x900')).toThrow(/\.\.\/escape/);
  });

  it('rejects a viewport missing its =', () => {
    expect(() => parseCaptureSet('desktop')).toThrow(/desktop/);
  });

  it('rejects two captures with the same name, which would silently overwrite one with the other', () => {
    expect(() => parseCaptureSet('desktop=1440x900,desktop=390x844')).toThrow(/desktop/);
  });
});

describe('readPngDimensions', () => {
  it('reads width and height out of the IHDR chunk', () => {
    expect(readPngDimensions(pngBytes(1440, 5230))).toEqual({ width: 1440, height: 5230 });
  });

  it('returns null for bytes that are not a PNG', () => {
    expect(readPngDimensions(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
  });

  it('returns null for a truncated PNG header', () => {
    expect(readPngDimensions(pngBytes(1440, 100).slice(0, 20))).toBeNull();
  });
});

describe('validateCapture', () => {
  it('accepts a real capture at the requested width', () => {
    const result = validateCapture({
      label: 'desktop.png',
      bytes: pngBytes(1440, 5230, { padTo: 4096 }),
      expectedWidth: 1440,
      minBytes: 1024,
    });

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.width).toBe(1440);
  });

  it('rejects a capture that was never written', () => {
    const result = validateCapture({
      label: 'mobile.png',
      bytes: null,
      expectedWidth: 390,
      minBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/mobile\.png.*not written/);
  });

  it('rejects a truncated file and says so', () => {
    const result = validateCapture({
      label: 'desktop.png',
      bytes: pngBytes(1440, 5230),
      expectedWidth: 1440,
      minBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/truncated/);
  });

  it('rejects a capture whose width is not the requested one', () => {
    const result = validateCapture({
      label: 'mobile.png',
      bytes: pngBytes(500, 3733, { padTo: 4096 }),
      expectedWidth: 390,
      minBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/500 wide.*390/);
  });

  it('rejects an empty file', () => {
    const result = validateCapture({
      label: 'desktop.png',
      bytes: new Uint8Array(0),
      expectedWidth: 1440,
      minBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/empty/);
  });

  it('collects every problem rather than stopping at the first', () => {
    const result = validateCapture({
      label: 'mobile.png',
      bytes: pngBytes(500, 10),
      expectedWidth: 390,
      minBytes: 1024,
    });

    expect(result.problems.length).toBeGreaterThan(1);
  });
});

describe('browserCandidates', () => {
  const found = { chrome: '/cache/chrome-mac-x64/Google Chrome for Testing', installed: '/Applications/Google Chrome.app' };

  it('offers only the override when one is set, so nothing else can be used by accident', () => {
    expect(
      browserCandidates({
        override: '/opt/chrome',
        cached: [found.chrome],
        installed: [found.installed],
        isExecutable: () => true,
      }),
    ).toEqual([{ path: '/opt/chrome', source: 'override' }]);
  });

  it('fails loudly when the override is set but not executable, rather than silently using another browser', () => {
    expect(() =>
      browserCandidates({
        override: '/opt/missing-chrome',
        cached: [found.chrome],
        installed: [found.installed],
        isExecutable: () => false,
      }),
    ).toThrow(/DESIGN_REVIEW_CHROME.*\/opt\/missing-chrome/);
  });

  it('puts cached Chrome for Testing builds ahead of the installed browser', () => {
    const candidates = browserCandidates({
      override: undefined,
      cached: [found.chrome],
      installed: [found.installed],
      isExecutable: () => true,
    });

    expect(candidates).toEqual([
      { path: found.chrome, source: 'chrome-for-testing' },
      { path: found.installed, source: 'installed' },
    ]);
  });

  it('skips a cached path that is not executable', () => {
    expect(
      browserCandidates({
        override: undefined,
        cached: ['/cache/gone'],
        installed: [found.installed],
        isExecutable: (p) => p === found.installed,
      }),
    ).toEqual([{ path: found.installed, source: 'installed' }]);
  });

  it('keeps several cached candidates, because a binary that exists is not one that will start', () => {
    expect(
      browserCandidates({
        override: undefined,
        cached: ['/cache/a', '/cache/b'],
        installed: [],
        isExecutable: () => true,
      }),
    ).toHaveLength(2);
  });

  it('names the override variable and every path it searched when nothing is installed', () => {
    let message = '';
    try {
      browserCandidates({
        override: undefined,
        cached: ['/cache/gone'],
        installed: ['/Applications/Google Chrome.app'],
        isExecutable: () => false,
      });
    } catch (error) {
      message = error.message;
    }

    expect(message).toMatch(/DESIGN_REVIEW_CHROME/);
    expect(message).toMatch(/\/cache\/gone/);
    expect(message).toMatch(/never downloads/);
  });
});

describe('formatNoUsableBrowser', () => {
  it('names every candidate it tried and why each was skipped', () => {
    const message = formatNoUsableBrowser(
      [
        { path: '/cache/a', source: 'chrome-for-testing' },
        { path: '/Applications/Google Chrome.app', source: 'installed' },
      ],
      [{ path: '/cache/a', reason: 'never reported a DevTools port' }],
    );

    expect(message).toMatch(/\/cache\/a/);
    expect(message).toMatch(/never reported a DevTools port/);
    expect(message).toMatch(/DESIGN_REVIEW_CHROME/);
  });
});

describe('formatBrowserNotFound', () => {
  it('lists each searched tier in the documented resolution order', () => {
    const message = formatBrowserNotFound({
      override: undefined,
      cached: ['/cache/gone'],
      installed: ['/Applications/Google Chrome.app'],
    });

    expect(message.indexOf('DESIGN_REVIEW_CHROME')).toBeLessThan(message.indexOf('/cache/gone'));
    expect(message.indexOf('/cache/gone')).toBeLessThan(message.indexOf('/Applications/Google Chrome.app'));
  });

  it('calls the browser cache what it is, a Chrome for Testing build', () => {
    expect(
      formatBrowserNotFound({ override: undefined, cached: [], installed: [] }),
    ).toMatch(/Chrome for Testing/);
  });
});

describe('clearStaleCapture', () => {
  it('removes a leftover capture so a failed run cannot leave a plausible file at the contract path', () => {
    const removed = [];
    const remove = (path) => removed.push(path);

    clearStaleCapture('/review/desktop.png', remove);

    expect(removed).toEqual(['/review/desktop.png']);
  });

  it('does nothing when there is no leftover file', () => {
    const remove = () => {
      throw new Error('should not be called');
    };

    expect(() => clearStaleCapture('/review/desktop.png', remove, { exists: () => false })).not.toThrow();
  });
});

describe('assessFontReadiness', () => {
  const loaded = [
    { family: 'Cinzel', status: 'loaded' },
    { family: 'Bookinsanity', status: 'loaded' },
  ];

  it('passes when the face is loaded, checkable, and measurably in effect', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: loaded,
      check: true,
      probe: { candidateWidth: 210.5, fallbackWidth: 260.25 },
    });

    expect(result.ok).toBe(true);
    expect(result.detail).toMatch(/Cinzel/);
  });

  it('fails when no FontFace for the display family is loaded', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: [{ family: 'Bookinsanity', status: 'loaded' }],
      check: true,
      probe: { candidateWidth: 210.5, fallbackWidth: 260.25 },
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/no loaded FontFace for Cinzel/);
  });

  it('fails when a face exists but is still unloaded, the swap-pause state', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: [{ family: 'Cinzel', status: 'unloaded' }],
      check: true,
      probe: { candidateWidth: 210.5, fallbackWidth: 260.25 },
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/not loaded/);
  });

  it('fails when document.fonts.check reports the family unavailable', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: loaded,
      check: false,
      probe: { candidateWidth: 210.5, fallbackWidth: 260.25 },
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/document\.fonts\.check\("1em Cinzel"\) was false/);
  });

  it('fails when the face is loaded but does not change rendering, so the fallback is still what is painted', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: loaded,
      check: true,
      probe: { candidateWidth: 260.25, fallbackWidth: 260.25 },
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/same width as the fallback/);
  });

  it('fails when the measurement probe could not be taken at all', () => {
    const result = assessFontReadiness({
      family: 'Cinzel',
      faces: loaded,
      check: true,
      probe: null,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/could not measure/);
  });
});

describe('formatFontGateFailure', () => {
  it('names the font and says the fallback was used instead', () => {
    const message = formatFontGateFailure({
      family: 'Cinzel',
      url: 'https://fonts.googleapis.com/css2?family=Cinzel',
      detail: 'no loaded FontFace for Cinzel; document.fonts.check("1em Cinzel") was false',
    });

    expect(message).toMatch(/Cinzel/);
    expect(message).toMatch(/fonts\.googleapis\.com/);
    expect(message).toMatch(/document\.fonts\.check/);
    expect(message).toMatch(/no capture/i);
  });
});

describe('formatDevServerHint', () => {
  it('prints the documented background dev server command', () => {
    expect(formatDevServerHint('http://localhost:4321/')).toMatch(/astro dev --background/);
  });
});
