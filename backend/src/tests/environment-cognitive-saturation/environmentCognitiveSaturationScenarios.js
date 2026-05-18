'use strict';

const sat = require('../../domains/environment/pilot-rollout/environmentCognitiveSaturationRuntime');

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

console.log('\nenvironment-cognitive-saturation\n');
const pack = sat.runEnvironmentCognitiveSaturationPack({ menu_count: 5, view_count: 2, kpi_count: 4 });
ok('ok pack', pack.ok === true);
ok('no collapse', pack.operational.saturation_collapse_risk === false);
const overload = sat.runEnvironmentCognitiveSaturationPack({ menu_count: 20, view_count: 10, dashboard_widget_count: 15, kpi_count: 15 });
ok('overload risk', overload.operational.saturation_collapse_risk === true || overload.navigation.sidebar_overload === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
