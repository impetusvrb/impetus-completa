'use strict';

/**
 * SEC-17 — Enterprise Exfiltration Detection Audit.
 * node backend/src/tests/securityExfiltrationDetection/SEC_17_EXFILTRATION_DETECTION.test.js
 */

process.env.SECURITY_EXFILTRATION_DETECTION = 'true';
process.env.SECURITY_DATA_PROTECTION_MODE = 'observe';
process.env.SECURITY_EXFILTRATION_REQUIRE_APPROVAL = 'true';
process.env.SECURITY_THREAT_DECEPTION = 'true';
process.env.SECURITY_ANTI_SCANNER = 'true';
process.env.SECURITY_ADAPTIVE_BLOCKING = 'true';
process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

const SEC_DOCS = [
  'SEC_17_EXFILTRATION_DETECTION.md',
  'SEC_17_ARCHITECTURE.md',
  'SEC_17_SENSITIVE_ASSETS.md',
  'SEC_17_DATA_MOVEMENT.md',
  'SEC_17_OBSERVABILITY.md',
  'SEC_17_ROLLBACK.md',
  'SEC_17_REPORT.md'
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
  { name: 'SEC-13A', file: 'tests/securityPromotionOperational/SEC_13A_OPERATIONAL_PROMOTION.test.js' },
  { name: 'SEC-14', file: 'tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js', timeoutMs: 900000 },
  { name: 'SEC-15', file: 'tests/securityAntiScanner/SEC_15_ANTI_SCANNER.test.js', timeoutMs: 1200000 },
  { name: 'SEC-16', file: 'tests/securityThreatDeception/SEC_16_THREAT_DECEPTION.test.js', timeoutMs: 1200000 }
];

let passed = 0;
let failed = 0;

function freshSec17() {
  const mods = [
    '../../securityExfiltrationDetection/index.js',
    '../../securityExfiltrationDetection/config/securityExfiltrationFlags.js',
    '../../securityExfiltrationDetection/engine/exfiltrationDetectionEngine.js',
    '../../securityExfiltrationDetection/runtime/exfiltrationRuntime.js',
    '../../securityExfiltrationDetection/metrics/exfiltrationMetrics.js',
    '../../securityExfiltrationDetection/store/exfiltrationStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec17 = require('../../securityExfiltrationDetection');
  sec17.store.resetForTests();
  sec17.metrics.resetForTests();
  sec17.shutdown?.();
  return sec17;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ex-1',
    severity: 'CRITICAL',
    classification: 'PATH_ENUMERATION',
    status: 'OPEN',
    confidence: 0.92,
    participants: { ips: ['203.0.113.200'], userAgents: ['python-requests/2.28'] },
    affectedComponents: [
      '/backend/src/server.js', '/.env', '/backend/docs/SEC_01_REPORT.md',
      '/backend/docs/evidence/sec-08/criteria.json', '/backup/db.sql'
    ],
    metrics: { requestCount: 25000, uniqueIps: 1, eventCount: 200 },
    durationMs: 7200000,
    tags: ['recurrence']
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ex-2',
    severity: 'HIGH',
    classification: 'GENERIC_SCAN',
    status: 'CLOSED',
    confidence: 0.7,
    participants: { ips: ['198.51.100.88'], userAgents: ['curl/7.68'] },
    affectedComponents: ['/frontend/dist/assets/main.js', '/frontend/src/App.tsx'],
    metrics: { requestCount: 8000, uniqueIps: 1 },
    firstSeen: '2026-07-01T10:00:00.000Z',
    lastSeen: '2026-07-01T14:00:00.000Z'
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

function runRegression(entry) {
  const rel = typeof entry === 'string' ? entry : entry.file;
  const timeoutMs = (typeof entry === 'object' && entry.timeoutMs) || 900000;
  try {
    execSync(`node "${path.join(SRC, rel)}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: timeoutMs,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (e) {
    if (e.stderr) process.stderr.write(String(e.stderr).slice(-500));
    return false;
  }
}

(async () => {
  console.log('\n  SEC-17 — ENTERPRISE EXFILTRATION DETECTION & DATA PROTECTION\n');

  await test('01 — API exportada', () => {
    const s = freshSec17();
    assert.ok(s.evaluateExfiltrationDetection);
    assert.ok(s.registry);
    assert.ok(s.movement);
    assert.ok(s.accessProfiler);
    assert.ok(s.confidence);
    assert.ok(s.planner);
    assert.ok(s.timeline);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_EXFILTRATION_DETECTION;
    delete require.cache[require.resolve('../../securityExfiltrationDetection/config/securityExfiltrationFlags.js')];
    const f = require('../../securityExfiltrationDetection/config/securityExfiltrationFlags');
    assert.strictEqual(f.isSecurityExfiltrationDetectionEnabled(), false);
    process.env.SECURITY_EXFILTRATION_DETECTION = 'true';
  });

  await test('03 — sensitive asset registry', () => {
    const reg = require('../../securityExfiltrationDetection/engine/sensitiveAssetRegistry');
    const assets = reg.getAllAssets();
    assert.ok(assets.length >= 10);
    assert.ok(assets.every((a) => a.criticality && a.category && a.logicalPath));
    assert.ok(reg.getCriticalAssets().length >= 4);
  });

  await test('04 — data movement analyzer', () => {
    seedIncidents();
    const mov = require('../../securityExfiltrationDetection/engine/dataMovementAnalysisService');
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getOpenIncidents()[0];
    const profile = mov.analyzeMovementFromIncident(inc);
    assert.ok(profile.movementTypes.includes('mass_download'));
    assert.ok(profile.matchedAssets.length > 0);
  });

  await test('05 — asset access profiler', () => {
    seedIncidents();
    const ap = require('../../securityExfiltrationDetection/engine/assetAccessProfiler');
    const reg = require('../../securityExfiltrationDetection/engine/sensitiveAssetRegistry');
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getOpenIncidents()[0];
    const assets = reg.matchAssetsFromPaths(inc.affectedComponents);
    const profile = ap.profileAccess(inc, null, assets);
    assert.ok(profile.frequency > 0);
    assert.ok(profile.assetsAccessed.length > 0);
  });

  await test('06 — exfiltration confidence', () => {
    seedIncidents();
    const conf = require('../../securityExfiltrationDetection/engine/exfiltrationConfidenceService');
    const mov = require('../../securityExfiltrationDetection/engine/dataMovementAnalysisService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const mps = mov.analyzeAllMovements(incidents);
    const report = conf.buildConfidenceReport(mps, [], [], [], incidents.length);
    assert.ok(report.exfiltrationConfidence >= 0);
    assert.ok(report.scrapingConfidence >= 0);
    assert.ok(report.evidenceStrength >= 0);
    assert.ok(report.falsePositiveProbability >= 0);
  });

  await test('07 — data protection planner auto_execute false', () => {
    const pl = require('../../securityExfiltrationDetection/engine/dataProtectionPlanner');
    const plan = pl.createProtectionPlan({
      action: 'preserve_evidence',
      reason: 'test',
      priority: 'HIGH'
    });
    assert.strictEqual(plan.auto_execute, false);
    assert.strictEqual(plan.executionAllowed, false);
  });

  await test('08 — exfiltration timeline', () => {
    seedIncidents();
    const tl = require('../../securityExfiltrationDetection/engine/exfiltrationTimelineBuilder');
    const sec02 = require('../../securityCorrelation');
    const incidents = [...sec02.store.getOpenIncidents(), ...sec02.store.getClosedIncidents(50)];
    const built = tl.buildTimeline(incidents, [], []);
    assert.ok(built.events.length > 0);
    assert.ok(built.summary);
    assert.ok(built.phases.includes('reconnaissance'));
  });

  await test('09 — dashboard exfiltration_detection_v1', () => {
    seedIncidents();
    const s = freshSec17();
    const dash = s.buildDashboard({ force: true });
    assert.strictEqual(dash.schema_version, 'exfiltration_detection_v1');
    assert.strictEqual(dash.executionAllowed, false);
    assert.ok(dash.detectionStatus);
    assert.ok('exfiltrationConfidence' in dash);
    assert.ok('scrapingConfidence' in dash);
    assert.ok(Array.isArray(dash.protectedAssets));
    assert.ok(Array.isArray(dash.suspiciousAssets));
    assert.ok(dash.timeline);
    assert.ok('evidenceStrength' in dash);
    assert.ok(Array.isArray(dash.recommendations));
    assert.ok('approvalRequired' in dash);
  });

  await test('10 — métricas observabilidade', () => {
    const s = freshSec17();
    seedIncidents();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'exfiltration_candidates', 'protected_assets', 'suspicious_asset_access',
      'scraping_patterns', 'download_profiles', 'evidence_strength',
      'asset_exposure', 'data_protection_plans'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('11 — audit payload read-only', () => {
    const s = freshSec17();
    seedIncidents();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-17');
  });

  await test('12 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-exfiltration'));
  });

  await test('13 — SEC-01→16 não importam sec17', () => {
    const upstream = [
      'securityThreatDeception/index.js',
      'securityAntiScanner/index.js',
      'securityAdaptiveBlocking/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityExfiltrationDetection'), f);
    }
  });

  await test('14 — sem bloqueio downloads/infra', () => {
    const dir = path.join(SRC, 'securityExfiltrationDetection');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['execSync', 'spawnSync', 'iptables', 'nginx', 'ufw', 'res.download'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of forbidden) assert.ok(!content.includes(word), `${file} contém ${word}`);
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`15 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('16 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_EXFILTRATION_DETECTION=false'));
    assert.ok(ex.includes('SECURITY_DATA_PROTECTION_MODE=observe'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t), t.name));
  }

  const criteria = {
    exfiltration_detection_available: failed === 0,
    sensitive_asset_registry_available: failed === 0,
    data_movement_analysis_available: failed === 0,
    asset_access_profiling_available: failed === 0,
    exfiltration_confidence_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-17');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-17', criteria, passed, failed }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
