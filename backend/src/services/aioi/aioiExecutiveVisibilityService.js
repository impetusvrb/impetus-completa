'use strict';

/**
 * AIOI-P4.2 — Executive Visibility Service (READ ONLY)
 *
 * Visibilidade executiva via composição P4.1 (getAutonomyReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const consumptionMetrics = require('./aioiConsumptionMetrics');
const autonomyReadModel = require('./aioiAutonomyReadModelService');

const VISIBILITY_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty', 'autonomy'
]);

function computeExecutiveVisibilityScore(arm) {
  const signals = consumptionMetrics._extractConsumptionSignals(arm);
  const values = VISIBILITY_PILLARS.map(k => {
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
      case 'institutionalization':   return signals.institutionalizationScore;
      case 'sovereignty':            return signals.sovereigntyScore;
      case 'autonomy':               return signals.autonomyScore;
      default:                       return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return consumptionMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildExecutiveVisibility(arm) {
  const visibility_score = computeExecutiveVisibilityScore(arm);
  return {
    visibility_score,
    visibility_status: consumptionMetrics.classifyExecutiveVisibility(visibility_score)
  };
}

async function getExecutiveVisibility(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const armRes = await autonomyReadModel.getAutonomyReadModel(companyId);
    if (!armRes.ok) {
      consumptionMetrics.recordError(companyId, 'getExecutiveVisibility', armRes.error);
      return { ok: false, error: armRes.error };
    }

    const executive_visibility = buildExecutiveVisibility(armRes.autonomy_read_model);
    consumptionMetrics.recordExecutiveVisibilityAnalyzed(companyId);
    return { ok: true, executive_visibility };

  } catch (err) {
    consumptionMetrics.recordError(companyId, 'getExecutiveVisibility', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VISIBILITY_PILLARS,
  computeExecutiveVisibilityScore,
  buildExecutiveVisibility,
  getExecutiveVisibility
};
