'use strict';

/**
 * AIOI-P4.4 — Strategic Overview Service (READ ONLY)
 *
 * Visão executiva da cadeia Trust → … → Visualization Readiness via P4.3.
 */

const { isValidUUID } = require('../../utils/security');
const cockpitMetrics = require('./aioiCockpitMetrics');
const visualizationReadModel = require('./aioiVisualizationReadModelService');

const STRATEGIC_OVERVIEW_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty',
  'autonomy', 'consumption', 'visualization_readiness'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':                    return signals.trustScore != null;
    case 'assurance':                  return signals.assuranceScore != null;
    case 'auditability':               return signals.auditabilityScore != null;
    case 'readiness':                  return signals.readinessScore != null;
    case 'value_governance':           return signals.valueGovernanceScore != null;
    case 'sustainability':             return signals.sustainabilityScore != null;
    case 'certification':              return signals.certificationScore != null;
    case 'conformance':                return signals.conformanceScore != null;
    case 'governance_excellence':      return signals.governanceExcellenceScore != null;
    case 'institutionalization':       return signals.institutionalizationScore != null;
    case 'sovereignty':                return signals.sovereigntyScore != null;
    case 'autonomy':                   return signals.autonomyScore != null;
    case 'consumption':                return signals.consumptionScore != null;
    case 'visualization_readiness':    return signals.visualizationReadinessScore != null;
    default:                           return false;
  }
}

function _stageScore(signals, stage) {
  switch (stage) {
    case 'trust':                    return signals.trustScore ?? 0;
    case 'assurance':                  return signals.assuranceScore ?? 0;
    case 'auditability':               return signals.auditabilityScore ?? 0;
    case 'readiness':                  return signals.readinessScore ?? 0;
    case 'value_governance':           return signals.valueGovernanceScore ?? 0;
    case 'sustainability':             return signals.sustainabilityScore ?? 0;
    case 'certification':              return signals.certificationScore ?? 0;
    case 'conformance':                return signals.conformanceScore ?? 0;
    case 'governance_excellence':      return signals.governanceExcellenceScore ?? 0;
    case 'institutionalization':       return signals.institutionalizationScore ?? 0;
    case 'sovereignty':                return signals.sovereigntyScore ?? 0;
    case 'autonomy':                   return signals.autonomyScore ?? 0;
    case 'consumption':                return signals.consumptionScore ?? 0;
    case 'visualization_readiness':    return signals.visualizationReadinessScore ?? 0;
    default:                           return 0;
  }
}

function computeStrategicOverviewScore(vrm) {
  const signals = cockpitMetrics._extractCockpitSignals(vrm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of STRATEGIC_OVERVIEW_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / STRATEGIC_OVERVIEW_STAGES.length;
  const avgScore = scoreSum / present;
  return cockpitMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildStrategicOverview(vrm) {
  const overview_score = computeStrategicOverviewScore(vrm);
  return {
    overview_score,
    overview_status: cockpitMetrics.classifyStrategicOverview(overview_score)
  };
}

async function getStrategicOverview(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vrmRes = await visualizationReadModel.getVisualizationReadModel(companyId);
    if (!vrmRes.ok) {
      cockpitMetrics.recordError(companyId, 'getStrategicOverview', vrmRes.error);
      return { ok: false, error: vrmRes.error };
    }

    const strategic_overview = buildStrategicOverview(vrmRes.visualization_read_model);
    cockpitMetrics.recordStrategicOverviewAnalyzed(companyId);
    return { ok: true, strategic_overview };

  } catch (err) {
    cockpitMetrics.recordError(companyId, 'getStrategicOverview', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  STRATEGIC_OVERVIEW_STAGES,
  computeStrategicOverviewScore,
  buildStrategicOverview,
  getStrategicOverview
};
