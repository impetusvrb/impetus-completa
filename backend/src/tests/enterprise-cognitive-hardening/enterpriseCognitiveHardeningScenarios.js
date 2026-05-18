'use strict';

const cognitive = require('../../enterprise-hardening/enterpriseCognitiveHardening');

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

console.log('\nenterprise-cognitive-hardening\n');
const pack = cognitive.enterpriseCognitiveHardeningRuntime({
  menu_count: 6,
  dashboard_widget_count: 4,
  kpi_count: 6
});
ok('cognitive pack', !!pack.maturity);
ok('ecmi index', typeof pack.ecmi?.enterprise_cognitive_maturity_index === 'number');
ok('executive density', pack.executive?.protected === true);
ok('fusion safe', pack.fusion?.fusion_safe === true);
ok('assistive only', pack.assistive_only === true);

const overload = cognitive.enterpriseCognitiveHardeningRuntime({
  menu_count: 20,
  dashboard_widget_count: 12,
  kpi_count: 15
});
ok('overload path', overload.executive?.executive_overload === true || overload.operational?.operational_overload === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
