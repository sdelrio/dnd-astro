import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeAvatarPath } from './avatar-path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicDir = join(repoRoot, 'public');
const avatarDir = join(publicDir, 'fg', 'avatar');

type ImageType = 'jpeg' | 'png' | 'svg' | 'unknown';

const expectedTypeByExtension: Record<string, ImageType> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.svg': 'svg',
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function hasExecutableBit(file: string): boolean {
  return (statSync(file).mode & 0o111) !== 0;
}

function sniffImageType(file: string): ImageType {
  const bytes = readFileSync(file);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'png';
  }
  const text = bytes
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .replace(/^\s*<\?xml[^>]*\?>/i, '');
  if (text.includes('<svg')) {
    return 'svg';
  }
  return 'unknown';
}

describe('public assets', () => {
  const files = collectFiles(publicDir);
  const imageFiles = files.filter((file) => extname(file).toLowerCase() in expectedTypeByExtension);

  it('are all static files with no executable bits', () => {
    const executables = files
      .filter(hasExecutableBit)
      .map((file) => relative(repoRoot, file));

    expect(executables).toEqual([]);
  });

  it('have extensions matching their content', () => {
    const mismatches = imageFiles.flatMap((file) => {
      const extension = extname(file).toLowerCase();
      const detected = sniffImageType(file);
      if (detected === expectedTypeByExtension[extension]) {
        return [];
      }
      return [`${relative(repoRoot, file)}: ${extension} extension but ${detected} content`];
    });

    expect(mismatches).toEqual([]);
  });
});

describe('avatar resolution against real assets', () => {
  it('resolves dracarys to the corrected .png portrait', () => {
    expect(probeAvatarPath('dracarys', avatarDir)).toBe('/fg/avatar/dracarys.png');
  });

  it('resolves enanidas to the added .png portrait', () => {
    expect(probeAvatarPath('enanidas', avatarDir)).toBe('/fg/avatar/enanidas.png');
  });
});
