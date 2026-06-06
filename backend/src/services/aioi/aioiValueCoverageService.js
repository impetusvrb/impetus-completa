'use strict';

/**
 * AIOI-P3.4 — Value Coverage Service (READ ONLY)
 *
 * Cobertura de 13 domínios de valor via read model P3.3.
 */

const { isValidUUID } = require('../../utils/security');
const vgMetrics = require('./aioiValueGovernanceMetrics');
const readinessReadModel = require('./aioiReadinessReadModelService');

const VALUE_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness'
]);

function _domainCovered(rrm, domain) {
  const arm = rrm?.auditability_read_model;
  const cmd = arm?.assurance_read_model?.trust_read_model?.executive_command_read_model;

  switch (domain) {
    case 'governance':       return !!cmd?.governance_read_model;
    case 'predictive':       return !!cmd?.predictive_read_model;
    case 'maturity':         return !!(cmd?.maturity_read_model?.maturity || cmd?.maturity_read_model?.benchmark);
    case 'strategic':        return !!cmd?.strategic_read_model;
    case 'value':            return !!cmd?.value_read_model;
    case 'resilience':       return !!cmd?.resilience_read_model;
    case 'scenario':         return !!cmd?.scenario_read_model;
    case 'digital_twin':     return !!cmd?.digital_twin_read_model?.operational_state;
    case 'executive_command': return !!cmd?.executive_command_state;
    case 'trust':
      return arm?.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return arm?.assurance_read_model?.intelligence_assurance?.assurance_score != null;
    case 'auditability':
      return arm?.enterprise_auditability?.auditability_score != null;
    case 'readiness':
      return rrm?.enterprise_scale_readiness?.enterprise_readiness_score != null;
    default:
      return false;
  }
}

function computeCoverageScore(rrm) {
  let covered = 0;
  for (const domain of VALUE_DOMAINS) {
    if (_domainCovered(rrm, domain)) covered++;
  }
  return vgMetrics.clampScore(Math.round((covered / VALUE_DOMAINS.length) * 100));
}

function buildValueCoverage(rrm) {
  const coverage_score = computeCoverageScore(rrm);
  return {
    coverage_score,
    coverage_status: vgMetrics.classifyCoverageStatus(coverage_score)
  };
}

async function getValueCoverage(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const readyRes = await readinessReadModel.getReadinessReadModel(companyId);
    if (!readyRes.ok) {
      vgMetrics.recordError(companyId, 'getValueCoverage', readyRes.error);
      return { ok: false, error: readyRes.error };
    }

    const value_coverage = buildValueCoverage(readyRes.readiness_read_model);
    vgMetrics.recordValueCoverageAnalyzed(companyId);
    return { ok: true, value_coverage };

  } catch (err) {
    vgMetrics.recordError(companyId, 'getValueCoverage', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VALUE_DOMAINS,
  computeCoverageScore,
  buildValueCoverage,
  getValueCoverage
};
