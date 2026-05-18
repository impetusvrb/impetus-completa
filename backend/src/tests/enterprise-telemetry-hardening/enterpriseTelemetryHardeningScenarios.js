'use strict';

const telemetry = require('../../enterprise-hardening/enterpriseTelemetryHardening');

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

console.log('\nenterprise-telemetry-hardening\n');
const normal = telemetry.enterpriseTelemetryHardeningRuntime({ event_rate_per_min: 50, mqtt_rate: 40 });
ok('normal ok', normal.ok === true);
ok('overload protection', !!normal.overload);
ok('adaptive sampling', normal.sampling?.adaptive === true);
ok('replay integrity', normal.replay?.integrity_ok === true);

const overload = telemetry.enterpriseTelemetryHardeningRuntime({ event_rate_per_min: 200, burst_factor: 4 });
ok('overload detected', overload.overload?.overload === true);
ok('throttle action', overload.overload?.action === 'throttle_sampling');

const collapse = telemetry.enterpriseTelemetryResilienceRuntime({ mqtt_rate: 250, opcua_rate: 200, modbus_rate: 120 });
ok('collapse risk path', collapse.collapse_risk === true || collapse.telemetry_pressure_score > 0.5);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
