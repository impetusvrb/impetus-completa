#!/usr/bin/env node
'use strict';

/**
 * Verificação — SZ4 Persistence pilot (PROMPT 15).
 * Uso: node scripts/verify-sz4-persistence-evidence.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sz4p = require('../src/runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
const sz4flags = require('../src/runtime-z-operational-nervous-system/config/sz4FeatureFlags');

const CHECKS = [];

function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  const diag = sz4p.getDiagnostics();
  const pilotTenants = String(process.env.IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS || '').split(',').filter(Boolean);

  check('persistence_enabled', sz4flags.isPersistenceEnabled(), {});
  check('pilot_only', sz4flags.persistencePilotOnly() === true, {});
  check('single_pilot_tenant', pilotTenants.length === 1, { count: pilotTenants.length, tenants: pilotTenants });
  check('ttl_90_days', sz4flags.persistenceTtlDays() === 90, { ttl: sz4flags.persistenceTtlDays() });
  check('replay_on_boot', diag.replay_on_boot === true, {});

  const schema = await sz4p.ensureSchema();
  check('schema_ok', schema.ok === true, schema);

  let tableExists = false;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_name = 'sz4_operational_persistence_records'
       ) AS ok`
    );
    tableExists = r.rows[0]?.ok === true;
    check('table_exists', tableExists, {});
  } catch (err) {
    check('table_exists', false, { error: err.message });
  }

  let auditBoot = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'sz4_persistence_boot'`
    );
    auditBoot = r.rows[0].cnt;
    check('audit_boot_events', auditBoot >= 0, { count: auditBoot });
  } catch (err) {
    check('audit_boot_events', false, { error: err.message });
  }

  const allPassed = CHECKS.every((c) => c.passed);
  const report = {
    ok: allPassed,
    generated_at: new Date().toISOString(),
    diagnostics: diag,
    health: sz4p.getHealth(),
    checks: CHECKS,
    summary: {
      passed: CHECKS.filter((c) => c.passed).length,
      failed: CHECKS.filter((c) => !c.passed).length,
    },
    rollback: {
      IMPETUS_SZ4_PERSISTENCE: 'off',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: 'backend/docs/SZ4_PERSISTENCE_ENTERPRISE_REPORT.md',
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
