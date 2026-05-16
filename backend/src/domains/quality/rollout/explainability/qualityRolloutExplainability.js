'use strict';

function buildRolloutExplainability(partial = {}) {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    version: 1,
    rationale: p.rationale != null ? String(p.rationale) : '',
    readiness_evidence: Array.isArray(p.readiness_evidence) ? p.readiness_evidence.slice(0, 48) : [],
    adoption_evidence: Array.isArray(p.adoption_evidence) ? p.adoption_evidence.slice(0, 48) : [],
    saturation_indicators: Array.isArray(p.saturation_indicators) ? p.saturation_indicators.slice(0, 24) : [],
    operational_confidence: p.operational_confidence != null ? Number(p.operational_confidence) : null,
    governance_status: p.governance_status && typeof p.governance_status === 'object' ? p.governance_status : {},
    blockers: Array.isArray(p.blockers) ? p.blockers.slice(0, 32) : [],
    rollback_strategy: p.rollback_strategy != null ? String(p.rollback_strategy) : 'desligar flags de sub-módulo e repor estágio anterior na matriz de rollout',
    assistive_only: true,
    no_auto_activation: true
  };
}

module.exports = { buildRolloutExplainability };
