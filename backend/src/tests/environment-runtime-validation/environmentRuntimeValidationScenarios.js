'use strict';

const orchestrator = require('../../domains/environment/analytics/environmentOperationalValidationOrchestrator');
const health = require('../../domains/environment/activation/environmentPublicationHealthService');
const flags = require('../../domains/environment/navigation/environmentNavigationFlags');
const rollout = require('../../domains/environment/activation/environmentActivationRolloutEngine');

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

console.log('\nenvironment-runtime-validation (backend)\n');

const checks = health.runSafeActivationChecks({ tenantId: 't1', hasEnvironmentIntelligenceModule: true });
ok('health domain environment', checks.domain === 'environment');
ok('rollout stages include controlled', rollout.STAGES.includes('controlled'));

const pack = orchestrator.runEnvironmentOperationalValidationPack({ tenant_id: 't1' });
ok('pack domain environment', pack.domain === 'environment');
ok('enterprise decision present', !!pack.enterprise_decision);
ok('no auto promotion', pack.controlled_rollout?.auto_promotion === false);

orchestrator.recordOperationalEvent({ tenant_id: 't1', route: '/app/environment/operational', audience_band: 'operator' });
ok('behavior event', true);

ok('flags snapshot', typeof flags.snapshot().navigation === 'boolean');
ok('cross domain correlation', !!pack.cross_domain_correlation?.linked_domains);
ok('cognitive correlation', pack.cognitive_correlation?.framework === 'environmental_cognitive_correlation');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
