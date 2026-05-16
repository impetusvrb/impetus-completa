'use strict';

/**
 * WAVE 4 — contratos de summarization e contexto seguro.
 */

const CONTRACT_VERSION = 1;

const KNOWN_FACT_SOURCES = Object.freeze([
  'operational_memory',
  'knowledge_memory',
  'eventos_empresa',
  'tasks',
  'reminders',
  'casos_manutencao',
  'claude_analytics',
  'user_message',
  'system'
]);

const HALLUCINATION_GUARDS = Object.freeze([
  'no_new_entities',
  'source_required',
  'no_speculative_markers',
  'facts_only_prompt'
]);

/**
 * @param {object} partial
 * @returns {object}
 */
function buildSummarizationContract(partial) {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    contract_version: CONTRACT_VERSION,
    input_ref: p.input_ref || 'memory_binding_block',
    mode: p.mode === 'active' ? 'active' : 'passive',
    hallucination_guards: [...HALLUCINATION_GUARDS],
    output: {
      summary: p.summary != null ? String(p.summary) : '',
      facts: Array.isArray(p.facts) ? p.facts : [],
      tokens_before: Number(p.tokens_before) || 0,
      tokens_after: Number(p.tokens_after) || 0
    },
    created_at: new Date().toISOString()
  };
}

/**
 * @param {{ text: string, source?: string, confidence?: number }} fact
 */
function validateFact(fact) {
  if (!fact || !fact.text || !String(fact.text).trim()) return { ok: false, reason: 'empty_text' };
  const src = String(fact.source || 'system').toLowerCase();
  if (!KNOWN_FACT_SOURCES.includes(src)) return { ok: false, reason: 'unknown_source' };
  return {
    ok: true,
    fact: {
      id: fact.id || `f_${Math.random().toString(36).slice(2, 8)}`,
      text: String(fact.text).trim().slice(0, 500),
      source: src,
      confidence: Math.min(1, Math.max(0, Number(fact.confidence) || 0.85))
    }
  };
}

module.exports = {
  CONTRACT_VERSION,
  KNOWN_FACT_SOURCES,
  HALLUCINATION_GUARDS,
  buildSummarizationContract,
  validateFact
};
