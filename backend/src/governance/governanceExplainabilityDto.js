'use strict';

/**
 * EVENT-GOVERNANCE-15 — DTO interno de explicabilidade (não exposto em APIs públicas).
 */

const crypto = require('crypto');

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernanceExplainabilityDto(params) {
  const score = Number(params.explainabilityScore);
  const normalizedScore =
    Number.isFinite(score) && score >= 0 && score <= 1 ? score : 0;

  return Object.freeze({
    explainabilityId: params.explainabilityId || crypto.randomUUID(),
    eventId: params.eventId || null,
    companyId: params.companyId || null,
    timestamp: params.timestamp || new Date().toISOString(),
    explainabilityScore: normalizedScore,
    decisionTrace: params.decisionTrace ? Object.freeze({ ...params.decisionTrace }) : null,
    evidence: Object.freeze(params.evidence || {}),
    factors: Object.freeze(Array.isArray(params.factors) ? [...params.factors] : []),
    rulesApplied: Object.freeze(Array.isArray(params.rulesApplied) ? [...params.rulesApplied] : [])
  });
}

module.exports = {
  buildGovernanceExplainabilityDto
};
