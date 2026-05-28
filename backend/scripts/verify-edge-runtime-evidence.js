#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gov = require('../src/industrial-edge/governance/edgeGovernanceService');
const flags = require('../src/industrial-edge/config/edgeRuntimeFlags');
const persistence = require('../src/industrial-edge/services/edgeQueuePersistenceService');

const CHECKS = [];
function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  check('edge_real_enabled', flags.isEdgeRuntimeRealEnabled(), {});
  check('edge_mode_on', flags.edgeRuntimeMode() === 'on', { mode: flags.edgeRuntimeMode() });
  check('edge_telemetry', process.env.IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED === 'true', {});
  check('persist_queue', flags.persistQueue(), {});

  const schema = await persistence.ensureSchema();
  check('schema_ok', schema.ok, schema);

  let tables = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.tables
       WHERE table_name IN ('edge_runtime_queue', 'edge_sync_audit', 'industrial_lab_runs')`
    );
    tables = r.rows[0]?.cnt || 0;
    check('tables_exist', tables >= 3, { count: tables });
  } catch (err) {
    check('tables_exist', false, { error: err.message });
  }

  const runtime = require('../src/industrial-edge/runtime/edgeRealSyncRuntime');
  check('runtime_module', typeof runtime.warmBoot === 'function', runtime.getGlobalStats());

  const allPassed = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok: allPassed,
    diagnostics: gov.getDiagnostics(),
    checks: CHECKS,
    rollback: {
      IMPETUS_EDGE_RUNTIME_MODE: 'audit',
      IMPETUS_MQTT_REAL_MODE: 'audit',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: ['backend/docs/EDGE_RUNTIME_INDUSTRIAL_LAB_REPORT.md'],
  }, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
