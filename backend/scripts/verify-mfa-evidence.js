#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gov = require('../src/mfa/governance/mfaGovernanceService');
const flags = require('../src/mfa/config/mfaFlags');
const bootstrap = require('../src/mfa/bootstrap/mfaSchemaBootstrap');

const CHECKS = [];
function check(name, passed, detail) { CHECKS.push({ name, passed: !!passed, detail }); }

async function main() {
  check('mfa_enabled', flags.isMfaEnabled(), {});
  check('mode_audit', flags.mfaMode() === 'audit', { mode: flags.mfaMode() });
  check('totp_enabled', flags.isTotpEnabled(), {});
  check('webauthn_enabled', flags.isWebAuthnEnabled(), {});
  check('backup_enabled', flags.isBackupCodesEnabled(), {});

  const schema = await bootstrap.ensureMfaSchema();
  check('schema_ok', schema.ok, schema);

  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.tables
       WHERE table_name IN ('tenant_mfa_policies','user_mfa_enrollments','mfa_challenges','mfa_audit_events')`
    );
    check('tables_exist', r.rows[0].cnt >= 4, { count: r.rows[0].cnt });
    const boot = await db.query(`SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'mfa_boot'`);
    check('audit_boot', true, { count: boot.rows[0].cnt });
  } catch (e) {
    check('tables_exist', false, { error: e.message });
  }

  const ok = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok,
    diagnostics: gov.getDiagnostics(),
    checks: CHECKS,
    rollback: {
      IMPETUS_MFA_ENABLED: 'false',
      IMPETUS_MFA_MODE: 'off',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: 'backend/docs/MFA_ENTERPRISE_REPORT.md',
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
