'use strict';

const pilot = require('../../domains/environment/pilot-rollout');

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

console.log('\nenvironment-pilot-rollout (backend)\n');

const pack = pilot.environmentPilotRolloutRuntime({
  tenant_id: '00000000-0000-4000-8000-000000000001',
  user: { role: 'coordenador', company_id: '00000000-0000-4000-8000-000000000001' }
});

ok('framework', pack.framework === 'environment_pilot_rollout');
ok('domain environment', pack.domain === 'environment');
ok('pilot readiness', !!pack.pilot_readiness?.level);
ok('maturity level', !!pack.operational_maturity?.maturity_level);
ok('ergonomics', typeof pack.operational_ergonomics?.ergonomics_score === 'number');
ok('saturation pack', !!pack.operational_saturation?.ok);
ok('multi domain', pack.multi_domain_coexistence?.ok === true);
ok('no auto promotion', pack.rollout_governance?.auto_promotion === false);
ok('shadow only', pack.shadow_only === true);
ok('decision hint', !!pack.operational_decision_hint?.action);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
