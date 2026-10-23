import { readFileSync } from 'node:fs';
const before = JSON.parse(readFileSync('/tmp/ohs-lock-before.json', 'utf8'));
const after = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const changes = {};
for (const [key, value] of Object.entries(after.packages || {})) {
  if (JSON.stringify(value) !== JSON.stringify(before.packages?.[key])) changes[key] = value;
}
const removed = Object.keys(before.packages || {}).filter((key) => !Object.hasOwn(after.packages, key));
const payload = JSON.stringify({ changes, removed, root: after.packages?.[''] });
console.log('OHS_LOCK_DIFF_START');
for (let i=0; i<payload.length; i+=3200) console.log('OHS_LOCK_PART=' + payload.slice(i,i+3200));
console.log('OHS_LOCK_DIFF_END');
