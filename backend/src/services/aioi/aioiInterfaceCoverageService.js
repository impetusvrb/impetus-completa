'use strict';

/**
 * AIOI-P4.6 — Interface Coverage Service (READ ONLY)
 *
 * Cobertura de elementos para consumo por interfaces via P4.5.
 */

const { isValidUUID } = require('../../utils/security');
const interfaceIntelligenceMetrics = require('./aioiInterfaceIntelligenceMetrics');
const decisionVisualizationReadModel = require('./aioiDecisionVisualizationReadModelService');

const INTERFACE_COVERAGE_DOMAINS = Object.freeze([
  'decision_perspective', 'decision_consistency', 'decision_visualization_coverage',
  'enterprise_decision_visualization', 'executive_summary', 'strategic_overview',
  'cockpit_readiness', 'visualization_readiness', 'visualization_coverage',
  'visualization_consistency', 'enterprise_consumption', 'trust',
  'governance_excellence', 'sovereignty', 'consumption'
]);

function _domainCovered(dvrm, domain) {
  const ecrm = dvrm?.executive_cockpit_read_model;
  const vrm = ecrm?.visualization_read_model;
  const crm = vrm?.consumption_read_model;
  const signals = interfaceIntelligenceMetrics._extractInterfaceIntelligenceSignals(dvrm);

  switch (domain) {
    case 'decision_perspective':
      return dvrm?.decision_perspective?.perspective_score != null;
    case 'decision_consistency':
      return dvrm?.decision_consistency?.consistency_score != null;
    case 'decision_visualization_coverage':
      return dvrm?.decision_visualization_coverage?.coverage_score != null;
    case 'enterprise_decision_visualization':
      return dvrm?.enterprise_decision_visualization?.visualization_score != null;
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
    case 'enterprise_consumption':
      return crm?.enterprise_consumption?.consumption_score != null;
    case 'trust':
      return signals.trustScore != null;
    case 'governance_excellence':
      return signals.governanceExcellenceScore != null;
    case 'sovereignty':
      return signals.sovereigntyScore != null;
    case 'consumption':
      return signals.consumptionScore != null;
    default:
      return false;
  }
}

function computeInterfaceCoverageScore(dvrm) {
  let covered = 0;
  for (const domain of INTERFACE_COVERAGE_DOMAINS) {
    if (_domainCovered(dvrm, domain)) covered++;
  }
  return interfaceIntelligenceMetrics.clampScore(
    Math.round((covered / INTERFACE_COVERAGE_DOMAINS.length) * 100)
  );
}

function buildInterfaceCoverage(dvrm) {
  const coverage_score = computeInterfaceCoverageScore(dvrm);
  return {
    coverage_score,
    coverage_status: interfaceIntelligenceMetrics.classifyInterfaceCoverage(coverage_score)
  };
}

async function getInterfaceCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const dvrmRes = await decisionVisualizationReadModel.getDecisionVisualizationReadModel(companyId);
    if (!dvrmRes.ok) {
      interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceCoverage', dvrmRes.error);
      return { ok: false, error: dvrmRes.error };
    }

    const interface_coverage = buildInterfaceCoverage(dvrmRes.decision_visualization_read_model);
    interfaceIntelligenceMetrics.recordInterfaceCoverageAnalyzed(companyId);
    return { ok: true, interface_coverage };

  } catch (err) {
    interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  INTERFACE_COVERAGE_DOMAINS,
  computeInterfaceCoverageScore,
  buildInterfaceCoverage,
  getInterfaceCoverage
};
