'use strict';

/**
 * AIOI-P4.6 — Interface Consistency Service (READ ONLY)
 *
 * Coerência da cadeia Trust → … → Decision Visualization via P4.5.
 */

const { isValidUUID } = require('../../utils/security');
const interfaceIntelligenceMetrics = require('./aioiInterfaceIntelligenceMetrics');
const decisionVisualizationReadModel = require('./aioiDecisionVisualizationReadModelService');

const INTERFACE_CONSISTENCY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'governance_excellence', 'institutionalization', 'sovereignty',
  'autonomy', 'consumption', 'visualization_readiness',
  'cockpit_readiness', 'decision_visualization'
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
    case 'decision_visualization':      return signals.enterpriseDecisionVisualizationScore != null;
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
    case 'decision_visualization':      return signals.enterpriseDecisionVisualizationScore ?? 0;
    default:                           return 0;
  }
}

function computeInterfaceConsistencyScore(dvrm) {
  const signals = interfaceIntelligenceMetrics._extractInterfaceIntelligenceSignals(dvrm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of INTERFACE_CONSISTENCY_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / INTERFACE_CONSISTENCY_STAGES.length;
  const avgScore = scoreSum / present;
  return interfaceIntelligenceMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildInterfaceConsistency(dvrm) {
  const consistency_score = computeInterfaceConsistencyScore(dvrm);
  return {
    consistency_score,
    consistency_status: interfaceIntelligenceMetrics.classifyInterfaceConsistency(consistency_score)
  };
}

async function getInterfaceConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const dvrmRes = await decisionVisualizationReadModel.getDecisionVisualizationReadModel(companyId);
    if (!dvrmRes.ok) {
      interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceConsistency', dvrmRes.error);
      return { ok: false, error: dvrmRes.error };
    }

    const interface_consistency = buildInterfaceConsistency(dvrmRes.decision_visualization_read_model);
    interfaceIntelligenceMetrics.recordInterfaceConsistencyAnalyzed(companyId);
    return { ok: true, interface_consistency };

  } catch (err) {
    interfaceIntelligenceMetrics.recordError(companyId, 'getInterfaceConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  INTERFACE_CONSISTENCY_STAGES,
  computeInterfaceConsistencyScore,
  buildInterfaceConsistency,
  getInterfaceConsistency
};
