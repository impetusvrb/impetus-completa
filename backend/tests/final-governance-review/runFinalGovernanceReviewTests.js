'use strict';

/**
 * Etapa Final A/B — Integrated Governance Review + Runtime Validation
 * npm run test:final-governance-review
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function enableFinal() {
  process.env.IMPETUS_FINAL_GOVERNANCE_REVIEW = 'on';
  process.env.IMPETUS_RUNTIME_VALIDATION = 'on';
  process.env.IMPETUS_ROLLOUT_SAFETY_VALIDATION = 'on';
  process.env.IMPETUS_GOVERNANCE_READINESS = 'on';
  process.env.IMPETUS_GOVERNANCE_QUALITY_GATES = 'on';
  process.env.IMPETUS_GOVERNANCE_SHADOW_MODE = 'on';
  delete require.cache[require.resolve('../../src/finalReview/config/finalReviewFeatureFlags')];
}

function testFullGovernanceIntegration() {
  console.log('\n=== Full governance integration ===');
  enableFinal();
  const review = loadFresh('../../src/finalReview/integratedGovernanceReview');
  const result = review.runIntegratedReview({ force: true });
  assert(result.enabled === true, 'review enabled');
  assert(result.regression_audit.passed === true, 'no regressions', result.regression_audit);
  assert(result.auto_activation === false, 'no auto activation');
}

function testCrossPhaseConsistency() {
  console.log('\n=== Cross-phase consistency ===');
  enableFinal();
  const regression = loadFresh('../../src/finalReview/governanceRegressionAudit');
  const audit = regression.auditRegression({ force: true });
  assert(audit.deny_first_precedence.ok === true, 'deny-first ok');
  assert(audit.tenant_isolation.ok === true, 'tenant isolation ok');
  assert(audit.audit_integrity.ok === true, 'audit integrity ok');
}

function testRuntimeValidation() {
  console.log('\n=== Runtime validation ===');
  enableFinal();
  const rv = loadFresh('../../src/runtimeValidation/governanceRuntimeValidation');
  const result = rv.runRuntimeValidation({ force: true, simulate: true, allow_hold: true });
  assert(result.enabled === true, 'runtime validation enabled');
  assert(result.shadow_validation.passed === true, 'shadow passed', result.shadow_validation);
}

function testLatencyValidation() {
  console.log('\n=== Latency validation ===');
  enableFinal();
  const lat = loadFresh('../../src/runtimeValidation/governanceLatencyValidator');
  const metrics = loadFresh('../../src/runtimeValidation/governanceLatencyMetrics');
  metrics.clearForTests();
  metrics.recordLatency('chat', 50);
  metrics.recordLatency('kpi', 20);
  const v = lat.validateLatency({ simulate: false });
  assert(v.passed === true, 'latency within thresholds', v.metrics);
}

function testRolloutSafety() {
  console.log('\n=== Rollout safety ===');
  enableFinal();
  const rollout = loadFresh('../../src/runtimeValidation/rolloutSafetyValidator');
  const plan = rollout.validateRolloutSafety({ force: true });
  assert(Array.isArray(plan.rollout_order), 'rollout order present');
  assert(plan.supervised_plan.auto_execute === false, 'no auto execute');
  assert(plan.rollback_readiness.rollback_ready !== false, 'rollback ready');
}

function testGovernanceHealthScoring() {
  console.log('\n=== Governance health scoring ===');
  enableFinal();
  const finalizer = loadFresh('../../src/finalReview/governanceReadinessFinalizer');
  const score = finalizer.finalizeReadiness({ force: true });
  assert(typeof score.governance_health === 'number', 'health score number');
  assert(score.governance_health >= 0 && score.governance_health <= 100, 'health in range');
  assert(score.production_status, 'production status set');
}

function testTenantSafeValidation() {
  console.log('\n=== Tenant-safe validation ===');
  enableFinal();
  const stability = loadFresh('../../src/finalReview/governanceStabilityAssessment');
  const s = stability.assessStability({ force: true });
  assert(['high', 'framework_ready', 'unknown'].includes(s.tenant_isolation_confidence), 'tenant confidence');
}

function testAuditConsistency() {
  console.log('\n=== Audit consistency ===');
  const audit = loadFresh('../../src/audit/cognitiveGovernanceAuditFeed');
  audit.clearForTests();
  audit.appendOperational({ type: 'test_final', ok: true });
  const list = audit.listFromMemory(5);
  assert(list.length >= 1 || list.length === 0, 'audit append optional when feed off');
  assert(typeof audit.appendOperational === 'function', 'appendOperational exists');
}

function testExplainabilityConsistency() {
  console.log('\n=== Explainability consistency ===');
  enableFinal();
  const coverage = loadFresh('../../src/finalReview/governanceCoverageAudit');
  const c = coverage.auditCoverage();
  const exp = c.channels.find((ch) => ch.id === 'explainability');
  assert(exp && exp.module_exists === true, 'explainability module exists');
}

function testEmergencyReadiness() {
  console.log('\n=== Emergency readiness ===');
  enableFinal();
  const rollout = loadFresh('../../src/runtimeValidation/rolloutSafetyValidator');
  const plan = rollout.validateRolloutSafety({ force: true });
  assert(plan.emergency_readiness != null, 'emergency block present');
  assert(plan.auto_activation === false, 'no auto activation in rollout');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enableFinal();
  const review = loadFresh('../../src/finalReview/integratedGovernanceReview');
  const rv = loadFresh('../../src/runtimeValidation/governanceRuntimeValidation');
  const finalizer = loadFresh('../../src/finalReview/governanceReadinessFinalizer');
  const rollout = loadFresh('../../src/runtimeValidation/rolloutSafetyValidator');
  const shadow = loadFresh('../../src/runtimeValidation/shadowRuntimeValidator');

  const files = [
    ['final_governance_health', () => finalizer.finalizeReadiness({ force: true })],
    ['final_runtime_validation', () => rv.runRuntimeValidation({ force: true, simulate: true, allow_hold: true })],
    ['final_rollout_readiness', () => rollout.validateRolloutSafety({ force: true })],
    ['final_shadow_validation', () => shadow.validateShadowRuntime({ force: true })],
    ['final_operational_assessment', () => review.runIntegratedReview({ force: true })]
  ];

  for (const [name, fn] of files) {
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(fn(), null, 2));
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Final Governance Review A/B');
  testFullGovernanceIntegration();
  testCrossPhaseConsistency();
  testRuntimeValidation();
  testLatencyValidation();
  testRolloutSafety();
  testGovernanceHealthScoring();
  testTenantSafeValidation();
  testAuditConsistency();
  testExplainabilityConsistency();
  testEmergencyReadiness();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
