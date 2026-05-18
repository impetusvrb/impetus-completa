'use strict';

const orchestrator = require('../../enterprise-pilot-rollout/enterprisePilotRolloutOrchestrator');
const classifier = require('../../enterprise-pilot-rollout/tenantReadinessClassifier');
const escalation = require('../../enterprise-pilot-rollout/rolloutEscalationProtection');
const gov = require('../../enterprise-pilot-rollout/rolloutGovernanceRuntime');

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

console.log('\nenterprise-pilot-rollout (backend)\n');

ok('classifier levels', classifier.LEVELS.includes('INDUSTRIAL_READY'));
ok('blocks auto promotion', escalation.assertNoEscalation({ auto_promotion: true }).blocked === true);
ok('blocks full without approval', escalation.assertNoEscalation({ target_stage: 'full' }).blocked === true);

const pack = orchestrator.runPilotRolloutPreparation({ tenant_id: 'pilot-tenant-1' });
ok('pack ok', pack.ok === true);
ok('four domains', pack.domains?.length === 4 && pack.domains.includes('environment'));
ok('dashboard', !!pack.dashboard);
ok('no auto promotion', pack.recommendation?.auto_promotion === false);
ok('audience matrix waves', pack.audience_matrix?.max_wave === 5);

const rb = gov.rollbackTenant('pilot-tenant-1');
ok('rollback to shadow', rb.state?.stage === 'shadow');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
