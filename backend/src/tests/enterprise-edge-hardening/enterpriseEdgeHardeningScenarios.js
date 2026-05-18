'use strict';

const edge = require('../../enterprise-hardening/enterpriseEdgeHardening');

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

console.log('\nenterprise-edge-hardening\n');
const stable = edge.enterpriseEdgeHardeningRuntime({ queue_depth: 100, reconnect_count_per_min: 2 });
ok('stable edge', stable.ok === true);
ok('queue protected', stable.queue?.protected === true);

const storm = edge.enterpriseEdgeHardeningRuntime({ reconnect_count_per_min: 20, queue_depth: 6000 });
ok('reconnect storm', storm.reconnect?.reconnect_storm === true);
ok('queue explosion', storm.queue?.queue_explosion === true);

const replay = edge.enterpriseReplayIntegrityRuntime({ duplicate_replay_ratio: 0.02 });
ok('replay integrity', replay.integrity_ok === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
