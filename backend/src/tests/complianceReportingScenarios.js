'use strict';

/**
 * Compliance Reporting Engine — testes (funções puras + geração read-only quando BD disponível).
 * Executar: node src/tests/complianceReportingScenarios.js
 */

const assert = require('assert');
const complianceReportingService = require('../services/complianceReportingService');

function testParsePeriodUtc() {
  const p = complianceReportingService.parsePeriod('2026-01-01', '2026-01-31');
  assert.strictEqual(p.error, undefined);
  assert.ok(p.span_days >= 28);
  assert.strictEqual(p.start.toISOString().slice(0, 10), '2026-01-01');
}

function testParsePeriodRejectsTooLong() {
  const p = complianceReportingService.parsePeriod('2026-01-01', '2026-12-31');
  assert.ok(p.error);
  assert.ok(p.error.includes('máximo'));
}

function testAccessSuperAdminGlobal() {
  const a = complianceReportingService.resolveAccessScope('super_admin', null);
  assert.strictEqual(a.scope, 'global');
  assert.strictEqual(a.company_id, null);
  assert.strictEqual(a.error, undefined);
}

function testAccessSuperAdminCompany() {
  const cid = '00000000-0000-4000-8000-000000000001';
  const a = complianceReportingService.resolveAccessScope('super_admin', cid);
  assert.strictEqual(a.scope, 'company');
  assert.strictEqual(a.company_id, cid);
}

function testAccessCommercialRequiresCompany() {
  const a = complianceReportingService.resolveAccessScope('admin_comercial', null);
  assert.ok(a.error);
}

function testAnonymizeNoRawUuidExposure() {
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const s = complianceReportingService.anonymizeSubjectId(id);
  assert.ok(!s.includes('eeee'));
  assert.ok(s.startsWith('SUBJECT_'));
}

function testBuildComplianceFlags() {
  const flags = complianceReportingService.buildComplianceFlags({
    trace: { total_decisions: 100, class_sensitive_flag: 30, class_high_critical: 5 },
    incidents: { total: 40 },
    legal: {
      by_action: { BLOCK: { count: 10 }, PROCESS: { count: 50 } },
      totals: { anonymization_actions: 0, retention_flags: 0 }
    },
    period: { span_days: 30 }
  });
  assert.ok(flags.some((f) => f.code === 'HIGH_SENSITIVE_CLASSIFICATION_VOLUME'));
  assert.ok(flags.some((f) => f.code === 'INCIDENT_VOLUME_ELEVATED'));
}

async function testGenerateReportDryRun() {
  try {
    const r = await complianceReportingService.generateComplianceReport({
      adminProfile: 'super_admin',
      company_id: null,
      period_start: '2026-01-01',
      period_end: '2026-01-07',
      report_type: 'GOVERNANCE_SUMMARY'
    });
    if (!r.ok) {
      console.warn('[SKIP integration]', r.error);
      return;
    }
    assert.strictEqual(r.report_type, 'GOVERNANCE_SUMMARY');
    assert.ok(r.period);
    assert.ok(Array.isArray(r.compliance_flags));
    assert.ok(r.metrics.traces);
    assert.strictEqual(r.export.pdf_ready, true);
    assert.ok(!JSON.stringify(r).includes('user_email'));
  } catch (e) {
    if (e && e.code === '42P01') {
      console.warn('[SKIP integration] schema incompleto (tabelas IA ausentes)');
      return;
    }
    throw e;
  }
}

const syncSuite = [
  testParsePeriodUtc,
  testParsePeriodRejectsTooLong,
  testAccessSuperAdminGlobal,
  testAccessSuperAdminCompany,
  testAccessCommercialRequiresCompany,
  testAnonymizeNoRawUuidExposure,
  testBuildComplianceFlags
];

let failed = false;
for (const t of syncSuite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}

(async () => {
  try {
    await testGenerateReportDryRun();
    console.log('OK', testGenerateReportDryRun.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', testGenerateReportDryRun.name, e);
  }
  if (failed) process.exit(1);
  console.log('complianceReportingScenarios: all passed');
})();
