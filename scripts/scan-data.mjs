// Fails when a tracked file looks like it carries someone's personal or secret data: an IBAN, a
// Spanish DNI/NIE, a token, an e-mail address, or a downloaded bundle committed by mistake.
// Tests and examples must use invented values that do not match these patterns.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  ['IBAN', /\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,7}\b/],
  ['DNI/NIE', /\b[XYZ]?\d{7,8}[A-HJ-NP-TV-Z]\b/],
  ['JWT', /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/],
  ['bearer token', /Bearer\s+[A-Za-z0-9._~+/-]{20,}/],
  ['e-mail', /\b[\w.+-]+@(?!users\.noreply\.github\.com|example\.(?:com|org))[\w-]+\.[\w.-]+\b/],
];
// Downloads the popup produces; they hold real data and never belong in the repository.
const DOWNLOADS = /(?:^|\/)[\w-]+-bundle-\d{4}-\d{2}-\d{2}\.json$/;

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];
for (const file of files) {
  if (DOWNLOADS.test(file)) problems.push(`${file}: a downloaded bundle`);
  if (file === 'scripts/scan-data.mjs' || /\.(png|jpg|ico|zip)$/i.test(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const [name, pattern] of PATTERNS)
      if (pattern.test(line)) problems.push(`${file}:${index + 1}: looks like ${name}`);
  });
}
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error('Use invented values in tests and examples; never commit real data.');
  process.exit(1);
}
console.log(`✓ ${files.length} files without personal data`);
