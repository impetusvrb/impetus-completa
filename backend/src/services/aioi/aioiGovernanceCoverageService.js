'use strict';

/**
 * AIOI-P3.2 — Governance Coverage Service (READ ONLY)
 *
 * Cobertura dos domínios de governança via read models existentes (P3.1).
 */

const { isValidUUID } = require('../../utils/security');
const auditMetrics = require('./aioiAuditabilityMetrics');
const assuranceReadModel = require('./aioiAssuranceReadModelService');

const GOVERNANCE_DOMAINS = Object.freeze([
  'governance', 'predictive', 'benchmark', 'strategic', 'value',
  'resilience', 'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance'
]);

function _domainPresent(arm, domain) {
  const cmd = arm?.trust_read_model?.executive_command_read_model;
  switch (domain) {
    case 'governance':
      return !!cmd?.governance_read_model;
    case 'predictive':
      return !!cmd?.predictive_read_model;
    case 'benchmark':
      return !!(cmd?.maturity_read_model?.benchmark || cmd?.maturity_read_model?.maturity);
    case 'strategic':
      return !!cmd?.strategic_read_model;
    case 'value':
      return !!cmd?.value_read_model;
    case 'resilience':
      return !!cmd?.resilience_read_model;
    case 'scenario':
      return !!cmd?.scenario_read_model;
    case 'digital_twin':
      return !!cmd?.digital_twin_read_model?.operational_state;
    case 'executive_command':
      return !!cmd?.executive_command_state;
    case 'trust':
      return arm?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return arm?.intelligence_assurance?.assurance_score != null;
    default:
      return false;
  }
}

function computeGovernanceScore(arm) {
  let present = 0;
  for (const domain of GOVERNANCE_DOMAINS) {
    if (_domainPresent(arm, domain)) present++;
  }
  return auditMetrics.clampScore(Math.round((present / GOVERNANCE_DOMAINS.length) * 100));
}

function buildGovernanceCoverage(arm) {
  const governance_score = computeGovernanceScore(arm);
  return {
    governance_score,
    governance_status: auditMetrics.classifyGovernanceStatus(governance_score)
  };
}

async function getGovernanceCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const assuranceRes = await assuranceReadModel.getAssuranceReadModel(companyId);
    if (!assuranceRes.ok) {
      auditMetrics.recordError(companyId, 'getGovernanceCoverage', assuranceRes.error);
      return { ok: false, error: assuranceRes.error };
    }

    const governance_coverage = buildGovernanceCoverage(assuranceRes.assurance_read_model);
    auditMetrics.recordGovernanceCoverageAnalyzed(companyId);
    return { ok: true, governance_coverage };

  } catch (err) {
    auditMetrics.recordError(companyId, 'getGovernanceCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  GOVERNANCE_DOMAINS,
  computeGovernanceScore,
  buildGovernanceCoverage,
  getGovernanceCoverage
};
