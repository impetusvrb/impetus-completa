/**
 * CERT-PULSE-02 FASE 8 — Motor Cognitivo Organizacional (compreensão + insights governados).
 */
'use strict';

const { GOVERNANCE } = require('./constants');
const { inferOrganizationalState } = require('./stateEngine');

/**
 * Gera pacote de compreensão organizacional (regra + estrutura para IA).
 */
function buildOrganizationalUnderstanding(perception, indexPack, correlationPack) {
  const state = inferOrganizationalState(indexPack, correlationPack);
  const insights = [];

  for (const pattern of correlationPack.patterns || []) {
    insights.push({
      insight_type: 'pattern',
      title: pattern.label,
      summary: `Padrão assistivo detectado com confiança ${Math.round((pattern.confidence || 0.5) * 100)}%. Não constitui diagnóstico.`,
      indicators_used: pattern.signals || [],
      correlations: correlationPack.correlations?.filter((c) =>
        (pattern.signals || []).some((s) => JSON.stringify(c).includes(s))
      ) || [],
      evidence: [{ type: 'pattern', code: pattern.code, severity: pattern.severity }],
      confidence: pattern.confidence || 0.5,
      ...GOVERNANCE
    });
  }

  if (state.state_code !== 'stable_team') {
    insights.push({
      insight_type: 'organizational_state',
      title: state.state_label,
      summary: `Estado organizacional inferido para apoio à decisão humana. ${state.evidence.join(' ')}`,
      indicators_used: indexPack.indicators_used || [],
      correlations: correlationPack.correlations || [],
      evidence: state.evidence.map((e) => ({ type: 'inference', text: e })),
      confidence: state.confidence,
      ...GOVERNANCE
    });
  }

  return {
    understanding: {
      pulse_index: indexPack.pulse_index,
      dimensions: indexPack.dimensions,
      organizational_state: state,
      correlations: correlationPack.correlations,
      patterns: correlationPack.patterns
    },
    insights,
    governance: GOVERNANCE
  };
}

module.exports = { buildOrganizationalUnderstanding };
