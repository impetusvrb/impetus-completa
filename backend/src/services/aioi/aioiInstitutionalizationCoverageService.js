'use strict';

/**
 * AIOI-P3.9 — Institutionalization Coverage Service (READ ONLY)
 *
 * Cobertura de 19 domínios via getGovernanceExcellenceReadModel (P3.8).
 */

const { isValidUUID } = require('../../utils/security');
const instMetrics = require('./aioiInstitutionalizationMetrics');
const governanceExcellenceReadModel = require('./aioiGovernanceExcellenceReadModelService');

const INSTITUTIONALIZATION_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification', 'conformance', 'governance_excellence'
]);

function _domainCovered(germ, domain) {
  const confRm = germ?.conformance_read_model;
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
    case 'governance_excellence':
      return germ?.enterprise_governance_excellence?.governance_excellence_score != null;
    default:
      return false;
  }
}

function computeInstitutionalizationCoverageScore(germ) {
  let covered = 0;
  for (const domain of INSTITUTIONALIZATION_DOMAINS) {
    if (_domainCovered(germ, domain)) covered++;
  }
  return instMetrics.clampScore(Math.round((covered / INSTITUTIONALIZATION_DOMAINS.length) * 100));
}

function buildInstitutionalizationCoverage(germ) {
  const coverage_score = computeInstitutionalizationCoverageScore(germ);
  return {
    coverage_score,
    coverage_status: instMetrics.classifyInstitutionalizationCoverage(coverage_score)
  };
}

async function getInstitutionalizationCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const germRes = await governanceExcellenceReadModel.getGovernanceExcellenceReadModel(companyId);
    if (!germRes.ok) {
      instMetrics.recordError(companyId, 'getInstitutionalizationCoverage', germRes.error);
      return { ok: false, error: germRes.error };
    }

    const institutionalization_coverage = buildInstitutionalizationCoverage(germRes.governance_excellence_read_model);
    instMetrics.recordInstitutionalizationCoverageAnalyzed(companyId);
    return { ok: true, institutionalization_coverage };

  } catch (err) {
    instMetrics.recordError(companyId, 'getInstitutionalizationCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  INSTITUTIONALIZATION_DOMAINS,
  computeInstitutionalizationCoverageScore,
  buildInstitutionalizationCoverage,
  getInstitutionalizationCoverage
};
