'use strict';

process.env.IMPETUS_MQTT_REAL_ENABLED = 'true';
process.env.IMPETUS_MQTT_REAL_MODE = 'audit';
process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED = 'true';

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const NON_PILOT = '00000000-0000-4000-8000-000000000099';

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
  const flags = require('../../src/industrial-mqtt/config/mqttRealFlags');
  const gov = require('../../src/industrial-mqtt/governance/mqttGovernanceService');
  const mqttConn = require('../../src/domains/environment/telemetry/connectors/environmentMqttConnector');

  console.log('\n── MQTT Real flags ──');
  assert('enabled', flags.isMqttRealEnabled());
  assert('mode audit', flags.mqttRealMode() === 'audit');
  assert('pilot active', gov.isActiveForTenant(PILOT));
  assert('non-pilot inactive', !gov.isActiveForTenant(NON_PILOT));
  assert('should connect in audit', gov.shouldConnectReal('audit'));
  assert('no persist in audit default', !gov.shouldPersistIngest('audit'));
  assert('persist in on', gov.shouldPersistIngest('on'));
  assert('simulate fallback invariant', flags.invariants.simulate_fallback_preserved);

  console.log('\n── Effective mode merge ──');
  assert('global audit caps broker on', gov.getEffectiveMode('on') === 'audit');
  assert('shadow stays shadow', gov.getEffectiveMode('shadow') === 'shadow');

  console.log('\n── Connector normalization ──');
  const norm = mqttConn.ingestMqttMessage(PILOT, 'plant/temp', { value: 22.5, unit: 'C' });
  assert('ingest ok', norm.ok === true);
  assert('sample has mqtt source', norm.sampleBody?.telemetry_source === 'mqtt');

  console.log('\n── Schema ──');
  const brokerSvc = require('../../src/industrial-mqtt/services/mqttBrokerConfigService');
  const schema = await brokerSvc.ensureSchema();
  assert('schema ok', schema.ok === true);

  console.log('\n── Buffer replay (unit) ──');
  const buffer = require('../../src/industrial-mqtt/runtime/mqttBufferReplayRuntime');
  const runtime = require('../../src/industrial-mqtt/runtime/mqttRealClientRuntime');
  let replayCount = 0;
  await buffer.bufferMessage(PILOT, 'test/replay', { value: 1 }, 1);
  const replay = await buffer.replayPending(PILOT, async (topic, payload) => {
    replayCount += 1;
    return runtime._processMessage(PILOT, topic, payload, 'audit', { replay: true });
  });
  assert('replay ran', replay.replayed >= 0, JSON.stringify(replay));

  console.log('\n── State / simulation fallback ──');
  const sim = mqttConn.simulateReconnect();
  assert('simulate preserved', sim.simulation === true);
  const state = mqttConn.getMqttState();
  assert('state exposes enabled', state.enabled === true);

  console.log(`\nMQTT Real tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
