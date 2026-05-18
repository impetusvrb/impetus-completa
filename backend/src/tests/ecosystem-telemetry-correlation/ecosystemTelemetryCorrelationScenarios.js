'use strict';

const { ecosystemTelemetryCorrelationRuntime } = require('../../ecosystem-correlation/ecosystemTelemetryCorrelationRuntime');

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

console.log('\necosystem-telemetry-correlation\n');
const pack = ecosystemTelemetryCorrelationRuntime({
  telemetry_streams: { quality: 1, environment: 1 },
  event_rate_per_min: 50
});
ok('score', pack.telemetry_correlation_score != null);
ok('no overload', pack.telemetry_overload === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
