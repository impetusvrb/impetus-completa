'use strict';

/**
 * AIOI-P4.5 — Decision Consistency Service (READ ONLY)
 *
 * Coerência da cadeia Trust → … → Cockpit Readiness via P4.4.
 */

const { isValidUUID } = require('../../utils/security');
const decisionVisualizationMetrics = require('./aioiDecisionVisualizationMetrics');
const executiveCockpitReadModel = require('./aioiExecutiveCockpitReadModelService');

const DECISION_CONSISTENCY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'governance_excellence', 'institutionalization', 'sovereignty',
  'autonomy', 'consumption', 'visualization_readiness', 'cockpit_readiness'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':                    return signals.trustScore != null;
    case 'assurance':                  return signals.assuranceScore != null;
    case 'auditability':               return signals.auditabilityScore != null;
    case 'readiness':                  return signals.readinessScore != null;
    case 'governance_excellence':      return signals.governanceExcellenceScore != null;
    case 'institutionalization':       return signals.institutionalizationScore != null;
    case 'sovereignty':                return signals.sovereigntyScore != null;
    case 'autonomy':                   return signals.autonomyScore != null;
    case 'consumption':                return signals.consumptionScore != null;
    case 'visualization_readiness':    return signals.visualizationReadinessScore != null;
    case 'cockpit_readiness':          return signals.cockpitReadinessScore != null;
    default:                           return false;
  }
}

function _stageScore(signals, stage) {
  switch (stage) {
    case 'trust':                    return signals.trustScore ?? 0;
    case 'assurance':                  return signals.assuranceScore ?? 0;
    case 'auditability':               return signals.auditabilityScore ?? 0;
    case 'readiness':                  return signals.readinessScore ?? 0;
    case 'governance_excellence':      return signals.governanceExcellenceScore ?? 0;
    case 'institutionalization':       return signals.institutionalizationScore ?? 0;
    case 'sovereignty':                return signals.sovereigntyScore ?? 0;
    case 'autonomy':                   return signals.autonomyScore ?? 0;
    case 'consumption':                return signals.consumptionScore ?? 0;
    case 'visualization_readiness':    return signals.visualizationReadinessScore ?? 0;
    case 'cockpit_readiness':          return signals.cockpitReadinessScore ?? 0;
    default:                           return 0;
  }
}

function computeDecisionConsistencyScore(ecrm) {
  const signals = decisionVisualizationMetrics._extractDecisionVisualizationSignals(ecrm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of DECISION_CONSISTENCY_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / DECISION_CONSISTENCY_STAGES.length;
  const avgScore = scoreSum / present;
  return decisionVisualizationMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildDecisionConsistency(ecrm) {
  const consistency_score = computeDecisionConsistencyScore(ecrm);
  return {
    consistency_score,
    consistency_status: decisionVisualizationMetrics.classifyDecisionConsistency(consistency_score)
  };
}

async function getDecisionConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const ecrmRes = await executiveCockpitReadModel.getExecutiveCockpitReadModel(companyId);
    if (!ecrmRes.ok) {
      decisionVisualizationMetrics.recordError(companyId, 'getDecisionConsistency', ecrmRes.error);
      return { ok: false, error: ecrmRes.error };
    }

    const decision_consistency = buildDecisionConsistency(ecrmRes.executive_cockpit_read_model);
    decisionVisualizationMetrics.recordDecisionConsistencyAnalyzed(companyId);
    return { ok: true, decision_consistency };

  } catch (err) {
    decisionVisualizationMetrics.recordError(companyId, 'getDecisionConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  DECISION_CONSISTENCY_STAGES,
  computeDecisionConsistencyScore,
  buildDecisionConsistency,
  getDecisionConsistency
};
