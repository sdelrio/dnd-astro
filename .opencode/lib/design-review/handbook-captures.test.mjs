import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_BASELINE_DIR, compareCaptures, describeComparison } from './handbook-captures.mjs';

/**
 * Comparing a run against a capture baseline.
 *
 * The comparison is corroboration, not a gate, and the tests here are about that
 * claim: the golden captures are not in version control, the baseline is not
 * either, and nothing this module does can fail a run. The gate is the manifest.
 */

const temporary = [];

function scratch(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'handbook-captures-'));
  temporary.push(dir);

  for (const [name, contents] of Object.entries(files)) writeFileSync(join(dir, name), contents);
  return dir;
}

/** Anything that looks like a PNG to the comparison, which is what it reads. */
const png = (bytes) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(bytes)]);

afterEach(() => {
  while (temporary.length > 0) rmSync(temporary.pop(), { recursive: true, force: true });
});

describe('comparing a run against a capture baseline', () => {
  /** Two directories of captures, as two runs of the book would leave. */
  const pair = ({ run = {}, baseline = {} } = {}) => ({ runDir: scratch(run), baselineDir: scratch(baseline) });

  it('says every sheet is identical when the two runs wrote the same bytes', () => {
    const { runDir, baselineDir } = pair({
      run: { 'sheet-01.png': png(1), 'sheet-02.png': png(2) },
      baseline: { 'sheet-01.png': png(1), 'sheet-02.png': png(2) },
    });

    const comparison = compareCaptures({ runDir, baselineDir });

    expect(comparison).toMatchObject({ identical: true, changed: [], added: [], removed: [], sheets: 2 });
    expect(describeComparison(comparison)).toMatch(/byte-identical/);
  });

  // Which sheet changed is the useful half of the answer. A verdict of "the book
  // is different" would send a reader to the whole book.
  it('names the sheets that changed, the ones that are new and the ones that are gone', () => {
    const { runDir, baselineDir } = pair({
      run: { 'sheet-01.png': png(1), 'sheet-02.png': png(2), 'sheet-03.png': png(3) },
      baseline: { 'sheet-01.png': png(1), 'sheet-02.png': png(9), 'sheet-04.png': png(4) },
    });

    const comparison = compareCaptures({ runDir, baselineDir });

    expect(comparison.changed).toEqual(['sheet-02.png']);
    expect(comparison.added).toEqual(['sheet-03.png']);
    expect(comparison.removed).toEqual(['sheet-04.png']);
    expect(comparison.identical).toBe(false);
  });

  it('ignores anything in the directory that is not one of the run\'s captures', () => {
    // A directory holding more than the captures is a directory with something
    // else in it, and reporting on that something would make every run noisy.
    const { runDir, baselineDir } = pair({
      run: { 'sheet-01.png': png(1), 'notes.txt': 'not a capture' },
      baseline: { 'sheet-01.png': png(1) },
    });

    expect(compareCaptures({ runDir, baselineDir })).toMatchObject({ sheets: 1, identical: true });
  });

  // Corroboration, not ground truth, and the message says so: two runs of the
  // same content on two machines can differ in one pixel of anti-aliasing, and
  // two runs on one machine can match while the browser has changed underneath.
  it('says what a difference is worth rather than calling it a verdict', () => {
    const { runDir, baselineDir } = pair({ run: { 'sheet-01.png': png(1) }, baseline: { 'sheet-01.png': png(2) } });

    expect(describeComparison(compareCaptures({ runDir, baselineDir }))).toMatch(/reason to look/);
  });

  // "You have never made a baseline" and "every sheet changed" are different
  // facts, and only one of them is a problem.
  it('reports a missing baseline as itself rather than as every sheet differing', () => {
    const runDir = scratch({ 'sheet-01.png': png(1) });
    const comparison = compareCaptures({ runDir, baselineDir: join(runDir, 'nowhere') });

    expect(comparison.hasBaseline).toBe(false);
    expect(comparison.identical).toBe(false);
    expect(describeComparison(comparison)).toMatch(/No capture baseline/);
  });

  // The acceptance criterion, stated as a check rather than as an intention: the
  // golden PNGs are not in version control, and the place a baseline goes by
  // default is a directory git ignores.
  it('keeps the baseline where git does not track it', () => {
    expect(DEFAULT_BASELINE_DIR.startsWith('tmp/')).toBe(true);

    const ignored = run_ignore_check(DEFAULT_BASELINE_DIR);
    expect(ignored).toBe(true);
  });
});

/** Whether git ignores a path, which is the only question that matters here. */
function run_ignore_check(path) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--no-index', path], { cwd: new URL('../../..', import.meta.url).pathname });
    return true;
  } catch {
    return false;
  }
}
