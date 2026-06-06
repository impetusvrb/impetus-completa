'use strict';

/**
 * AIOI-P3.9 — Governance Stability Service (READ ONLY)
 *
 * Estabilidade via composição P3.8 (getGovernanceExcellenceReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const instMetrics = require('./aioiInstitutionalizationMetrics');
const governanceExcellenceReadModel = require('./aioiGovernanceExcellenceReadModelService');

const STABILITY_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence'
]);

function computeGovernanceStabilityScore(germ) {
  const signals = instMetrics._extractInstitutionalizationSignals(germ);
  const values = STABILITY_PILLARS.map(k => {
    switch (k) {
      case 'trust':                return signals.trustScore;
      case 'assurance':              return signals.assuranceScore;
      case 'auditability':           return signals.auditabilityScore;
      case 'readiness':              return signals.readinessScore;
      case 'value_governance':       return signals.valueGovernanceScore;
      case 'sustainability':         return signals.sustainabilityScore;
      case 'certification':          return signals.certificationScore;
      case 'conformance':            return signals.conformanceScore;
      case 'governance_excellence':  return signals.governanceExcellenceScore;
      default:                       return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return instMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildGovernanceStability(germ) {
  const stability_score = computeGovernanceStabilityScore(germ);
  return {
    stability_score,
    stability_status: instMetrics.classifyGovernanceStability(stability_score)
  };
}

async function getGovernanceStability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const germRes = await governanceExcellenceReadModel.getGovernanceExcellenceReadModel(companyId);
    if (!germRes.ok) {
      instMetrics.recordError(companyId, 'getGovernanceStability', germRes.error);
      return { ok: false, error: germRes.error };
    }

    const governance_stability = buildGovernanceStability(germRes.governance_excellence_read_model);
    instMetrics.recordGovernanceStabilityAnalyzed(companyId);
    return { ok: true, governance_stability };

  } catch (err) {
    instMetrics.recordError(companyId, 'getGovernanceStability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  STABILITY_PILLARS,
  computeGovernanceStabilityScore,
  buildGovernanceStability,
  getGovernanceStability
};
