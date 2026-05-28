#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const CHECKS = [];
function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  check('industrial_lab_enabled', process.env.IMPETUS_INDUSTRIAL_LAB_ENABLED === 'true', {});
  check('edge_runtime_enabled', process.env.IMPETUS_EDGE_RUNTIME_REAL_ENABLED === 'true', {});
  check('mqtt_mode_on', process.env.IMPETUS_MQTT_REAL_MODE === 'on', { mode: process.env.IMPETUS_MQTT_REAL_MODE });
  check('edge_mode_on', process.env.IMPETUS_EDGE_RUNTIME_MODE === 'on', { mode: process.env.IMPETUS_EDGE_RUNTIME_MODE });

  const lab = require('../src/industrial-edge/lab/industrialLabE2eService');
  const run = await lab.runSuite(lab.PILOT_DEFAULT);
  check('e2e_suite_ok', run.ok, { run_id: run.run_id, lab_connectivity: run.lab_connectivity_ok });

  let runs = 0;
  try {
    const db = require('../src/db');
    const r = await db.query('SELECT COUNT(*)::int AS cnt FROM industrial_lab_runs');
    runs = r.rows[0]?.cnt || 0;
    check('lab_runs_table', runs >= 1, { count: runs });
  } catch (err) {
    check('lab_runs_table', false, { error: err.message });
  }

  const allPassed = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok: allPassed,
    e2e: run,
    checks: CHECKS,
    documentation: ['backend/docs/EDGE_RUNTIME_INDUSTRIAL_LAB_REPORT.md'],
  }, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
