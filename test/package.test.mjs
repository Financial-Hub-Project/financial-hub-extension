import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildPackage } from '../scripts/package.mjs';
import { storeManifest } from '../scripts/store.mjs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

test('the store manifest drops the localhost origins and keeps everything else', () => {
  const store = storeManifest(manifest);
  assert.ok(!JSON.stringify(store).includes('localhost'));
  assert.deepEqual(store.permissions, manifest.permissions);
  assert.ok(store.host_permissions.includes('https://financial-hub.es/*'));
  const importPage = store.content_scripts.find((entry) => entry.js.includes('src/financial-hub.js'));
  assert.deepEqual(importPage.matches, ['https://financial-hub.es/carteras/importar*']);
  assert.ok(JSON.stringify(manifest).includes('localhost'), 'the unpacked build still reaches a local Financial Hub');
});

test('the package is the same bytes every time and carries only the extension', () => {
  const first = buildPackage();
  const second = buildPackage();
  assert.ok(first.archive.equals(second.archive));
  assert.equal(first.names[0], 'manifest.json');
  for (const name of first.names.slice(1)) assert.match(name, /^(LICENSE|src\/.+)$/);
  assert.ok(!first.archive.includes('localhost'));
});
