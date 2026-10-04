/**
 * The local capture baseline: which sheets changed since a run recorded them.
 *
 * **Corroboration, not ground truth.** Two runs of the same content on two
 * machines can differ in one pixel of anti-aliasing and agree about everything a
 * reader of the book can see, and two runs on one machine can be byte-identical
 * while the browser changed underneath both. So this reports *which sheets
 * changed* and nothing more, and a changed sheet is a reason to look at that page
 * rather than a verdict. The manifest is the gate; this is how you find out which
 * page to look at.
 *
 * It is a separate module from the manifest because it is the opposite of it. The
 * manifest is a few kilobytes of text, it is committed, and it decides whether the
 * suite passes. This is tens of megabytes of image, it is held outside version
 * control, and it cannot fail a run - which is exactly why a gate that fired on a
 * font hinting change would be a gate nobody keeps.
 *
 * See `handbook-manifest.mjs`, and the Capture entry in CONTEXT.md.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Where the capture baseline lives when the run is not told.
 *
 * Under `tmp/`, which is gitignored: a baseline is a picture of one machine's
 * render of one day, and committing one would be committing tens of megabytes of
 * binary that a reviewer cannot read into a repository that is otherwise text. A
 * test asks git itself whether it ignores this path.
 */
export const DEFAULT_BASELINE_DIR = 'tmp/handbook/baseline';

/** Only the run's own captures, and only the sheet files among whatever is there. */
const CAPTURE_FILE = /^sheet-\d+\.png$/;

/** Every capture in a directory, by name, hashed. `null` when there is no directory. */
function capturesIn(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;

  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => CAPTURE_FILE.test(name))
      .sort()
      .map((name) => [name, createHash('sha256').update(readFileSync(join(dir, name))).digest('hex')])
  );
}

/**
 * Compare a run's captures against a baseline held outside the repository.
 *
 * Named counts rather than a verdict, in every field and in the message, because
 * the caller has to decide what a changed sheet means and only it knows whether
 * the browser moved.
 */
export function compareCaptures({ runDir, baselineDir, label = baselineDir }) {
  const run = capturesIn(runDir);
  const baseline = capturesIn(baselineDir);
  const names = [...new Set([...(Object.keys(run ?? {})), ...(Object.keys(baseline ?? {}))])].sort();

  const changed = names.filter(
    (name) => run?.[name] !== undefined && baseline?.[name] !== undefined && run[name] !== baseline[name]
  );
  const added = names.filter((name) => run?.[name] !== undefined && baseline?.[name] === undefined);
  const removed = names.filter((name) => run?.[name] === undefined && baseline?.[name] !== undefined);
  const unchanged = names.filter((name) => run?.[name] !== undefined && run[name] === baseline?.[name]);

  return {
    runDir,
    baselineDir,
    // What the run calls it, which is what a reader of the output recognises. The
    // resolved path is kept beside it for the caller that has to open it.
    label,
    hasBaseline: baseline !== null,
    sheets: names.length,
    changed,
    added,
    removed,
    unchanged,
    identical: names.length > 0 && changed.length === 0 && added.length === 0 && removed.length === 0,
  };
}

/**
 * The lines a run prints about a comparison.
 *
 * A missing baseline is reported as itself rather than as a failure of every
 * sheet, because "you have never made a baseline" and "every sheet changed" are
 * different facts and only one of them is a problem.
 */
export function describeComparison(comparison) {
  if (!comparison.hasBaseline) {
    return `No capture baseline at ${comparison.label}, so there is nothing to compare this run against. Record one with --baseline <dir>.`;
  }

  if (comparison.identical) {
    return `Captures match the baseline at ${comparison.label}: ${comparison.unchanged.length} of ${comparison.sheets} sheets byte-identical.`;
  }

  return [
    `Captures differ from the baseline at ${comparison.label}:`,
    `${comparison.changed.length} changed, ${comparison.added.length} new, ${comparison.removed.length} missing, out of ${comparison.sheets} sheets.`,
    'A changed sheet is a reason to look at that page, not proof that the artifact is wrong.',
  ].join('\n');
}
