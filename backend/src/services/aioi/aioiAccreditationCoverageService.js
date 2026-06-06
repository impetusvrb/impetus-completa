'use strict';

/**
 * AIOI-P3.6 — Accreditation Coverage Service (READ ONLY)
 *
 * Cobertura de 16 capacidades via getSustainabilityReadModel (P3.5).
 */

const { isValidUUID } = require('../../utils/security');
const certMetrics = require('./aioiCertificationMetrics');
const sustainabilityReadModel = require('./aioiSustainabilityReadModelService');

const ACCREDITATION_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability'
]);

function _domainCovered(srm, domain) {
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
    default:
      return false;
  }
}

function computeAccreditationCoverageScore(srm) {
  let covered = 0;
  for (const domain of ACCREDITATION_DOMAINS) {
    if (_domainCovered(srm, domain)) covered++;
  }
  return certMetrics.clampScore(Math.round((covered / ACCREDITATION_DOMAINS.length) * 100));
}

function buildAccreditationCoverage(srm) {
  const coverage_score = computeAccreditationCoverageScore(srm);
  return {
    coverage_score,
    coverage_status: certMetrics.classifyCoverageStatus(coverage_score)
  };
}

async function getAccreditationCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const susRes = await sustainabilityReadModel.getSustainabilityReadModel(companyId);
    if (!susRes.ok) {
      certMetrics.recordError(companyId, 'getAccreditationCoverage', susRes.error);
      return { ok: false, error: susRes.error };
    }

    const accreditation_coverage = buildAccreditationCoverage(susRes.sustainability_read_model);
    certMetrics.recordAccreditationCoverageAnalyzed(companyId);
    return { ok: true, accreditation_coverage };

  } catch (err) {
    certMetrics.recordError(companyId, 'getAccreditationCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ACCREDITATION_DOMAINS,
  computeAccreditationCoverageScore,
  buildAccreditationCoverage,
  getAccreditationCoverage
};
