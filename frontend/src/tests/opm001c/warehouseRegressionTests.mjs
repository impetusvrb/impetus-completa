/**
 * OPM — Warehouse module regression (001A · 001B · 001C).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');

const scripts = ['test:opm001a', 'test:opm001b', 'test:opm001c-warehouse'];

let passed = 0;
let failed = 0;

for (const script of scripts) {
  const r = spawnSync('npm', ['run', script], { cwd: FE, stdio: 'pipe', encoding: 'utf8' });
  if (r.status === 0) {
    passed += 1;
    console.log(`  ✓ ${script}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${script}`);
    if (r.stderr) console.error(r.stderr.slice(0, 500));
  }
}

console.log(`\nWarehouse regression: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
