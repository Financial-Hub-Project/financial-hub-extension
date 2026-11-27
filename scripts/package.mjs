// Builds the zip for the Chrome Web Store in dist/, without dependencies. The archive is
// reproducible: it is read from a commit (HEAD by default), with sorted entries, a fixed timestamp
// and no compression, so the same commit always gives the same bytes and SHA-256.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { committed, packageFiles, storeManifest, uncommitted } from './store.mjs';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (data) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
// 1980-01-01 00:00, the earliest date a zip can hold.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(10, 4); // version needed: 1.0
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4); // made by: Unix, 2.0
    central.writeUInt16LE(10, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

export function buildPackage(ref = 'HEAD') {
  const manifest = JSON.parse(committed(ref, 'manifest.json').toString('utf8'));
  const entries = [
    { name: 'manifest.json', data: Buffer.from(`${JSON.stringify(storeManifest(manifest), null, 2)}\n`) },
    ...packageFiles(ref).map((name) => ({ name, data: committed(ref, name) })),
  ];
  return { version: manifest.version, archive: zip(entries), names: entries.map((entry) => entry.name) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const ref = process.argv[2] ?? 'HEAD';
  const dirty = uncommitted();
  if (dirty.length)
    console.warn(`! The package is built from ${ref}; these changes are left out:\n  ${dirty.join('\n  ')}`);
  const { version, archive, names } = buildPackage(ref);
  mkdirSync('dist', { recursive: true });
  const path = `dist/financial-hub-extension-${version}.zip`;
  writeFileSync(path, archive);
  const sha = createHash('sha256').update(archive).digest('hex');
  console.log(`✓ ${path} (${ref}): ${names.length} files, ${archive.length} bytes\n  sha256 ${sha}`);
}
