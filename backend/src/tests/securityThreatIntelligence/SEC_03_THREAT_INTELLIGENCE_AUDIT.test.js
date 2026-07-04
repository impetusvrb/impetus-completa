'use strict';

/**
 * SEC-03 — Threat Intelligence Audit (20+ checks).
 * node backend/src/tests/securityThreatIntelligence/SEC_03_THREAT_INTELLIGENCE_AUDIT.test.js
 */

process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function freshSec03() {
  const mods = [
    '../../securityThreatIntelligence/index.js',
    '../../securityThreatIntelligence/store/threatProfileStore.js',
    '../../securityThreatIntelligence/metrics/threatIntelligenceMetrics.js',
    '../../securityThreatIntelligence/engine/threatIntelligenceEngine.js',
    '../../securityThreatIntelligence/config/securityThreatIntelligenceFlags.js',
    '../../securityCorrelation/index.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  return require('../../securityThreatIntelligence');
}

function sampleIncident(overrides = {}) {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  return createSecurityIncidentDto({
    incidentId: overrides.incidentId || `inc-test-${Math.random().toString(36).slice(2, 8)}`,
    firstSeen: overrides.firstSeen || '2026-07-03T02:04:00Z',
    lastSeen: overrides.lastSeen || '2026-07-03T05:05:00Z',
    durationMs: overrides.durationMs ?? 10860000,
    classification: overrides.classification || 'CREDENTIAL_SCAN',
    severity: overrides.severity || 'CRITICAL',
    participants: overrides.participants || {
      ips: [overrides.source_ip || '3.19.29.56'],
      userAgents: [overrides.user_agent || 'scanner-bot'],
      asns: overrides.asns || []
    },
    affectedComponents: overrides.affectedComponents || ['http-surface'],
    evidence: overrides.evidence || [{ eventId: 'ev-1', path_prefix: '/.env', request_count: 23000 }],
    metrics: overrides.metrics || {
      eventCount: 100,
      requestCount: overrides.request_count ?? 23000,
      uniquePaths: 80,
      uniqueIps: 1,
      statusCodes: { 404: 22000, 403: 1000 }
    },
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
  console.log('\n  SEC-03 — ENTERPRISE THREAT INTELLIGENCE AUDIT\n');

  await test('01 — módulo securityThreatIntelligence exporta API', () => {
    const s = freshSec03();
    assert.ok(s.analyzeIncident);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_THREAT_INTELLIGENCE;
    delete process.env.SECURITY_THREAT_INTELLIGENCE;
    delete require.cache[require.resolve('../../securityThreatIntelligence/config/securityThreatIntelligenceFlags.js')];
    const f = require('../../securityThreatIntelligence/config/securityThreatIntelligenceFlags');
    assert.strictEqual(f.isSecurityThreatIntelligenceEnabled(), false);
    process.env.SECURITY_THREAT_INTELLIGENCE = prev || 'true';
  });

  await test('03 — Threat Profile DTO schema v1', () => {
    const { createThreatProfileDto } = require('../../securityThreatIntelligence/dto/threatProfileDto');
    const p = createThreatProfileDto({ incidentId: 'inc-1' });
    assert.strictEqual(p.schema_version, 'threat_profile_v1');
    assert.ok(p.threatProfileId);
    assert.ok(p.disclaimer.includes('Não infere identidade'));
  });

  await test('04 — Scanner AWS → CLOUD_SCANNER', () => {
    const s = freshSec03();
    s.store.resetForTests();
    s.metrics.resetForTests();
    const profile = s.analyzeIncident(sampleIncident({
      source_ip: '3.19.29.56',
      classification: 'CREDENTIAL_SCAN'
    }));
    assert.strictEqual(profile.primaryAssessment, 'CLOUD_SCANNER');
    assert.ok(profile.providerHints.some((p) => p.id === 'aws'));
  });

  await test('05 — Scanner Vultr → CLOUD_SCANNER', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const profile = s.analyzeIncident(sampleIncident({
      source_ip: '45.32.100.10',
      classification: 'GENERIC_SCANNER',
      metrics: { eventCount: 5, requestCount: 500, uniquePaths: 10, uniqueIps: 1, statusCodes: { 404: 400 } }
    }));
    assert.strictEqual(profile.primaryAssessment, 'CLOUD_SCANNER');
    assert.ok(profile.providerHints.some((p) => p.id === 'vultr'));
  });

  await test('06 — Crawler legítimo → CRAWLER', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const profile = s.analyzeIncident(sampleIncident({
      classification: 'CRAWLER',
      severity: 'LOW',
      user_agent: 'Googlebot/2.1',
      metrics: { eventCount: 2, requestCount: 50, uniquePaths: 5, uniqueIps: 1, statusCodes: { 200: 50 } }
    }));
    assert.strictEqual(profile.primaryAssessment, 'CRAWLER');
    assert.ok(profile.threatIndicators.some((i) => i.code === 'LEGITIMATE_CRAWLER'));
  });

  await test('07 — Operador autorizado → OPERATIONAL_ACCESS', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const profile = s.analyzeIncident(sampleIncident({
      classification: 'OPERATIONAL_ACCESS',
      severity: 'INFO',
      source_ip: '170.246.1.1',
      metrics: { eventCount: 1, requestCount: 10, uniquePaths: 2, uniqueIps: 1, statusCodes: { 200: 10 } }
    }));
    assert.strictEqual(profile.primaryAssessment, 'OPERATIONAL_ACCESS');
    assert.strictEqual(profile.originAssessment.level, 'Likely');
  });

  await test('08 — Dois ASNs diferentes → campanha Unknown/Possible', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const p1 = s.analyzeIncident(sampleIncident({
      incidentId: 'inc-asn-a',
      asns: ['AS16509'],
      source_ip: '3.19.29.56'
    }));
    const p2 = s.analyzeIncident(sampleIncident({
      incidentId: 'inc-asn-b',
      asns: ['AS20473'],
      source_ip: '45.32.100.10',
      classification: 'GENERIC_SCANNER',
      metrics: { eventCount: 3, requestCount: 300, uniquePaths: 8, uniqueIps: 1, statusCodes: { 404: 250 } }
    }));
    assert.ok(['Unknown', 'Possible'].includes(p2.campaignAssessment.level));
    assert.notStrictEqual(p1.providerHints[0]?.id, p2.providerHints[0]?.id);
  });

  await test('09 — Mesmo ASN em dias distintos → historical occurred_before', () => {
    const s = freshSec03();
    s.store.resetForTests();
    s.analyzeIncident(sampleIncident({
      incidentId: 'inc-day1',
      firstSeen: '2026-07-01T02:00:00Z',
      asns: ['AS16509'],
      source_ip: '52.12.34.56'
    }));
    const p2 = s.analyzeIncident(sampleIncident({
      incidentId: 'inc-day2',
      firstSeen: '2026-07-03T02:00:00Z',
      asns: ['AS16509'],
      source_ip: '52.12.34.56'
    }));
    assert.strictEqual(p2.historicalSimilarity.occurred_before, true);
    assert.ok(p2.historicalSimilarity.prior_incident_ids.includes('inc-day1'));
  });

  await test('10 — Campanha contínua → Likely mesma campanha', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const base = {
      classification: 'CREDENTIAL_SCAN',
      source_ip: '3.19.29.56',
      asns: ['AS16509']
    };
    s.analyzeIncident(sampleIncident({ incidentId: 'inc-c1', ...base }));
    s.analyzeIncident(sampleIncident({ incidentId: 'inc-c2', ...base }));
    const p3 = s.analyzeIncident(sampleIncident({ incidentId: 'inc-c3', ...base }));
    assert.ok(['Likely', 'Possible'].includes(p3.campaignAssessment.level));
    assert.strictEqual(p3.campaignAssessment.is_isolated, false);
  });

  await test('11 — Incidentes independentes → isolados', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const p = s.analyzeIncident(sampleIncident({
      incidentId: 'inc-independent',
      classification: 'HEALTH_CHECK',
      severity: 'INFO',
      source_ip: '8.8.8.8',
      metrics: { eventCount: 1, requestCount: 5, uniquePaths: 1, uniqueIps: 1, statusCodes: { 200: 5 } }
    }));
    assert.strictEqual(p.campaignAssessment.is_isolated, true);
  });

  await test('12 — threat indicators registrados', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const p = s.analyzeIncident(sampleIncident());
    assert.ok(p.threatIndicators.length >= 3);
    assert.ok(p.threatIndicators.some((i) => i.code === 'CREDENTIAL_SCAN'));
    assert.ok(p.threatIndicators.some((i) => i.code === 'MASSIVE_404'));
  });

  await test('13 — nunca altera Incident DTO SEC-02', () => {
    const s = freshSec03();
    s.store.resetForTests();
    const inc = sampleIncident({ incidentId: 'inc-immutable' });
    const before = JSON.stringify(inc);
    s.analyzeIncident(inc);
    assert.strictEqual(JSON.stringify(inc), before);
  });

  await test('14 — dashboard DTO schema v1', () => {
    const s = freshSec03();
    const dash = s.buildDashboard();
    assert.strictEqual(dash.schema_version, 'threat_dashboard_v1');
    assert.ok(Array.isArray(dash.top_indicators));
  });

  await test('15 — audit payload SEC-03 criteria', () => {
    const s = freshSec03();
    const p = s.getAuditPayload();
    assert.strictEqual(p.phase, 'SEC-03');
    assert.strictEqual(p.no_attacker_identity_inference, true);
    assert.strictEqual(p.criteria.threat_profile_available, true);
  });

  await test('16 — métricas threat_profiles incrementam', () => {
    const s = freshSec03();
    s.store.resetForTests();
    s.metrics.resetForTests();
    s.analyzeIncident(sampleIncident({ incidentId: 'inc-met' }));
    assert.ok(s.metrics.getSnapshot().threat_profiles >= 1);
  });

  await test('17 — endpoint registado em audit.js', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(src.includes('/security-threat-intelligence'));
  });

  await test('18 — SEC-02 preservado (sem import destrutivo)', () => {
    const eg = fs.readFileSync(path.join(SRC, 'services/eventGovernanceService.js'), 'utf8');
    assert.ok(!eg.includes('securityThreatIntelligence'));
    const corr = require('../../securityCorrelation');
    assert.ok(corr.correlateEvent);
  });

  await test('19 — flag off → analyzeIncident null', () => {
    const prev = process.env.SECURITY_THREAT_INTELLIGENCE;
    process.env.SECURITY_THREAT_INTELLIGENCE = 'false';
    delete require.cache[require.resolve('../../securityThreatIntelligence/index.js')];
    delete require.cache[require.resolve('../../securityThreatIntelligence/config/securityThreatIntelligenceFlags.js')];
    const s = require('../../securityThreatIntelligence');
    assert.strictEqual(s.analyzeIncident(sampleIncident()), null);
    process.env.SECURITY_THREAT_INTELLIGENCE = prev || 'true';
  });

  await test('20 — documentação SEC_03 presente', () => {
    for (const f of ['SEC_03_THREAT_INTELLIGENCE.md', 'SEC_03_ARCHITECTURE.md', 'SEC_03_REPORT.md']) {
      assert.ok(fs.existsSync(path.join(DOCS, f)), `missing ${f}`);
    }
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
