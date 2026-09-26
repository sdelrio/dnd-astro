/**
 * Where a browser may already be on this machine.
 *
 * Nothing here downloads anything. The candidates are, in resolution order:
 *
 *   1. `DESIGN_REVIEW_CHROME` - an explicit override, used verbatim or reported
 *      as broken. Never silently skipped.
 *   2. Chrome for Testing builds already in a Puppeteer cache directory
 *      (`PUPPETEER_CACHE_DIR`, then the platform cache paths), newest version
 *      first, because a newer pinned build is a better rendering target than an
 *      older one and neither is more "already installed" than the other.
 *   3. An installed browser: the usual macOS application bundles, then `PATH`.
 *
 * The order matches `resolveBrowser` in `capture-helpers.mjs`; the paths here
 * are the inputs to it. The report of which binary was used comes from there, so
 * the two files cannot drift apart silently.
 */

import { accessSync, constants, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, sep } from 'node:path';

/** The environment variable that names a browser explicitly. */
export { OVERRIDE_ENV as BROWSER_OVERRIDE_ENV } from './capture-helpers.mjs';

export function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Directories a Puppeteer-managed Chrome for Testing build may live in. */
export function cacheRoots() {
  const home = homedir();
  const roots = [];

  if (process.env.PUPPETEER_CACHE_DIR) roots.push(process.env.PUPPETEER_CACHE_DIR);
  // Puppeteer's own default is the `.cache` path on every platform it builds
  // for; the macOS Library cache is where some installs put it instead.
  roots.push(join(home, '.cache', 'puppeteer'));
  roots.push(join(home, 'Library', 'Caches', 'puppeteer'));

  return roots.filter((root, index) => roots.indexOf(root) === index);
}

/**
 * Chrome for Testing binaries found in a Puppeteer cache, most-preferred first.
 *
 * Headless-shell builds come before full builds, newest version first within
 * each group. Two reasons, in order of weight:
 *
 *   - This command always launches headless, and the shell is the build made for
 *     exactly that. A full Chrome-for-Testing app bundle in a headless launch
 *     is a configuration the build is not primarily for.
 *   - On this machine a full cached Chrome for Testing bundle starts and stays
 *     up but never opens its DevTools port, while the shell and the installed
 *     Chrome both do. The launch loop tries candidates in order and reports
 *     which one worked, so a build that cannot serve is skipped rather than
 *     silently promoted.
 *
 * The version is read out of the directory name (`mac-145.0.7632.46`), so the
 * sort is numeric per component rather than lexicographic, which would put
 * `mac-99` above `mac-145`.
 */
export function cachedBrowserPaths() {
  const found = [];
  const byFlavour = new Map([
    ['chrome-headless-shell', []],
    ['chrome', []],
  ]);

  for (const root of cacheRoots()) {
    for (const flavour of byFlavour.keys()) {
      const flavourDir = join(root, flavour);
      let versions;
      try {
        versions = readdirSync(flavourDir);
      } catch {
        continue;
      }

      const ordered = versions
        .map((name) => ({ name, version: parseVersion(name) }))
        .filter((entry) => entry.version !== null)
        .sort((a, b) => compareVersions(b.version, a.version));

      for (const { name } of ordered) {
        byFlavour.get(flavour).push(...buildPaths(join(flavourDir, name)));
      }
    }
  }

  for (const paths of byFlavour.values()) found.push(...paths);

  return found;
}

/**
 * The executable paths inside one Chrome for Testing build directory.
 *
 * A build directory nests differently per platform - macOS puts
 * `Google Chrome for Testing.app` inside a `chrome-mac-x64` directory, Linux
 * puts `chrome` at the top - so this walks two levels and collects the names it
 * recognises rather than assuming one layout.
 */
function buildPaths(versionDir) {
  const wanted = new Set(executableNames().map((relative) => relative.split(sep).pop()));
  const found = [];

  walk(versionDir, 4, (file) => {
    if (wanted.has(basename(file))) found.push(file);
  });

  return found;
}

/** Depth-first walk yielding file paths, without pulling in a glob dependency. */
function walk(directory, depth, onFile) {
  if (depth < 0) return;

  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full, depth - 1, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

/** Candidate relative paths for the browser binary, most specific first. */
function executableNames() {
  if (process.platform === 'darwin') {
    return [
      join('Contents', 'MacOS', 'Google Chrome for Testing'),
      join('Contents', 'MacOS', 'Chromium'),
      'chrome-headless-shell',
    ];
  }
  if (process.platform === 'win32') return ['chrome.exe', 'chrome-headless-shell.exe'];
  return ['chrome', 'chrome-headless-shell'];
}

/** Browsers installed in the usual places, then on `PATH`. */
export function installedBrowserPaths() {
  const home = homedir();
  const paths = [];

  if (process.platform === 'darwin') {
    for (const bundle of [
      'Google Chrome.app',
      'Google Chrome for Testing.app',
      'Chromium.app',
      'Brave Browser.app',
      'Microsoft Edge.app',
    ]) {
      paths.push(join('/Applications', bundle, 'Contents', 'MacOS', bundle.replace(/\.app$/, '')));
      paths.push(join(home, 'Applications', bundle, 'Contents', 'MacOS', bundle.replace(/\.app$/, '')));
    }
  } else if (process.platform === 'win32') {
    for (const relative of [
      'Google\\Chrome\\Application\\chrome.exe',
      'Chromium\\Application\\chrome.exe',
    ]) {
      paths.push(join(process.env.LOCALAPPDATA ?? '', relative));
      paths.push(join(process.env.ProgramFiles ?? '', relative));
    }
  } else {
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
      for (const dir of (process.env.PATH ?? '').split(':').filter(Boolean)) {
        paths.push(join(dir, name));
      }
    }
  }

  return paths;
}

/** `mac-145.0.7632.46` -> `[145, 0, 7632, 46]`; `linux-123` -> `[123]`. */
function parseVersion(dirName) {
  const match = /^(?:mac|mac_arm|linux|win\d+)-(\d+(?:\.\d+)*)$/.exec(dirName);
  if (!match) return null;
  return match[1].split('.').map(Number);
}

function compareVersions(a, b) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
