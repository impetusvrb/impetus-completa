'use strict';

/**
 * AIOI-P4.2 — Decision Consumption Service (READ ONLY)
 *
 * Consumo executivo Trust → … → Autonomy via getAutonomyReadModel (P4.1).
 */

const { isValidUUID } = require('../../utils/security');
const consumptionMetrics = require('./aioiConsumptionMetrics');
const autonomyReadModel = require('./aioiAutonomyReadModelService');

const DECISION_CONSUMPTION_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty', 'autonomy'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':                return signals.trustScore != null;
    case 'assurance':              return signals.assuranceScore != null;
    case 'auditability':           return signals.auditabilityScore != null;
    case 'readiness':              return signals.readinessScore != null;
    case 'value_governance':       return signals.valueGovernanceScore != null;
    case 'sustainability':         return signals.sustainabilityScore != null;
    case 'certification':          return signals.certificationScore != null;
    case 'conformance':            return signals.conformanceScore != null;
    case 'governance_excellence':  return signals.governanceExcellenceScore != null;
    case 'institutionalization':   return signals.institutionalizationScore != null;
    case 'sovereignty':            return signals.sovereigntyScore != null;
    case 'autonomy':               return signals.autonomyScore != null;
    default:                       return false;
  }
}

function _stageScore(signals, stage) {
  switch (stage) {
    case 'trust':                return signals.trustScore ?? 0;
    case 'assurance':              return signals.assuranceScore ?? 0;
    case 'auditability':           return signals.auditabilityScore ?? 0;
    case 'readiness':              return signals.readinessScore ?? 0;
    case 'value_governance':       return signals.valueGovernanceScore ?? 0;
    case 'sustainability':         return signals.sustainabilityScore ?? 0;
    case 'certification':          return signals.certificationScore ?? 0;
    case 'conformance':            return signals.conformanceScore ?? 0;
    case 'governance_excellence':  return signals.governanceExcellenceScore ?? 0;
    case 'institutionalization':   return signals.institutionalizationScore ?? 0;
    case 'sovereignty':            return signals.sovereigntyScore ?? 0;
    case 'autonomy':               return signals.autonomyScore ?? 0;
    default:                       return 0;
  }
}

function computeDecisionConsumptionScore(arm) {
  const signals = consumptionMetrics._extractConsumptionSignals(arm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of DECISION_CONSUMPTION_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / DECISION_CONSUMPTION_STAGES.length;
  const avgScore = scoreSum / present;
  return consumptionMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildDecisionConsumption(arm) {
  const consumption_score = computeDecisionConsumptionScore(arm);
  return {
    consumption_score,
    consumption_status: consumptionMetrics.classifyDecisionConsumption(consumption_score)
  };
}

async function getDecisionConsumption(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const armRes = await autonomyReadModel.getAutonomyReadModel(companyId);
    if (!armRes.ok) {
      consumptionMetrics.recordError(companyId, 'getDecisionConsumption', armRes.error);
      return { ok: false, error: armRes.error };
    }

    const decision_consumption = buildDecisionConsumption(armRes.autonomy_read_model);
    consumptionMetrics.recordDecisionConsumptionAnalyzed(companyId);
    return { ok: true, decision_consumption };

  } catch (err) {
    consumptionMetrics.recordError(companyId, 'getDecisionConsumption', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  DECISION_CONSUMPTION_STAGES,
  computeDecisionConsumptionScore,
  buildDecisionConsumption,
  getDecisionConsumption
};
