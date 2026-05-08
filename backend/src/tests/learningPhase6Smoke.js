'use strict';

/**
 * Smoke Fase 6 — memória operacional, insights e contrato de não-regressão (sem servidor HTTP).
 * Feedback HTTP: POST /api/feedback/ com Authorization (ver rotas/feedback.js).
 */

const assert = require('assert');
const learningMemory = require('../services/learningMemoryService');
const { generateInsights } = require('../services/learningInsightsService');
const aiAnalytics = require('../services/aiAnalyticsService');
const decisionFacade = require('../services/decisionFacadeService');

function testMemoryFiveInteractions() {
  for (let i = 0; i < 5; i++) {
    learningMemory.storeInteraction({
      input: `pergunta-teste-${i}`,
      output: { reasoning_excerpt: 'ok', decision: null, success: true },
      context: { module: 'smoke' },
      confidence: 0.85
    });
  }
  const recent = learningMemory.getRecentInteractions();
  assert(recent.length >= 5, 'memória deve conter pelo menos 5 interações');
  assert(recent[recent.length - 1].interactionId, 'cada entrada deve ter interactionId');
}

function testInsightsLowConfidencePattern() {
  for (let i = 0; i < 12; i++) {
    learningMemory.storeInteraction({
      input: `low-conf-${i}`,
      output: { reasoning_excerpt: 'weak', decision: null, success: true },
      context: { module: 'smoke' },
      confidence: 0.2
    });
  }
  const insights = generateInsights();
  assert(
    Array.isArray(insights) && insights.length > 0,
    'com >30% de confiança baixa e amostra ≥10, deve haver pelo menos um insight'
  );
  const viaAnalytics = aiAnalytics.getLearningInsights();
  assert.deepStrictEqual(viaAnalytics, insights);
}

function testDecisionFacadeExportsUnchanged() {
  assert.strictEqual(typeof decisionFacade.decide, 'function');
  assert.strictEqual(typeof decisionFacade.decideWithFacade, 'function');
  assert.strictEqual(typeof decisionFacade.decisionFingerprint, 'function');
  assert.strictEqual(typeof decisionFacade.logFacadeCoherence, 'function');
  const keys = Object.keys(decisionFacade).sort();
  assert.deepStrictEqual(
    keys,
    ['decide', 'decideWithFacade', 'decisionFingerprint', 'logFacadeCoherence'].sort()
  );
}

function main() {
  testMemoryFiveInteractions();
  testInsightsLowConfidencePattern();
  testDecisionFacadeExportsUnchanged();
  console.log('[LEARNING_PHASE6_SMOKE]', 'ok — memória, insights, exports da fachada');
  console.log(
    '[LEARNING_PHASE6_SMOKE]',
    'feedback: POST /api/feedback/ com JSON { interactionId, rating, comment } e Bearer token'
  );
}

main();
