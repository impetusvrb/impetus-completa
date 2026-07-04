'use strict';

/**
 * SEC-12 — Execution Validation Audit.
 * node backend/src/tests/securityExecutionValidation/SEC_12_EXECUTION_VALIDATION.test.js
 */

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

const SEC_DOCS = [
  'SEC_12_EXECUTION_VALIDATION.md',
  'SEC_12_ARCHITECTURE.md',
  'SEC_12_DRY_RUN.md',
  'SEC_12_ROLLBACK_VALIDATION.md',
  'SEC_12_OBSERVABILITY.md',
  'SEC_12_REPORT.md'
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
  { name: 'SEC-11', file: 'tests/securityAdaptiveProtection/SEC_11_ADAPTIVE_PROTECTION.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec12() {
  const mods = [
    '../../securityExecutionValidation/index.js',
    '../../securityExecutionValidation/config/securityExecutionValidationFlags.js',
    '../../securityExecutionValidation/engine/executionValidationEngine.js',
    '../../securityExecutionValidation/runtime/executionValidationRuntime.js',
    '../../securityExecutionValidation/metrics/executionValidationMetrics.js',
    '../../securityExecutionValidation/store/executionValidationStore.js',
    '../../securityAdaptiveProtection/store/adaptiveProtectionStore.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const s = require('../../securityExecutionValidation');
  s.store.resetForTests();
  s.metrics.resetForTests();
  s.shutdown?.();
  return s;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-sec12-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    participants: { ips: ['203.0.113.20'], userAgents: ['scan'] },
    metrics: { requestCount: 6000, uniqueIps: 1 }
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
    execSync(`node "${path.join(SRC, rel)}"`, { cwd: ROOT, stdio: 'pipe', timeout: 360000, env: { ...process.env, NODE_ENV: 'test' } });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-12 — EXECUTION VALIDATION AUDIT\n');

  await test('01 — módulo exporta API', () => {
    const s = freshSec12();
    assert.ok(s.evaluateValidation);
    assert.ok(s.getAuditPayload);
    assert.ok(s.registry);
  });

  await test('02 — flags default OFF / DRY_RUN true', () => {
    delete process.env.SECURITY_EXECUTION_VALIDATION;
    delete process.env.SECURITY_DRY_RUN_ONLY;
    delete require.cache[require.resolve('../../securityExecutionValidation/config/securityExecutionValidationFlags.js')];
    const f = require('../../securityExecutionValidation/config/securityExecutionValidationFlags');
    assert.strictEqual(f.isSecurityExecutionValidationEnabled(), false);
    assert.strictEqual(f.dryRunOnly(), true);
    process.env.SECURITY_EXECUTION_VALIDATION = 'true';
    process.env.SECURITY_DRY_RUN_ONLY = 'true';
  });

  await test('03 — action registry catalog', () => {
    const r = require('../../securityExecutionValidation/registry/protectionActionRegistry');
    const all = r.getAllActions();
    assert.ok(all.length >= 8);
    assert.ok(r.getActionById('restrict_admin'));
    assert.ok(r.getActionById('rate_limit_profile'));
  });

  await test('04 — execution validator verdicts', () => {
    const ev = require('../../securityExecutionValidation/engine/executionValidator');
    const reg = require('../../securityExecutionValidation/registry/protectionActionRegistry');
    const blocked = ev.validateAction(
      { registryAction: reg.getActionById('nginx_hardened_profile') },
      { approvalStatus: {}, sec11Dashboard: {} }
    );
    assert.strictEqual(blocked.verdict, 'BLOCKED');
  });

  await test('05 — rollback validator', () => {
    const rv = require('../../securityExecutionValidation/engine/rollbackValidator');
    const reg = require('../../securityExecutionValidation/registry/protectionActionRegistry');
    const result = rv.validateRollback(reg.getActionById('limit_uploads'));
    assert.ok(result.rollbackDocumented);
  });

  await test('06 — dry run never executes', () => {
    const dr = require('../../securityExecutionValidation/engine/dryRunEngine');
    const result = dr.simulateAction({ actionId: 'limit_uploads', verdict: 'VALID', impact: { impacts: { backend: 'MEDIUM' } }, estimatedDurationMinutes: 3, rollback: { estimatedRollbackMinutes: 3 } });
    assert.strictEqual(result.executed, false);
    assert.strictEqual(result.dryRun, true);
  });

  await test('07 — change impact analyzer protected systems', () => {
    const ia = require('../../securityExecutionValidation/engine/changeImpactAnalyzer');
    const reg = require('../../securityExecutionValidation/registry/protectionActionRegistry');
    const impact = ia.analyzeImpact({}, reg.getActionById('rate_limit_profile'));
    assert.strictEqual(impact.protectedSystemsIntact.event_governance, true);
    assert.strictEqual(impact.protectedSystemsIntact.eco, true);
  });

  await test('08 — approval workflow validator', () => {
    const av = require('../../securityExecutionValidation/engine/approvalWorkflowValidator');
    const pending = av.validateApproval({ status: 'PENDING', approvalType: 'single', currentApprovals: 0, requestedAt: new Date().toISOString() }, 'DEFENSE');
    assert.strictEqual(pending.valid, false);
    const dual = av.validateApproval({ status: 'APPROVED', approvalType: 'dual', currentApprovals: 2, requiredApprovals: 2, requestedAt: new Date().toISOString(), approvedBy: [{ approver: 'A' }, { approver: 'B' }] }, 'LOCKDOWN');
    assert.strictEqual(dual.valid, true);
  });

  await test('09 — execution_readiness_score', () => {
    const rs = require('../../securityExecutionValidation/engine/executionReadinessScore');
    const score = rs.computeExecutionReadinessScore({
      validations: [{ verdict: 'VALID', rollback: { valid: true } }],
      dryRuns: [{ availability_impact: 'MINIMAL' }],
      approvalValidation: { valid: true }
    });
    assert.ok(score.execution_readiness_score >= 0 && score.execution_readiness_score <= 1);
  });

  await test('10 — dashboard execution_validation_v1', () => {
    seedIncidents();
    const sec12 = freshSec12();
    const dash = sec12.buildDashboard({ force: true });
    assert.ok(dash);
    assert.strictEqual(dash.schema_version, 'execution_validation_v1');
    assert.strictEqual(dash.dry_run_only, true);
    assert.ok(Array.isArray(dash.actionRegistry));
  });

  await test('11 — SEC-11 nunca executa directamente (layer)', () => {
    const eng = fs.readFileSync(path.join(SRC, 'securityAdaptiveProtection/engine/adaptiveProtectionEngine.js'), 'utf8');
    assert.ok(!eng.includes('execSync'));
    assert.ok(!eng.includes('nginx'));
    const dto = require('../../securityAdaptiveProtection/dto/adaptiveProtectionDto');
    const plan = dto.createProtectionPlanDto({});
    assert.strictEqual(plan.auto_execute, false);
  });

  await test('12 — métricas', () => {
    seedIncidents();
    const sec12 = freshSec12();
    sec12.buildDashboard({ force: true });
    const snap = sec12.metrics.getSnapshot();
    assert.ok('dry_runs' in snap);
    assert.ok('validated_actions' in snap);
  });

  await test('13 — rota audit', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(audit.includes('/security-execution-validation'));
  });

  await test('14 — SEC-01→11 não importam sec12', () => {
    for (const m of ['securityAdaptiveProtection/index.js', 'securityActiveDefense/index.js']) {
      assert.ok(!fs.readFileSync(path.join(SRC, m), 'utf8').includes('securityExecutionValidation'));
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`15 — ${doc}`, () => assert.ok(fs.existsSync(path.join(DOCS, doc)), doc));
  }

  await test('16 — .env.example flags', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_EXECUTION_VALIDATION=false'));
    assert.ok(ex.includes('SECURITY_DRY_RUN_ONLY'));
  });

  for (const t of REGRESSION) {
    await test(`REG — ${t.name}`, () => assert.ok(runRegression(t.file), t.name));
  }

  const criteria = {
    execution_validation_available: failed === 0,
    action_registry_available: failed === 0,
    dry_run_available: failed === 0,
    rollback_validation_available: failed === 0,
    impact_analysis_available: failed === 0,
    approval_validation_available: failed === 0,
    execution_readiness_score_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flags_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evDir = path.join(DOCS, 'evidence/sec-12');
  if (!fs.existsSync(evDir)) fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, 'criteria.json'), JSON.stringify({ certification: 'SEC-12', criteria, passed, failed }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));
  if (failed > 0) process.exit(1);
})();
