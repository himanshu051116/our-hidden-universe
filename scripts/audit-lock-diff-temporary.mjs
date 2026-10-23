import { readFileSync } from 'node:fs';
const before = JSON.parse(readFileSync('/tmp/ohs-lock-before.json', 'utf8'));
const after = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const entries = {};
for (const [path, value] of Object.entries(after.packages || {})) {
  if (JSON.stringify(value) !== JSON.stringify(before.packages?.[path])) entries[path] = value;
}
const removed = Object.keys(before.packages || {}).filter((path) => !(path in after.packages));
console.log('OHS_AUDIT_PATCH_START');
console.log(JSON.stringify({ entries, removed, version: after.lockfileVersion }));
console.log('OHS_AUDIT_PATCH_END');
console.log('Changed packages:', Object.keys(entries).length, 'removed:', removed.length);
