'use strict';

/**
 * AIOI-P3.7 — Standards Coverage Service (READ ONLY)
 *
 * Cobertura de 17 domínios certificados via getCertificationReadModel (P3.6).
 */

const { isValidUUID } = require('../../utils/security');
const confMetrics = require('./aioiConformanceMetrics');
const certificationReadModel = require('./aioiCertificationReadModelService');

const STANDARDS_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification'
]);

function _domainCovered(crm, domain) {
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
    default:
      return false;
  }
}

function computeStandardsCoverageScore(crm) {
  let covered = 0;
  for (const domain of STANDARDS_DOMAINS) {
    if (_domainCovered(crm, domain)) covered++;
  }
  return confMetrics.clampScore(Math.round((covered / STANDARDS_DOMAINS.length) * 100));
}

function buildStandardsCoverage(crm) {
  const coverage_score = computeStandardsCoverageScore(crm);
  return {
    coverage_score,
    coverage_status: confMetrics.classifyCoverageStatus(coverage_score)
  };
}

async function getStandardsCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const certRes = await certificationReadModel.getCertificationReadModel(companyId);
    if (!certRes.ok) {
      confMetrics.recordError(companyId, 'getStandardsCoverage', certRes.error);
      return { ok: false, error: certRes.error };
    }

    const standards_coverage = buildStandardsCoverage(certRes.certification_read_model);
    confMetrics.recordStandardsCoverageAnalyzed(companyId);
    return { ok: true, standards_coverage };

  } catch (err) {
    confMetrics.recordError(companyId, 'getStandardsCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  STANDARDS_DOMAINS,
  computeStandardsCoverageScore,
  buildStandardsCoverage,
  getStandardsCoverage
};
