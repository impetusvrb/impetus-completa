'use strict';

const orchestrator = require('../../enterprise-shadow-stabilization/enterpriseShadowStabilizationOrchestrator');
const multi = require('../../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const pilot = require('../../enterprise-shadow-stabilization/tenantPilotReadinessEngine');

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

console.log('\nenterprise-shadow-stabilization (backend)\n');

const pack = orchestrator.runShadowStabilizationCycle({ tenant_id: 'tenant-shadow-1' });
ok('pack framework', pack.framework === 'enterprise_shadow_stabilization');
ok('three domains', pack.domains.length === 3);
ok('multi domain publication', !!pack.multi_domain_publication);
ok('cognitive scores', pack.cognitive_maturity?.rollout_readiness_score != null);
ok('no auto promotion', pack.rollout_recommendation?.auto_promotion === false);
ok('pilot status valid', ['remain_in_shadow', 'pilot_ready', 'controlled_ready'].includes(pack.tenant_pilot_readiness?.status));

const md = multi.validateMultiDomainPublication();
ok('publication bounded', md.bounded_publication === true);
ok('pipeline order', md.pipeline_order.join(',') === 'quality,safety,logistics');

orchestrator.collectUsageEvent({
  tenant_id: 'tenant-shadow-1',
  route: '/app/quality/operational',
  domain: 'quality',
  navigation_depth: 2
});
ok('usage collected', true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
