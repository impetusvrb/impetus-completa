'use strict';

/**
 * AIOI-P3.0 — Model Consistency Analysis Service (READ ONLY)
 *
 * Alinhamento entre read models P2.1–P2.9 — composição, sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const trustMetrics = require('./aioiTrustMetrics');
const commandReadModel = require('./aioiExecutiveCommandReadModelService');

const REQUIRED_LAYERS = Object.freeze([
  'governance_read_model',
  'predictive_read_model',
  'maturity_read_model',
  'strategic_read_model',
  'value_read_model',
  'resilience_read_model',
  'scenario_read_model',
  'digital_twin_read_model',
  'executive_command_state'
]);

function _layerPresenceScore(cmdModel) {
  let present = 0;
  for (const key of REQUIRED_LAYERS) {
    if (cmdModel[key] != null) present++;
  }
  return Math.round((present / REQUIRED_LAYERS.length) * 60);
}

function _signalAlignmentScore(cmdModel) {
  const op = cmdModel.executive_command_state?.operational_state;
  if (!op) return 20;

  let aligned = 0;
  let checks = 0;

  const gov = op.governance_status;
  const valueScore = op.operational_value?.operational_value_score ?? 50;
  const resilience = op.resilience_status;
  const readiness = cmdModel.executive_readiness?.readiness_score ?? 50;
  const twinScore = cmdModel.digital_twin_read_model?.twin_consistency?.consistency_score ?? 50;

  checks++;
  if ((gov === 'healthy' && valueScore >= 50) || (gov !== 'healthy' && valueScore < 60)) aligned++;

  checks++;
  if ((resilience === 'highly_resilient' && readiness >= 60) ||
      (resilience === 'fragile' && readiness < 70) ||
      resilience === 'resilient') aligned++;

  checks++;
  if (Math.abs(valueScore - twinScore) <= 30) aligned++;

  checks++;
  const maturityLevel = op.maturity_level;
  if ((maturityLevel === 'optimized' || maturityLevel === 'autonomous_ready') && valueScore >= 60) aligned++;
  else if (maturityLevel === 'initial' || maturityLevel === 'developing') aligned++;
  else if (valueScore >= 40) aligned++;

  return Math.round((aligned / checks) * 40);
}

function computeModelConsistencyScore(cmdModel) {
  if (!cmdModel) return 0;
  return trustMetrics.clampScore(_layerPresenceScore(cmdModel) + _signalAlignmentScore(cmdModel));
}

function buildModelConsistency(cmdModel) {
  const consistency_score = computeModelConsistencyScore(cmdModel);
  return {
    consistency_score,
    consistency_status: trustMetrics.classifyConsistencyStatus(consistency_score)
  };
}

async function getModelConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const cmdRes = await commandReadModel.getExecutiveCommandReadModel(companyId);
    if (!cmdRes.ok) {
      trustMetrics.recordError(companyId, 'getModelConsistency', cmdRes.error);
      return { ok: false, error: cmdRes.error };
    }

    const model_consistency = buildModelConsistency(cmdRes.executive_command_read_model);
    trustMetrics.recordConsistencyAnalyzed(companyId);
    return { ok: true, model_consistency };

  } catch (err) {
    trustMetrics.recordError(companyId, 'getModelConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  REQUIRED_LAYERS,
  computeModelConsistencyScore,
  buildModelConsistency,
  getModelConsistency
};
