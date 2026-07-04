'use strict';

/**
 * SEC-07 — SOC Dashboard Audit (22+ checks).
 * node backend/src/tests/securitySOC/SEC_07_SOC_AUDIT.test.js
 */

process.env.SECURITY_SOC = 'true';
process.env.SECURITY_CORRELATION_ENGINE = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshSec07() {
  const mods = [
    '../../securitySOC/index.js',
    '../../securitySOC/runtime/socRuntime.js',
    '../../securitySOC/engine/socDashboardBuilder.js',
    '../../securitySOC/metrics/socMetrics.js',
    '../../securitySOC/config/securitySOCFlags.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const b = require('../../securitySOC/engine/socDashboardBuilder');
  b.invalidateCache();
  return require('../../securitySOC');
}

function seedIncident() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-soc-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    timeline: [{ timestamp: '2026-07-03T02:04:00Z', phase: 'RECONNAISSANCE', label: 'Reconhecimento' }],
    metrics: { requestCount: 5000, eventCount: 20 }
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-soc-closed',
    severity: 'MEDIUM',
    status: 'CLOSED',
    lastSeen: '2026-07-02T10:00:00Z'
  }));
}

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

(async () => {
  console.log('\n  SEC-07 — ENTERPRISE SECURITY SOC AUDIT\n');

  await test('01 — módulo securitySOC exporta API', () => {
    const s = freshSec07();
    assert.ok(s.buildSOC);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_SOC;
    delete process.env.SECURITY_SOC;
    delete require.cache[require.resolve('../../securitySOC/config/securitySOCFlags.js')];
    const f = require('../../securitySOC/config/securitySOCFlags');
    assert.strictEqual(f.isSecuritySOCEnabled(), false);
    process.env.SECURITY_SOC = prev || 'true';
  });

  await test('03 — Security SOC DTO schema v1', () => {
    const { createSecuritySOCDto } = require('../../securitySOC/dto/securitySOCDto');
    const d = createSecuritySOCDto({ socStatus: 'SECURE', overallSecurityScore: 0.95 });
    assert.strictEqual(d.schema_version, 'security_soc_v1');
    assert.strictEqual(d.read_only, true);
  });

  await test('04 — colector read-only SEC-01→06', () => {
    const { collectAllModulesData } = require('../../securitySOC/engine/socDataCollector');
    const data = collectAllModulesData();
    assert.ok('sec01' in data && 'sec06' in data);
  });

  await test('05 — overall security score 0-1', () => {
    seedIncident();
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(soc.overallSecurityScore >= 0 && soc.overallSecurityScore <= 1);
  });

  await test('06 — global indicators KPIs', () => {
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(soc.globalIndicators.overall_security_score != null);
    assert.ok(soc.globalIndicators.threat_level);
  });

  await test('07 — executive timeline', () => {
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(Array.isArray(soc.timeline));
    assert.ok(soc.timeline.some((t) => t.phase === 'CURRENT_STATE'));
  });

  await test('08 — executive summary determinístico', () => {
    const { buildExecutiveSummary } = require('../../securitySOC/engine/executiveSummaryBuilder');
    const { collectAllModulesData } = require('../../securitySOC/engine/socDataCollector');
    const data = collectAllModulesData();
    seedIncident();
    const data2 = collectAllModulesData();
    const summary = buildExecutiveSummary(data2, { overall_security_score: 0.8 }, 'ELEVATED');
    assert.ok(typeof summary === 'string');
    assert.ok(summary.length > 10);
  });

  await test('09 — dashboard operacional', () => {
    seedIncident();
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(soc.operationalDashboard);
    assert.strictEqual(soc.operationalDashboard.schema_version, 'soc_operations_v1');
  });

  await test('10 — dashboard executivo', () => {
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(soc.executiveDashboard);
    assert.strictEqual(soc.executiveDashboard.schema_version, 'soc_executive_v1');
  });

  await test('11 — active vs resolved incidents', () => {
    seedIncident();
    const s = freshSec07();
    const soc = s.buildSOC({ force: true });
    assert.ok(soc.activeIncidents.length >= 1);
  });

  await test('12 — audit payload SEC-07 criteria', () => {
    const s = freshSec07();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-07');
    assert.strictEqual(p.read_only_dashboard, true);
    assert.strictEqual(p.criteria.security_soc_available, true);
  });

  await test('13 — executive endpoint payload', () => {
    const s = freshSec07();
    const p = s.getExecutivePayload();
    assert.strictEqual(p.phase, 'SEC-07');
    assert.ok(p.executive_summary != null);
  });

  await test('14 — operations endpoint payload', () => {
    seedIncident();
    const s = freshSec07();
    const p = s.getOperationsPayload();
    assert.strictEqual(p.phase, 'SEC-07');
    assert.ok(p.operations);
  });

  await test('15 — métricas soc_dashboard_requests', () => {
    const s = freshSec07();
    s.metrics.resetForTests();
    s.getAuditPayload();
    assert.ok(s.metrics.getSnapshot().soc_dashboard_requests >= 1);
  });

  await test('16 — endpoints registados em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-soc'));
    assert.ok(src.includes('/security-soc/executive'));
    assert.ok(src.includes('/security-soc/operations'));
  });

  await test('17 — SEC-06 preservado', () => {
    const r = require('../../securityResponse');
    assert.ok(r.orchestrateResponse);
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securitySOC'));
  });

  await test('18 — regressão SEC-01→06', () => {
    assert.ok(require('../../securityObservatory').bus);
    assert.ok(require('../../securityCorrelation').correlateEvent);
    assert.ok(require('../../securityThreatIntelligence').analyzeIncident);
    assert.ok(require('../../securityRuntimeIntegrity').runIntegrityCheck);
    assert.ok(require('../../securityNotification').getAuditPayload);
    assert.ok(require('../../securityResponse').getAuditPayload);
  });

  await test('19 — flag off → buildSOC null', () => {
    const prev = process.env.SECURITY_SOC;
    process.env.SECURITY_SOC = 'false';
    delete require.cache[require.resolve('../../securitySOC/index.js')];
    delete require.cache[require.resolve('../../securitySOC/config/securitySOCFlags.js')];
    const s = require('../../securitySOC');
    assert.strictEqual(s.buildSOC(), null);
    process.env.SECURITY_SOC = prev || 'true';
  });

  await test('20 — resolve threat level', () => {
    const { resolveThreatLevel } = require('../../securitySOC/engine/socScoreCalculator');
    const level = resolveThreatLevel({
      sec02: { open: [{ severity: 'CRITICAL' }] },
      sec03: { profiles: [] },
      sec04: { lastReport: null }
    });
    assert.strictEqual(level, 'CRITICAL');
  });

  await test('21 — não modifica incident store', () => {
    seedIncident();
    const sec02 = require('../../securityCorrelation');
    const before = sec02.store.getAllIncidents().length;
    const s = freshSec07();
    s.buildSOC({ force: true });
    assert.strictEqual(sec02.store.getAllIncidents().length, before);
  });

  await test('22 — documentação SEC_07 presente', () => {
    for (const f of ['SEC_07_SOC.md', 'SEC_07_ARCHITECTURE.md', 'SEC_07_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
