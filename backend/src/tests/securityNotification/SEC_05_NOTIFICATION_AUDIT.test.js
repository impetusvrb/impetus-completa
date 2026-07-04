'use strict';

/**
 * SEC-05 — Notification Center Audit (20+ checks).
 * node backend/src/tests/securityNotification/SEC_05_NOTIFICATION_AUDIT.test.js
 */

process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';
process.env.SECURITY_NOTIFICATION_CENTER = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshSec05() {
  const mods = [
    '../../securityNotification/index.js',
    '../../securityNotification/runtime/notificationRuntime.js',
    '../../securityNotification/store/notificationStore.js',
    '../../securityNotification/metrics/notificationMetrics.js',
    '../../securityNotification/engine/notificationEngine.js',
    '../../securityNotification/channels/channelRouter.js',
    '../../securityNotification/config/securityNotificationFlags.js',
    '../../securityCorrelation/store/incidentStore.js',
    '../../securityThreatIntelligence/store/threatProfileStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  return require('../../securityNotification');
}

function sampleIncident(overrides = {}) {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  return createSecurityIncidentDto({
    incidentId: overrides.incidentId || 'inc-notif-test',
    classification: 'CREDENTIAL_SCAN',
    severity: 'CRITICAL',
    firstSeen: '2026-07-03T02:04:00Z',
    lastSeen: '2026-07-03T05:05:00Z',
    durationMs: 10860000,
    timeline: [
      { timestamp: '2026-07-03T02:04:00Z', phase: 'RECONNAISSANCE', label: 'Reconhecimento' },
      { timestamp: '2026-07-03T03:00:00Z', phase: 'AUTH_ATTEMPT', label: 'Tentativa de autenticação' },
      { timestamp: '2026-07-03T05:05:00Z', phase: 'CLOSURE', label: 'Encerramento' }
    ],
    participants: { ips: ['3.19.29.56'], userAgents: ['scanner'], asns: [] },
    affectedComponents: ['http-surface'],
    evidence: [{ eventId: 'ev-1', request_count: 23000, path_prefix: '/.env' }],
    metrics: { eventCount: 100, requestCount: 23000, uniquePaths: 80, uniqueIps: 1, statusCodes: { 404: 22000 } },
    summary: { what_happened: 'Varredura automatizada 23000 requests' },
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
  console.log('\n  SEC-05 — ENTERPRISE SECURITY NOTIFICATION AUDIT\n');

  await test('01 — módulo securityNotification exporta API', () => {
    const s = freshSec05();
    assert.ok(s.processAllSources);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_NOTIFICATION_CENTER;
    delete process.env.SECURITY_NOTIFICATION_CENTER;
    delete require.cache[require.resolve('../../securityNotification/config/securityNotificationFlags.js')];
    const f = require('../../securityNotification/config/securityNotificationFlags');
    assert.strictEqual(f.isSecurityNotificationCenterEnabled(), false);
    process.env.SECURITY_NOTIFICATION_CENTER = prev || 'true';
  });

  await test('03 — Notification DTO schema v1', () => {
    const { createNotificationDto } = require('../../securityNotification/dto/notificationDto');
    const n = createNotificationDto({ title: 'Test', severity: 'HIGH' });
    assert.strictEqual(n.schema_version, 'security_notification_v1');
    assert.ok(n.commandCenter);
  });

  await test('04 — prioridade CRITICAL → P0', () => {
    const { mapPriority } = require('../../securityNotification/engine/notificationRules');
    assert.strictEqual(mapPriority('CRITICAL'), 'P0');
  });

  await test('05 — agrupamento 23000 eventos → 1 notificação', async () => {
    const s = freshSec05();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const sec02 = require('../../securityCorrelation');
    sec02.store.resetForTests();
    const inc = sampleIncident();
    sec02.store.addIncident(inc);

    const { buildFromIncident } = require('../../securityNotification/engine/notificationEngine');
    const n1 = buildFromIncident(inc, null, null);
    await s.engine.upsertAndDeliver(n1);
    const n2 = buildFromIncident({ ...inc, metrics: { ...inc.metrics, requestCount: 46000 } }, null, null);
    await s.engine.upsertAndDeliver(n2);

    assert.strictEqual(s.store.getAll().length, 1);
    assert.ok(s.store.getAll()[0].groupedEventCount >= 2);
  });

  await test('06 — deduplicação por incidentId', () => {
    const { deduplicationKey } = require('../../securityNotification/engine/notificationAggregator');
    const k1 = deduplicationKey('inc-1', 'COMBINED_INCIDENT');
    const k2 = deduplicationKey('inc-1', 'COMBINED_INCIDENT');
    assert.strictEqual(k1, k2);
  });

  await test('07 — timeline com fases SEC-02/03/04', () => {
    const { buildNotificationTimeline } = require('../../securityNotification/engine/notificationTimelineBuilder');
    const inc = sampleIncident();
    const tl = buildNotificationTimeline(inc, { analyzedAt: '2026-07-03T04:00:00Z', primaryAssessment: 'CLOUD_SCANNER' }, {
      checkedAt: '2026-07-03T04:30:00Z',
      integrityStatus: 'DEGRADED',
      integrityScore: 0.7
    });
    assert.ok(tl.some((t) => t.phase === 'RECONNAISSANCE'));
    assert.ok(tl.some((t) => t.phase === 'THREAT_ASSESSED'));
    assert.ok(tl.some((t) => t.phase === 'INTEGRITY_DEGRADED'));
  });

  await test('08 — command center com contexto completo', () => {
    const { buildCommandCenter } = require('../../securityNotification/engine/notificationEngine');
    const inc = sampleIncident();
    const cc = buildCommandCenter(inc, { confidence: 0.8, primaryAssessment: 'CLOUD_SCANNER', recommendations: [{ text: 'Rever logs' }] }, null);
    assert.ok(cc.incident_classification);
    assert.ok(cc.analysis_confidence);
    assert.ok(cc.potential_impact);
    assert.ok(cc.suggested_owner);
  });

  await test('09 — perfis destinatários por severidade', () => {
    const { resolveRecipientsForNotification } = require('../../securityNotification/recipients/recipientProfiles');
    const recs = resolveRecipientsForNotification('CRITICAL', ['administrator', 'security', 'directorate']);
    assert.ok(recs.length >= 2);
  });

  await test('10 — canais CRITICAL incluem console e audit', () => {
    const { mapChannels } = require('../../securityNotification/engine/notificationRules');
    const ch = mapChannels('CRITICAL');
    assert.ok(ch.includes('console'));
    assert.ok(ch.includes('audit'));
  });

  await test('11 — adapters externos desacoplados (skipped)', async () => {
    const { externalAdapters } = require('../../securityNotification/channels/channelRouter');
    const { createNotificationDto } = require('../../securityNotification/dto/notificationDto');
    const n = createNotificationDto({ title: 'Adapter test' });
    for (const adapter of externalAdapters) {
      const r = await adapter.send(n, []);
      assert.strictEqual(r.status, 'skipped');
    }
  });

  await test('12 — dashboard DTO schema v1', () => {
    const s = freshSec05();
    const dash = s.buildDashboard();
    assert.strictEqual(dash.schema_version, 'notification_dashboard_v1');
  });

  await test('13 — audit payload SEC-05 criteria', () => {
    const s = freshSec05();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-05');
    assert.strictEqual(p.no_auto_response, true);
    assert.strictEqual(p.criteria.notification_center_available, true);
  });

  await test('14 — pending payload', async () => {
    const s = freshSec05();
    s.store.resetForTests();
    const { buildFromIncident } = require('../../securityNotification/engine/notificationEngine');
    await s.engine.upsertAndDeliver(buildFromIncident(sampleIncident(), null, null));
    const p = s.getPendingPayload();
    assert.ok(p.count >= 1);
    assert.ok(Array.isArray(p.pending));
  });

  await test('15 — métricas notifications_generated', async () => {
    const s = freshSec05();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const { buildFromIncident } = require('../../securityNotification/engine/notificationEngine');
    await s.engine.upsertAndDeliver(buildFromIncident(sampleIncident({ incidentId: 'inc-met' }), null, null));
    assert.ok(s.metrics.getSnapshot().notifications_generated >= 1);
  });

  await test('16 — endpoints registados em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-notifications'));
    assert.ok(src.includes('/security-notifications/pending'));
  });

  await test('17 — SEC-04 preservado', () => {
    const ri = require('../../securityRuntimeIntegrity');
    assert.ok(ri.runIntegrityCheck);
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityNotification'));
  });

  await test('18 — regressão SEC-01→SEC-04 módulos intactos', () => {
    assert.ok(require('../../securityObservatory').bus);
    assert.ok(require('../../securityCorrelation').correlateEvent);
    assert.ok(require('../../securityThreatIntelligence').analyzeIncident);
    assert.ok(require('../../securityRuntimeIntegrity').runIntegrityCheck);
  });

  await test('19 — flag off → processAllSources vazio', async () => {
    const prev = process.env.SECURITY_NOTIFICATION_CENTER;
    process.env.SECURITY_NOTIFICATION_CENTER = 'false';
    delete require.cache[require.resolve('../../securityNotification/index.js')];
    delete require.cache[require.resolve('../../securityNotification/config/securityNotificationFlags.js')];
    const s = require('../../securityNotification');
    const r = await s.processAllSources();
    assert.deepStrictEqual(r, []);
    process.env.SECURITY_NOTIFICATION_CENTER = prev || 'true';
  });

  await test('20 — documentação SEC_05 presente', () => {
    for (const f of ['SEC_05_NOTIFICATION_CENTER.md', 'SEC_05_ARCHITECTURE.md', 'SEC_05_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
