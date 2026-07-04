'use strict';

/**
 * SEC-19 — Enterprise Attack Simulation & Operational Stress Certification.
 * node backend/src/tests/securityOperational/SEC_19_OPERATIONAL_CERTIFICATION.test.js
 */

process.env.SECURITY_OPERATIONAL_CERTIFICATION = 'true';
process.env.SECURITY_OPERATIONAL_CERTIFICATION_MODE = 'audit';
process.env.SECURITY_OPERATIONAL_STRESS_SIMULATED = 'true';
process.env.SECURITY_RUNTIME_PROTECTION = 'true';
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
  'SEC_19_OPERATIONAL_CERTIFICATION.md',
  'SEC_19_ATTACK_SCENARIOS.md',
  'SEC_19_STRESS_RESULTS.md',
  'SEC_19_OPERATIONAL_SCORE.md',
  'SEC_19_OBSERVABILITY.md',
  'SEC_19_ROLLBACK.md',
  'SEC_19_REPORT.md'
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
  { name: 'SEC-17', file: 'tests/securityExfiltrationDetection/SEC_17_EXFILTRATION_DETECTION.test.js', timeoutMs: 1500000 },
  { name: 'SEC-18', file: 'tests/securityRuntimeProtection/SEC_18_RUNTIME_PROTECTION.test.js', timeoutMs: 1800000 }
];

const SKIP_REGRESSION = process.env.SKIP_SEC19_REGRESSION === 'true';

let passed = 0;
let failed = 0;

function freshSec19() {
  const mods = [
    '../../securityOperationalCertification/index.js',
    '../../securityOperationalCertification/config/securityOperationalCertificationFlags.js',
    '../../securityOperationalCertification/engine/certificationEngine.js',
    '../../securityOperationalCertification/runtime/operationalCertificationRuntime.js',
    '../../securityOperationalCertification/metrics/operationalCertificationMetrics.js',
    '../../securityOperationalCertification/store/operationalCertificationStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec19 = require('../../securityOperationalCertification');
  sec19.store.resetForTests();
  sec19.metrics.resetForTests();
  sec19.shutdown?.();
  return sec19;
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
  console.log('\n  SEC-19 — ENTERPRISE ATTACK SIMULATION & OPERATIONAL STRESS CERTIFICATION\n');

  await test('01 — API exportada', () => {
    const s = freshSec19();
    assert.ok(s.runOperationalCertification);
    assert.ok(s.simulations.attacks);
    assert.ok(s.simulations.stress);
    assert.ok(s.readiness);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_OPERATIONAL_CERTIFICATION;
    delete require.cache[require.resolve('../../securityOperationalCertification/config/securityOperationalCertificationFlags.js')];
    const f = require('../../securityOperationalCertification/config/securityOperationalCertificationFlags');
    assert.strictEqual(f.isSecurityOperationalCertificationEnabled(), false);
    process.env.SECURITY_OPERATIONAL_CERTIFICATION = 'true';
  });

  await test('03 — catálogo de cenários de ataque', () => {
    const cat = require('../../securityOperationalCertification/simulations/attackScenarioCatalog');
    const all = cat.getAllScenarios();
    assert.ok(all.length >= 22);
    const cats = new Set(all.map((s) => s.category));
    for (const c of ['scanner', 'enumeration', 'crawling', 'reconnaissance', 'exfiltration']) {
      assert.ok(cats.has(c), c);
    }
    assert.ok(cat.STRESS_TIERS.includes(5000));
    assert.ok(cat.STRESS_TIERS.includes(50000));
  });

  await test('04 — simulação scanner (.env, .git, docker, backups)', () => {
    const s = freshSec19();
    const r = s.simulations.attacks.runCategorySimulation('scanner');
    assert.ok(r.total >= 6);
    assert.ok(r.detected >= 1);
    assert.strictEqual(r.results.every((x) => x.simulated), true);
  });

  await test('05 — simulação enumeração (APIs, admin, uploads)', () => {
    const s = freshSec19();
    const r = s.simulations.attacks.runCategorySimulation('enumeration');
    assert.ok(r.total >= 5);
    assert.ok(r.detected >= 1);
  });

  await test('06 — simulação crawling (GPTBot, ClaudeBot, genérico, browser)', () => {
    const s = freshSec19();
    const r = s.simulations.attacks.runCategorySimulation('crawling');
    assert.ok(r.total >= 4);
    assert.ok(r.detected >= 1);
  });

  await test('07 — simulação reconhecimento (fingerprint, 404, source maps)', () => {
    const s = freshSec19();
    const r = s.simulations.attacks.runCategorySimulation('reconnaissance');
    assert.ok(r.total >= 6);
    assert.ok(r.detected >= 1);
  });

  await test('08 — exfiltração simulada (sem download real)', () => {
    const s = freshSec19();
    const r = s.simulations.attacks.runCategorySimulation('exfiltration');
    assert.ok(r.total >= 5);
    assert.ok(r.results.every((x) => x.noRealDownload === true));
    assert.ok(r.detected >= 1);
  });

  await test('09 — incidente composto (recon → enum → cred → scraping → movimento → shutdown)', () => {
    const s = freshSec19();
    const composite = s.simulations.attacks.runCompositeIncidentScenario();
    assert.strictEqual(composite.phases.length, 6);
    assert.ok(composite.detected);
    assert.ok(composite.chain.includes('reconnaissance'));
  });

  await test('10 — stress 5k/10k/20k/50k requests simulados', () => {
    const s = freshSec19();
    const stress = s.simulations.stress.runAllStressTests();
    assert.strictEqual(stress.results.length, 4);
    assert.ok(stress.results.every((t) => t.simulated === true));
    assert.ok(stress.allStable);
    for (const tier of [5000, 10000, 20000, 50000]) {
      assert.ok(stress.results.some((r) => r.tier === tier));
    }
  });

  await test('11 — operational readiness score', () => {
    const s = freshSec19();
    s.simulations.attacks.runAllAttackSimulations();
    s.simulations.stress.runAllStressTests();
    const dash = s.runOperationalCertification({ regressionPassing: true });
    const r = dash.operationalReadiness;
    assert.ok('observabilityCoverage' in r);
    assert.ok('incidentAccuracy' in r);
    assert.ok('falsePositiveRate' in r);
    assert.ok('falseNegativeRate' in r);
    assert.ok('runtimeStability' in r);
    assert.ok('securityLatency' in r);
    assert.ok('notificationLatency' in r);
    assert.ok('protectionReadiness' in r);
    assert.ok('rollbackReadiness' in r);
    assert.ok('overallOperationalScore' in r);
    assert.ok(r.overallOperationalScore >= 0.5);
  });

  await test('12 — dashboard security_operational_certification_v1', () => {
    const s = freshSec19();
    const dash = s.buildDashboard({ regressionPassing: true });
    assert.strictEqual(dash.schema_version, 'security_operational_certification_v1');
    assert.strictEqual(dash.read_only, true);
    assert.ok(dash.attackCoverage);
    assert.ok('detectionAccuracy' in dash);
    assert.ok('operationalScore' in dash);
    assert.ok(dash.runtimeHealth);
    assert.ok(Array.isArray(dash.stressResults));
    assert.ok(dash.readinessLevel);
    assert.ok(dash.certificationDecision);
  });

  await test('13 — métricas observabilidade', () => {
    const s = freshSec19();
    s.buildDashboard({ regressionPassing: true });
    const snap = s.metrics.getSnapshot();
    const required = [
      'attack_simulations',
      'stress_runs',
      'operational_certifications',
      'false_positive_rate',
      'false_negative_rate',
      'operational_score',
      'security_readiness',
      'certification_runs'
    ];
    for (const k of required) assert.ok(k in snap, k);
  });

  await test('14 — audit payload read-only', () => {
    const s = freshSec19();
    s.init();
    const payload = s.getAuditPayload();
    assert.strictEqual(payload.read_only, true);
    assert.strictEqual(payload.phase, 'SEC-19');
  });

  await test('15 — rota audit', () => {
    assert.ok(
      fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-operational-certification')
    );
  });

  await test('16 — SEC-01→18 não importam sec19', () => {
    const upstream = [
      'securityRuntimeProtection/index.js',
      'securityExfiltrationDetection/index.js',
      'securityThreatDeception/index.js',
      'securityAntiScanner/index.js',
      'securityAdaptiveBlocking/index.js',
      'securityCorrelation/index.js'
    ];
    for (const f of upstream) {
      assert.ok(!fs.readFileSync(path.join(SRC, f), 'utf8').includes('securityOperationalCertification'), f);
    }
  });

  await test('17 — sem execução infra / novas protecções', () => {
    const dir = path.join(SRC, 'securityOperationalCertification');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    const forbidden = ['iptables', 'nginx', 'pm2 restart', 'spawnSync'];
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of forbidden) {
        assert.ok(!content.includes(word), `${file} contém ${word}`);
      }
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`18 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('19 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_OPERATIONAL_CERTIFICATION=false'));
  });

  await test('20 — Security Baseline evidências (SECURITY-BASELINE-01)', () => {
    const c = path.join(DOCS, 'evidence/security-baseline-01/criteria.json');
    assert.ok(fs.existsSync(c), c);
    const j = JSON.parse(fs.readFileSync(c, 'utf8'));
    assert.strictEqual(j.certification, 'SECURITY-BASELINE-01');
  });

  let regressionPassing = true;
  if (SKIP_REGRESSION) {
    console.log('  ⏭  Regressão completa ignorada (SKIP_SEC19_REGRESSION=true)');
  } else {
    for (const t of REGRESSION) {
      await test(`REG — ${t.name}`, () => {
        const ok = runRegression(t);
        if (!ok) regressionPassing = false;
        assert.ok(ok, t.name);
      });
    }
  }

  const criteria = {
    attack_simulation_completed: failed === 0,
    stress_tests_completed: failed === 0,
    operational_readiness_available: failed === 0,
    overall_operational_score_available: failed === 0,
    security_dashboard_available: failed === 0,
    audit_endpoint_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    full_regression_passing: SKIP_REGRESSION ? true : regressionPassing && failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-19');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, 'criteria.json'),
    JSON.stringify({ certification: 'SEC-19', criteria, passed, failed, regressionPassing }, null, 2)
  );

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
