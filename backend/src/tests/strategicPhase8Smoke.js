'use strict';

/**
 * Fase 8 — padrões globais, propostas estratégicas, aplicação segmentada, rollback.
 */

const assert = require('assert');
const learningMemory = require('../services/learningMemoryService');
const strategicLearning = require('../services/strategicLearningService');
const supervisedLearning = require('../services/supervisedLearningService');
const adaptiveTuning = require('../services/adaptiveTuningService');
const aiAnalytics = require('../services/aiAnalyticsService');

process.env.IMPETUS_SUPERVISED_LEARNING_APPLY = 'true';
process.env.IMPETUS_STRATEGIC_LEARNING_APPLY = 'true';
process.env.IMPETUS_STRATEGIC_ROLLOUT_ENABLED = 'true';
process.env.IMPETUS_STRATEGIC_ROLLOUT_PCT = '1';

function seedPatternMemory() {
  for (let i = 0; i < 55; i++) {
    learningMemory.storeInteraction({
      input: `strat-${i}`,
      output: {},
      context: {
        module: 'smoke',
        metrics: { data_state: i % 3 === 0 ? 'production_active' : 'degraded' }
      },
      confidence: 0.25
    });
  }
}

function testPatternDetected() {
  const patterns = strategicLearning.analyzeSystemPatterns();
  assert(patterns.length >= 1, 'esperado ≥1 padrão com amostra grande e taxas altas');
  assert(patterns.some((p) => p.type === 'low_confidence_global'));
  assert(patterns.some((p) => p.type === 'high_no_data_usage'));
}

function testStrategicProposals() {
  const props = supervisedLearning.generateStrategicProposals();
  assert(props.length >= 1);
  assert(props.some((p) => p.type === 'strategy_adjustment' && p.action === 'increase_no_data_guidance'));
}

function testApprovalAndTextEffect() {
  adaptiveTuning.clearApprovedLearningAdjustments();
  const { createdIds } = supervisedLearning.scanAndStorePendingProposals();
  const stratId = createdIds.find((id) => {
    const row = supervisedLearning.findProposal(id);
    return row && row.proposal?.action === 'increase_no_data_guidance';
  });
  assert(stratId, 'deve existir proposta estratégica pendente');
  supervisedLearning.approveProposal(stratId, { userId: 'admin-test' });
  const adj = adaptiveTuning.getApprovedLearningAdjustments();
  assert.strictEqual(adj.strategy, 'increase_no_data_guidance');

  const out = aiAnalytics.applyStrategicAssistantTextTail('Olá.', {
    metrics: { data_state: 'degraded' }
  });
  assert(out.includes('configure fontes de dados'), 'tail aplicado em contexto não-produção');

  adaptiveTuning.clearApprovedLearningAdjustments();
  const plain = aiAnalytics.applyStrategicAssistantTextTail('Olá.', {
    metrics: { data_state: 'degraded' }
  });
  assert.strictEqual(plain, 'Olá.');
}

function testConfidenceTemperingSubset() {
  process.env.IMPETUS_STRATEGIC_ROLLOUT_PCT = '0.2';
  adaptiveTuning.clearApprovedLearningAdjustments();
  const args = { baseScore: 0.8, data_state: 'production_active', completeness: 1 };
  const baseline = adaptiveTuning.adjustConfidence(args);
  adaptiveTuning.mergeApprovedAdjustments({ strategy: 'reduce_assertiveness' });
  let tempered = 0;
  for (let i = 0; i < 120; i++) {
    const v = adaptiveTuning.adjustConfidence(args);
    if (v < baseline) tempered++;
  }
  assert(tempered > 0 && tempered < 120, 'rollout probabilístico deve temperar apenas subset');
}

function main() {
  seedPatternMemory();
  testPatternDetected();
  testStrategicProposals();
  testApprovalAndTextEffect();
  process.env.IMPETUS_STRATEGIC_ROLLOUT_PCT = '0.2';
  testConfidenceTemperingSubset();
  console.log('[STRATEGIC_PHASE8_SMOKE]', 'ok');
}

main();
