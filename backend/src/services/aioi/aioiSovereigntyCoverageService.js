'use strict';

/**
 * AIOI-P4.0 — Sovereignty Coverage Service (READ ONLY)
 *
 * Cobertura de 20 domínios via getInstitutionalizationReadModel (P3.9).
 */

const { isValidUUID } = require('../../utils/security');
const sovMetrics = require('./aioiSovereigntyMetrics');
const institutionalizationReadModel = require('./aioiInstitutionalizationReadModelService');

const SOVEREIGNTY_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification', 'conformance', 'governance_excellence', 'institutionalization'
]);

function _domainCovered(irm, domain) {
  const germ = irm?.governance_excellence_read_model;
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
    case 'institutionalization':
      return irm?.enterprise_institutionalization?.institutionalization_score != null;
    default:
      return false;
  }
}

function computeSovereigntyCoverageScore(irm) {
  let covered = 0;
  for (const domain of SOVEREIGNTY_DOMAINS) {
    if (_domainCovered(irm, domain)) covered++;
  }
  return sovMetrics.clampScore(Math.round((covered / SOVEREIGNTY_DOMAINS.length) * 100));
}

function buildSovereigntyCoverage(irm) {
  const coverage_score = computeSovereigntyCoverageScore(irm);
  return {
    coverage_score,
    coverage_status: sovMetrics.classifySovereigntyCoverage(coverage_score)
  };
}

async function getSovereigntyCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const irmRes = await institutionalizationReadModel.getInstitutionalizationReadModel(companyId);
    if (!irmRes.ok) {
      sovMetrics.recordError(companyId, 'getSovereigntyCoverage', irmRes.error);
      return { ok: false, error: irmRes.error };
    }

    const sovereignty_coverage = buildSovereigntyCoverage(irmRes.institutionalization_read_model);
    sovMetrics.recordSovereigntyCoverageAnalyzed(companyId);
    return { ok: true, sovereignty_coverage };

  } catch (err) {
    sovMetrics.recordError(companyId, 'getSovereigntyCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  SOVEREIGNTY_DOMAINS,
  computeSovereigntyCoverageScore,
  buildSovereigntyCoverage,
  getSovereigntyCoverage
};
