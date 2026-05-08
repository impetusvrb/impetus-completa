'use strict';

const { isAdaptiveTuningEnabled } = require('../services/adaptiveTuningService');

/**
 * Auditor de narrativa proibida — rede final de segurança cognitiva.
 * Verifica se a resposta ao utilizador contém frases proibidas definidas pelo
 * contextInterpretationLayer e, se sim, substitui por fallback determinístico.
 */

const FALLBACK_MESSAGES = {
  tenant_empty:
    'No momento, esta organização ainda não possui máquinas ou fontes de dados conectadas ao Impetus. Para que eu possa oferecer análises operacionais reais, o primeiro passo é cadastrar os equipamentos e configurar as integrações. Posso ajudá-lo a começar — basta dizer.',
  tenant_inactive:
    'As máquinas cadastradas nesta organização não apresentam telemetria recente. Antes de avaliar a operação, recomendo verificar o estado das integrações (PLC/gateway) para garantir que os dados estão a fluir corretamente para o sistema.'
};

function normalizeForComparison(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function auditResponse({ text, must_avoid_phrases, data_state, narrative_mode }) {
  if (!text || !Array.isArray(must_avoid_phrases) || must_avoid_phrases.length === 0) {
    return {
      clean: true,
      violations: [],
      sanitized_text: text || '',
      action_taken: 'none'
    };
  }

  const normalized = normalizeForComparison(text);
  const violations = [];

  for (const phrase of must_avoid_phrases) {
    if (!phrase) continue;
    const normalizedPhrase = normalizeForComparison(phrase);
    if (normalized.includes(normalizedPhrase)) {
      violations.push(phrase);
    }
  }

  if (violations.length === 0) {
    return {
      clean: true,
      violations: [],
      sanitized_text: text,
      action_taken: 'none'
    };
  }

  const fallback = FALLBACK_MESSAGES[data_state];

  if (!fallback) {
    return {
      clean: false,
      violations,
      sanitized_text: text,
      action_taken: 'none'
    };
  }

  console.info('[FORBIDDEN_NARRATIVE_BLOCKED]', {
    violations,
    data_state,
    narrative_mode
  });

  return {
    clean: false,
    violations,
    sanitized_text: fallback,
    action_taken: 'replaced'
  };
}

/**
 * Regra mínima de pós-processamento quando não há produção ativa com visibilidade plena:
 * evita narrativa de parada produtiva sem evidência nos dados.
 * @param {{ text: string, data_state?: string|null }} p
 * @returns {string}
 */
function enforceNarrativeRules({ text, data_state }) {
  if (text == null || typeof text !== 'string') return text || '';
  if (data_state === 'production_active') return text;

  const normalized = normalizeForComparison(text);
  const extraForbidden = ['operação parada', 'produção interrompida'];
  for (const phrase of extraForbidden) {
    const np = normalizeForComparison(phrase);
    if (np && normalized.includes(np)) {
      const fb = FALLBACK_MESSAGES[data_state] || FALLBACK_MESSAGES.tenant_empty;
      console.info('[FORBIDDEN_NARRATIVE_BLOCKED]', {
        rule: 'enforceNarrativeRules',
        data_state: data_state || null,
        phrase
      });
      return fb;
    }
  }
  return text;
}

/**
 * Suavização de narrativa quando não há produção activa com dados — não altera decisões.
 * @param {string} text
 * @param {string|undefined|null} data_state
 * @returns {string}
 */
function softenNarrative(text, data_state) {
  if (text == null || typeof text !== 'string') return text || '';
  if (data_state === 'production_active') return text;
  return text.replace(/\bestável|estavel|normal\b/gi, 'sem dados suficientes para avaliação');
}

/**
 * Pós-processamento unificado para todas as saídas (dashboard GPT e Conselho Cognitivo).
 * @param {{ text?: string|null, data_state?: string|null }} params
 * @returns {string}
 */
function applyUnifiedPostProcessing({ text, data_state } = {}) {
  let result = String(text ?? '');

  result = enforceNarrativeRules({
    text: result,
    data_state
  });

  if (isAdaptiveTuningEnabled()) {
    result = softenNarrative(result, data_state);
  }

  return result;
}

module.exports = {
  auditResponse,
  normalizeForComparison,
  enforceNarrativeRules,
  softenNarrative,
  applyUnifiedPostProcessing
};
