'use strict';

const { enterpriseOperationalHardeningRuntime } = require('../../enterprise-hardening/enterpriseOperationalHardeningRuntime');

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

console.log('\nenterprise-hardening-runtime\n');
const pack = enterpriseOperationalHardeningRuntime({
  tenant_id: 't-hardening',
  event_rate_per_min: 80,
  queue_depth: 200,
  menu_count: 6,
  dashboard_widget_count: 5
});
ok('framework', pack.framework === 'enterprise_operational_hardening');
ok('telemetry layer', !!pack.telemetry);
ok('edge layer', !!pack.edge);
ok('tenant layer', !!pack.tenant);
ok('cognitive layer', !!pack.cognitive);
ok('observability layer', !!pack.observability);
ok('continuity layer', !!pack.continuity);
ok('maturity', !!pack.maturity?.ecosystem?.maturity_level);
ok('runtime resilience', typeof pack.runtime_resilience?.score === 'number');
ok('validation object', !!pack.validation);
ok('no auto promotion', pack.rollout_governance?.auto_promotion === false);
ok('shadow first', pack.rollout_governance?.shadow_first === true);
ok('assistive only', pack.assistive_only === true && pack.enforcement === false);
ok('observation cycle', pack.observation_cycle?.shadow_first === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
