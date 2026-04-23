'use strict';

/**
 * AI Learning Feedback Engine — testes offline.
 * Executar: node src/tests/aiLearningFeedbackScenarios.js
 */

const assert = require('assert');
const aiLearningFeedbackService = require('../services/aiLearningFeedbackService');

const uid = '00000000-0000-0000-0000-0000000000aa';
const cid = '00000000-0000-0000-0000-0000000000bb';

function seedRejects(n) {
  for (let i = 0; i < n; i += 1) {
    aiLearningFeedbackService.captureFeedback(`aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, '0')}`, 'REJECTED', {
      user_id: uid,
      company_id: cid,
      module_name: 'cognitive_council',
      operation_type: 'read_insight'
    });
  }
}

function testDefaultConfidenceWithoutHistory() {
  aiLearningFeedbackService.resetForTests();
  const c = aiLearningFeedbackService.getAiConfidenceScore({ companyId: cid, userId: uid });
  assert.strictEqual(c, 80);
  const g = aiLearningFeedbackService.getLearningGovernanceSignals({
    companyId: cid,
    userId: uid,
    module: 'cognitive_council',
    operation_type: 'read_insight'
  });
  assert.strictEqual(g.adjustment_applied, null);
}

function testRejectsLowerConfidence() {
  aiLearningFeedbackService.resetForTests();
  seedRejects(10);
  const c = aiLearningFeedbackService.getAiConfidenceScore({ companyId: cid, userId: uid });
  assert.ok(c < 55, `expected low confidence, got ${c}`);
}

function testPatternLowAccuracy() {
  aiLearningFeedbackService.resetForTests();
  for (let i = 0; i < 9; i += 1) {
    aiLearningFeedbackService.captureFeedback(`bbbbbbbb-bbbb-cccc-dddd-${String(i).padStart(12, '0')}`, 'REJECTED', {
      user_id: uid,
      company_id: cid,
      module_name: 'm1',
      operation_type: null
    });
  }
  aiLearningFeedbackService.captureFeedback('cccccccc-bbbb-cccc-dddd-000000000001', 'ACCEPTED', {
    user_id: uid,
    company_id: cid,
    module_name: 'm1',
    operation_type: null
  });
  const p = aiLearningFeedbackService.analyzeFeedbackPatterns({ companyId: cid, userId: uid });
  assert.strictEqual(p.issue_detected, true);
  assert.strictEqual(p.issue_type, 'LOW_ACCURACY');
  assert.ok(['MEDIUM', 'HIGH'].includes(p.severity), `severity ${p.severity}`);
}

function testAdjustmentsDisabledNoBoost() {
  aiLearningFeedbackService.resetForTests();
  seedRejects(12);
  const prev = process.env.AI_LEARNING_ADJUSTMENTS_ENABLED;
  process.env.AI_LEARNING_ADJUSTMENTS_ENABLED = 'false';
  try {
    const g = aiLearningFeedbackService.getLearningGovernanceSignals({
      companyId: cid,
      userId: uid,
      module: 'cognitive_council',
      operation_type: 'read_insight'
    });
    assert.ok(g.confidence_score < 50);
    assert.strictEqual(g.risk_score_boost, 0);
    assert.strictEqual(g.adjustment_applied, null);
    assert.strictEqual(g.require_validation_extra, false);
    assert.strictEqual(g.response_mode_tighten, 0);
  } finally {
    if (prev === undefined) delete process.env.AI_LEARNING_ADJUSTMENTS_ENABLED;
    else process.env.AI_LEARNING_ADJUSTMENTS_ENABLED = prev;
  }
}

function testAdjustmentsEnabledAppliesSignal() {
  aiLearningFeedbackService.resetForTests();
  seedRejects(14);
  const prev = process.env.AI_LEARNING_ADJUSTMENTS_ENABLED;
  process.env.AI_LEARNING_ADJUSTMENTS_ENABLED = 'true';
  try {
    const g = aiLearningFeedbackService.getLearningGovernanceSignals({
      companyId: cid,
      userId: uid,
      module: 'cognitive_council',
      operation_type: 'read_insight'
    });
    assert.ok(g.confidence_score < 50);
    assert.ok(g.risk_score_boost > 0);
    assert.ok(g.adjustment_applied != null);
    assert.strictEqual(g.require_validation_extra, true);
    assert.ok(g.response_mode_tighten >= 1);
  } finally {
    if (prev === undefined) delete process.env.AI_LEARNING_ADJUSTMENTS_ENABLED;
    else process.env.AI_LEARNING_ADJUSTMENTS_ENABLED = prev;
  }
}

function testPartiallyAcceptedCountsAsPartial() {
  aiLearningFeedbackService.resetForTests();
  aiLearningFeedbackService.captureFeedback('dddddddd-bbbb-cccc-dddd-000000000001', 'ADJUSTED', {
    user_id: uid,
    company_id: cid,
    module_name: 'x',
    operation_type: null
  });
  const s = aiLearningFeedbackService.getStatsSnapshot(cid, uid);
  assert.strictEqual(s.partial_count, 1);
}

function testResetClearsState() {
  aiLearningFeedbackService.resetForTests();
  seedRejects(3);
  aiLearningFeedbackService.resetForTests();
  const s = aiLearningFeedbackService.getStatsSnapshot(cid, uid);
  assert.strictEqual(s, null);
}

const suite = [
  testDefaultConfidenceWithoutHistory,
  testRejectsLowerConfidence,
  testPatternLowAccuracy,
  testAdjustmentsDisabledNoBoost,
  testAdjustmentsEnabledAppliesSignal,
  testPartiallyAcceptedCountsAsPartial,
  testResetClearsState
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}
if (failed) process.exit(1);
console.log('aiLearningFeedbackScenarios: all passed');
