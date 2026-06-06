'use strict';

/**
 * AIOI-P3.8 — Governance Maturity Service (READ ONLY)
 *
 * Maturidade via composição P3.7 (getConformanceReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceExcellenceMetrics');
const conformanceReadModel = require('./aioiConformanceReadModelService');

const MATURITY_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance'
]);

function computeGovernanceMaturityScore(confRm) {
  const signals = govMetrics._extractGovernanceSignals(confRm);
  const values = MATURITY_PILLARS.map(k => {
    switch (k) {
      case 'trust':            return signals.trustScore;
      case 'assurance':          return signals.assuranceScore;
      case 'auditability':       return signals.auditabilityScore;
      case 'readiness':          return signals.readinessScore;
      case 'value_governance':   return signals.valueGovernanceScore;
      case 'sustainability':     return signals.sustainabilityScore;
      case 'certification':      return signals.certificationScore;
      case 'conformance':        return signals.conformanceScore;
      default:                   return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return govMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildGovernanceMaturity(confRm) {
  const maturity_score = computeGovernanceMaturityScore(confRm);
  return {
    maturity_score,
    maturity_status: govMetrics.classifyGovernanceMaturity(maturity_score)
  };
}

async function getGovernanceMaturity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const confRes = await conformanceReadModel.getConformanceReadModel(companyId);
    if (!confRes.ok) {
      govMetrics.recordError(companyId, 'getGovernanceMaturity', confRes.error);
      return { ok: false, error: confRes.error };
    }

    const governance_maturity = buildGovernanceMaturity(confRes.conformance_read_model);
    govMetrics.recordGovernanceMaturityAnalyzed(companyId);
    return { ok: true, governance_maturity };

  } catch (err) {
    govMetrics.recordError(companyId, 'getGovernanceMaturity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  MATURITY_PILLARS,
  computeGovernanceMaturityScore,
  buildGovernanceMaturity,
  getGovernanceMaturity
};
