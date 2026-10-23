import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/assets/', import.meta.url);
const paths = readdirSync(root).filter((name) => name.endsWith('.js'));
const entry = paths.find((name) => /^index-[A-Za-z0-9_-]+\.js$/.test(name));
if (!entry) throw new Error('Main entry bundle was not found after Vite build.');

const mainBytes = readFileSync(new URL(entry, root));
const mainGzip = gzipSync(mainBytes, { level: 9 }).length;
const totalJsBytes = paths.reduce((sum, filename) => sum + statSync(new URL(filename, root)).size, 0);
const mb = (bytes) => (bytes / 1024).toFixed(1);

console.log(`OHS bundle audit: entry ${mb(mainGzip)} KiB gzipped (${mb(mainBytes.length)} KiB raw), ${paths.length} script chunks, ${mb(totalJsBytes)} KiB total scripts`);

const MAX_MAIN_GZIP = 160 * 1024;
if (mainGzip > MAX_MAIN_GZIP) {
  console.error(`Initial JS entry exceeds the ${mb(MAX_MAIN_GZIP)} KiB gzip budget. Check eager imports and route splitting.`);
  process.exitCode = 1;
}
