import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashPath = join(__dirname, '../../enterprise-pilot-rollout/EnterprisePilotExecutiveDashboard.jsx');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nenterprise-pilot-rollout (frontend)\n');

const src = readFileSync(dashPath, 'utf8');
ok('dashboard file exists', src.includes('EnterprisePilotExecutiveDashboard'));
ok('uses pilot api', src.includes('fetchPilotRolloutPreparation'));
ok('no motionless typo', !src.includes('motionlessLoadingCard'));
ok('impetus-card pattern', src.includes('impetus-card'));

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
