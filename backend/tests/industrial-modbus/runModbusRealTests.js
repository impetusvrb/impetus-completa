'use strict';

process.env.IMPETUS_MODBUS_REAL_ENABLED = 'true';
process.env.IMPETUS_MODBUS_REAL_MODE = 'audit';
process.env.IMPETUS_MODBUS_REAL_PILOT_TENANTS = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED = 'true';

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
  const flags = require('../../src/industrial-modbus/config/modbusRealFlags');
  const gov = require('../../src/industrial-modbus/governance/modbusGovernanceService');
  const modbusConn = require('../../src/domains/environment/telemetry/connectors/environmentModbusConnector');

  console.log('\n── Modbus Real flags ──');
  assert('enabled', flags.isModbusRealEnabled());
  assert('mode audit', flags.modbusRealMode() === 'audit');
  assert('pilot active', gov.isActiveForTenant(PILOT));
  assert('non-pilot inactive', !gov.isActiveForTenant(NON_PILOT));
  assert('should poll in audit', gov.shouldPollReal('audit'));
  assert('no persist in audit default', !gov.shouldPersistIngest('audit'));
  assert('persist in on', gov.shouldPersistIngest('on'));
  assert('simulate fallback invariant', flags.invariants.simulate_fallback_preserved);

  console.log('\n── Effective mode merge ──');
  assert('global audit caps device on', gov.getEffectiveMode('on') === 'audit');

  console.log('\n── Connector conversion ──');
  const sample = modbusConn.convertRegisterToSample(40001, 100, { scale: 0.1, unit: 'bar' });
  assert('scaled value', sample.value === 10);
  assert('modbus source', sample.telemetry_source === 'modbus_tcp');

  console.log('\n── Simulation fallback ──');
  const sim = await modbusConn.pollRegisters(
    NON_PILOT,
    [{ address: 0, raw_value: 42 }],
    {},
    1
  );
  assert('non-pilot simulation', sim.simulation === true && sim.ok === true);

  console.log('\n── Schema ──');
  const deviceSvc = require('../../src/industrial-modbus/services/modbusDeviceConfigService');
  const schema = await deviceSvc.ensureSchema();
  assert('schema ok', schema.ok === true);

  console.log('\n── Buffer replay (unit) ──');
  const buffer = require('../../src/industrial-modbus/runtime/modbusSampleBufferRuntime');
  await buffer.bufferSample(PILOT, '0', { value: 5, meta: { scale: 1 } });
  const replay = await buffer.replayPending(PILOT, async (registerKey, payload) => {
    const norm = modbusConn.convertRegisterToSample(registerKey, payload?.value, payload?.meta || {});
    return !!norm.metric_key;
  });
  assert('replay ran', replay.replayed >= 0, JSON.stringify(replay));

  console.log('\n── State / simulate reconnect ──');
  const rc = modbusConn.simulateReconnect();
  assert('simulate preserved', rc.simulation === true);
  const state = modbusConn.getModbusState();
  assert('state enabled', state.enabled === true);

  console.log(`\nModbus Real tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
