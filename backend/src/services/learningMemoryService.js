'use strict';

/**
 * Memória operacional em processo — apenas observação (Fase 6).
 * Não altera decisões, prompts nem pipeline. Limite fixo para controlo de RAM.
 */

const crypto = require('crypto');

const memory = [];
const MAX_ENTRIES = 500;

/**
 * @param {{ input?: string, output?: unknown, context?: unknown, confidence?: number|null }} entry
 */
function storeInteraction({ input, output, context, confidence }) {
  if (process.env.LEARNING_MEMORY_STORE === 'false') return;

  const interactionId = crypto.randomUUID();
  memory.push({
    interactionId,
    timestamp: Date.now(),
    input,
    output,
    context,
    confidence: confidence != null && Number.isFinite(Number(confidence)) ? Number(confidence) : null
  });

  if (memory.length > MAX_ENTRIES) memory.shift();

  try {
    console.log('[LEARNING_MEMORY]', memory.length);
    const { generateInsights } = require('./learningInsightsService');
    console.log('[LEARNING_INSIGHTS]', generateInsights());
  } catch (_e) {}
}

function getRecentInteractions() {
  return memory.slice();
}

module.exports = {
  storeInteraction,
  getRecentInteractions
};
