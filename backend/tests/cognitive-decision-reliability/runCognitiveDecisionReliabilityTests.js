'use strict';

/**
 * npm run test:cognitive-decision-reliability
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
    if (d) console.log('       ', JSON.stringify(d).slice(0, 300));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseR() {
  delete process.env.IMPETUS_DECISION_RELIABILITY;
  delete process.env.IMPETUS_OPERATIONAL_TRUST_ENGINE;
  delete process.env.IMPETUS_RECOMMENDATION_QUALITY_ANALYSIS;
  delete process.env.IMPETUS_DECISION_STABILITY_ENGINE;
  delete process.env.IMPETUS_HUMAN_OVERSIGHT_RELIABILITY;
  process.env.IMPETUS_DECISION_RELIABILITY_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/decisionReliability/config/phaseRFeatureFlags')];
  loadFresh('../../src/decisionReliability/reliabilityTelemetry').resetReliabilityTelemetry();
  loadFresh('../../src/decisionReliability/recommendationConsistencyValidator').clearRecommendationHistory();
}

function testRecommendationQuality() {
  console.log('\n=== Recommendation quality ===');
  resetPhaseR();
  const ana = loadFresh('../../src/decisionReliability/recommendationQualityAnalyzer');
  const r = ana.analyzeRecommendationQuality(
    { text: 'Recomendo priorizar a verificação do KPI de qualidade na linha 2 antes da reunião operacional de amanhã.' },
    { functional_axis: 'quality', canonical_axis: 'quality' }
  );
  assert(r.recommendation_quality > 0.7, 'quality score');
  assert(r.operational_usefulness > 0.6, 'usefulness');
}

function testOperationalTrust() {
  console.log('\n=== Operational trust ===');
  const trust = loadFresh('../../src/decisionReliability/operationalTrustEngine');
  const r = trust.computeOperationalTrust({ cognitive_consistency_score: 0.9, functional_axis: 'safety' }, { text: 'x'.repeat(100) });
  assert(r.operational_trust_score > 0.7, 'trust high');
  const low = trust.computeOperationalTrust({ ambiguous: true, weak_guidance: true }, { text: 'talvez', degraded: true });
  assert(low.low_trust === true, 'low trust detected');
}

function testAmbiguityDetection() {
  console.log('\n=== Ambiguity detection ===');
  const det = loadFresh('../../src/decisionReliability/cognitiveAmbiguityDetector');
  const r = det.detectCognitiveAmbiguity({ canonical_axis: 'general', ambiguous_targeting: true }, { text: 'Talvez seja A ou B?' });
  assert(r.cognitive_ambiguity_score > 0.4, 'ambiguity score');
}

function testRuntimeStability() {
  console.log('\n=== Runtime stability ===');
  const eng = loadFresh('../../src/decisionReliability/decisionStabilityEngine');
  const u = { id: 1 };
  const rec = { text: 'stable operational guidance for quality KPI' };
  const a = eng.assessDecisionStability(u, rec, { channel: 'test' });
  const b = eng.assessDecisionStability(u, rec, { channel: 'test' });
  assert(a.consistent === true && b.consistent === true, 'stable recommendations');
}

function testSupervisionRecommendation() {
  console.log('\n=== Supervision recommendation ===');
  const ho = loadFresh('../../src/decisionReliability/humanOversightReliability');
  const r = ho.assessHumanOversight({ low_trust: true, high_ambiguity: true, weak_guidance: true, escalate_recommended: true });
  assert(r.recommend_human_oversight === true, 'oversight recommended');
  assert(r.auto_escalate === false, 'no auto escalate');
}

function testWeakGuidance() {
  console.log('\n=== Weak guidance ===');
  const rec = loadFresh('../../src/decisionReliability/recommendationTrustEvaluator');
  const r = rec.evaluateRecommendationTrust({ text: 'ok' });
  assert(r.weak_guidance === true, 'short weak guidance');
}

function testRuntimeDecisionConfidence() {
  console.log('\n=== Runtime decision confidence ===');
  const eng = loadFresh('../../src/decisionReliability/cognitiveDecisionReliabilityEngine');
  const r = eng.assessDecisionReliability({ cognitive_consistency_score: 0.92, has_provenance: true });
  assert(r.runtime_decision_confidence > 0.8, 'confidence');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseR();
  const facade = loadFresh('../../src/decisionReliability/decisionReliabilityFacade');
  const { decision_reliability } = facade.enrichWithDecisionReliability(
    { id: 1, functional_axis: 'quality' },
    {},
    {
      force: true,
      runtime_consistency: { cognitive_consistency_score: 0.9, synchronization: { canonical_axis: 'quality' } },
      contextual_delivery: { contextual_delivery_confidence: 0.88 }
    }
  );
  assert(decision_reliability?.phase === 'R', 'phase R');
  assert(decision_reliability?.auto_enforce === false, 'no enforce');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseR();
  const facade = loadFresh('../../src/decisionReliability/decisionReliabilityFacade');
  const scenarios = [
    ['executive', 'executive', 0.92],
    ['coordinator', 'safety', 0.88],
    ['operator', 'operations', 0.85],
    ['quality', 'quality', 0.9],
    ['environmental', 'environmental', 0.87],
    ['safety', 'safety', 0.89],
    ['financial', 'financial', 0.86],
    ['ambiguous-runtime', 'general', 0.55, true],
    ['weak-guidance-runtime', 'quality', 0.7, false, true],
    ['low-confidence-runtime', 'quality', 0.45]
  ];
  for (const row of scenarios) {
    const [file, axis, consistency, ambiguous, weak] = row;
    const { decision_reliability } = facade.enrichWithDecisionReliability(
      { id: 1, functional_axis: axis },
      {},
      {
        force: true,
        runtime_consistency: {
          cognitive_consistency_score: consistency,
          synchronization: { canonical_axis: axis },
          interchannel: { divergence_detected: ambiguous }
        },
        contextual_delivery: { contextual_delivery_confidence: consistency, ambiguous_targeting: ambiguous }
      }
    );
    if (weak) {
      facade.enrichChatDecisionReliability(
        { id: 1 },
        { reply: 'talvez', degraded: true },
        { functional_axis: axis, force: true }
      );
    }
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(decision_reliability, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Cognitive Decision Reliability — Phase R');
  testRecommendationQuality();
  testOperationalTrust();
  testAmbiguityDetection();
  testRuntimeStability();
  testSupervisionRecommendation();
  testWeakGuidance();
  testRuntimeDecisionConfidence();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
