'use strict';

/**
 * SEC-14 — Enterprise Adaptive Blocking Engine Audit.
 * node backend/src/tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js
 */

process.env.SECURITY_ADAPTIVE_BLOCKING = 'true';
process.env.SECURITY_BLOCKING_MODE = 'observe';
process.env.SECURITY_BLOCKING_REQUIRE_APPROVAL = 'true';
process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';
process.env.SECURITY_ACTIVE_DEFENSE = 'true';
process.env.SECURITY_ADAPTIVE_PROTECTION = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

const SEC_DOCS = [
  'SEC_14_ADAPTIVE_BLOCKING.md',
  'SEC_14_ARCHITECTURE.md',
  'SEC_14_REPUTATION_ENGINE.md',
  'SEC_14_BEHAVIOR_ANALYSIS.md',
  'SEC_14_OBSERVABILITY.md',
  'SEC_14_ROLLBACK.md',
  'SEC_14_REPORT.md'
];

const REGRESSION = [
  { name: 'SEC-01', file: 'tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js' },
  { name: 'SEC-02', file: 'tests/securityCorrelation/SEC_02_CORRELATION_AUDIT.test.js' },
  { name: 'SEC-03', file: 'tests/securityThreatIntelligence/SEC_03_THREAT_INTELLIGENCE_AUDIT.test.js' },
  { name: 'SEC-04', file: 'tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js' },
  { name: 'SEC-05', file: 'tests/securityNotification/SEC_05_NOTIFICATION_AUDIT.test.js' },
  { name: 'SEC-06', file: 'tests/securityResponse/SEC_06_RESPONSE_AUDIT.test.js' },
  { name: 'SEC-07', file: 'tests/securitySOC/SEC_07_SOC_AUDIT.test.js' },
  { name: 'SEC-08', file: 'tests/audit/SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js' },
  { name: 'SEC-09', file: 'tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js' },
  { name: 'SEC-10', file: 'tests/securityActiveDefense/SEC_10_ACTIVE_DEFENSE.test.js' },
  { name: 'SEC-11', file: 'tests/securityAdaptiveProtection/SEC_11_ADAPTIVE_PROTECTION.test.js' },
  { name: 'SEC-12', file: 'tests/securityExecutionValidation/SEC_12_EXECUTION_VALIDATION.test.js' },
  { name: 'SEC-13', file: 'tests/securityControlledExecution/SEC_13_CONTROLLED_EXECUTION.test.js' },
  { name: 'SEC-13A', file: 'tests/securityPromotionOperational/SEC_13A_OPERATIONAL_PROMOTION.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec14() {
  const mods = [
    '../../securityAdaptiveBlocking/index.js',
    '../../securityAdaptiveBlocking/config/securityAdaptiveBlockingFlags.js',
    '../../securityAdaptiveBlocking/engine/adaptiveBlockingEngine.js',
    '../../securityAdaptiveBlocking/runtime/adaptiveBlockingRuntime.js',
    '../../securityAdaptiveBlocking/metrics/adaptiveBlockingMetrics.js',
    '../../securityAdaptiveBlocking/store/adaptiveBlockingStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec14 = require('../../securityAdaptiveBlocking');
  sec14.store.resetForTests();
  sec14.metrics.resetForTests();
  sec14.shutdown?.();
  return sec14;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ab-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    confidence: 0.85,
    participants: {
      ips: ['203.0.113.50', '203.0.113.51'],
      userAgents: ['mass-scanner/2.0'],
      asns: ['AS64496']
    },
    affectedComponents: ['/api/auth/login', '/api/users', '/admin'],
    metrics: { requestCount: 12000, uniqueIps: 2, eventCount: 80 },
    durationMs: 3600000,
    tags: ['recurrence']
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ab-2',
    severity: 'MEDIUM',
    classification: 'PATH_ENUMERATION',
    status: 'CLOSED',
    confidence: 0.6,
    participants: { ips: ['198.51.100.99'], userAgents: ['curl/7.68'] },
    affectedComponents: ['/wp-admin', '/.env'],
    metrics: { requestCount: 2500, uniqueIps: 1 }
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

function runRegression(rel) {
  try {
    execSync(`node "${path.join(SRC, rel)}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 480000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-14 — ENTERPRISE ADAPTIVE BLOCKING ENGINE\n');

  await test('01 — API exportada', () => {
    const s = freshSec14();
    assert.ok(s.evaluateAdaptiveBlocking);
    assert.ok(s.getAuditPayload);
    assert.ok(s.reputation);
    assert.ok(s.behavior);
    assert.ok(s.fingerprint);
    assert.ok(s.blacklist);
    assert.ok(s.recommendations);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_ADAPTIVE_BLOCKING;
    delete require.cache[require.resolve('../../securityAdaptiveBlocking/config/securityAdaptiveBlockingFlags.js')];
    const f = require('../../securityAdaptiveBlocking/config/securityAdaptiveBlockingFlags');
    assert.strictEqual(f.isSecurityAdaptiveBlockingEnabled(), false);
    process.env.SECURITY_ADAPTIVE_BLOCKING = 'true';
  });

  await test('03 — blocking mode observe', () => {
    const f = require('../../securityAdaptiveBlocking/config/securityAdaptiveBlockingFlags');
    assert.strictEqual(f.blockingMode(), 'observe');
    assert.strictEqual(f.requireApproval(), true);
  });

  await test('04 — blacklist estados', () => {
    const bl = require('../../securityAdaptiveBlocking/engine/adaptiveBlacklistService');
    assert.deepStrictEqual(bl.BLACKLIST_STATES, [
      'NORMAL', 'OBSERVED', 'WATCHLIST', 'QUARANTINE', 'BLOCK_CANDIDATE', 'MANUAL_REVIEW'
    ]);
  });

  await test('05 — reputation engine', () => {
    seedIncidents();
    const rep = require('../../securityAdaptiveBlocking/engine/reputationService');
    const sec02 = require('../../securityCorrelation');
    const incidents = [...sec02.store.getOpenIncidents(), ...sec02.store.getClosedIncidents(50)];
    const r = rep.updateReputationForIp('203.0.113.50', incidents);
    assert.ok(r.reputationScore >= 0 && r.reputationScore <= 100);
    assert.ok(Array.isArray(r.incidentHistory));
    assert.ok(typeof r.recurrence === 'number');
    assert.ok(typeof r.confidence === 'number');
  });

  await test('06 — behavior analysis', () => {
    seedIncidents();
    const beh = require('../../securityAdaptiveBlocking/engine/behaviorAnalysisService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const profiles = beh.analyzeAllBehaviors(incidents);
    assert.ok(profiles.length > 0);
    assert.ok(profiles[0].behaviors.includes('credential_scanning'));
  });

  await test('07 — fingerprint engine', () => {
    seedIncidents();
    const fp = require('../../securityAdaptiveBlocking/engine/fingerprintService');
    const beh = require('../../securityAdaptiveBlocking/engine/behaviorAnalysisService');
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getOpenIncidents()[0];
    const profile = beh.analyzeIncidentBehavior(inc);
    const fingerprint = fp.buildFingerprint(inc, profile);
    assert.strictEqual(fingerprint.schema_version, 'scanner_fingerprint_v1');
    assert.ok(fingerprint.disclaimer.includes('não infere identidade'));
  });

  await test('08 — blocking recommendations auto_execute false', () => {
    const rec = require('../../securityAdaptiveBlocking/engine/blockingRecommendationService');
    const r = rec.createRecommendation('203.0.113.50', { reputationScore: 20, recurrence: 3 }, { state: 'QUARANTINE' }, 0.8, null);
    assert.strictEqual(r.auto_execute, false);
    assert.strictEqual(r.executionAllowed, false);
    assert.ok(rec.RECOMMENDATION_TYPES.includes(r.action));
  });

  await test('09 — dashboard adaptive_blocking_v1', () => {
    seedIncidents();
    const s = freshSec14();
    const dash = s.buildDashboard({ force: true });
    assert.strictEqual(dash.schema_version, 'adaptive_blocking_v1');
    assert.strictEqual(dash.executionAllowed, false);
    assert.ok(dash.blockingStatus);
    assert.ok('reputationScore' in dash);
    assert.ok('behaviorScore' in dash);
    assert.ok('fingerprintConfidence' in dash);
    assert.ok('recommendedAction' in dash);
    assert.ok('recommendationReason' in dash);
    assert.ok('approvalRequired' in dash);
  });

  await test('10 — métricas observabilidade', () => {
    const s = freshSec14();
    seedIncidents();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'adaptive_blocking_events', 'watchlist_ips', 'quarantine_candidates',
      'manual_reviews', 'reputation_updates', 'behavior_profiles',
      'fingerprints_generated', 'blocking_recommendations'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('11 — audit payload read-only', () => {
    const s = freshSec14();
    seedIncidents();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-14');
    assert.ok(payload.dashboard || payload.enabled === false);
  });

  await test('12 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-adaptive-blocking'));
  });

  await test('13 — SEC-01→13A não importam sec14', () => {
    const upstream = [
      'securityCorrelation/index.js',
      'securityActiveDefense/index.js',
      'securityAdaptiveProtection/index.js',
      'securityControlledExecution/index.js',
      'securityPromotionOperational/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityAdaptiveBlocking'), f);
    }
  });

  await test('14 — sem execução infra', () => {
    const dir = path.join(SRC, 'securityAdaptiveBlocking');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['execSync', 'spawnSync', 'iptables', 'nginx', 'ufw', 'rateLimit'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of forbidden) {
        assert.ok(!content.includes(word), `${file} contém ${word}`);
      }
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`15 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('16 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_ADAPTIVE_BLOCKING=false'));
    assert.ok(ex.includes('SECURITY_BLOCKING_MODE=observe'));
    assert.ok(ex.includes('SECURITY_BLOCKING_REQUIRE_APPROVAL=true'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t.file), t.name));
  }

  const criteria = {
    adaptive_blocking_available: failed === 0,
    reputation_engine_available: failed === 0,
    behavior_analysis_available: failed === 0,
    fingerprint_engine_available: failed === 0,
    blocking_recommendations_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-14');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-14', criteria, passed, failed }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
