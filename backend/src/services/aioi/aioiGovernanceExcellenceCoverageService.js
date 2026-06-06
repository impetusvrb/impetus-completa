'use strict';

/**
 * AIOI-P3.8 — Governance Excellence Coverage Service (READ ONLY)
 *
 * Cobertura de 18 domínios via getConformanceReadModel (P3.7).
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceExcellenceMetrics');
const conformanceReadModel = require('./aioiConformanceReadModelService');

const EXCELLENCE_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification', 'conformance'
]);

function _domainCovered(confRm, domain) {
  const crm = confRm?.certification_read_model;
  const srm = crm?.sustainability_read_model;
  const vgrm = srm?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const cmd = arm?.assurance_read_model?.trust_read_model?.executive_command_read_model;

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
      return arm?.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return arm?.assurance_read_model?.intelligence_assurance?.assurance_score != null;
    case 'auditability':
      return arm?.enterprise_auditability?.auditability_score != null;
    case 'readiness':
      return rrm?.enterprise_scale_readiness?.enterprise_readiness_score != null;
    case 'adoption':
      return rrm?.adoption_analysis?.adoption_score != null;
    case 'value_governance':
      return vgrm?.enterprise_value_governance?.value_governance_score != null;
    case 'sustainability':
      return srm?.enterprise_sustainability?.enterprise_sustainability_score != null;
    case 'certification':
      return crm?.enterprise_certification?.certification_score != null;
    case 'conformance':
      return confRm?.intelligence_conformance?.conformance_score != null;
    default:
      return false;
  }
}

function computeGovernanceExcellenceCoverageScore(confRm) {
  let covered = 0;
  for (const domain of EXCELLENCE_DOMAINS) {
    if (_domainCovered(confRm, domain)) covered++;
  }
  return govMetrics.clampScore(Math.round((covered / EXCELLENCE_DOMAINS.length) * 100));
}

function buildGovernanceExcellenceCoverage(confRm) {
  const coverage_score = computeGovernanceExcellenceCoverageScore(confRm);
  return {
    coverage_score,
    coverage_status: govMetrics.classifyGovernanceCoverage(coverage_score)
  };
}

async function getGovernanceExcellenceCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const confRes = await conformanceReadModel.getConformanceReadModel(companyId);
    if (!confRes.ok) {
      govMetrics.recordError(companyId, 'getGovernanceExcellenceCoverage', confRes.error);
      return { ok: false, error: confRes.error };
    }

    const governance_excellence_coverage = buildGovernanceExcellenceCoverage(confRes.conformance_read_model);
    govMetrics.recordGovernanceCoverageAnalyzed(companyId);
    return { ok: true, governance_excellence_coverage };

  } catch (err) {
    govMetrics.recordError(companyId, 'getGovernanceExcellenceCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  EXCELLENCE_DOMAINS,
  computeGovernanceExcellenceCoverageScore,
  buildGovernanceExcellenceCoverage,
  getGovernanceExcellenceCoverage
};
