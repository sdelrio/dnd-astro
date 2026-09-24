import path from 'node:path';

const TMP_PREFIXES = ['/tmp/', '/private/tmp/'];

export const TMP_BASH_ERROR =
  'Refusing /tmp: write scratch files to the repo-relative tmp/ directory instead (see AGENTS.md Temporary Files).';

export function rewriteTmpPath(filePath, repoRoot) {
  const prefix = TMP_PREFIXES.find((candidate) => filePath.startsWith(candidate));
  if (!prefix) return { path: filePath, redirected: false };

  const tmpRoot = path.join(repoRoot, 'tmp');
  const target = path.join(tmpRoot, filePath.slice(prefix.length));
  if (target !== tmpRoot && !target.startsWith(tmpRoot + path.sep)) {
    return { path: filePath, redirected: false };
  }

  return { path: target, redirected: true };
}

// Treat /tmp and /private/tmp as path segments: a delimiter (or start) must
// precede them, so URLs like example.com/tmp and siblings like /var/tmp stay put.
const TMP_REFERENCE = /(?:^|[^\w./-])(?:\/private)?\/tmp(?:\/|\b)/;

export function bashReferencesTmp(command) {
  return TMP_REFERENCE.test(command);
}
