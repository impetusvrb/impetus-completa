'use strict';

/**
 * AIOI-P4.5 — Decision Visualization Coverage Service (READ ONLY)
 *
 * Cobertura executiva orientada à visualização via P4.4.
 */

const { isValidUUID } = require('../../utils/security');
const decisionVisualizationMetrics = require('./aioiDecisionVisualizationMetrics');
const executiveCockpitReadModel = require('./aioiExecutiveCockpitReadModelService');

const DECISION_VISUALIZATION_COVERAGE_DOMAINS = Object.freeze([
  'executive_summary', 'strategic_overview', 'cockpit_readiness',
  'visualization_readiness', 'visualization_coverage', 'visualization_consistency',
  'executive_presentation', 'enterprise_consumption', 'enterprise_autonomy',
  'sovereignty', 'governance_excellence', 'trust', 'readiness', 'consumption'
]);

function _domainCovered(ecrm, domain) {
  const vrm = ecrm?.visualization_read_model;
  const crm = vrm?.consumption_read_model;
  const signals = decisionVisualizationMetrics._extractDecisionVisualizationSignals(ecrm);

  switch (domain) {
    case 'executive_summary':
      return ecrm?.executive_summary?.summary_score != null;
    case 'strategic_overview':
      return ecrm?.strategic_overview?.overview_score != null;
    case 'cockpit_readiness':
      return ecrm?.enterprise_cockpit_readiness?.cockpit_score != null;
    case 'visualization_readiness':
      return vrm?.enterprise_visualization_readiness?.visualization_score != null;
    case 'visualization_coverage':
      return vrm?.visualization_coverage?.coverage_score != null;
    case 'visualization_consistency':
      return vrm?.visualization_consistency?.consistency_score != null;
    case 'executive_presentation':
      return vrm?.executive_presentation?.presentation_score != null;
    case 'enterprise_consumption':
      return crm?.enterprise_consumption?.consumption_score != null;
    case 'enterprise_autonomy':
      return crm?.autonomy_read_model?.enterprise_autonomy?.autonomy_score != null;
    case 'sovereignty':
      return signals.sovereigntyScore != null;
    case 'governance_excellence':
      return signals.governanceExcellenceScore != null;
    case 'trust':
      return signals.trustScore != null;
    case 'readiness':
      return signals.readinessScore != null;
    case 'consumption':
      return signals.consumptionScore != null;
    default:
      return false;
  }
}

function computeDecisionVisualizationCoverageScore(ecrm) {
  let covered = 0;
  for (const domain of DECISION_VISUALIZATION_COVERAGE_DOMAINS) {
    if (_domainCovered(ecrm, domain)) covered++;
  }
  return decisionVisualizationMetrics.clampScore(
    Math.round((covered / DECISION_VISUALIZATION_COVERAGE_DOMAINS.length) * 100)
  );
}

function buildDecisionVisualizationCoverage(ecrm) {
  const coverage_score = computeDecisionVisualizationCoverageScore(ecrm);
  return {
    coverage_score,
    coverage_status: decisionVisualizationMetrics.classifyDecisionVisualizationCoverage(coverage_score)
  };
}

async function getDecisionVisualizationCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const ecrmRes = await executiveCockpitReadModel.getExecutiveCockpitReadModel(companyId);
    if (!ecrmRes.ok) {
      decisionVisualizationMetrics.recordError(companyId, 'getDecisionVisualizationCoverage', ecrmRes.error);
      return { ok: false, error: ecrmRes.error };
    }

    const decision_visualization_coverage = buildDecisionVisualizationCoverage(ecrmRes.executive_cockpit_read_model);
    decisionVisualizationMetrics.recordDecisionVisualizationCoverageAnalyzed(companyId);
    return { ok: true, decision_visualization_coverage };

  } catch (err) {
    decisionVisualizationMetrics.recordError(companyId, 'getDecisionVisualizationCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  DECISION_VISUALIZATION_COVERAGE_DOMAINS,
  computeDecisionVisualizationCoverageScore,
  buildDecisionVisualizationCoverage,
  getDecisionVisualizationCoverage
};
