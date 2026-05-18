'use strict';

const orchestrator = require('../../domains/environment/analytics/environmentOperationalValidationOrchestrator');
const { environmentRolloutPublicationRuntime } = require('../../domains/environment/publication');

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

console.log('\nenvironment-rollout-validation\n');

const rollout = environmentRolloutPublicationRuntime();
ok('auto promotion false', rollout.auto_promotion === false);

const pack = orchestrator.runEnvironmentOperationalValidationPack({ tenant_id: 't1' });
ok('controlled rollout domain', pack.controlled_rollout?.domain === 'environment');
ok('enterprise decision remain shadow when not ready', pack.enterprise_decision?.remain_shadow !== false || pack.health_checks?.readiness?.ready);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
