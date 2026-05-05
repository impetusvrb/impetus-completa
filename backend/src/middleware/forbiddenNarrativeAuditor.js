'use strict';

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

module.exports = { auditResponse, normalizeForComparison };
