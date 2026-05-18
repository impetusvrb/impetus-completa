import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let passed = 0;
let failed = 0;
function ok(l, c) {
  if (c) {
    console.log(`  OK ${l}`);
    passed++;
  } else {
    console.error(`  FAIL ${l}`);
    failed++;
  }
}

console.log('\nenvironment-pilot-rollout (frontend)\n');
const dash = readFileSync(join(__dirname, '../../domains/environment/pilot-runtime/EnvironmentPilotOperationalDashboard.jsx'), 'utf8');
ok('fetches pilot pack', dash.includes('fetchEnvironmentPilotRolloutPack'));
ok('indicators', dash.includes('EnvironmentPilotIndicators'));
const hub = readFileSync(join(__dirname, '../../domains/environment/pilot-runtime/EnvironmentPilotRolloutHub.jsx'), 'utf8');
ok('hub title', hub.includes('Rollout Pilot'));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
