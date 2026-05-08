'use strict';

/**
 * Fase 7 — proposta, aprovação, efeito em adjustConfidence, rollback.
 */

const assert = require('assert');
const learningMemory = require('../services/learningMemoryService');
const supervisedLearning = require('../services/supervisedLearningService');
const adaptiveTuning = require('../services/adaptiveTuningService');
const aiAnalytics = require('../services/aiAnalyticsService');

process.env.IMPETUS_SUPERVISED_LEARNING_APPLY = 'true';

function seedLowConfidenceMemory(n = 25) {
  for (let i = 0; i < n; i++) {
    learningMemory.storeInteraction({
      input: `sup-${i}`,
      output: {},
      context: { module: 'smoke' },
      confidence: 0.2
    });
  }
}

function testProposalGeneration() {
  const { createdIds } = supervisedLearning.scanAndStorePendingProposals();
  assert(createdIds.length >= 1, 'com ≥20 amostras e >40% baixa confiança deve criar proposta');
  const p = supervisedLearning.findProposal(createdIds[0]);
  assert(p && p.status === 'pending');
}

function testApproval() {
  const pending = supervisedLearning.getProposals().filter((x) => x.status === 'pending');
  assert(pending.length >= 1);
  const id = pending[0].id;
  const updated = supervisedLearning.approveProposal(id, { userId: 'smoke-admin' });
  assert(updated && updated.status === 'approved');
  const again = supervisedLearning.approveProposal(id, { userId: 'smoke-admin' });
  assert.strictEqual(again, null, 'não deve aprovar duas vezes');
}

function testConfidenceEffectAndRollback() {
  adaptiveTuning.clearApprovedLearningAdjustments();
  const args = { baseScore: 0.9, data_state: 'production_active', completeness: 1 };
  const baseline = adaptiveTuning.adjustConfidence(args);
  adaptiveTuning.mergeApprovedAdjustments({ confidenceFactor: 0.5 });
  const adjusted = adaptiveTuning.adjustConfidence(args);
  assert(adjusted < baseline, 'factor 0.5 deve reduzir confiança exposta');
  adaptiveTuning.clearApprovedLearningAdjustments();
  const restored = adaptiveTuning.adjustConfidence(args);
  assert.strictEqual(restored, baseline, 'rollback deve restaurar comportamento');
}

function testAnalyticsDelegates() {
  assert.strictEqual(typeof aiAnalytics.getSupervisedLearningProposals, 'function');
  assert.strictEqual(typeof aiAnalytics.scanSupervisedLearningProposals, 'function');
}

function main() {
  seedLowConfidenceMemory(25);
  testProposalGeneration();
  testApproval();
  testConfidenceEffectAndRollback();
  testAnalyticsDelegates();
  console.log('[SUPERVISED_PHASE7_SMOKE]', 'ok');
}

main();
