// Static checks without dependencies: every script parses, every file the manifest names exists,
// and every broker in the registry has its adapter folder and content scripts.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BROKERS } from '../src/brokers.js';
import { packageFiles, pngSize, storeManifest, uncommitted } from './store.mjs';

const problems = [];
const scripts = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? scripts(path) : path.endsWith('.js') ? [path] : [];
  });
for (const file of scripts('src')) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    problems.push(`${file}: ${String(error.stderr).trim().split('\n')[0]}`);
  }
}
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const named = [
  manifest.action.default_popup,
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((entry) => entry.js),
];
for (const file of named) if (!existsSync(file)) problems.push(`manifest names a missing file: ${file}`);
for (const broker of BROKERS) {
  if (!existsSync(`src/brokers/${broker.id}/content.js`))
    problems.push(`broker ${broker.id} has no src/brokers/${broker.id}/content.js`);
  for (const page of broker.pages) {
    const pattern = `${page}*`;
    if (!manifest.content_scripts.some((entry) => entry.matches.includes(pattern)))
      problems.push(`broker ${broker.id}: no content script matches ${pattern}`);
    if (!manifest.host_permissions.includes(pattern))
      problems.push(`broker ${broker.id}: host permission ${pattern} is missing`);
  }
}
// What the Chrome Web Store asks of the manifest and of the package built from it.
const VERSION = /^(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){0,3}$/;
if (!VERSION.test(manifest.version) || manifest.version.split('.').some((part) => Number(part) > 65535))
  problems.push(`version ${manifest.version} is not 1 to 4 dot-separated integers from 0 to 65535`);
if (manifest.name.length > 75) problems.push('name is longer than 75 characters');
if (manifest.description.length > 132) problems.push('description is longer than 132 characters');
for (const icons of [manifest.icons, manifest.action.default_icon])
  for (const [size, file] of Object.entries(icons ?? {})) {
    const found = existsSync(file) ? pngSize(readFileSync(file)) : null;
    if (!found || found.width !== Number(size) || found.height !== Number(size))
      problems.push(`icon ${size} (${file}) is not a ${size}×${size} PNG`);
  }
if (!manifest.icons?.['128']) problems.push('the store needs a 128×128 icon');
const store = storeManifest(manifest);
if (JSON.stringify(store).includes('localhost')) problems.push('the store manifest still reaches localhost');
// The package is built from the commit: every file the manifest names must be tracked.
const packaged = new Set([...packageFiles(), ...uncommitted().filter((file) => existsSync(file))]);
for (const file of [...named, ...Object.values(manifest.icons)])
  if (!packaged.has(file)) problems.push(`the package leaves out ${file} (is it committed?)`);
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ ${named.length} manifest files, ${BROKERS.length} broker(s)`);
