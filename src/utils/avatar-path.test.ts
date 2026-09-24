import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { probeAvatarPath, resolveAvatarPath, FACELESS_AVATAR } from './avatar-path';

describe('avatar-path', () => {
  let tempDir: string;
  let avatarDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'avatar-path-test-'));
    avatarDir = join(tempDir, 'avatars');
    mkdirSync(avatarDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('probeAvatarPath', () => {
    it('returns .jpg avatar path when .jpg exists', () => {
      writeFileSync(join(avatarDir, 'hero.jpg'), 'fake jpg');
      writeFileSync(join(avatarDir, 'hero.png'), 'fake png');

      expect(probeAvatarPath('hero', avatarDir)).toBe('/fg/avatar/hero.jpg');
    });

    it('returns .png avatar path when only .png exists', () => {
      writeFileSync(join(avatarDir, 'mage.png'), 'fake png');

      expect(probeAvatarPath('mage', avatarDir)).toBe('/fg/avatar/mage.png');
    });

    it('falls back to faceless.svg when no avatar file exists', () => {
      expect(probeAvatarPath('unknown', avatarDir)).toBe(FACELESS_AVATAR);
    });
  });

  describe('resolveAvatarPath with an explicit image override', () => {
    it('uses the override when the file exists', () => {
      writeFileSync(join(avatarDir, 'alioth.jpg'), 'fake jpg');

      expect(
        resolveAvatarPath({ explicit: 'alioth.jpg', slug: 'other', avatarDir })
      ).toBe('/fg/avatar/alioth.jpg');
    });

    it('falls back to faceless.svg when the override file is missing', () => {
      expect(
        resolveAvatarPath({ explicit: 'dontexists.jpg', slug: 'other', avatarDir })
      ).toBe(FACELESS_AVATAR);
    });

    it('does not consult the stored path when the override is missing', () => {
      expect(
        resolveAvatarPath({
          explicit: 'dontexists.jpg',
          storedPath: '/fg/avatar/stored.png',
          slug: 'other',
          avatarDir,
        })
      ).toBe(FACELESS_AVATAR);
    });

    it('ignores the stored path when the override exists', () => {
      writeFileSync(join(avatarDir, 'antonidas.png'), 'fake png');

      expect(
        resolveAvatarPath({
          explicit: 'antonidas.png',
          storedPath: '/fg/avatar/stored.png',
          slug: 'other',
          avatarDir,
        })
      ).toBe('/fg/avatar/antonidas.png');
    });
  });

  describe('resolveAvatarPath without an explicit override', () => {
    it('prefers the stored path from the build pipeline', () => {
      expect(
        resolveAvatarPath({ storedPath: '/fg/avatar/milo.jpg', slug: 'milo', avatarDir })
      ).toBe('/fg/avatar/milo.jpg');
    });

    it('probes .jpg then .png then faceless.svg when no stored path exists', () => {
      writeFileSync(join(avatarDir, 'milo.jpg'), 'fake jpg');
      writeFileSync(join(avatarDir, 'draknor.png'), 'fake png');

      expect(resolveAvatarPath({ slug: 'milo', avatarDir })).toBe('/fg/avatar/milo.jpg');
      expect(resolveAvatarPath({ slug: 'draknor', avatarDir })).toBe('/fg/avatar/draknor.png');
      expect(resolveAvatarPath({ slug: 'unknown', avatarDir })).toBe(FACELESS_AVATAR);
    });

    it('probes the name slug when neither filename nor stored path is known', () => {
      writeFileSync(join(avatarDir, 'testhero.png'), 'fake png');

      expect(
        resolveAvatarPath({ slug: 'testhero', avatarDir })
      ).toBe('/fg/avatar/testhero.png');
    });
  });
});
