import { isEnvironmentOperationalRuntimeEnabled, isEnvironmentOfflineRuntimeEnabled } from '../../domains/environment/operational-runtime/environmentOperationalFeatureFlags.js';
import { environmentEnqueueMutation, environmentListQueue } from '../../domains/environment/offline/environmentOfflineQueue.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

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

console.log('\nenvironment-operational-runtime (frontend)\n');

ok('hub base exists', readFileSync(join(__dir, '../../domains/environment/operational-runtime/shared/EnvironmentOperationalHubBase.jsx'), 'utf8').includes('EnvironmentOperationalHubBase'));
ok('water hub exists', readFileSync(join(__dir, '../../domains/environment/operational-runtime/water/WaterOperationalHub.jsx'), 'utf8').includes('environment.water.sample_collected'));
ok('flags are functions', typeof isEnvironmentOperationalRuntimeEnabled === 'function');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
