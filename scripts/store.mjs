// What goes to the Chrome Web Store: the manifest without the development-only origins and the
// files under src/ plus the licence. Shared by the packaging script, the static checks and tests.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

export function packageFiles(root = '.') {
  const walk = (dir) =>
    readdirSync(join(root, dir)).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
    });
  return ['LICENSE', ...walk('src')].sort();
}

// The sizes of a PNG from its header, or null when the file is not a PNG.
export function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
