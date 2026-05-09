'use strict';

/**
 * Memória operacional em processo — apenas observação (Fase 6).
 * Persistência opcional (JSON) com IMPETUS_COGNITIVE_PERSISTENCE_ENABLED=true.
 */

const crypto = require('crypto');
const cognitivePersistence = require('./cognitivePersistenceService');
const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');

const memory = [];
const MAX_ENTRIES_RAM_ONLY = 500;

function getMemoryCap() {
  return cognitivePersistence.isPersistenceEnabled()
    ? cognitivePersistence.MAX_INTERACTIONS
    : MAX_ENTRIES_RAM_ONLY;
}

/**
 * @param {{ input?: string, output?: unknown, context?: unknown, confidence?: number|null }} entry
 */
function storeInteraction({ input, output, context, confidence }) {
  if (process.env.LEARNING_MEMORY_STORE === 'false') return;

  const interactionId = crypto.randomUUID();
  const row = {
    interactionId,
    timestamp: Date.now(),
    input,
    output,
    context,
    confidence: confidence != null && Number.isFinite(Number(confidence)) ? Number(confidence) : null
  };
  memory.push(row);

  const cap = getMemoryCap();
  while (memory.length > cap) memory.shift();

  if (cognitivePersistence.isPersistenceEnabled()) {
    try {
      cognitivePersistence.appendInteraction(row);
    } catch (_e) {}
  }

  cognitiveDbPersistence.schedulePersistInteractionToDb(row);

  try {
    console.log('[LEARNING_MEMORY]', memory.length);
    const { generateInsights } = require('./learningInsightsService');
    console.log('[LEARNING_INSIGHTS]', generateInsights());
  } catch (_e) {}
}

function getRecentInteractions() {
  return memory.slice();
}

/**
 * Reidrata interações a partir do disco (sem alterar decisões). Chamado no arranque do módulo.
 */
function rehydrateLearningMemory() {
  if (!cognitivePersistence.isPersistenceEnabled()) return;
  try {
    const persisted = cognitivePersistence.loadCognitiveMemory();
    if (Array.isArray(persisted.interactions) && persisted.interactions.length > 0) {
      const cap = getMemoryCap();
      const slice = persisted.interactions.slice(-cap);
      memory.splice(0, memory.length, ...slice);
    }
    try {
      console.log('[COGNITIVE_REHYDRATION]', { interactions: memory.length, scope: 'learning_memory' });
    } catch (_e) {}
  } catch (err) {
    console.warn('[COGNITIVE_REHYDRATION]', err?.message || err);
  }
}

/**
 * Observabilidade Fase 9 — não altera decisões; regista meta no mesmo buffer (respeita LEARNING_MEMORY_STORE).
 * @param {object} detail
 */
function recordAutonomousEvent(detail) {
  storeInteraction({
    input: '[autonomous_controlled]',
    output: detail && typeof detail === 'object' ? detail : { detail },
    context: { source: 'autonomousOptimizationService' },
    confidence: null
  });
}

rehydrateLearningMemory();

module.exports = {
  storeInteraction,
  getRecentInteractions,
  recordAutonomousEvent,
  rehydrateLearningMemory
};
