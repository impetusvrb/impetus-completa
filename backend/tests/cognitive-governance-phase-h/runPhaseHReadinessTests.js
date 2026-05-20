'use strict';

/**
 * Fase H — Governance Readiness
 * npm run test:cognitive-governance-phase-h
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
    if (d) console.log('       ', JSON.stringify(d).slice(0, 350));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function enablePhaseH() {
  process.env.IMPETUS_GOVERNANCE_READINESS = 'on';
  process.env.IMPETUS_GOVERNANCE_QUALITY_GATES = 'on';
  process.env.IMPETUS_GOVERNANCE_ACTIVATION_PLANNER = 'on';
  process.env.IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER = 'on';
}

function testReadinessScoring() {
  console.log('\n=== Readiness scoring ===');
  enablePhaseH();
  const engine = loadFresh('../../src/governanceReadiness/governanceReadinessEngine');
  const r = engine.assessReadiness({
    force: true,
    metrics: {
      shadow_alignment_rate: 0.96,
      governance_confidence_score: 0.88,
      governance_false_positive_rate: 0.03,
      governance_overblocking_rate: 0.05,
      governance_context_preservation_rate: 0.92,
      drift_stability: 'stable'
    }
  });
  assert(r.readiness_score >= 80, 'score >= 80', r);
  assert(r.activation_recommendation, 'has recommendation');
  assert(r.auto_activation === false, 'no auto activation');
}

function testFalsePositive() {
  console.log('\n=== False positive ===');
  enablePhaseH();
  const fp = loadFresh('../../src/governanceReadiness/governanceFalsePositiveAnalyzer');
  const r = fp.analyzeFalsePositives({
    force: true,
    denied_count: 5,
    total_evaluations: 10,
    shadow_diverged: false,
    denial_reason: 'domain_not_authorized',
    channel: 'chat'
  });
  assert(r.incidents.length > 0, 'incidents detected');
}

function testOverblocking() {
  console.log('\n=== Overblocking ===');
  const ob = loadFresh('../../src/governanceReadiness/governanceOverblockingDetector');
  const r = ob.detectOverblocking({
    force: true,
    denied_count: 50,
    total_evaluations: 100,
    sanitizer_aggressiveness: 0.7
  });
  assert(r.overblocking_rate > 0.2, 'high overblocking rate', r);
}

function testQualityGate() {
  console.log('\n=== Quality gate ===');
  enablePhaseH();
  const gate = loadFresh('../../src/governanceQuality/governanceQualityGate');
  const fail = gate.evaluateQualityGate(
    {
      shadow_alignment_rate: 0.8,
      governance_confidence_score: 0.7,
      governance_false_positive_rate: 0.2,
      leakage_risk: 'high',
      drift_stability: 'unstable'
    },
    { force: true }
  );
  assert(fail.passed === false, 'gate blocks bad readiness');
  const pass = gate.evaluateQualityGate(
    {
      shadow_alignment_rate: 0.96,
      governance_confidence_score: 0.9,
      governance_false_positive_rate: 0.02,
      governance_overblocking_rate: 0.04,
      leakage_risk: 'low',
      drift_stability: 'stable'
    },
    { force: true }
  );
  assert(pass.passed === true, 'gate passes good readiness');
}

function testActivationPlan() {
  console.log('\n=== Activation plan ===');
  enablePhaseH();
  const planner = loadFresh('../../src/governanceReadiness/governanceActivationPlanner');
  const plan = planner.buildActivationPlan({ readiness_score: 88, shadow_alignment_rate: 0.95, force: true });
  assert(plan.auto_execute === false, 'no auto execute');
  assert(plan.channel_steps.length >= 7, '7 steps');
  assert(plan.max_recommended_step >= 2, 'partial steps recommended');
}

function testRollback() {
  console.log('\n=== Rollback coordination ===');
  const rb = loadFresh('../../src/governanceReadiness/governanceRollbackCoordinator');
  const r = rb.coordinateRollback({ scope: 'phase_f_only' });
  assert(r.auto_applied === false, 'no auto rollback');
  assert(r.flags_to_disable.length > 0, 'flags listed');
  assert(r.rebuild_required === false, 'no rebuild');
}

function testTenantReadiness() {
  console.log('\n=== Tenant readiness ===');
  enablePhaseH();
  const tenant = loadFresh('../../src/governanceReadiness/tenantGovernanceReadiness');
  const r = tenant.evaluateTenantReadiness({
    id: 'tenant-1',
    industry: 'chemical',
    critical_infrastructure: true,
    user_count: 1000
  });
  assert(r.tenant_readiness_score <= 75, 'critical tenant capped');
  assert(r.auto_activation === false, 'no tenant auto activation');
}

function testPromotionSafety() {
  console.log('\n=== Promotion safety ===');
  enablePhaseH();
  const promo = loadFresh('../../src/governanceReadiness/governancePromotionService');
  const r = promo.evaluatePromotion({ force: true });
  assert(r.auto_promotion === false, 'no auto promotion');
  assert(typeof r.promotion_allowed === 'boolean', 'promotion decision');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enablePhaseH();
  const engine = loadFresh('../../src/governanceReadiness/governanceReadinessEngine');
  const personas = [
    ['readiness_quality', { functional_area: 'quality' }],
    ['readiness_environmental', { functional_area: 'environmental', industry: 'chemical' }],
    ['readiness_safety', { functional_area: 'safety', department: 'SST' }],
    ['readiness_hr', { functional_area: 'hr' }],
    ['readiness_executive', { role: 'diretor', hierarchy_level: 1 }]
  ];
  for (const [name, ctx] of personas) {
    const r = engine.assessReadiness({
      force: true,
      metrics: {
        shadow_alignment_rate: name.includes('safety') ? 0.94 : 0.97,
        governance_confidence_score: 0.86,
        governance_false_positive_rate: name.includes('environmental') ? 0.06 : 0.02,
        governance_overblocking_rate: name.includes('hr') ? 0.1 : 0.04
      }
    });
    fs.writeFileSync(
      path.join(SNAPSHOT_DIR, `${name}.json`),
      JSON.stringify(
        {
          readiness_score: r.readiness_score,
          activation_recommendation: r.activation_recommendation,
          leakage_risk: r.leakage_risk,
          overblocking_risk: r.overblocking_risk,
          context: ctx
        },
        null,
        2
      )
    );
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Cognitive Governance Phase H');
  testReadinessScoring();
  testFalsePositive();
  testOverblocking();
  testQualityGate();
  testActivationPlan();
  testRollback();
  testTenantReadiness();
  testPromotionSafety();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
