'use strict';

/**
 * AIOI-P4.3 — Executive Presentation Service (READ ONLY)
 *
 * Preparação para apresentação executiva via composição P4.2 (getConsumptionReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const visualizationMetrics = require('./aioiVisualizationMetrics');
const consumptionReadModel = require('./aioiConsumptionReadModelService');

const PRESENTATION_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty', 'autonomy', 'consumption'
]);

function computeExecutivePresentationScore(crm) {
  const signals = visualizationMetrics._extractVisualizationSignals(crm);
  const values = PRESENTATION_PILLARS.map(k => {
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
      case 'consumption':            return signals.consumptionScore;
      default:                       return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return visualizationMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildExecutivePresentation(crm) {
  const presentation_score = computeExecutivePresentationScore(crm);
  return {
    presentation_score,
    presentation_status: visualizationMetrics.classifyExecutivePresentation(presentation_score)
  };
}

async function getExecutivePresentation(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const crmRes = await consumptionReadModel.getConsumptionReadModel(companyId);
    if (!crmRes.ok) {
      visualizationMetrics.recordError(companyId, 'getExecutivePresentation', crmRes.error);
      return { ok: false, error: crmRes.error };
    }

    const executive_presentation = buildExecutivePresentation(crmRes.consumption_read_model);
    visualizationMetrics.recordExecutivePresentationAnalyzed(companyId);
    return { ok: true, executive_presentation };

  } catch (err) {
    visualizationMetrics.recordError(companyId, 'getExecutivePresentation', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  PRESENTATION_PILLARS,
  computeExecutivePresentationScore,
  buildExecutivePresentation,
  getExecutivePresentation
};
