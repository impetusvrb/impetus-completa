'use strict';

/**
 * SEC-13A — Operational Promotion & Validation Audit.
 * node backend/src/tests/securityPromotionOperational/SEC_13A_OPERATIONAL_PROMOTION.test.js
 */

process.env.SECURITY_OPERATIONAL_PROMOTION = 'true';
process.env.SECURITY_PROMOTION_MODE = 'controlled';
process.env.SECURITY_PROMOTION_VALIDATE = 'true';
process.env.SECURITY_CONTROLLED_EXECUTION = 'true';
process.env.SECURITY_EXECUTION_VALIDATION = 'true';
process.env.SECURITY_DRY_RUN_ONLY = 'true';
process.env.SECURITY_ADAPTIVE_PROTECTION = 'true';
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

const DOCS_LIST = [
  'SEC_13A_OPERATIONAL_PROMOTION.md',
  'SEC_13A_RUNTIME.md',
  'SEC_13A_OBSERVABILITY.md',
  'SEC_13A_ROLLBACK.md',
  'SEC_13A_REPORT.md'
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
  { name: 'SEC-13', file: 'tests/securityControlledExecution/SEC_13_CONTROLLED_EXECUTION.test.js' }
];

let passed = 0;
let failed = 0;

function fresh13A() {
  const mods = [
    '../../securityPromotionOperational/index.js',
    '../../securityPromotionOperational/config/securityOperationalPromotionFlags.js',
    '../../securityPromotionOperational/engine/promotionOperationalDashboard.js',
    '../../securityPromotionOperational/store/operationalPromotionStore.js',
    '../../securityPromotionOperational/metrics/securityOperationalMonitor.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const s = require('../../securityPromotionOperational');
  s.store.resetForTests();
  s.metrics.resetForTests();
  s.shutdown?.();
  return s;
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
    execSync(`node "${path.join(SRC, rel)}"`, { cwd: ROOT, stdio: 'pipe', timeout: 480000, env: { ...process.env, NODE_ENV: 'test' } });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-13A — OPERATIONAL PROMOTION & VALIDATION\n');

  await test('01 — API exportada', () => {
    const s = fresh13A();
    assert.ok(s.buildDashboard);
    assert.ok(s.getAuditPayload);
  });

  await test('02 — flags default OFF', () => {
    delete process.env.SECURITY_OPERATIONAL_PROMOTION;
    delete require.cache[require.resolve('../../securityPromotionOperational/config/securityOperationalPromotionFlags.js')];
    const f = require('../../securityPromotionOperational/config/securityOperationalPromotionFlags');
    assert.strictEqual(f.isSecurityOperationalPromotionEnabled(), false);
    process.env.SECURITY_OPERATIONAL_PROMOTION = 'true';
  });

  await test('03 — sequência SEC-01→13', () => {
    const seq = require('../../securityPromotionOperational/config/operationalPromotionSequence');
    const phases = seq.OPERATIONAL_SEQUENCE.map((s) => s.phase);
    assert.deepStrictEqual(phases, [
      'SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05', 'SEC-06', 'SEC-07',
      'SEC-10', 'SEC-11', 'SEC-12', 'SEC-13'
    ]);
  });

  await test('04 — estados OFF READY ONLINE', () => {
    const rt = require('../../securityPromotionOperational/engine/securityPromotionRuntime');
    const states = rt.buildModuleStates();
    const valid = ['OFF', 'READY', 'ONLINE', 'MONITORING', 'DEGRADED', 'ROLLBACK', 'FAILED'];
    assert.ok(states.every((s) => valid.includes(s.state)));
  });

  await test('05 — violação sequência strict', () => {
    process.env.SECURITY_OBSERVATORY = 'false';
    process.env.SECURITY_CORRELATION_ENGINE = 'true';
    delete require.cache[require.resolve('../../securityPromotionOperational/engine/securityPromotionRuntime.js')];
    const rt = require('../../securityPromotionOperational/engine/securityPromotionRuntime');
    const runtime = rt.evaluatePromotionRuntime();
    assert.ok(runtime.sequenceViolations.length > 0);
    delete process.env.SECURITY_CORRELATION_ENGINE;
  });

  await test('06 — operational validation', () => {
    const ov = require('../../securityPromotionOperational/engine/operationalValidationEngine');
    const states = require('../../securityPromotionOperational/engine/securityPromotionRuntime').buildModuleStates();
    const v = ov.validateOperational(states);
    assert.ok(v.runtime.memory.heapUsedMb >= 0);
    assert.ok(v.rollbackTest.simulated);
    assert.strictEqual(v.rollbackTest.executed, false);
  });

  await test('07 — report antes/durante/depois', () => {
    const rep = require('../../securityPromotionOperational/engine/operationalValidationReport');
    const r = rep.buildPromotionReport({
      moduleStates: [],
      validation: { overallPass: true, runtime: { memory: { heapUsedMb: 100 } } },
      promotionRuntime: { sequenceValid: true, nextPromotionStep: null, sequenceViolations: [] }
    });
    assert.ok(r.antes && r.durante && r.depois);
  });

  await test('08 — dashboard', () => {
    const s = fresh13A();
    const dash = s.buildDashboard({ force: true });
    assert.ok(dash);
    assert.strictEqual(dash.schema_version, 'operational_promotion_dashboard_v1');
    assert.strictEqual(dash.auto_activation, false);
    assert.ok(dash.modules.length === 11);
  });

  await test('09 — métricas monitor', () => {
    const s = fresh13A();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    assert.ok('operational_score' in snap);
    assert.ok('security_modules_online' in snap);
  });

  await test('10 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-operational-promotion'));
  });

  await test('11 — SEC-01→13 não importam sec13a', () => {
    assert.ok(!fs.readFileSync(path.join(SRC, 'securityControlledExecution/index.js'), 'utf8').includes('securityPromotionOperational'));
  });

  await test('12 — sem auto activação', () => {
    const dash = require('../../securityPromotionOperational/engine/promotionOperationalDashboard.js');
    const src = fs.readFileSync(path.join(SRC, 'securityPromotionOperational/engine/promotionOperationalDashboard.js'), 'utf8');
    assert.ok(!src.includes('execSync'));
    assert.ok(!src.includes('writeFileSync'));
  });

  for (const doc of DOCS_LIST) {
    await test(`13 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('14 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_OPERATIONAL_PROMOTION=false'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t.file), t.name));
  }

  const criteria = {
    operational_promotion_available: failed === 0,
    promotion_sequence_available: failed === 0,
    runtime_validation_available: failed === 0,
    rollback_available: failed === 0,
    monitoring_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-13a');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, 'criteria.json'), JSON.stringify({ certification: 'SEC-13A', criteria, passed, failed }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
