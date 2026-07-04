'use strict';

/**
 * SEC-11 — Enterprise Adaptive Protection Audit.
 * node backend/src/tests/securityAdaptiveProtection/SEC_11_ADAPTIVE_PROTECTION.test.js
 */

process.env.SECURITY_ADAPTIVE_PROTECTION = 'true';
process.env.SECURITY_PROTECTION_MODE = 'observe';
process.env.SECURITY_PROTECTION_REQUIRE_APPROVAL = 'true';
process.env.SECURITY_ACTIVE_DEFENSE = 'true';
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
  'SEC_11_ADAPTIVE_PROTECTION.md',
  'SEC_11_ARCHITECTURE.md',
  'SEC_11_PROTECTION_PROFILES.md',
  'SEC_11_APPROVAL_ENGINE.md',
  'SEC_11_OBSERVABILITY.md',
  'SEC_11_ROLLBACK.md',
  'SEC_11_REPORT.md'
];

const REGRESSION_TESTS = [
  { name: 'SEC-01', file: 'tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js' },
  { name: 'SEC-02', file: 'tests/securityCorrelation/SEC_02_CORRELATION_AUDIT.test.js' },
  { name: 'SEC-03', file: 'tests/securityThreatIntelligence/SEC_03_THREAT_INTELLIGENCE_AUDIT.test.js' },
  { name: 'SEC-04', file: 'tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js' },
  { name: 'SEC-05', file: 'tests/securityNotification/SEC_05_NOTIFICATION_AUDIT.test.js' },
  { name: 'SEC-06', file: 'tests/securityResponse/SEC_06_RESPONSE_AUDIT.test.js' },
  { name: 'SEC-07', file: 'tests/securitySOC/SEC_07_SOC_AUDIT.test.js' },
  { name: 'SEC-08', file: 'tests/audit/SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js' },
  { name: 'SEC-09', file: 'tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js' },
  { name: 'SEC-10', file: 'tests/securityActiveDefense/SEC_10_ACTIVE_DEFENSE.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec11() {
  const mods = [
    '../../securityAdaptiveProtection/index.js',
    '../../securityAdaptiveProtection/config/securityAdaptiveProtectionFlags.js',
    '../../securityAdaptiveProtection/engine/adaptiveProtectionEngine.js',
    '../../securityAdaptiveProtection/runtime/adaptiveProtectionRuntime.js',
    '../../securityAdaptiveProtection/metrics/adaptiveProtectionMetrics.js',
    '../../securityAdaptiveProtection/store/adaptiveProtectionStore.js',
    '../../securityActiveDefense/store/activeDefenseStore.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec11 = require('../../securityAdaptiveProtection');
  sec11.store.resetForTests();
  sec11.metrics.resetForTests();
  sec11.shutdown?.();
  return sec11;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-sec11-1',
    severity: 'CRITICAL',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    participants: { ips: ['203.0.113.1', '203.0.113.2', '203.0.113.3', '203.0.113.4', '203.0.113.5'], userAgents: ['scan'], asns: [] },
    metrics: { requestCount: 25000, uniqueIps: 5, eventCount: 100 },
    durationMs: 3600000
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

function runRegression(relPath) {
  try {
    execSync(`node "${path.join(SRC, relPath)}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 300000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-11 — ENTERPRISE ADAPTIVE PROTECTION AUDIT\n');

  await test('01 — módulo exporta API', () => {
    const s = freshSec11();
    assert.ok(s.evaluateProtection);
    assert.ok(s.getAuditPayload);
    assert.ok(s.registerApproval);
  });

  await test('02 — flag default false', () => {
    delete process.env.SECURITY_ADAPTIVE_PROTECTION;
    delete require.cache[require.resolve('../../securityAdaptiveProtection/config/securityAdaptiveProtectionFlags.js')];
    const f = require('../../securityAdaptiveProtection/config/securityAdaptiveProtectionFlags');
    assert.strictEqual(f.isSecurityAdaptiveProtectionEnabled(), false);
    process.env.SECURITY_ADAPTIVE_PROTECTION = 'true';
  });

  await test('03 — REQUIRE_APPROVAL true default', () => {
    delete process.env.SECURITY_PROTECTION_REQUIRE_APPROVAL;
    delete require.cache[require.resolve('../../securityAdaptiveProtection/config/securityAdaptiveProtectionFlags.js')];
    const f = require('../../securityAdaptiveProtection/config/securityAdaptiveProtectionFlags');
    assert.strictEqual(f.requireApproval(), true);
    process.env.SECURITY_PROTECTION_REQUIRE_APPROVAL = 'true';
  });

  await test('04 — sem execSync/nginx/pm2 no engine', () => {
    const src = fs.readFileSync(path.join(SRC, 'securityAdaptiveProtection/engine/adaptiveProtectionEngine.js'), 'utf8');
    assert.ok(!src.includes('execSync'));
    assert.ok(!src.includes('nginx'));
    assert.ok(!src.includes('blockIp'));
  });

  await test('05 — colector SEC-01→10 read-only', () => {
    const { collectSecLayerData } = require('../../securityAdaptiveProtection/collectors/secLayerCollector');
    const d = collectSecLayerData();
    assert.ok('sec10' in d);
    assert.ok('sec02' in d);
  });

  await test('06 — protection profiles NORMAL→LOCKDOWN', () => {
    const p = require('../../securityAdaptiveProtection/engine/protectionProfileService');
    assert.ok(p.PROFILES.NORMAL);
    assert.ok(p.PROFILES.LOCKDOWN);
    assert.strictEqual(p.recommendProfile('CRITICAL', 'PROTECTED', 0.3), 'LOCKDOWN');
  });

  await test('07 — adaptive surface plan only', () => {
    const sm = require('../../securityAdaptiveProtection/engine/adaptiveSurfaceManager');
    const plan = sm.buildSurfacePlan({ id: 'DEFENSE' }, [], []);
    assert.ok(plan.actions.length > 0);
    assert.strictEqual(plan.auto_execute, false);
  });

  await test('08 — anti-scanner recommendations', () => {
    const as = require('../../securityAdaptiveProtection/engine/antiScannerService');
    const patterns = as.detectScannerPatterns(
      [{ classification: 'CREDENTIAL_SCAN', participants: { ips: ['1', '2', '3', '4', '5'] } }],
      []
    );
    assert.ok(patterns.includes('credential_scan'));
    const recs = as.buildAntiScannerRecommendations(patterns);
    assert.ok(recs.every((r) => r.auto_execute === false));
  });

  await test('09 — runtime_protection_score', () => {
    seedIncidents();
    const rs = require('../../securityAdaptiveProtection/engine/runtimeShieldService');
    const sec02 = require('../../securityCorrelation');
    const result = rs.computeRuntimeProtectionScore({
      openIncidents: sec02.store.getOpenIncidents(),
      threatLevel: 'CRITICAL'
    });
    assert.ok(result.runtime_protection_score >= 0 && result.runtime_protection_score <= 1);
  });

  await test('10 — approval engine dual/single/emergency', () => {
    const ap = require('../../securityAdaptiveProtection/engine/administratorApprovalService');
    const plan = { planId: 'p1', recommendedProfile: 'LOCKDOWN', summary: 'test', rollback: {} };
    const req = ap.createApprovalRequest(plan);
    assert.strictEqual(req.approvalType, 'dual');
    ap.registerApproval(req, 'Wellington', 'incident response', 'single');
    assert.strictEqual(req.currentApprovals, 1);
    ap.registerApproval(req, 'Gustavo', 'dual confirm', 'dual');
    assert.strictEqual(req.status, 'APPROVED');
    assert.strictEqual(ap.canExecutePlan(req), true);
  });

  await test('11 — recovery + rollback plans', () => {
    const rp = require('../../securityAdaptiveProtection/engine/recoveryPlanner');
    const rec = rp.buildRecoveryPlan({ incidents: [], recommendedProfile: 'DEFENSE', threatLevel: 'HIGH' });
    const rb = rp.buildRollbackPlan('DEFENSE');
    assert.strictEqual(rec.auto_execute, false);
    assert.strictEqual(rb.auto_execute, false);
    assert.ok(rb.actions.length >= 3);
  });

  await test('12 — dashboard DTO adaptive_protection_v1', () => {
    seedIncidents();
    const sec11 = freshSec11();
    const dash = sec11.buildDashboard({ force: true });
    assert.ok(dash);
    assert.strictEqual(dash.schema_version, 'adaptive_protection_v1');
    assert.ok('protectionPlan' in dash);
    assert.ok('recoveryPlan' in dash);
    assert.ok('rollbackPlan' in dash);
    assert.strictEqual(dash.read_only, true);
  });

  await test('13 — protection plan never auto_execute', () => {
    seedIncidents();
    const sec11 = freshSec11();
    const dash = sec11.buildDashboard({ force: true });
    assert.strictEqual(dash.protectionPlan.auto_execute, false);
  });

  await test('14 — métricas obrigatórias', () => {
    seedIncidents();
    const sec11 = freshSec11();
    sec11.buildDashboard({ force: true });
    const snap = sec11.metrics.getSnapshot();
    assert.ok(snap.adaptive_protection_plans >= 1);
    assert.ok('runtime_protection_score' in snap);
    assert.ok('recovery_plans' in snap);
  });

  await test('15 — rota /security-adaptive-protection', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(audit.includes('/security-adaptive-protection'));
  });

  await test('16 — SEC-01→10 não importam securityAdaptiveProtection', () => {
    for (const m of ['securityActiveDefense/index.js', 'securitySOC/index.js', 'securityCorrelation/index.js']) {
      const src = fs.readFileSync(path.join(SRC, m), 'utf8');
      assert.ok(!src.includes('securityAdaptiveProtection'), m);
    }
  });

  await test('17 — SEC-11 não importa eventGovernance', () => {
    const idx = fs.readFileSync(path.join(SRC, 'securityAdaptiveProtection/index.js'), 'utf8');
    assert.ok(!idx.includes('eventGovernance'));
  });

  for (const doc of SEC_DOCS) {
    await test(`18 — ${doc}`, () => {
      assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('19 — flags .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_ADAPTIVE_PROTECTION=false'));
    assert.ok(ex.includes('SECURITY_PROTECTION_REQUIRE_APPROVAL'));
  });

  for (const t of REGRESSION_TESTS) {
    await test(`REG — ${t.name}`, () => {
      assert.ok(runRegression(t.file), `${t.name} failed`);
    });
  }

  const criteria = {
    adaptive_protection_available: failed === 0,
    protection_profiles_available: failed === 0,
    anti_scanner_recommendations_available: failed === 0,
    runtime_shield_available: failed === 0,
    approval_engine_available: failed === 0,
    recovery_planner_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    event_governance_preserved: failed === 0,
    baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evidenceDir = path.join(DOCS, 'evidence/sec-11');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'criteria.json'), JSON.stringify({ certification: 'SEC-11', criteria, passed, failed }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
