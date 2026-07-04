'use strict';

/**
 * SEC-15 — Enterprise Anti-Scanner & Anti-Enumeration Audit.
 * node backend/src/tests/securityAntiScanner/SEC_15_ANTI_SCANNER.test.js
 */

process.env.SECURITY_ANTI_SCANNER = 'true';
process.env.SECURITY_SURFACE_PROTECTION_MODE = 'observe';
process.env.SECURITY_ANTI_SCANNER_REQUIRE_APPROVAL = 'true';
process.env.SECURITY_ADAPTIVE_BLOCKING = 'true';
process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

const SEC_DOCS = [
  'SEC_15_ANTI_SCANNER.md',
  'SEC_15_ARCHITECTURE.md',
  'SEC_15_SCANNER_PATTERNS.md',
  'SEC_15_SURFACE_PROTECTION.md',
  'SEC_15_OBSERVABILITY.md',
  'SEC_15_ROLLBACK.md',
  'SEC_15_REPORT.md'
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
  { name: 'SEC-14', file: 'tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec15() {
  const mods = [
    '../../securityAntiScanner/index.js',
    '../../securityAntiScanner/config/securityAntiScannerFlags.js',
    '../../securityAntiScanner/engine/antiScannerEngine.js',
    '../../securityAntiScanner/runtime/antiScannerRuntime.js',
    '../../securityAntiScanner/metrics/antiScannerMetrics.js',
    '../../securityAntiScanner/store/antiScannerStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec15 = require('../../securityAntiScanner');
  sec15.store.resetForTests();
  sec15.metrics.resetForTests();
  sec15.shutdown?.();
  return sec15;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-as-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    confidence: 0.9,
    participants: {
      ips: ['203.0.113.77'],
      userAgents: ['nikto/2.1.5'],
      asns: ['AS64496']
    },
    affectedComponents: ['/api/auth/login', '/api/users', '/.env', '/wp-admin', '/docker-compose.yml'],
    metrics: { requestCount: 15000, uniqueIps: 1, eventCount: 120 },
    durationMs: 1800000,
    tags: ['recurrence']
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-as-2',
    severity: 'MEDIUM',
    classification: 'PATH_ENUMERATION',
    status: 'OPEN',
    confidence: 0.7,
    participants: { ips: ['198.51.100.44'], userAgents: ['bot-scanner/1.0'] },
    affectedComponents: ['/admin', '/swagger', '/api/v1/users', '/uploads/test'],
    metrics: { requestCount: 3000, uniqueIps: 1 }
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
      timeout: 600000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-15 — ENTERPRISE ANTI-SCANNER & ANTI-ENUMERATION\n');

  await test('01 — API exportada', () => {
    const s = freshSec15();
    assert.ok(s.evaluateAntiScanner);
    assert.ok(s.scannerFingerprint);
    assert.ok(s.enumerationDetection);
    assert.ok(s.scannerConfidence);
    assert.ok(s.surfacePlanner);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_ANTI_SCANNER;
    delete require.cache[require.resolve('../../securityAntiScanner/config/securityAntiScannerFlags.js')];
    const f = require('../../securityAntiScanner/config/securityAntiScannerFlags');
    assert.strictEqual(f.isSecurityAntiScannerEnabled(), false);
    process.env.SECURITY_ANTI_SCANNER = 'true';
  });

  await test('03 — surface protection mode observe', () => {
    const f = require('../../securityAntiScanner/config/securityAntiScannerFlags');
    assert.strictEqual(f.surfaceProtectionMode(), 'observe');
    assert.strictEqual(f.requireApproval(), true);
  });

  await test('04 — scanner fingerprint patterns', () => {
    seedIncidents();
    const sf = require('../../securityAntiScanner/engine/scannerFingerprintService');
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getOpenIncidents()[0];
    const fp = sf.buildScannerFingerprint(inc);
    assert.ok(fp.patterns.includes('credential_scanner'));
    assert.ok(fp.disclaimer.includes('não identifica'));
  });

  await test('05 — enumeration detection', () => {
    seedIncidents();
    const ed = require('../../securityAntiScanner/engine/enumerationDetectionService');
    const sec02 = require('../../securityCorrelation');
    const inc = sec02.store.getOpenIncidents()[0];
    const profile = ed.detectEnumerationFromIncident(inc);
    assert.ok(profile.enumerationTypes.includes('sensitive_file_probe'));
  });

  await test('06 — scanner confidence engine', () => {
    seedIncidents();
    const sf = require('../../securityAntiScanner/engine/scannerFingerprintService');
    const ed = require('../../securityAntiScanner/engine/enumerationDetectionService');
    const conf = require('../../securityAntiScanner/engine/scannerConfidenceService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const fps = sf.detectAllScannerFingerprints(incidents);
    const enums = ed.detectAllEnumerations(incidents);
    const report = conf.buildConfidenceReport(fps, enums, [], incidents);
    assert.ok(report.scannerConfidence >= 0 && report.scannerConfidence <= 1);
    assert.ok(report.enumerationConfidence >= 0);
    assert.ok(report.automationConfidence >= 0);
    assert.ok(report.falsePositiveProbability >= 0);
  });

  await test('07 — surface planner auto_execute false', () => {
    const sp = require('../../securityAntiScanner/engine/surfaceProtectionPlanner');
    const plan = sp.createSurfaceRecommendation({
      action: 'uniform_404_response',
      reason: 'test',
      priority: 'HIGH'
    });
    assert.strictEqual(plan.auto_execute, false);
    assert.strictEqual(plan.executionAllowed, false);
  });

  await test('08 — dashboard anti_scanner_v1', () => {
    seedIncidents();
    const s = freshSec15();
    const dash = s.buildDashboard({ force: true });
    assert.strictEqual(dash.schema_version, 'anti_scanner_v1');
    assert.strictEqual(dash.executionAllowed, false);
    assert.ok(typeof dash.scannerDetected === 'boolean');
    assert.ok('scannerConfidence' in dash);
    assert.ok(typeof dash.enumerationDetected === 'boolean');
    assert.ok(dash.attackPattern);
    assert.ok('protectionRecommendation' in dash);
    assert.ok('recommendedSurfaceProfile' in dash);
    assert.ok('approvalRequired' in dash);
  });

  await test('09 — métricas observabilidade', () => {
    const s = freshSec15();
    seedIncidents();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'scanner_detections', 'enumeration_attempts', 'surface_profiles',
      'scanner_confidence', 'enumeration_confidence',
      'recommended_surface_changes', 'anti_scanner_reports'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('10 — audit payload read-only', () => {
    const s = freshSec15();
    seedIncidents();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-15');
  });

  await test('11 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-anti-scanner'));
  });

  await test('12 — SEC-01→14 não importam sec15', () => {
    const upstream = [
      'securityAdaptiveBlocking/index.js',
      'securityCorrelation/index.js',
      'securityThreatIntelligence/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityAntiScanner'), f);
    }
  });

  await test('13 — sem execução infra/HTTP', () => {
    const dir = path.join(SRC, 'securityAntiScanner');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['execSync', 'spawnSync', 'iptables', 'nginx', 'ufw', 'res.setHeader', 'res.status'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of forbidden) assert.ok(!content.includes(word), `${file} contém ${word}`);
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`14 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('15 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_ANTI_SCANNER=false'));
    assert.ok(ex.includes('SECURITY_SURFACE_PROTECTION_MODE=observe'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t.file), t.name));
  }

  const criteria = {
    anti_scanner_available: failed === 0,
    scanner_fingerprint_available: failed === 0,
    enumeration_detection_available: failed === 0,
    surface_protection_planner_available: failed === 0,
    scanner_confidence_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-15');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-15', criteria, passed, failed }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
