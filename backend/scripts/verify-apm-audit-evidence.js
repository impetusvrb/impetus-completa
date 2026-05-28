#!/usr/bin/env node
'use strict';

/**
 * Verificação independente — APM Enterprise em modo audit.
 * Uso: node scripts/verify-apm-audit-evidence.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const apm = require('../src/observability/apmEnterpriseBridge');
const flags = require('../src/observability/observabilityFlags');

const CHECKS = [];

function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  const diag = apm.getDiagnostics();

  check('observability_v2_enabled', flags.isObservabilityV2Enabled(), {});
  check('apm_enterprise_enabled', flags.isApmEnterpriseEnabled(), {});
  check('mode_is_audit', diag.enterprise_mode === 'audit', { mode: diag.enterprise_mode });
  check('shadow_mode_off', diag.shadow_mode === false, { shadow_mode: diag.shadow_mode });
  check('sampling_rate_0_1', diag.sampling_rate === 0.1, { sampling_rate: diag.sampling_rate });
  check('otel_exporter_disabled', flags.isOtelExporterEnabled() === false, {
    otel_exporter: process.env.IMPETUS_OTEL_EXPORTER_ENABLED,
  });
  check('otel_export_inactive', diag.otel_export === false, { otel_export: diag.otel_export });
  check('alerts_observe_only', flags.isAlertsObserveOnly() === true, {
    alerts_enforce: process.env.IMPETUS_OBSERVABILITY_ALERTS_ENFORCE,
  });

  let auditBoot = 0;
  try {
    const db = require('../src/db');
    const r = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'apm_enterprise_boot'`
    );
    auditBoot = r.rows[0].cnt;
    check('audit_boot_events', true, { count: auditBoot });
  } catch (err) {
    check('audit_boot_events', false, { error: err.message });
  }

  const allPassed = CHECKS.every((c) => c.passed);
  const report = {
    ok: allPassed,
    generated_at: new Date().toISOString(),
    diagnostics: diag,
    checks: CHECKS,
    summary: {
      passed: CHECKS.filter((c) => c.passed).length,
      failed: CHECKS.filter((c) => !c.passed).length,
    },
    rollback: {
      IMPETUS_APM_ENTERPRISE_MODE: 'shadow',
      IMPETUS_APM_SHADOW_MODE: 'true',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: 'backend/docs/APM_AUDIT_PROMOTION_REPORT.md',
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
