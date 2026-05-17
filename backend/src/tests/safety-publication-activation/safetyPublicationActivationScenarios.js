'use strict';

const health = require('../../domains/safety/activation/safetyPublicationHealthService');
const matrix = require('../../domains/safety/governance/risk/safetyRiskMatrixEngine');
const rollout = require('../../domains/safety/activation/safetyActivationRolloutEngine');

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

console.log('\nsafety-publication-activation\n');

const checks = health.runSafeActivationChecks({ tenantId: '00000000-0000-4000-8000-000000000001', hasSafetyIntelligenceModule: true });
ok('health returns domain safety', checks.domain === 'safety');
ok('readiness object present', checks.readiness && typeof checks.readiness.ready === 'boolean');
ok('rollout stage valid', rollout.STAGES.includes(checks.activation_stage));

const risk = matrix.evaluateRiskMatrix([{ hazard: 'test', severity: 5, probability: 4 }]);
ok('risk matrix critical', risk.ok && risk.critical_count >= 1);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
