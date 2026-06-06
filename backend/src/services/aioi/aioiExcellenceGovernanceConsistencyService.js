'use strict';

/**
 * AIOI-P3.8 — Excellence Governance Consistency Service (READ ONLY)
 *
 * Coerência Trust → … → Conformance via getConformanceReadModel (P3.7).
 * Nome distinto de aioiGovernanceConsistencyService.js (P2.3 — ciclo operacional).
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceExcellenceMetrics');
const conformanceReadModel = require('./aioiConformanceReadModelService');

const CONSISTENCY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':            return signals.trustScore != null;
    case 'assurance':          return signals.assuranceScore != null;
    case 'auditability':       return signals.auditabilityScore != null;
    case 'readiness':          return signals.readinessScore != null;
    case 'value_governance':   return signals.valueGovernanceScore != null;
    case 'sustainability':     return signals.sustainabilityScore != null;
    case 'certification':      return signals.certificationScore != null;
    case 'conformance':        return signals.conformanceScore != null;
    default:                   return false;
  }
}

function _stageScore(signals, stage) {
  switch (stage) {
    case 'trust':            return signals.trustScore ?? 0;
    case 'assurance':          return signals.assuranceScore ?? 0;
    case 'auditability':       return signals.auditabilityScore ?? 0;
    case 'readiness':          return signals.readinessScore ?? 0;
    case 'value_governance':   return signals.valueGovernanceScore ?? 0;
    case 'sustainability':     return signals.sustainabilityScore ?? 0;
    case 'certification':      return signals.certificationScore ?? 0;
    case 'conformance':        return signals.conformanceScore ?? 0;
    default:                   return 0;
  }
}

function computeGovernanceConsistencyScore(confRm) {
  const signals = govMetrics._extractGovernanceSignals(confRm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of CONSISTENCY_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / CONSISTENCY_STAGES.length;
  const avgScore = scoreSum / present;
  return govMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildGovernanceConsistency(confRm) {
  const consistency_score = computeGovernanceConsistencyScore(confRm);
  return {
    consistency_score,
    consistency_status: govMetrics.classifyGovernanceConsistency(consistency_score)
  };
}

async function getGovernanceConsistency(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const confRes = await conformanceReadModel.getConformanceReadModel(companyId);
    if (!confRes.ok) {
      govMetrics.recordError(companyId, 'getGovernanceConsistency', confRes.error);
      return { ok: false, error: confRes.error };
    }

    const governance_consistency = buildGovernanceConsistency(confRes.conformance_read_model);
    govMetrics.recordGovernanceConsistencyAnalyzed(companyId);
    return { ok: true, governance_consistency };

  } catch (err) {
    govMetrics.recordError(companyId, 'getGovernanceConsistency', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CONSISTENCY_STAGES,
  computeGovernanceConsistencyScore,
  buildGovernanceConsistency,
  getGovernanceConsistency
};
