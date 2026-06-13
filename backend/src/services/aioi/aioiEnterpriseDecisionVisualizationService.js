'use strict';

/**
 * AIOI-P4.5 — Enterprise Decision Visualization Service (READ ONLY)
 *
 * Score composto: perspective + consistency + coverage + cockpit readiness.
 */

const { isValidUUID } = require('../../utils/security');
const decisionVisualizationMetrics = require('./aioiDecisionVisualizationMetrics');
const perspectiveService = require('./aioiDecisionPerspectiveService');
const consistencyService = require('./aioiDecisionConsistencyService');
const coverageService = require('./aioiDecisionVisualizationCoverageService');
const executiveCockpitReadModel = require('./aioiExecutiveCockpitReadModelService');

const ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS = Object.freeze({
  decisionPerspective:          0.25,
  decisionConsistency:          0.25,
  visualizationCoverage:        0.25,
  cockpitReadiness:             0.25
});

function computeEnterpriseDecisionVisualizationScore({
  perspectiveScore, consistencyScore, visualizationCoverageScore, cockpitReadinessScore
}) {
  const raw =
    (perspectiveScore ?? 50) * ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS.decisionPerspective +
    (consistencyScore ?? 50) * ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS.decisionConsistency +
    (visualizationCoverageScore ?? 50) * ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS.visualizationCoverage +
    (cockpitReadinessScore ?? 50) * ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS.cockpitReadiness;
  return decisionVisualizationMetrics.clampScore(raw);
}

function buildEnterpriseDecisionVisualization(signals) {
  const visualization_score = computeEnterpriseDecisionVisualizationScore(signals);
  return {
    visualization_score,
    visualization_level: decisionVisualizationMetrics.classifyEnterpriseDecisionVisualization(visualization_score)
  };
}

async function getEnterpriseDecisionVisualization(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const ecrmRes = await executiveCockpitReadModel.getExecutiveCockpitReadModel(companyId);
    if (!ecrmRes.ok) {
      decisionVisualizationMetrics.recordError(companyId, 'getEnterpriseDecisionVisualization', ecrmRes.error);
      return { ok: false, error: ecrmRes.error };
    }

    const ecrm = ecrmRes.executive_cockpit_read_model;
    const extracted = decisionVisualizationMetrics._extractDecisionVisualizationSignals(ecrm);

    const enterprise_decision_visualization = buildEnterpriseDecisionVisualization({
      perspectiveScore:           perspectiveService.computeDecisionPerspectiveScore(ecrm),
      consistencyScore:           consistencyService.computeDecisionConsistencyScore(ecrm),
      visualizationCoverageScore: coverageService.computeDecisionVisualizationCoverageScore(ecrm),
      cockpitReadinessScore:      extracted.cockpitReadinessScore
    });

    decisionVisualizationMetrics.recordEnterpriseDecisionVisualizationAnalyzed(companyId);
    return { ok: true, enterprise_decision_visualization };

  } catch (err) {
    decisionVisualizationMetrics.recordError(companyId, 'getEnterpriseDecisionVisualization', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_DECISION_VISUALIZATION_WEIGHTS,
  computeEnterpriseDecisionVisualizationScore,
  buildEnterpriseDecisionVisualization,
  getEnterpriseDecisionVisualization
};
