'use strict';

/**
 * AIOI-P4.3 — Enterprise Visualization Readiness Service (READ ONLY)
 *
 * Score composto: presentation + consistency + coverage + enterprise consumption.
 */

const { isValidUUID } = require('../../utils/security');
const visualizationMetrics = require('./aioiVisualizationMetrics');
const presentationService = require('./aioiExecutivePresentationService');
const consistencyService = require('./aioiVisualizationConsistencyService');
const coverageService = require('./aioiVisualizationCoverageService');
const consumptionReadModel = require('./aioiConsumptionReadModelService');

const ENTERPRISE_VISUALIZATION_WEIGHTS = Object.freeze({
  executivePresentation:    0.25,
  visualizationConsistency: 0.25,
  visualizationCoverage:    0.25,
  enterpriseConsumption:    0.25
});

function computeEnterpriseVisualizationReadinessScore({
  presentationScore, consistencyScore, coverageScore, enterpriseConsumptionScore
}) {
  const raw =
    (presentationScore ?? 50) * ENTERPRISE_VISUALIZATION_WEIGHTS.executivePresentation +
    (consistencyScore ?? 50) * ENTERPRISE_VISUALIZATION_WEIGHTS.visualizationConsistency +
    (coverageScore ?? 50) * ENTERPRISE_VISUALIZATION_WEIGHTS.visualizationCoverage +
    (enterpriseConsumptionScore ?? 50) * ENTERPRISE_VISUALIZATION_WEIGHTS.enterpriseConsumption;
  return visualizationMetrics.clampScore(raw);
}

function buildEnterpriseVisualizationReadiness(signals) {
  const visualization_score = computeEnterpriseVisualizationReadinessScore(signals);
  return {
    visualization_score,
    visualization_level: visualizationMetrics.classifyEnterpriseVisualizationReadiness(visualization_score)
  };
}

async function getEnterpriseVisualizationReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const crmRes = await consumptionReadModel.getConsumptionReadModel(companyId);
    if (!crmRes.ok) {
      visualizationMetrics.recordError(companyId, 'getEnterpriseVisualizationReadiness', crmRes.error);
      return { ok: false, error: crmRes.error };
    }

    const crm = crmRes.consumption_read_model;

    const enterprise_visualization_readiness = buildEnterpriseVisualizationReadiness({
      presentationScore:          presentationService.computeExecutivePresentationScore(crm),
      consistencyScore:           consistencyService.computeVisualizationConsistencyScore(crm),
      coverageScore:              coverageService.computeVisualizationCoverageScore(crm),
      enterpriseConsumptionScore: crm.enterprise_consumption?.consumption_score
    });

    visualizationMetrics.recordEnterpriseVisualizationReadinessAnalyzed(companyId);
    return { ok: true, enterprise_visualization_readiness };

  } catch (err) {
    visualizationMetrics.recordError(companyId, 'getEnterpriseVisualizationReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_VISUALIZATION_WEIGHTS,
  computeEnterpriseVisualizationReadinessScore,
  buildEnterpriseVisualizationReadiness,
  getEnterpriseVisualizationReadiness
};
