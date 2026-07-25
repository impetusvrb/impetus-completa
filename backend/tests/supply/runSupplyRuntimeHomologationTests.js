'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const BACKEND = path.join(__dirname, '../..');

const SUITES = [
  'test:supply-api',
  'test:supply-rbac',
  'test:supply-navigation',
  'test:supply-pilot',
  'test:pilot-integration',
  'test:supply-promotion'
];

let failed = 0;

console.log('GF-027 — Supply Runtime Homologation Suite\n');

for (const script of SUITES) {
  console.log(`▶ ${script}`);
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    failed += 1;
    console.error(`✗ ${script} FAILED\n`);
  } else {
    console.log(`✓ ${script} PASS\n`);
  }
}

console.log(failed ? `HOMOLOGATION: ${failed} suite(s) failed` : 'HOMOLOGATION: ALL PASS');
process.exit(failed ? 1 : 0);
