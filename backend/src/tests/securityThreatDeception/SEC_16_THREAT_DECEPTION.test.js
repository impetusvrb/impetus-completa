'use strict';

/**
 * SEC-16 — Enterprise Threat Deception Framework Audit.
 * node backend/src/tests/securityThreatDeception/SEC_16_THREAT_DECEPTION.test.js
 */

process.env.SECURITY_THREAT_DECEPTION = 'true';
process.env.SECURITY_DECEPTION_MODE = 'observe';
process.env.SECURITY_DECEPTION_REQUIRE_APPROVAL = 'true';
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
  'SEC_16_THREAT_DECEPTION.md',
  'SEC_16_ARCHITECTURE.md',
  'SEC_16_HONEYPOT_PROFILES.md',
  'SEC_16_ENGAGEMENT_ANALYSIS.md',
  'SEC_16_OBSERVABILITY.md',
  'SEC_16_ROLLBACK.md',
  'SEC_16_REPORT.md'
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
  { name: 'SEC-15', file: 'tests/securityAntiScanner/SEC_15_ANTI_SCANNER.test.js', timeoutMs: 1200000 }
];

let passed = 0;
let failed = 0;

function freshSec16() {
  const mods = [
    '../../securityThreatDeception/index.js',
    '../../securityThreatDeception/config/securityThreatDeceptionFlags.js',
    '../../securityThreatDeception/engine/threatDeceptionEngine.js',
    '../../securityThreatDeception/runtime/threatDeceptionRuntime.js',
    '../../securityThreatDeception/metrics/threatDeceptionMetrics.js',
    '../../securityThreatDeception/store/threatDeceptionStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec16 = require('../../securityThreatDeception');
  sec16.store.resetForTests();
  sec16.metrics.resetForTests();
  sec16.shutdown?.();
  return sec16;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-td-1',
    severity: 'HIGH',
    classification: 'PATH_ENUMERATION',
    status: 'OPEN',
    confidence: 0.88,
    participants: { ips: ['203.0.113.99'], userAgents: ['nikto/2.1.5'] },
    affectedComponents: ['/.env', '/.git/HEAD', '/backup/db.sql', '/admin/login'],
    metrics: { requestCount: 8000, uniqueIps: 1 },
    durationMs: 3600000,
    tags: ['recurrence']
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-td-2',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    confidence: 0.75,
    participants: { ips: ['198.51.100.20'], userAgents: ['python-requests/2.28'] },
    affectedComponents: ['/api/auth/login', '/api/internal/users'],
    metrics: { requestCount: 5000, uniqueIps: 1 }
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
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-16 — ENTERPRISE THREAT DECEPTION FRAMEWORK\n');

  await test('01 — API exportada', () => {
    const s = freshSec16();
    assert.ok(s.evaluateThreatDeception);
    assert.ok(s.honeypot);
    assert.ok(s.scenarios);
    assert.ok(s.engagement);
    assert.ok(s.evidence);
    assert.ok(s.planner);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_THREAT_DECEPTION;
    delete require.cache[require.resolve('../../securityThreatDeception/config/securityThreatDeceptionFlags.js')];
    const f = require('../../securityThreatDeception/config/securityThreatDeceptionFlags');
    assert.strictEqual(f.isSecurityThreatDeceptionEnabled(), false);
    process.env.SECURITY_THREAT_DECEPTION = 'true';
  });

  await test('03 — honeypot profiles certificados', () => {
    const hp = require('../../securityThreatDeception/engine/honeypotProfileService');
    const profiles = hp.getAllProfiles();
    assert.strictEqual(profiles.length, 8);
    assert.ok(profiles.every((p) => p.physicalResource === false));
    assert.ok(profiles.every((p) => p.deployed === false));
    assert.ok(hp.HONEYPOT_PROFILES.includes('fake_env'));
  });

  await test('04 — deception scenarios', () => {
    seedIncidents();
    const sc = require('../../securityThreatDeception/engine/deceptionScenarioService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const built = sc.buildScenariosFromContext(incidents, { scannerDetected: true });
    assert.ok(built.length > 0);
    assert.strictEqual(built[0].auto_execute, false);
    assert.strictEqual(built[0].deployed, false);
  });

  await test('05 — engagement analyzer', () => {
    seedIncidents();
    const eng = require('../../securityThreatDeception/engine/engagementAnalysisService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const profile = eng.analyzeEngagement(incidents, null, { scannerConfidence: 0.7 }, []);
    assert.ok(profile.deceptionConfidence >= 0);
    assert.ok(profile.attackerPersistence >= 0);
    assert.ok(profile.interactionDepth >= 0);
    assert.ok(profile.scannerSophistication >= 0);
  });

  await test('06 — evidence enrichment sem duplicar', () => {
    seedIncidents();
    const ev = require('../../securityThreatDeception/engine/deceptionEvidenceService');
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const enrichment = ev.enrichEvidence(incidents, [], { profileId: 'eng-1' }, null);
    assert.ok(enrichment.sec02References.every((r) => r.duplicateEvent === false));
    assert.ok(enrichment.disclaimer.includes('nenhum evento duplicado'));
  });

  await test('07 — deception planner auto_execute false', () => {
    const pl = require('../../securityThreatDeception/engine/threatDeceptionPlanner');
    const plan = pl.createDeceptionPlan({
      action: 'present_fake_resource',
      reason: 'test',
      fakeResource: 'fake_env'
    });
    assert.strictEqual(plan.auto_execute, false);
    assert.strictEqual(plan.executionAllowed, false);
  });

  await test('08 — dashboard threat_deception_v1', () => {
    seedIncidents();
    const s = freshSec16();
    const dash = s.buildDashboard({ force: true });
    assert.strictEqual(dash.schema_version, 'threat_deception_v1');
    assert.strictEqual(dash.executionAllowed, false);
    assert.ok(dash.deceptionStatus);
    assert.ok('deceptionConfidence' in dash);
    assert.ok(dash.engagementLevel);
    assert.ok('fakeResourceRecommended' in dash);
    assert.ok('evidenceGain' in dash);
    assert.ok('recommendedScenario' in dash);
    assert.ok('approvalRequired' in dash);
  });

  await test('09 — métricas observabilidade', () => {
    const s = freshSec16();
    seedIncidents();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'deception_plans', 'deception_candidates', 'engagement_profiles',
      'fake_resource_recommendations', 'evidence_enrichment',
      'attacker_persistence', 'scanner_sophistication'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('10 — audit payload read-only', () => {
    const s = freshSec16();
    seedIncidents();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-16');
  });

  await test('11 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-threat-deception'));
  });

  await test('12 — SEC-01→15 não importam sec16', () => {
    const upstream = [
      'securityAdaptiveBlocking/index.js',
      'securityAntiScanner/index.js',
      'securityCorrelation/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityThreatDeception'), f);
    }
  });

  await test('13 — sem honeypots reais / infra', () => {
    const dir = path.join(SRC, 'securityThreatDeception');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['execSync', 'spawnSync', 'iptables', 'nginx', 'ufw', 'res.status', 'res.send'];
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
    assert.ok(ex.includes('SECURITY_THREAT_DECEPTION=false'));
    assert.ok(ex.includes('SECURITY_DECEPTION_MODE=observe'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t), t.name));
  }

  const criteria = {
    threat_deception_available: failed === 0,
    honeypot_profiles_available: failed === 0,
    engagement_analysis_available: failed === 0,
    evidence_enrichment_available: failed === 0,
    deception_planner_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-16');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-16', criteria, passed, failed }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
