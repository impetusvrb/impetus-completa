'use strict';

/**
 * AIOI-P4.3 — Visualization Consistency Service (READ ONLY)
 *
 * Consistência da cadeia Trust → … → Consumption via getConsumptionReadModel (P4.2).
 */

const { isValidUUID } = require('../../utils/security');
const visualizationMetrics = require('./aioiVisualizationMetrics');
const consumptionReadModel = require('./aioiConsumptionReadModelService');

const VISUALIZATION_CONSISTENCY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty', 'autonomy', 'consumption'
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
    case 'consumption':            return signals.consumptionScore != null;
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
    case 'consumption':            return signals.consumptionScore ?? 0;
    default:                       return 0;
  }
}

function computeVisualizationConsistencyScore(crm) {
  const signals = visualizationMetrics._extractVisualizationSignals(crm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of VISUALIZATION_CONSISTENCY_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / VISUALIZATION_CONSISTENCY_STAGES.length;
  const avgScore = scoreSum / present;
  return visualizationMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildVisualizationConsistency(crm) {
  const consistency_score = computeVisualizationConsistencyScore(crm);
  return {
    consistency_score,
    consistency_status: visualizationMetrics.classifyVisualizationConsistency(consistency_score)
  };
}

async function getVisualizationConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const crmRes = await consumptionReadModel.getConsumptionReadModel(companyId);
    if (!crmRes.ok) {
      visualizationMetrics.recordError(companyId, 'getVisualizationConsistency', crmRes.error);
      return { ok: false, error: crmRes.error };
    }

    const visualization_consistency = buildVisualizationConsistency(crmRes.consumption_read_model);
    visualizationMetrics.recordVisualizationConsistencyAnalyzed(companyId);
    return { ok: true, visualization_consistency };

  } catch (err) {
    visualizationMetrics.recordError(companyId, 'getVisualizationConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VISUALIZATION_CONSISTENCY_STAGES,
  computeVisualizationConsistencyScore,
  buildVisualizationConsistency,
  getVisualizationConsistency
};
