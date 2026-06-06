'use strict';

/**
 * AIOI-P3.4 — Intelligence Utilization Service (READ ONLY)
 *
 * Mede utilização efetiva das capacidades P2.1–P3.3 via composição P3.3.
 */

const { isValidUUID } = require('../../utils/security');
const vgMetrics = require('./aioiValueGovernanceMetrics');
const readinessReadModel = require('./aioiReadinessReadModelService');

const UTILIZATION_LAYERS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness'
]);

function _layerUtilized(rrm, layer) {
  const arm = rrm?.auditability_read_model;
  const cmd = arm?.assurance_read_model?.trust_read_model?.executive_command_read_model;

  switch (layer) {
    case 'governance':       return !!cmd?.governance_read_model;
    case 'predictive':       return !!cmd?.predictive_read_model;
    case 'maturity':         return !!cmd?.maturity_read_model;
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

function computeUtilizationScore(rrm) {
  let utilized = 0;
  for (const layer of UTILIZATION_LAYERS) {
    if (_layerUtilized(rrm, layer)) utilized++;
  }

  let score = Math.round((utilized / UTILIZATION_LAYERS.length) * 85);

  const adoption = rrm?.adoption_analysis?.adoption_score;
  if (adoption >= 70) score += 8;
  else if (adoption >= 40) score += 4;

  const readiness = rrm?.enterprise_scale_readiness?.enterprise_readiness_score;
  if (readiness >= 70) score += 7;
  else if (readiness >= 40) score += 3;

  return vgMetrics.clampScore(score);
}

function buildIntelligenceUtilization(rrm) {
  const utilization_score = computeUtilizationScore(rrm);
  return {
    utilization_score,
    utilization_status: vgMetrics.classifyUtilizationStatus(utilization_score)
  };
}

async function getIntelligenceUtilization(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const readyRes = await readinessReadModel.getReadinessReadModel(companyId);
    if (!readyRes.ok) {
      vgMetrics.recordError(companyId, 'getIntelligenceUtilization', readyRes.error);
      return { ok: false, error: readyRes.error };
    }

    const intelligence_utilization = buildIntelligenceUtilization(readyRes.readiness_read_model);
    vgMetrics.recordUtilizationAnalyzed(companyId);
    return { ok: true, intelligence_utilization };

  } catch (err) {
    vgMetrics.recordError(companyId, 'getIntelligenceUtilization', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  UTILIZATION_LAYERS,
  computeUtilizationScore,
  buildIntelligenceUtilization,
  getIntelligenceUtilization
};
