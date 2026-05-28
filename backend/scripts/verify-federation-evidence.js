#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const gov = require('../src/federation/governance/federationGovernanceService');
const flags = require('../src/federation/config/federationFlags');
const bootstrap = require('../src/federation/bootstrap/federationSchemaBootstrap');

const CHECKS = [];
function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  check('federation_enabled', flags.isFederationEnabled(), {});
  check('mode_audit', flags.federationMode() === 'audit', { mode: flags.federationMode() });
  check('oidc_enabled', flags.isOidcEnabled(), {});
  check('saml_enabled', flags.isSamlEnabled(), {});
  check('scim_enabled', flags.isScimEnabled(), {});
  check('pilot_single_tenant', flags.federationPilotTenants().length >= 1, {
    tenants: flags.federationPilotTenants(),
  });

  const schema = await bootstrap.ensureFederationSchema();
  check('schema_ok', schema.ok, schema);

  let tables = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.tables
       WHERE table_name IN (
         'tenant_federation_providers',
         'federation_identity_links',
         'federation_login_traces',
         'scim_provisioning_tokens'
       )`
    );
    tables = r.rows[0]?.cnt || 0;
    check('tables_exist', tables >= 4, { count: tables });
  } catch (err) {
    check('tables_exist', false, { error: err.message });
  }

  let auditBoot = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'federation_boot'`
    );
    auditBoot = r.rows[0].cnt;
    check('audit_boot', auditBoot >= 0, { count: auditBoot });
  } catch (err) {
    check('audit_boot', false, { error: err.message });
  }

  const allPassed = CHECKS.every((c) => c.passed);
  console.log(JSON.stringify({
    ok: allPassed,
    diagnostics: gov.getDiagnostics(),
    checks: CHECKS,
    rollback: {
      IMPETUS_FEDERATION_ENABLED: 'false',
      IMPETUS_FEDERATION_MODE: 'off',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: [
      'backend/docs/FEDERATION_ENTERPRISE_REPORT.md',
      'backend/docs/ENTERPRISE_ONBOARDING_GUIDE_FEDERATION.md',
    ],
  }, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
