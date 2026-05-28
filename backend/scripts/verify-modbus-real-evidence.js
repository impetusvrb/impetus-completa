#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gov = require('../src/industrial-modbus/governance/modbusGovernanceService');
const flags = require('../src/industrial-modbus/config/modbusRealFlags');
const deviceSvc = require('../src/industrial-modbus/services/modbusDeviceConfigService');

const CHECKS = [];
function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  check('modbus_real_enabled', flags.isModbusRealEnabled(), {});
  check('mode_on', flags.modbusRealMode() === 'on', { mode: flags.modbusRealMode() });
  check('env_telemetry_runtime', process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED === 'true', {});
  check('env_modbus_connector', process.env.IMPETUS_ENVIRONMENT_TELEMETRY_MODBUS_ENABLED === 'true', {});
  check('pilot_tenant', flags.modbusPilotTenants().length >= 1, {
    tenants: flags.modbusPilotTenants(),
  });
  check('host_port_set', !!flags.defaultHost() && flags.defaultPort() > 0, {
    host: flags.defaultHost(),
    port: flags.defaultPort(),
  });

  const schema = await deviceSvc.ensureSchema();
  check('schema_ok', schema.ok, schema);

  let tables = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.tables
       WHERE table_name IN ('tenant_modbus_devices', 'modbus_sample_buffer', 'modbus_connection_audit')`
    );
    tables = r.rows[0]?.cnt || 0;
    check('tables_exist', tables >= 3, { count: tables });
  } catch (err) {
    check('tables_exist', false, { error: err.message });
  }

  let auditEvents = 0;
  try {
    const db = require('../src/db');
    const r = await db.query('SELECT COUNT(*)::int AS cnt FROM modbus_connection_audit');
    auditEvents = r.rows[0]?.cnt || 0;
    check('audit_table_readable', true, { count: auditEvents });
  } catch (err) {
    check('audit_table_readable', false, { error: err.message });
  }

  let runtimeStats = null;
  try {
    const runtime = require('../src/industrial-modbus/runtime/modbusRealPollRuntime');
    runtimeStats = runtime.getGlobalStats();
    check('runtime_module', true, runtimeStats);
  } catch (err) {
    check('runtime_module', false, { error: err.message });
  }

  const allPassed = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok: allPassed,
    diagnostics: gov.getDiagnostics(),
    runtime_stats: runtimeStats,
    checks: CHECKS,
    rollback: {
      IMPETUS_MODBUS_REAL_ENABLED: 'false',
      IMPETUS_MODBUS_REAL_MODE: 'shadow',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: ['backend/docs/MODBUS_REAL_ENTERPRISE_REPORT.md'],
  }, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
