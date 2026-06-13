'use strict';

/**
 * AIOI-P4.4 — Enterprise Cockpit Readiness Service (READ ONLY)
 *
 * Score composto: summary + overview + visualization coverage + visualization readiness.
 */

const { isValidUUID } = require('../../utils/security');
const cockpitMetrics = require('./aioiCockpitMetrics');
const summaryService = require('./aioiExecutiveSummaryService');
const overviewService = require('./aioiStrategicOverviewService');
const visualizationReadModel = require('./aioiVisualizationReadModelService');

const ENTERPRISE_COCKPIT_WEIGHTS = Object.freeze({
  executiveSummary:       0.25,
  strategicOverview:      0.25,
  visualizationCoverage:  0.25,
  visualizationReadiness: 0.25
});

function computeEnterpriseCockpitReadinessScore({
  summaryScore, overviewScore, visualizationCoverageScore, visualizationReadinessScore
}) {
  const raw =
    (summaryScore ?? 50) * ENTERPRISE_COCKPIT_WEIGHTS.executiveSummary +
    (overviewScore ?? 50) * ENTERPRISE_COCKPIT_WEIGHTS.strategicOverview +
    (visualizationCoverageScore ?? 50) * ENTERPRISE_COCKPIT_WEIGHTS.visualizationCoverage +
    (visualizationReadinessScore ?? 50) * ENTERPRISE_COCKPIT_WEIGHTS.visualizationReadiness;
  return cockpitMetrics.clampScore(raw);
}

function buildEnterpriseCockpitReadiness(signals) {
  const cockpit_score = computeEnterpriseCockpitReadinessScore(signals);
  return {
    cockpit_score,
    cockpit_level: cockpitMetrics.classifyEnterpriseCockpitReadiness(cockpit_score)
  };
}

async function getEnterpriseCockpitReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vrmRes = await visualizationReadModel.getVisualizationReadModel(companyId);
    if (!vrmRes.ok) {
      cockpitMetrics.recordError(companyId, 'getEnterpriseCockpitReadiness', vrmRes.error);
      return { ok: false, error: vrmRes.error };
    }

    const vrm = vrmRes.visualization_read_model;
    const extracted = cockpitMetrics._extractCockpitSignals(vrm);

    const enterprise_cockpit_readiness = buildEnterpriseCockpitReadiness({
      summaryScore:               summaryService.computeExecutiveSummaryScore(vrm),
      overviewScore:              overviewService.computeStrategicOverviewScore(vrm),
      visualizationCoverageScore: extracted.visualizationCoverageScore,
      visualizationReadinessScore: extracted.visualizationReadinessScore
    });

    cockpitMetrics.recordEnterpriseCockpitReadinessAnalyzed(companyId);
    return { ok: true, enterprise_cockpit_readiness };

  } catch (err) {
    cockpitMetrics.recordError(companyId, 'getEnterpriseCockpitReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_COCKPIT_WEIGHTS,
  computeEnterpriseCockpitReadinessScore,
  buildEnterpriseCockpitReadiness,
  getEnterpriseCockpitReadiness
};
