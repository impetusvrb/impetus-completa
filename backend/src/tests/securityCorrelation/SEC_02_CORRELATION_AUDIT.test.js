'use strict';

/**
 * SEC-02 — Correlation Engine Audit (18+ checks).
 * node backend/src/tests/securityCorrelation/SEC_02_CORRELATION_AUDIT.test.js
 */

process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_CORRELATION_WINDOW_MS = '14400000';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshModule() {
  const mods = [
    '../../securityCorrelation/index.js',
    '../../securityCorrelation/store/incidentStore.js',
    '../../securityCorrelation/metrics/correlationMetrics.js',
    '../../securityCorrelation/engine/correlationEngine.js',
    '../../securityCorrelation/config/securityCorrelationFlags.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  return require('../../securityCorrelation');
}

function sampleEvent(overrides = {}) {
  return {
    id: overrides.id || `se-test-${Math.random().toString(36).slice(2, 8)}`,
    event_type: overrides.event_type || 'HTTP_SCAN',
    classification: overrides.classification || 'CREDENTIAL_SCAN',
    window_start: overrides.window_start || '2026-07-03T02:04:00Z',
    window_end: overrides.window_end || '2026-07-03T02:05:00Z',
    source_ip: overrides.source_ip || '3.19.29.56',
    user_agent: overrides.user_agent || 'scanner-bot',
    path_prefix: overrides.path_prefix || '/.env',
    request_count: overrides.request_count ?? 100,
    status_codes: overrides.status_codes || { 404: 100 },
    recorded_at: overrides.recorded_at || '2026-07-03T02:05:00Z'
  };
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
  console.log('\n  SEC-02 — ENTERPRISE SECURITY CORRELATION AUDIT\n');

  await test('01 — módulo securityCorrelation exporta API', () => {
    const s = freshModule();
    assert.ok(s.correlateEvent);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_CORRELATION_ENGINE;
    delete process.env.SECURITY_CORRELATION_ENGINE;
    delete require.cache[require.resolve('../../securityCorrelation/config/securityCorrelationFlags.js')];
    const f = require('../../securityCorrelation/config/securityCorrelationFlags');
    assert.strictEqual(f.isSecurityCorrelationEngineEnabled(), false);
    process.env.SECURITY_CORRELATION_ENGINE = prev || 'true';
  });

  await test('03 — Security Incident DTO schema v1', () => {
    const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
    const inc = createSecurityIncidentDto({ severity: 'HIGH', riskScore: 0.7 });
    assert.strictEqual(inc.schema_version, 'security_incident_v1');
    assert.ok(inc.incidentId);
  });

  await test('04 — correlaciona evento único → 1 incidente', () => {
    const s = freshModule();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const inc = s.correlateEvent(sampleEvent({ id: 'ev-1' }));
    assert.ok(inc);
    assert.strictEqual(inc.metrics.eventCount, 1);
  });

  await test('05 — 100 eventos mesmo IP → 1 incidente (agrupamento)', () => {
    const s = freshModule();
    s.store.resetForTests();
    s.metrics.resetForTests();
    let lastId = null;
    for (let i = 0; i < 100; i++) {
      const inc = s.correlateEvent(sampleEvent({
        id: `ev-batch-${i}`,
        request_count: 230,
        window_start: `2026-07-03T02:${String(4 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`
      }));
      lastId = inc.incidentId;
    }
    const all = s.store.getAllIncidents();
    assert.strictEqual(all.length, 1);
    assert.ok(all[0].metrics.requestCount >= 23000);
    assert.strictEqual(all[0].incidentId, lastId);
  });

  await test('06 — IPs diferentes → incidentes separados', () => {
    const s = freshModule();
    s.store.resetForTests();
    s.metrics.resetForTests();
    s.correlateEvent(sampleEvent({ id: 'a1', source_ip: '1.1.1.1', user_agent: 'bot-alpha' }));
    s.correlateEvent(sampleEvent({ id: 'a2', source_ip: '2.2.2.2', user_agent: 'bot-beta' }));
    assert.strictEqual(s.store.getAllIncidents().length, 2);
  });

  await test('07 — severity CRITICAL para volume alto', () => {
    const { computeSeverity } = require('../../securityCorrelation/engine/severityCalculator');
    const sev = computeSeverity({
      classification: 'CREDENTIAL_SCAN',
      requestCount: 23000,
      eventCount: 50,
      uniquePaths: 80,
      statusCodes: { 404: 20000 },
      durationMs: 3 * 3600000
    });
    assert.strictEqual(sev, 'CRITICAL');
  });

  await test('08 — risk score entre 0 e 1', () => {
    const { computeRiskScore } = require('../../securityCorrelation/engine/riskScoreCalculator');
    const r = computeRiskScore({
      classification: 'CREDENTIAL_SCAN',
      requestCount: 1000,
      uniquePaths: 20,
      uniqueIps: 1,
      statusCodes: { 404: 900 },
      durationMs: 3600000,
      severity: 'HIGH'
    });
    assert.ok(r >= 0 && r <= 1);
  });

  await test('09 — incident timeline com fases', () => {
    const { buildIncidentTimelinePhases } = require('../../securityCorrelation/engine/incidentSummaryBuilder');
    const events = [
      { time: '2026-07-03T02:04:00Z', event_type: 'HTTP_SCAN', path: '/.env' },
      { time: '2026-07-03T02:30:00Z', event_type: 'ENUMERATION', path: '/api' },
      { time: '2026-07-03T03:00:00Z', event_type: 'AUTH_ATTEMPT', path: '/api/auth' },
      { time: '2026-07-03T05:05:00Z', event_type: 'HTTP_SCAN', path: '/server.js' }
    ];
    const tl = buildIncidentTimelinePhases(events);
    assert.ok(tl.some((p) => p.phase === 'RECONNAISSANCE'));
    assert.ok(tl.some((p) => p.phase === 'CLOSURE'));
  });

  await test('10 — incident summary responde perguntas', () => {
    const s = freshModule();
    s.store.resetForTests();
    const inc = s.correlateEvent(sampleEvent({ id: 'sum-1', request_count: 500 }));
    assert.ok(inc.summary.what_happened);
    assert.ok(inc.summary.when_started);
    assert.ok(inc.summary.duration_human);
  });

  await test('11 — evidence referencia eventos sem alterá-los', () => {
    const s = freshModule();
    s.store.resetForTests();
    const ev = sampleEvent({ id: 'immutable-ev' });
    const before = JSON.stringify(ev);
    s.correlateEvent(ev);
    assert.strictEqual(JSON.stringify(ev), before);
  });

  await test('12 — dashboard DTO schema v1', () => {
    const s = freshModule();
    const dash = s.buildDashboard();
    assert.strictEqual(dash.schema_version, 'incident_dashboard_v1');
    assert.ok(typeof dash.open_incidents === 'number');
  });

  await test('13 — audit payload SEC-02 criteria', () => {
    const s = freshModule();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-02');
    assert.strictEqual(p.no_auto_response, true);
    assert.strictEqual(p.criteria.correlation_engine_available, true);
  });

  await test('14 — métricas correlation_runs incrementam', () => {
    const s = freshModule();
    s.store.resetForTests();
    s.metrics.resetForTests();
    s.correlateEvent(sampleEvent({ id: 'm1' }));
    assert.ok(s.metrics.getSnapshot().correlation_runs >= 1);
  });

  await test('15 — endpoint registado em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-incidents'));
  });

  await test('16 — documentação SEC_02 presente', () => {
    for (const f of ['SEC_02_CORRELATION_ENGINE.md', 'SEC_02_ARCHITECTURE.md', 'SEC_02_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  await test('17 — SEC-01 preservado (sem import circular destrutivo)', () => {
    const obs = require('../../securityObservatory');
    assert.ok(obs.bus);
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityCorrelation'));
  });

  await test('18 — flag off → correlateEvent null', () => {
    const prev = process.env.SECURITY_CORRELATION_ENGINE;
    process.env.SECURITY_CORRELATION_ENGINE = 'false';
    delete require.cache[require.resolve('../../securityCorrelation/index.js')];
    delete require.cache[require.resolve('../../securityCorrelation/config/securityCorrelationFlags.js')];
    const s = require('../../securityCorrelation');
    assert.strictEqual(s.correlateEvent(sampleEvent()), null);
    process.env.SECURITY_CORRELATION_ENGINE = prev || 'true';
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
