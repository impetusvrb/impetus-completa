'use strict';

const health = require('../../domains/environment/activation/environmentPublicationHealthService');
const rollout = require('../../domains/environment/activation/environmentActivationRolloutEngine');
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

console.log('\nenvironment-publication-activation\n');

const checks = health.runSafeActivationChecks({
  tenantId: '00000000-0000-4000-8000-000000000001',
  hasEnvironmentIntelligenceModule: true
});
ok('health domain environment', checks.domain === 'environment');
ok('readiness object', checks.readiness && typeof checks.readiness.ready === 'boolean');
ok('rollout stage valid', rollout.STAGES.includes(checks.activation_stage));

const rolloutPub = environmentRolloutPublicationRuntime();
ok('shadow rollout', rolloutPub.auto_promotion === false);
ok('definitive blocked in shadow', rolloutPub.definitive === false || rolloutPub.shadow === true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
