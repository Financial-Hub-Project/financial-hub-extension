// Checks a bundle saved with the popup's "Descargar el paquete" button:
//   npm run validate -- myinvestor-bundle-2026-11-01.json
import { readFileSync } from 'node:fs';
import { validateBundle } from '../src/validate.js';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: npm run validate -- <bundle.json> [...]');
  process.exit(2);
}
let failed = false;
for (const file of files) {
  const problems = validateBundle(readFileSync(file, 'utf8'));
  if (problems.length) {
    failed = true;
    console.error(`✗ ${file}`);
    for (const problem of problems) console.error(`  - ${problem}`);
  } else console.log(`✓ ${file}`);
}
process.exit(failed ? 1 : 0);
