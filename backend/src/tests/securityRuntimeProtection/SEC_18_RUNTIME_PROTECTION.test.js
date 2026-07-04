'use strict';

/**
 * SEC-18 — Enterprise Adaptive Runtime Protection Audit.
 * node backend/src/tests/securityRuntimeProtection/SEC_18_RUNTIME_PROTECTION.test.js
 */

process.env.SECURITY_RUNTIME_PROTECTION = 'true';
process.env.SECURITY_RUNTIME_PROTECTION_MODE = 'observe';
process.env.SECURITY_RUNTIME_REQUIRE_APPROVAL = 'true';
process.env.SECURITY_EXFILTRATION_DETECTION = 'true';
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
  'SEC_18_RUNTIME_PROTECTION.md',
  'SEC_18_ARCHITECTURE.md',
  'SEC_18_PROTECTION_PROFILES.md',
  'SEC_18_RUNTIME_RISK.md',
  'SEC_18_OBSERVABILITY.md',
  'SEC_18_ROLLBACK.md',
  'SEC_18_REPORT.md'
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
  { name: 'SEC-16', file: 'tests/securityThreatDeception/SEC_16_THREAT_DECEPTION.test.js', timeoutMs: 1200000 },
  { name: 'SEC-17', file: 'tests/securityExfiltrationDetection/SEC_17_EXFILTRATION_DETECTION.test.js', timeoutMs: 1500000 }
];

let passed = 0;
let failed = 0;

function freshSec18() {
  const mods = [
    '../../securityRuntimeProtection/index.js',
    '../../securityRuntimeProtection/config/securityRuntimeProtectionFlags.js',
    '../../securityRuntimeProtection/engine/runtimeProtectionEngine.js',
    '../../securityRuntimeProtection/runtime/runtimeProtectionRuntime.js',
    '../../securityRuntimeProtection/metrics/runtimeProtectionMetrics.js',
    '../../securityRuntimeProtection/store/runtimeProtectionStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec18 = require('../../securityRuntimeProtection');
  sec18.store.resetForTests();
  sec18.metrics.resetForTests();
  sec18.shutdown?.();
  return sec18;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-rp-1',
    severity: 'CRITICAL',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    confidence: 0.95,
    participants: { ips: ['203.0.113.250'], userAgents: ['mass-scanner/3.0'] },
    affectedComponents: ['/api/admin', '/backend/src/', '/.env'],
    metrics: { requestCount: 30000, uniqueIps: 1 },
    durationMs: 3600000,
    tags: ['recurrence']
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
  console.log('\n  SEC-18 — ENTERPRISE ADAPTIVE RUNTIME PROTECTION\n');

  await test('01 — API exportada', () => {
    const s = freshSec18();
    assert.ok(s.evaluateRuntimeProtection);
    assert.ok(s.profiles);
    assert.ok(s.riskEngine);
    assert.ok(s.planner);
    assert.ok(s.safety);
    assert.ok(s.approval);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_RUNTIME_PROTECTION;
    delete require.cache[require.resolve('../../securityRuntimeProtection/config/securityRuntimeProtectionFlags.js')];
    const f = require('../../securityRuntimeProtection/config/securityRuntimeProtectionFlags');
    assert.strictEqual(f.isSecurityRuntimeProtectionEnabled(), false);
    process.env.SECURITY_RUNTIME_PROTECTION = 'true';
  });

  await test('03 — protection profiles', () => {
    const pm = require('../../securityRuntimeProtection/engine/protectionProfileManager');
    const all = pm.getAllProfiles();
    assert.deepStrictEqual(pm.PROTECTION_PROFILES, [
      'NORMAL', 'OBSERVE', 'ELEVATED', 'PROTECTED', 'HARDENED', 'LOCKDOWN_READY'
    ]);
    assert.ok(all.every((p) => p.lockdownEligible === false || p.id === 'LOCKDOWN_READY'));
  });

  await test('04 — runtime risk assessment', () => {
    seedIncidents();
    const risk = require('../../securityRuntimeProtection/engine/runtimeRiskAssessment');
    const ctx = require('../../securityRuntimeProtection/collectors/secRuntimeProtectionCollector').collectRuntimeProtectionContext();
    const sec02 = require('../../securityCorrelation');
    const incidents = sec02.store.getOpenIncidents();
    const assessment = risk.assessRuntimeRisk(ctx, incidents);
    assert.ok(assessment.runtimeRiskScore >= 0);
    assert.ok(assessment.exposureScore >= 0);
    assert.ok(assessment.protectionUrgency >= 0);
  });

  await test('05 — adaptive planner auto_execute false', () => {
    const pl = require('../../securityRuntimeProtection/engine/adaptiveProtectionPlanner');
    const plan = pl.createProtectionPlan({
      action: 'hide_admin_modules',
      reason: 'test',
      targetProfile: 'PROTECTED'
    });
    assert.strictEqual(plan.auto_execute, false);
    assert.strictEqual(plan.executionEligible, false);
  });

  await test('06 — runtime safety validator', () => {
    const sv = require('../../securityRuntimeProtection/engine/runtimeSafetyValidator');
    const check = sv.validateSafety('PROTECTED', { runtimeRiskScore: 0.6, operationalRisk: 0.2, integrityOk: true }, []);
    assert.strictEqual(check.executionBlocked, true);
    assert.strictEqual(check.rollbackPossible, true);
  });

  await test('07 — approval coordinator', () => {
    const ap = require('../../securityRuntimeProtection/engine/runtimeApprovalCoordinator');
    const req = ap.createApprovalRequest('HARDENED', { protectionUrgency: 0.8 }, []);
    assert.strictEqual(req.type, 'dual');
    assert.strictEqual(req.auto_execute, false);
    const status = ap.resolveApprovalStatus(req);
    assert.strictEqual(status.executionEligible, false);
  });

  await test('08 — dashboard runtime_protection_v1', () => {
    seedIncidents();
    const s = freshSec18();
    const dash = s.buildDashboard({ force: true });
    assert.strictEqual(dash.schema_version, 'runtime_protection_v1');
    assert.strictEqual(dash.executionEligible, false);
    assert.ok(dash.protectionStatus);
    assert.ok(dash.currentProfile);
    assert.ok(dash.recommendedProfile);
    assert.ok('runtimeRiskScore' in dash);
    assert.ok('protectionUrgency' in dash);
    assert.ok(dash.approvalStatus);
    assert.strictEqual(dash.rollbackAvailable, true);
    assert.ok(Array.isArray(dash.recommendedActions));
  });

  await test('09 — métricas observabilidade', () => {
    const s = freshSec18();
    seedIncidents();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'runtime_profiles', 'runtime_risk', 'protection_plans',
      'runtime_approvals', 'runtime_safety_checks', 'recommended_profiles', 'rollback_validation'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('10 — audit payload read-only', () => {
    const s = freshSec18();
    seedIncidents();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-18');
  });

  await test('11 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-runtime-protection'));
  });

  await test('12 — SEC-01→17 não importam sec18', () => {
    const upstream = [
      'securityExfiltrationDetection/index.js',
      'securityThreatDeception/index.js',
      'securityControlledExecution/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityRuntimeProtection'), f);
    }
  });

  await test('13 — sem execução infra/lockdown', () => {
    const dir = path.join(SRC, 'securityRuntimeProtection');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['execSync', 'spawnSync', 'iptables', 'nginx', 'pm2', 'process.exit'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of forbidden) {
        if (word === 'process.exit' && file.includes('test')) continue;
        assert.ok(!content.includes(word), `${file} contém ${word}`);
      }
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`14 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('15 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_RUNTIME_PROTECTION=false'));
    assert.ok(ex.includes('SECURITY_RUNTIME_PROTECTION_MODE=observe'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t), t.name));
  }

  const criteria = {
    runtime_protection_available: failed === 0,
    protection_profiles_available: failed === 0,
    runtime_risk_available: failed === 0,
    approval_coordination_available: failed === 0,
    runtime_safety_validation_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-18');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-18', criteria, passed, failed }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
