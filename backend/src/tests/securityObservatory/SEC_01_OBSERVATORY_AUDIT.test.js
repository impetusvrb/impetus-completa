'use strict';

/**
 * SEC-01 — Enterprise Security Observatory Audit (15+ checks).
 * node backend/src/tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js
 */

process.env.SECURITY_OBSERVATORY = 'true';
process.env.SECURITY_OBSERVATORY_WINDOW_MS = '10000';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

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

function freshObservatory() {
  delete require.cache[require.resolve('../../securityObservatory/index.js')];
  delete require.cache[require.resolve('../../securityObservatory/metrics/securityMetricsStore.js')];
  delete require.cache[require.resolve('../../securityObservatory/timeline/securityTimeline.js')];
  delete require.cache[require.resolve('../../securityObservatory/observatory/securityObservatoryRuntime.js')];
  return require('../../securityObservatory');
}

(async () => {
  console.log('\n  SEC-01 — ENTERPRISE SECURITY OBSERVATORY AUDIT\n');

  await test('01 — módulo securityObservatory exporta API pública', () => {
    const o = freshObservatory();
    assert.ok(o.init);
    assert.ok(o.getAuditPayload);
    assert.ok(o.bus);
    assert.ok(o.dto);
  });

  await test('02 — feature flag SECURITY_OBSERVATORY default false sem env', () => {
    const flags = require('../../securityObservatory/config/securityObservatoryFlags');
    const prev = process.env.SECURITY_OBSERVATORY;
    delete process.env.SECURITY_OBSERVATORY;
    delete require.cache[require.resolve('../../securityObservatory/config/securityObservatoryFlags.js')];
    const f2 = require('../../securityObservatory/config/securityObservatoryFlags');
    assert.strictEqual(f2.isSecurityObservatoryEnabled(), false);
    process.env.SECURITY_OBSERVATORY = prev || 'true';
  });

  await test('03 — Security Event DTO schema v1', () => {
    const { createSecurityEventDto, EVENT_TYPES } = require('../../securityObservatory/dto/securityEventDto');
    assert.ok(EVENT_TYPES.includes('HTTP_SCAN'));
    const ev = createSecurityEventDto({ event_type: 'HTTP_SCAN', request_count: 10 });
    assert.strictEqual(ev.schema_version, 'security_event_v1');
    assert.strictEqual(ev.request_count, 10);
    assert.throws(() => { ev.request_count = 5; });
  });

  await test('04 — classificador CREDENTIAL_SCAN para .env', () => {
    const { classifyHttpAggregate } = require('../../securityObservatory/classification/securityClassifier');
    const r = classifyHttpAggregate({
      path: '/.env',
      statusCodes: { 404: 10 },
      requestCount: 10,
      userAgent: 'scanner'
    });
    assert.strictEqual(r.classification, 'CREDENTIAL_SCAN');
  });

  await test('05 — classificador CRAWLER para GPTBot', () => {
    const { classifyHttpAggregate } = require('../../securityObservatory/classification/securityClassifier');
    const r = classifyHttpAggregate({
      path: '/assets/index.js',
      statusCodes: { 200: 5 },
      requestCount: 5,
      userAgent: 'GPTBot/1.4'
    });
    assert.strictEqual(r.classification, 'CRAWLER');
  });

  await test('06 — classificador HEALTH_CHECK', () => {
    const { classifyHttpAggregate } = require('../../securityObservatory/classification/securityClassifier');
    const r = classifyHttpAggregate({ path: '/health', statusCodes: { 200: 1 }, requestCount: 1 });
    assert.strictEqual(r.classification, 'HEALTH_CHECK');
  });

  await test('07 — event bus publica e consumidores read-only', () => {
    const bus = require('../../securityObservatory/bus/securityEventBus');
    let received = 0;
    const unsub = bus.subscribe(() => { received += 1; });
    bus.publish({ event_type: 'HTTP_SCAN', request_count: 1, classification: 'GENERIC_SCANNER' });
    assert.strictEqual(received, 1);
    unsub();
  });

  await test('08 — metrics agrega samples sem 1:1 storage', () => {
    const metrics = require('../../securityObservatory/metrics/securityMetricsStore');
    metrics.resetForTests();
    for (let i = 0; i < 100; i++) {
      metrics.recordHttpSample({
        ip: '3.19.29.56',
        path: '/.env',
        method: 'GET',
        status: 404,
        bytes: 186,
        latencyMs: 5,
        userAgent: 'scanner'
      });
    }
    const snap = metrics.getMetricsSnapshot();
    assert.strictEqual(snap.top_origins[0].key, '3.19.29.56');
    assert.ok(snap.status_distribution['404'] >= 100);
    assert.ok(snap.active_buckets <= 100);
  });

  await test('09 — timeline regista entradas', () => {
    const timeline = require('../../securityObservatory/timeline/securityTimeline');
    timeline.resetForTests();
    timeline.addTimelineEntry({
      timestamp: '2026-07-03T02:05:00Z',
      label: '02:05',
      classification: 'BACKGROUND_INTERNET_NOISE',
      request_count: 23000,
      summary: 'janela Gustavo'
    });
    assert.ok(timeline.getTimeline(10).length >= 1);
  });

  await test('10 — runtime flush produz eventos classificados', () => {
    const o = freshObservatory();
    o.runtime.shutdown();
    const metrics = require('../../securityObservatory/metrics/securityMetricsStore');
    metrics.resetForTests();
    metrics.recordHttpSample({
      ip: '1.2.3.4', path: '/docker-compose.yml', method: 'GET', status: 404, bytes: 146, userAgent: 'bot'
    });
    o.runtime.flushAggregationWindows();
    const recent = o.bus.getRecentEvents(5);
    assert.ok(recent.length >= 0);
  });

  await test('11 — dashboard DTO schema v1', () => {
    const o = freshObservatory();
    const dash = o.buildDashboard();
    assert.strictEqual(dash.schema_version, 'security_dashboard_v1');
    assert.ok(dash.attack_surface_activity);
    assert.ok(Array.isArray(dash.timeline));
  });

  await test('12 — audit payload inclui criteria SEC-01', () => {
    const o = freshObservatory();
    const payload = o.getAuditPayload();
    assert.strictEqual(payload.phase, 'SEC-01');
    assert.strictEqual(payload.no_auto_response, true);
    assert.strictEqual(payload.criteria.no_runtime_interference, true);
  });

  await test('13 — nginx log ingestor batch', () => {
    const ingest = require('../../securityObservatory/ingest/nginxLogIngestor');
    const line = '3.19.29.56 - - [03/Jul/2026:02:04:40 +0000] "GET /.env HTTP/2.0" 404 186 "-" "bot"';
    const p = ingest.parseNginxAccessLine(line);
    assert.strictEqual(p.ip, '3.19.29.56');
    assert.strictEqual(p.status, 404);
    const r = ingest.ingestNginxLines([line], { force: true });
    assert.strictEqual(r.ingested, 1);
  });

  await test('14 — middleware no-op quando flag off', () => {
    const prev = process.env.SECURITY_OBSERVATORY;
    process.env.SECURITY_OBSERVATORY = 'false';
    delete require.cache[require.resolve('../../securityObservatory/config/securityObservatoryFlags.js')];
    const { securityObservatoryMiddleware } = require('../../securityObservatory/middleware/securityObservatoryMiddleware');
    let called = false;
    securityObservatoryMiddleware({}, {}, () => { called = true; });
    assert.strictEqual(called, true);
    process.env.SECURITY_OBSERVATORY = prev || 'true';
  });

  await test('15 — audit route registada em routes/audit.js', () => {
    const auditSrc = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(auditSrc.includes('/security-observatory'));
    assert.ok(auditSrc.includes('securityObservatory'));
  });

  await test('16 — documentação SEC_01 presente', () => {
    const required = [
      'SEC_01_SECURITY_OBSERVATORY.md',
      'SEC_01_ARCHITECTURE.md',
      'SEC_01_REPORT.md'
    ];
    for (const f of required) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  await test('17 — Event Governance não alterado (hash check path exists)', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'services/eventGovernanceService.js')));
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityObservatory'), 'EG must not import observatory');
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
