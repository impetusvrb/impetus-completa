'use strict';

/**
 * AIOI-P4.4 — Executive Summary Service (READ ONLY)
 *
 * Consolidação executiva via composição P4.3 (getVisualizationReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const cockpitMetrics = require('./aioiCockpitMetrics');
const visualizationReadModel = require('./aioiVisualizationReadModelService');

const SUMMARY_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'governance_excellence', 'institutionalization', 'sovereignty',
  'autonomy', 'consumption', 'visualization_readiness'
]);

function computeExecutiveSummaryScore(vrm) {
  const signals = cockpitMetrics._extractCockpitSignals(vrm);
  const values = SUMMARY_PILLARS.map(k => {
    switch (k) {
      case 'trust':                    return signals.trustScore;
      case 'assurance':                  return signals.assuranceScore;
      case 'auditability':               return signals.auditabilityScore;
      case 'readiness':                  return signals.readinessScore;
      case 'governance_excellence':      return signals.governanceExcellenceScore;
      case 'institutionalization':       return signals.institutionalizationScore;
      case 'sovereignty':                return signals.sovereigntyScore;
      case 'autonomy':                   return signals.autonomyScore;
      case 'consumption':                return signals.consumptionScore;
      case 'visualization_readiness':    return signals.visualizationReadinessScore;
      default:                           return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return cockpitMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildExecutiveSummary(vrm) {
  const summary_score = computeExecutiveSummaryScore(vrm);
  return {
    summary_score,
    summary_status: cockpitMetrics.classifyExecutiveSummary(summary_score)
  };
}

async function getExecutiveSummary(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vrmRes = await visualizationReadModel.getVisualizationReadModel(companyId);
    if (!vrmRes.ok) {
      cockpitMetrics.recordError(companyId, 'getExecutiveSummary', vrmRes.error);
      return { ok: false, error: vrmRes.error };
    }

    const executive_summary = buildExecutiveSummary(vrmRes.visualization_read_model);
    cockpitMetrics.recordExecutiveSummaryAnalyzed(companyId);
    return { ok: true, executive_summary };

  } catch (err) {
    cockpitMetrics.recordError(companyId, 'getExecutiveSummary', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  SUMMARY_PILLARS,
  computeExecutiveSummaryScore,
  buildExecutiveSummary,
  getExecutiveSummary
};
