'use strict';

const orchestrator = require('../../domains/logistics/analytics/logisticsOperationalValidationOrchestrator');
const health = require('../../domains/logistics/activation/logisticsPublicationHealthService');
const flags = require('../../domains/logistics/navigation/logisticsNavigationFlags');
const rollout = require('../../domains/logistics/activation/logisticsActivationRolloutEngine');

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

console.log('\nlogistics-runtime-validation (backend)\n');

const checks = health.runSafeActivationChecks({ tenantId: 't1', hasLogisticsIntelligenceModule: true });
ok('health domain logistics', checks.domain === 'logistics');
ok('rollout stages include controlled', rollout.STAGES.includes('controlled'));

const pack = orchestrator.runLogisticsOperationalValidationPack({ tenant_id: 't1' });
ok('pack domain logistics', pack.domain === 'logistics');
ok('enterprise decision present', !!pack.enterprise_decision);
ok('no auto promotion', pack.controlled_rollout?.auto_promotion === false);

orchestrator.recordOperationalEvent({ tenant_id: 't1', route: '/app/logistics/operational', audience_band: 'operator' });
ok('behavior event', true);

ok('flags snapshot', typeof flags.snapshot().navigation === 'boolean');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
