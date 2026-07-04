'use strict';

/**
 * SEC-13 — Controlled Execution Audit.
 * node backend/src/tests/securityControlledExecution/SEC_13_CONTROLLED_EXECUTION.test.js
 */

process.env.SECURITY_CONTROLLED_EXECUTION = 'true';
process.env.SECURITY_AUTO_EXECUTION_LEVEL = 'LOW';
process.env.SECURITY_MANUAL_APPROVAL_REQUIRED = 'true';
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
  'SEC_13_CONTROLLED_EXECUTION.md',
  'SEC_13_ARCHITECTURE.md',
  'SEC_13_ACTION_REGISTRY.md',
  'SEC_13_OBSERVABILITY.md',
  'SEC_13_ROLLBACK.md',
  'SEC_13_REPORT.md'
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
  { name: 'SEC-12', file: 'tests/securityExecutionValidation/SEC_12_EXECUTION_VALIDATION.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec13() {
  const mods = [
    '../../securityControlledExecution/index.js',
    '../../securityControlledExecution/config/securityControlledExecutionFlags.js',
    '../../securityControlledExecution/engine/controlledExecutionEngine.js',
    '../../securityControlledExecution/runtime/controlledExecutionRuntime.js',
    '../../securityControlledExecution/metrics/controlledExecutionMetrics.js',
    '../../securityControlledExecution/engine/executionJournalService.js',
    '../../securityExecutionValidation/store/executionValidationStore.js',
    '../../securityAdaptiveProtection/store/adaptiveProtectionStore.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const s = require('../../securityControlledExecution');
  s.journal.resetForTests();
  s.metrics.resetForTests();
  s.shutdown?.();
  return s;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-sec13-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    metrics: { requestCount: 3000 }
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
    execSync(`node "${path.join(SRC, rel)}"`, { cwd: ROOT, stdio: 'pipe', timeout: 420000, env: { ...process.env, NODE_ENV: 'test' } });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-13 — CONTROLLED EXECUTION AUDIT\n');

  await test('01 — API exportada', () => {
    const s = freshSec13();
    assert.ok(s.evaluateExecution);
    assert.ok(s.rollbackExecution);
  });

  await test('02 — flags default OFF / LOW only', () => {
    delete process.env.SECURITY_CONTROLLED_EXECUTION;
    delete require.cache[require.resolve('../../securityControlledExecution/config/securityControlledExecutionFlags.js')];
    const f = require('../../securityControlledExecution/config/securityControlledExecutionFlags');
    assert.strictEqual(f.isSecurityControlledExecutionEnabled(), false);
    assert.strictEqual(f.autoExecutionLevel(), 'LOW');
    process.env.SECURITY_CONTROLLED_EXECUTION = 'true';
  });

  await test('03 — action registry AUTO vs MANUAL', () => {
    const r = require('../../securityControlledExecution/registry/actionExecutorRegistry');
    assert.ok(r.isAutoExecutable('generate_snapshot'));
    assert.ok(r.isManualOnly('nginx_hardened_profile'));
    assert.ok(r.isManualOnly('lockdown'));
    assert.ok(r.getAutoExecutableActions().length >= 7);
  });

  await test('04 — safe execution sem nginx/pm2', () => {
    const src = fs.readFileSync(path.join(SRC, 'securityControlledExecution/engine/safeExecutionService.js'), 'utf8');
    assert.ok(!src.includes('execSync'));
    assert.ok(!src.includes('nginx'));
    assert.ok(!src.includes('pm2'));
  });

  await test('05 — MANUAL_ONLY bloqueado', () => {
    const ap = require('../../securityControlledExecution/engine/approvalEnforcementService');
    const r = ap.validateExecutionEligibility('rate_limit_profile', { sec11: {}, sec12: {} });
    assert.strictEqual(r.eligible, false);
    assert.strictEqual(r.blocked, true);
  });

  await test('06 — AUTO executable', () => {
    seedIncidents();
    const se = require('../../securityControlledExecution/engine/safeExecutionService');
    const result = se.executeAction('generate_snapshot', {});
    assert.strictEqual(result.ok, true);
    assert.ok(result.executionId);
  });

  await test('07 — rollback executor', () => {
    const rb = require('../../securityControlledExecution/engine/rollbackExecutionService');
    const result = rb.executeRollback({
      executionId: 'exec-test',
      rollback: { action: 'restore_log_level', previous: 'info' }
    });
    assert.strictEqual(result.ok, true);
  });

  await test('08 — execution journal', () => {
    const j = require('../../securityControlledExecution/engine/executionJournalService');
    j.resetForTests();
    j.append({ type: 'TEST', actionId: 'generate_snapshot' });
    assert.ok(j.getHistory(1).length >= 1);
  });

  await test('09 — dashboard controlled_execution_v1', () => {
    seedIncidents();
    const s = freshSec13();
    const dash = s.buildDashboard({ force: true });
    assert.ok(dash);
    assert.strictEqual(dash.schema_version, 'controlled_execution_v1');
    assert.ok(Array.isArray(dash.executedActions));
    assert.ok(Array.isArray(dash.blockedActions));
  });

  await test('10 — consome SEC-11 e SEC-12', () => {
    seedIncidents();
    const s = freshSec13();
    const dash = s.buildDashboard({ force: true });
    assert.ok(dash.sec11_snapshot || dash.sec12_snapshot);
  });

  await test('11 — métricas', () => {
    seedIncidents();
    const s = freshSec13();
    s.buildDashboard({ force: true });
    const snap = s.metrics.getSnapshot();
    assert.ok('controlled_executions' in snap);
    assert.ok('execution_safety_score' in snap);
  });

  await test('12 — rota audit', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-controlled-execution'));
  });

  await test('13 — SEC-01→12 não importam sec13', () => {
    assert.ok(!fs.readFileSync(path.join(SRC, 'securityExecutionValidation/index.js'), 'utf8').includes('securityControlledExecution'));
  });

  for (const doc of DOCS_LIST) {
    await test(`14 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('15 — .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_CONTROLLED_EXECUTION=false'));
    assert.ok(ex.includes('SECURITY_AUTO_EXECUTION_LEVEL'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t.file), t.name));
  }

  const criteria = {
    controlled_execution_available: failed === 0,
    safe_execution_available: failed === 0,
    rollback_execution_available: failed === 0,
    approval_enforcement_available: failed === 0,
    execution_journal_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    event_governance_preserved: failed === 0,
    baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-13');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, 'criteria.json'), JSON.stringify({ certification: 'SEC-13', criteria, passed, failed }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
