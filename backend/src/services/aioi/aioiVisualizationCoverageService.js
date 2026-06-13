'use strict';

/**
 * AIOI-P4.3 — Visualization Coverage Service (READ ONLY)
 *
 * Cobertura de 23 domínios via getConsumptionReadModel (P4.2).
 */

const { isValidUUID } = require('../../utils/security');
const visualizationMetrics = require('./aioiVisualizationMetrics');
const consumptionReadModel = require('./aioiConsumptionReadModelService');

const VISUALIZATION_COVERAGE_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification', 'conformance', 'governance_excellence', 'institutionalization',
  'sovereignty', 'autonomy', 'consumption'
]);

function _domainCovered(crm, domain) {
  const arm = crm?.autonomy_read_model;
  const srm = arm?.sovereignty_read_model;
  const irm = srm?.institutionalization_read_model;
  const germ = irm?.governance_excellence_read_model;
  const confRm = germ?.conformance_read_model;
  const certRm = confRm?.certification_read_model;
  const srmNested = certRm?.sustainability_read_model;
  const vgrm = srmNested?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const auditRm = rrm?.auditability_read_model;
  const cmd = auditRm?.assurance_read_model?.trust_read_model?.executive_command_read_model;

  switch (domain) {
    case 'governance':        return !!cmd?.governance_read_model;
    case 'predictive':        return !!cmd?.predictive_read_model;
    case 'maturity':          return !!(cmd?.maturity_read_model?.maturity || cmd?.maturity_read_model?.benchmark);
    case 'strategic':         return !!cmd?.strategic_read_model;
    case 'value':             return !!cmd?.value_read_model;
    case 'resilience':        return !!cmd?.resilience_read_model;
    case 'scenario':          return !!cmd?.scenario_read_model;
    case 'digital_twin':      return !!cmd?.digital_twin_read_model?.operational_state;
    case 'executive_command': return !!cmd?.executive_command_state;
    case 'trust':
      return auditRm?.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return auditRm?.assurance_read_model?.intelligence_assurance?.assurance_score != null;
    case 'auditability':
      return auditRm?.enterprise_auditability?.auditability_score != null;
    case 'readiness':
      return rrm?.enterprise_scale_readiness?.enterprise_readiness_score != null;
    case 'adoption':
      return rrm?.adoption_analysis?.adoption_score != null;
    case 'value_governance':
      return vgrm?.enterprise_value_governance?.value_governance_score != null;
    case 'sustainability':
      return srmNested?.enterprise_sustainability?.enterprise_sustainability_score != null;
    case 'certification':
      return certRm?.enterprise_certification?.certification_score != null;
    case 'conformance':
      return confRm?.intelligence_conformance?.conformance_score != null;
    case 'governance_excellence':
      return germ?.enterprise_governance_excellence?.governance_excellence_score != null;
    case 'institutionalization':
      return irm?.enterprise_institutionalization?.institutionalization_score != null;
    case 'sovereignty':
      return srm?.enterprise_sovereignty?.sovereignty_score != null;
    case 'autonomy':
      return arm?.enterprise_autonomy?.autonomy_score != null;
    case 'consumption':
      return crm?.enterprise_consumption?.consumption_score != null;
    default:
      return false;
  }
}

function computeVisualizationCoverageScore(crm) {
  let covered = 0;
  for (const domain of VISUALIZATION_COVERAGE_DOMAINS) {
    if (_domainCovered(crm, domain)) covered++;
  }
  return visualizationMetrics.clampScore(Math.round((covered / VISUALIZATION_COVERAGE_DOMAINS.length) * 100));
}

function buildVisualizationCoverage(crm) {
  const coverage_score = computeVisualizationCoverageScore(crm);
  return {
    coverage_score,
    coverage_status: visualizationMetrics.classifyVisualizationCoverage(coverage_score)
  };
}

async function getVisualizationCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const crmRes = await consumptionReadModel.getConsumptionReadModel(companyId);
    if (!crmRes.ok) {
      visualizationMetrics.recordError(companyId, 'getVisualizationCoverage', crmRes.error);
      return { ok: false, error: crmRes.error };
    }

    const visualization_coverage = buildVisualizationCoverage(crmRes.consumption_read_model);
    visualizationMetrics.recordVisualizationCoverageAnalyzed(companyId);
    return { ok: true, visualization_coverage };

  } catch (err) {
    visualizationMetrics.recordError(companyId, 'getVisualizationCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VISUALIZATION_COVERAGE_DOMAINS,
  computeVisualizationCoverageScore,
  buildVisualizationCoverage,
  getVisualizationCoverage
};
