'use strict';

const obs = require('../../enterprise-hardening/enterpriseObservabilityHardening');

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

console.log('\nenterprise-observability-hardening\n');
const stable = obs.enterpriseObservabilityHardeningRuntime({ distinct_metric_keys: 200, metrics_per_min: 400 });
ok('stable observability', stable.ok === true);
ok('wave2 flag', stable.wave2_integrated === true);
ok('adaptive retention', stable.adaptive_retention === true);

const explosion = obs.enterpriseObservabilityHardeningRuntime({ distinct_metric_keys: 1200, metrics_per_min: 2500 });
ok('cardinality explosion', explosion.cardinality?.cardinality_explosion === true);
ok('pressure overload', explosion.pressure?.overload === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
