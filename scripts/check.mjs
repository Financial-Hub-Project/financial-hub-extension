// Static checks without dependencies: every script parses, every file the manifest names exists,
// and every broker in the registry has its adapter folder and content scripts.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BROKERS } from '../src/brokers.js';

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
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ ${named.length} manifest files, ${BROKERS.length} broker(s)`);
