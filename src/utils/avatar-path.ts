import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const FACELESS_AVATAR = '/fg/avatar/faceless.svg';

/**
 * Public URL prefix for avatar files under public/fg/avatar.
 */
const AVATAR_URL_PREFIX = '/fg/avatar';

/**
 * Build-time avatar directory for the current working directory.
 */
export function defaultAvatarDir(rootDir: string = process.cwd()): string {
  return join(rootDir, 'public/fg/avatar');
}

/**
 * Probe for an avatar image matching the base filename in the avatar directory.
 * Resolution priority: .jpg -> .png -> faceless.svg
 */
export function probeAvatarPath(base: string, avatarDir: string): string {
  if (existsSync(join(avatarDir, `${base}.jpg`))) {
    return `${AVATAR_URL_PREFIX}/${base}.jpg`;
  }
  if (existsSync(join(avatarDir, `${base}.png`))) {
    return `${AVATAR_URL_PREFIX}/${base}.png`;
  }
  return FACELESS_AVATAR;
}

export interface ResolveAvatarPathOptions {
  /** Explicit image prop override: a filename inside the avatar directory. */
  explicit?: string;
  /** Path pre-resolved by the character build pipeline. */
  storedPath?: string;
  /** Base filename used to probe when no override or stored path applies. */
  slug: string;
  /** Avatar directory; defaults to public/fg/avatar under the cwd. */
  avatarDir?: string;
}

/**
 * An explicit override is only a filename inside the avatar directory. Reject
 * anything that could resolve elsewhere: a path separator, a parent-directory
 * segment, or a leading dot (a dotfile). A plain filename that merely contains
 * a dot, such as `milo.jpg`, is still allowed.
 */
function isSafeOverride(explicit: string): boolean {
  return !/[\\/]/.test(explicit) && !explicit.includes('..') && !explicit.startsWith('.');
}

/**
 * Resolve the build-time avatar src shared by the character build pipeline
 * and the card renderer:
 *
 * 1. An explicit override wins when its file exists; a missing file still
 *    falls back to faceless.svg. An override that is not a plain filename
 *    fails the safety check and falls back without being probed.
 * 2. Otherwise the stored path from the build pipeline is used as-is.
 * 3. Otherwise probe {slug}.jpg -> {slug}.png -> faceless.svg.
 */
export function resolveAvatarPath({
  explicit,
  storedPath,
  slug,
  avatarDir = defaultAvatarDir(),
}: ResolveAvatarPathOptions): string {
  if (explicit) {
    if (!isSafeOverride(explicit)) {
      return FACELESS_AVATAR;
    }
    return existsSync(join(avatarDir, explicit))
      ? `${AVATAR_URL_PREFIX}/${explicit}`
      : FACELESS_AVATAR;
  }
  if (storedPath) {
    return storedPath;
  }
  return probeAvatarPath(slug, avatarDir);
}
