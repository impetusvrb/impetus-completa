'use strict';

process.env.IMPETUS_OPCUA_REAL_ENABLED = 'true';
process.env.IMPETUS_OPCUA_REAL_MODE = 'audit';
process.env.IMPETUS_OPCUA_REAL_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OPCUA_ENABLED = 'true';

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
  const flags = require('../../src/industrial-opcua/config/opcuaRealFlags');
  const gov = require('../../src/industrial-opcua/governance/opcuaGovernanceService');
  const opcuaConn = require('../../src/domains/environment/telemetry/connectors/environmentOpcUaConnector');

  console.log('\n── OPC-UA Real flags ──');
  assert('enabled', flags.isOpcUaRealEnabled());
  assert('mode audit', flags.opcuaRealMode() === 'audit');
  assert('pilot active', gov.isActiveForTenant(PILOT));
  assert('non-pilot inactive', !gov.isActiveForTenant(NON_PILOT));
  assert('should connect in audit', gov.shouldConnectReal('audit'));
  assert('no persist in audit default', !gov.shouldPersistIngest('audit'));
  assert('persist in on', gov.shouldPersistIngest('on'));
  assert('simulate fallback invariant', flags.invariants.simulate_fallback_preserved);

  console.log('\n── Effective mode merge ──');
  assert('global audit caps server on', gov.getEffectiveMode('on') === 'audit');
  assert('shadow stays shadow', gov.getEffectiveMode('shadow') === 'shadow');

  console.log('\n── Connector normalization ──');
  const norm = opcuaConn.ingestSubscriptionSample(PILOT, 'ns=2;s=Temp', 42.1, { unit: 'C' });
  assert('ingest ok', norm.ok === true);
  assert('sample has opcua source', norm.sampleBody?.telemetry_source === 'opcua');

  console.log('\n── Schema ──');
  const serverSvc = require('../../src/industrial-opcua/services/opcuaServerConfigService');
  const schema = await serverSvc.ensureSchema();
  assert('schema ok', schema.ok === true);

  console.log('\n── Buffer replay (unit) ──');
  const buffer = require('../../src/industrial-opcua/runtime/opcuaSampleBufferRuntime');
  await buffer.bufferSample(PILOT, 'ns=2;s=Replay', { value: 10, meta: {} });
  const replay = await buffer.replayPending(PILOT, async (nodeId, payload) => {
    const norm = opcuaConn.ingestSubscriptionSample(PILOT, nodeId, payload?.value, payload?.meta || {});
    return norm.ok === true;
  });
  assert('replay ran', replay.replayed >= 0, JSON.stringify(replay));

  console.log('\n── State / simulation fallback ──');
  const sim = opcuaConn.simulateReconnect();
  assert('simulate preserved', sim.simulation === true);
  const state = opcuaConn.getOpcUaState();
  assert('state exposes enabled', state.enabled === true);

  console.log(`\nOPC-UA Real tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
