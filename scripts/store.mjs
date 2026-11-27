// What goes to the Chrome Web Store: the manifest without the development-only origins and the
// tracked files under src/ plus the licence, read from a commit so the package depends on the
// commit alone (not on the checkout's line endings or untracked files). Shared by the packaging
// script, the static checks and tests.
import { execFileSync } from 'node:child_process';

const git = (args, encoding = 'utf8') => execFileSync('git', args, { encoding, maxBuffer: 64 * 1024 * 1024 });

// Origins that only make sense while developing against a local Financial Hub.
const DEV_ONLY = /^https?:\/\/localhost(?::\d+)?\//;

export function storeManifest(manifest) {
  const store = structuredClone(manifest);
  store.host_permissions = store.host_permissions.filter((pattern) => !DEV_ONLY.test(pattern));
  store.content_scripts = store.content_scripts
    .map((entry) => ({ ...entry, matches: entry.matches.filter((pattern) => !DEV_ONLY.test(pattern)) }))
    .filter((entry) => entry.matches.length > 0);
  return store;
}

/** The files the package carries, as committed in `ref`. */
export function packageFiles(ref = 'HEAD') {
  return git(['ls-tree', '-r', '--name-only', '-z', ref, '--', 'LICENSE', 'src'])
    .split('\0')
    .filter(Boolean)
    .sort();
}

/** The bytes of a file as committed in `ref`. */
export const committed = (ref, path) => git(['show', `${ref}:${path}`], 'buffer');

/** Packaged paths whose checkout differs from `ref` (uncommitted or untracked changes). */
export const uncommitted = (ref = 'HEAD') =>
  git(['status', '--porcelain', '--untracked-files=all', '--', 'manifest.json', 'LICENSE', 'src'])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3));

// The sizes of a PNG from its header, or null when the file is not a PNG.
export function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
