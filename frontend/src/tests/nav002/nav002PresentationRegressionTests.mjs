/**
 * NAV-002 — Full presentation regression (NAV + WMS + OPM).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');

const SCRIPTS = [
  'test:nav001',
  'test:nav002',
  'test:warehouse-regression',
  'test:feature-flags-regression',
  'test:rbac-regression'
];

let passed = 0;
let failed = 0;

for (const script of SCRIPTS) {
  const r = spawnSync('npm', ['run', script], { cwd: FE, stdio: 'pipe', encoding: 'utf8' });
  if (r.status === 0) {
    passed += 1;
    console.log(`  ✓ ${script}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${script}`);
  }
}

console.log(`\nNAV-002 presentation regression: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
