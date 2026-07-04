'use strict';

/**
 * SEC-06 — Response Orchestrator Audit (22+ checks).
 * node backend/src/tests/securityResponse/SEC_06_RESPONSE_AUDIT.test.js
 */

process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';
process.env.SECURITY_RESPONSE_ORCHESTRATOR = 'true';
process.env.SECURITY_RESPONSE_DEFAULT_MODE = 'assist';
process.env.SECURITY_RESPONSE_MAX_LEVEL = '2';
process.env.SECURITY_RESPONSE_PROTECT_ENABLED = 'false';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshSec06() {
  const mods = [
    '../../securityResponse/index.js',
    '../../securityResponse/runtime/responseRuntime.js',
    '../../securityResponse/store/responseStore.js',
    '../../securityResponse/metrics/responseMetrics.js',
    '../../securityResponse/engine/responseOrchestrator.js',
    '../../securityResponse/engine/assistExecutor.js',
    '../../securityResponse/config/securityResponseFlags.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  return require('../../securityResponse');
}

function sampleIncident(overrides = {}) {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  return createSecurityIncidentDto({
    incidentId: overrides.incidentId || 'inc-resp-test',
    classification: overrides.classification || 'CREDENTIAL_SCAN',
    severity: overrides.severity || 'CRITICAL',
    evidence: overrides.evidence || [{ eventId: 'ev-1', request_count: 23000 }],
    metrics: overrides.metrics || { eventCount: 100, requestCount: 23000, uniquePaths: 80, uniqueIps: 1, statusCodes: { 404: 22000 } },
    summary: overrides.summary || { what_happened: 'Scan 23k' },
    ...overrides
  });
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
  console.log('\n  SEC-06 — ENTERPRISE SECURITY RESPONSE ORCHESTRATOR AUDIT\n');

  await test('01 — módulo securityResponse exporta API', () => {
    const s = freshSec06();
    assert.ok(s.orchestrateResponse);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_RESPONSE_ORCHESTRATOR;
    delete process.env.SECURITY_RESPONSE_ORCHESTRATOR;
    delete require.cache[require.resolve('../../securityResponse/config/securityResponseFlags.js')];
    const f = require('../../securityResponse/config/securityResponseFlags');
    assert.strictEqual(f.isSecurityResponseOrchestratorEnabled(), false);
    process.env.SECURITY_RESPONSE_ORCHESTRATOR = prev || 'true';
  });

  await test('03 — Security Response DTO schema v1', () => {
    const { createSecurityResponseDto } = require('../../securityResponse/dto/securityResponseDto');
    const r = createSecurityResponseDto({ recommendedLevel: 'ADVISE' });
    assert.strictEqual(r.schema_version, 'security_response_v1');
    assert.strictEqual(r.reversible, true);
  });

  await test('04 — níveis OBSERVE/ADVISE/ASSIST/PROTECT definidos', () => {
    const { LEVELS } = require('../../securityResponse/dto/securityResponseDto');
    assert.ok(LEVELS.includes('OBSERVE'));
    assert.ok(LEVELS.includes('PROTECT'));
  });

  await test('05 — modo OBSERVE para operacional', async () => {
    process.env.SECURITY_RESPONSE_DEFAULT_MODE = 'observe';
    delete require.cache[require.resolve('../../securityResponse/config/securityResponseFlags.js')];
    const s = freshSec06();
    s.store.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ severity: 'INFO', classification: 'OPERATIONAL_ACCESS' }));

    const resp = await s.orchestrateResponse({ force: true, incidentId: 'inc-resp-test' });
    assert.ok(['OBSERVE', 'ADVISE'].includes(resp.currentMode));
  });

  await test('06 — modo ADVISE em MEDIUM', async () => {
    process.env.SECURITY_RESPONSE_DEFAULT_MODE = 'advise';
    process.env.SECURITY_RESPONSE_MAX_LEVEL = '1';
    delete require.cache[require.resolve('../../securityResponse/config/securityResponseFlags.js')];
    const s = freshSec06();
    s.store.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ severity: 'MEDIUM', incidentId: 'inc-advise' }));

    const resp = await s.orchestrateResponse({ force: true, incidentId: 'inc-advise' });
    assert.strictEqual(resp.currentMode, 'ADVISE');
    assert.strictEqual(resp.executionStatus, 'completed');
  });

  await test('07 — modo ASSIST executa acções reversíveis', async () => {
    process.env.SECURITY_RESPONSE_DEFAULT_MODE = 'assist';
    process.env.SECURITY_RESPONSE_MAX_LEVEL = '2';
    delete require.cache[require.resolve('../../securityResponse/config/securityResponseFlags.js')];
    const s = freshSec06();
    s.store.resetForTests();
    s.assist.resetAssistStateForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident());

    const resp = await s.orchestrateResponse({ force: true, incidentId: 'inc-resp-test' });
    assert.strictEqual(resp.currentMode, 'ASSIST');
    assert.ok(resp.executedActions.length >= 1);
    assert.ok(
      resp.executedActions.some((a) =>
        ['EVIDENCE_SNAPSHOT', 'RUN_CORRELATION', 'CONSOLIDATED_REPORT', 'RUN_INTEGRITY_CHECK'].includes(a.actionId)
      )
    );
  });

  await test('08 — Protect gera plano apenas (nunca executa)', async () => {
    const { buildAdaptiveProtectionPlan } = require('../../securityResponse/catalog/adaptiveProtectionPlans');
    const plan = buildAdaptiveProtectionPlan({
      incident: sampleIncident(),
      integrityReport: { integrityStatus: 'COMPROMISED' }
    });
    assert.strictEqual(plan.auto_execute, false);
    assert.strictEqual(plan.approval_required, true);
    assert.ok(plan.recommendations.length >= 5);
  });

  await test('09 — Protect desabilitado por defeito', () => {
    const f = require('../../securityResponse/config/securityResponseFlags');
    assert.strictEqual(f.protectModeEnabled(), false);
  });

  await test('10 — catálogo com rollback e operator_required', () => {
    const { CATALOG } = require('../../securityResponse/catalog/actionCatalog');
    assert.ok(CATALOG.every((c) => c.rollback != null));
    assert.ok(CATALOG.some((c) => c.level === 'ASSIST'));
  });

  await test('11 — rollback reversível', async () => {
    const s = freshSec06();
    s.store.resetForTests();
    s.assist.resetAssistStateForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ incidentId: 'inc-rollback' }));

    const resp = await s.orchestrateResponse({ force: true, incidentId: 'inc-rollback' });
    const rolled = s.rollbackResponse(resp.responseId);
    assert.strictEqual(rolled.executionStatus, 'cancelled');
    assert.ok(rolled.responseTimeline.some((t) => t.phase === 'ROLLBACK'));
  });

  await test('12 — assist não inclui acções destrutivas', () => {
    const { ASSIST_ACTIONS } = require('../../securityResponse/catalog/actionCatalog');
    const forbidden = ['KILL_PROCESS', 'RESTART_PM2', 'BLOCK_IP', 'UFW', 'NGINX'];
    for (const a of ASSIST_ACTIONS) {
      for (const f of forbidden) assert.ok(!a.includes(f));
    }
  });

  await test('13 — audit payload SEC-06 criteria', () => {
    const s = freshSec06();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-06');
    assert.strictEqual(p.no_destructive_actions, true);
    assert.strictEqual(p.protect_auto_execute, false);
    assert.strictEqual(p.criteria.protect_mode_disabled, true);
  });

  await test('14 — history payload', async () => {
    const s = freshSec06();
    s.store.resetForTests();
    await s.orchestrateResponse({ force: true, incidentId: 'inc-hist' });
    const h = s.getHistoryPayload();
    assert.ok(h.count >= 0);
    assert.ok(Array.isArray(h.history));
  });

  await test('15 — métricas responses_generated', async () => {
    const s = freshSec06();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ incidentId: 'inc-met' }));
    await s.orchestrateResponse({ force: true, incidentId: 'inc-met' });
    assert.ok(s.metrics.getSnapshot().responses_generated >= 1);
  });

  await test('16 — endpoints registados em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-response'));
    assert.ok(src.includes('/security-response/history'));
  });

  await test('17 — SEC-05 preservado', () => {
    const n = require('../../securityNotification');
    assert.ok(n.processAllSources);
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityResponse'));
  });

  await test('18 — regressão SEC-01→SEC-05', () => {
    assert.ok(require('../../securityObservatory').bus);
    assert.ok(require('../../securityCorrelation').correlateEvent);
    assert.ok(require('../../securityThreatIntelligence').analyzeIncident);
    assert.ok(require('../../securityRuntimeIntegrity').runIntegrityCheck);
    assert.ok(require('../../securityNotification').getAuditPayload);
  });

  await test('19 — flag off → orchestrateResponse null', async () => {
    const prev = process.env.SECURITY_RESPONSE_ORCHESTRATOR;
    process.env.SECURITY_RESPONSE_ORCHESTRATOR = 'false';
    delete require.cache[require.resolve('../../securityResponse/index.js')];
    delete require.cache[require.resolve('../../securityResponse/config/securityResponseFlags.js')];
    const s = require('../../securityResponse');
    const r = await s.orchestrateResponse({});
    assert.strictEqual(r, null);
    process.env.SECURITY_RESPONSE_ORCHESTRATOR = prev || 'true';
  });

  await test('20 — timeline de resposta', async () => {
    const s = freshSec06();
    s.store.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ incidentId: 'inc-tl' }));
    const resp = await s.orchestrateResponse({ force: true, incidentId: 'inc-tl' });
    assert.ok(resp.responseTimeline.length >= 1);
  });

  await test('21 — integrity compromised → plano Protect', async () => {
    const s = freshSec06();
    s.store.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    sec02.store.addIncident(sampleIncident({ incidentId: 'inc-prot' }));

    const { resolveRecommendedLevel } = require('../../securityResponse/engine/responseLevelResolver');
    const level = resolveRecommendedLevel({
      incident: sampleIncident({ incidentId: 'inc-prot' }),
      integrityReport: { integrityStatus: 'COMPROMISED' }
    });
    assert.strictEqual(level, 'PROTECT');
  });

  await test('22 — documentação SEC_06 presente', () => {
    for (const f of ['SEC_06_RESPONSE_ORCHESTRATOR.md', 'SEC_06_RESPONSE_LEVELS.md', 'SEC_06_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
