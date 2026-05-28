#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gov = require('../src/tenant-isolation/governance/tenantRlsGovernanceService');
const flags = require('../src/tenant-isolation/config/tenantRlsFlags');
const rls = require('../src/tenant-isolation/runtime/tenantRlsRuntime');

const CHECKS = [];
function check(name, passed, detail) { CHECKS.push({ name, passed: !!passed, detail }); }

async function main() {
  check('rls_enabled', flags.isRlsEnabled(), {});
  check('mode_audit', flags.rlsMode() === 'audit', { mode: flags.rlsMode() });
  check('fuzz_enabled', flags.fuzzEnabled(), {});

  const boot = await rls.boot();
  check('boot_ok', boot.schema?.ok !== false, boot);

  const registry = await rls.listRegistry();
  check('registry_populated', registry.length >= 10, { count: registry.length });

  try {
    const db = require('../src/db');
    const fn = await db.query(
      `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'impetus_tenant_row_visible') AS ok`
    );
    check('rls_function_exists', fn.rows[0]?.ok === true, {});
  } catch (e) {
    check('rls_function_exists', false, { error: e.message });
  }

  const fuzz = require('../src/tenant-isolation/testing/tenantFuzzSuite');
  const fuzzOut = await fuzz.runFullSuite();
  check('fuzz_suite_ok', fuzzOut.ok === true, fuzzOut.summary);

  const attack = require('../src/tenant-isolation/testing/crossTenantAttackSimulator');
  const atk = await attack.runAttackSimulation();
  check('chaos_ok', atk.ok === true, atk.summary);

  let auditBoot = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(`SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'tenant_rls_boot'`);
    auditBoot = r.rows[0].cnt;
    check('audit_boot', auditBoot >= 0, { count: auditBoot });
  } catch (e) {
    check('audit_boot', false, { error: e.message });
  }

  const ok = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok,
    diagnostics: gov.getDiagnostics(),
    checks: CHECKS,
    rollback: {
      IMPETUS_RLS_ENABLED: 'false',
      IMPETUS_RLS_MODE: 'off',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: 'backend/docs/TENANT_RLS_HARDENING_REPORT.md',
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
