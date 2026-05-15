'use strict';

/**
 * IMPETUS — Camada LLM sob o AI Security Gateway (invokeUnifiedLlm).
 * Com IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED=true, o fluxo público entra via unifiedOrchestrator.executeCognitiveFlow → runLlm.
 * Com gateway desactivado, executeCognitiveFlow usa rawChatCompletionMessages directamente.
 */

const aiSecurityGateway = require('./aiSecurityGateway');

/**
 * @param {object} p
 * @param {string} p.channel
 * @param {object|null} p.user
 * @param {string|null} p.companyId
 * @param {string} [p.model]
 * @param {Array} p.messages
 * @param {object} [p.metadata]
 * @param {string} [p.traceId]
 * @param {object} p.llmOpts — opções OpenAI (max_tokens, billing, response_format, timeout, model)
 * @param {function(Array, object): Promise<string>} p.executeFn
 * @returns {Promise<string>}
 */
async function runLlm(p) {
  return aiSecurityGateway.invokeUnifiedLlm({
    channel: p.channel,
    user: p.user,
    companyId: p.companyId,
    model: p.model,
    messages: p.messages,
    metadata: p.metadata || {},
    traceId: p.traceId,
    llmOpts: p.llmOpts || {},
    executeFn: p.executeFn
  });
}

module.exports = { runLlm };
