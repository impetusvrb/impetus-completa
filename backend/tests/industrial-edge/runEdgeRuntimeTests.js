'use strict';

process.env.IMPETUS_EDGE_RUNTIME_REAL_ENABLED = 'true';
process.env.IMPETUS_EDGE_RUNTIME_MODE = 'on';
process.env.IMPETUS_EDGE_RUNTIME_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED = 'true';
process.env.IMPETUS_INDUSTRIAL_LAB_ENABLED = 'true';

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log('  ✓', name);
  } else {
    failed += 1;
    console.error('  ✗', name, detail);
  }
}

async function main() {
  const flags = require('../../src/industrial-edge/config/edgeRuntimeFlags');
  const gov = require('../../src/industrial-edge/governance/edgeGovernanceService');
  const bridge = require('../../src/industrial-edge/runtime/edgeConnectorBridgeRuntime');

  console.log('\n── Edge flags ──');
  assert('enabled', flags.isEdgeRuntimeRealEnabled());
  assert('sync on mode', gov.shouldSyncToIngest('on'));
  assert('persist audit', gov.shouldPersistQueue('audit'));
  assert('pilot active', gov.isActiveForTenant(PILOT));

  console.log('\n── Bridge audit ──');
  const mqtt = await bridge.bridgeEdgePayload(PILOT, {
    connector_source: 'mqtt',
    topic: 'lab/test',
    value: 10,
  }, 'audit');
  assert('mqtt bridge audit', mqtt.ok && mqtt.audit === true);

  console.log('\n── Schema + queue ──');
  const persistence = require('../../src/industrial-edge/services/edgeQueuePersistenceService');
  assert('schema', (await persistence.ensureSchema()).ok === true);

  console.log(`\nEdge Runtime tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
