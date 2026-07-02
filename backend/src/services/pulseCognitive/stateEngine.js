/**
 * CERT-PULSE-02 FASE 3/10 — Pulse State Engine + Estado Organizacional inferido.
 */
'use strict';

const { ORGANIZATIONAL_STATES } = require('./constants');

function inferOrganizationalState(indexPack, correlationPack = {}) {
  const idx = indexPack.pulse_index || 50;
  const d = indexPack.dimensions || {};
  const patterns = correlationPack.patterns || [];

  const codes = patterns.map((p) => p.code);
  const hasDisengagement = codes.includes('disengagement_risk') || codes.includes('safety_participation_decline');
  const hasOverload = codes.includes('overload_signal');
  const hasGrowth = codes.includes('positive_evolution');
  const hasDivergence = codes.includes('perception_divergence');

  let stateCode = 'stable_team';
  let confidence = indexPack.confidence || 0.5;
  const evidence = [];

  if (idx < 40 || hasDisengagement) {
    stateCode = 'at_risk_team';
    evidence.push('Índice abaixo de 40 ou padrão de desengajamento correlacionado.');
    confidence = Math.min(confidence + 0.1, 0.9);
  } else if ((d.engagement || 0) < 38 && (d.participation || 0) < 38) {
    stateCode = 'disengaged_team';
    evidence.push('Engajamento e participação abaixo do limiar de referência.');
  } else if (hasOverload || (d.stability || 0) < 42) {
    stateCode = 'overloaded_team';
    evidence.push('Sinais de sobrecarga ou instabilidade de jornada.');
  } else if (hasGrowth && (d.evolution || 0) >= 65) {
    stateCode = 'growing_team';
    evidence.push('Evolução positiva com participação operacional consistente.');
  } else if (idx >= 75 && !hasDisengagement && (d.consistency || 0) >= 60) {
    stateCode = 'healthy_team';
    evidence.push('Índice elevado com consistência e ausência de padrões de risco.');
  } else if (hasDivergence || codes.length >= 3) {
    stateCode = 'transforming_team';
    evidence.push('Múltiplos sinais em transição ou divergência de percepção.');
  }

  const stateMeta = ORGANIZATIONAL_STATES[stateCode] || ORGANIZATIONAL_STATES.stable_team;

  return {
    state_code: stateCode,
    state_label: stateMeta.label,
    severity: stateMeta.severity,
    confidence: clamp(confidence),
    evidence,
    inference: {
      pulse_index: idx,
      dimensions: d,
      pattern_codes: codes,
      assistive_only: true,
      human_in_the_loop: true,
      not_a_label: 'Estado inferido; decisão permanece humana.'
    }
  };
}

function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Representação do estado contínuo para persistência.
 */
function buildStateRecord(companyId, scopeType, scopeKey, scopeLabel, indexPack, correlationPack) {
  const orgState = inferOrganizationalState(indexPack, correlationPack);
  return {
    company_id: companyId,
    scope_type: scopeType,
    scope_key: scopeKey,
    scope_label: scopeLabel || scopeKey,
    state_code: orgState.state_code,
    state_label: orgState.state_label,
    inference: orgState.inference,
    confidence: orgState.confidence,
    evidence: orgState.evidence
  };
}

module.exports = {
  inferOrganizationalState,
  buildStateRecord
};
