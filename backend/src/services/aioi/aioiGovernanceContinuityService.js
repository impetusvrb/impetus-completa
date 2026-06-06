'use strict';

/**
 * AIOI-P3.5 — Governance Continuity Service (READ ONLY)
 *
 * Continuidade Trust → Assurance → Auditability → Readiness → Value Governance.
 */

const { isValidUUID } = require('../../utils/security');
const susMetrics = require('./aioiSustainabilityMetrics');
const valueGovernanceReadModel = require('./aioiValueGovernanceReadModelService');

const CONTINUITY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness', 'value_governance'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':            return signals.trustScore != null;
    case 'assurance':          return signals.assuranceScore != null;
    case 'auditability':       return signals.auditabilityScore != null;
    case 'readiness':          return signals.readinessScore != null;
    case 'value_governance':   return signals.valueGovernanceScore != null;
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
    default:                   return 0;
  }
}

function computeContinuityScore(vgrm) {
  const signals = susMetrics._extractGovernanceSignals(vgrm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of CONTINUITY_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / CONTINUITY_STAGES.length;
  const avgScore = scoreSum / present;
  return susMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildGovernanceContinuity(vgrm) {
  const continuity_score = computeContinuityScore(vgrm);
  return {
    continuity_score,
    continuity_status: susMetrics.classifyContinuityStatus(continuity_score)
  };
}

async function getGovernanceContinuity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vgRes = await valueGovernanceReadModel.getValueGovernanceReadModel(companyId);
    if (!vgRes.ok) {
      susMetrics.recordError(companyId, 'getGovernanceContinuity', vgRes.error);
      return { ok: false, error: vgRes.error };
    }

    const governance_continuity = buildGovernanceContinuity(vgRes.value_governance_read_model);
    susMetrics.recordContinuityAnalyzed(companyId);
    return { ok: true, governance_continuity };

  } catch (err) {
    susMetrics.recordError(companyId, 'getGovernanceContinuity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CONTINUITY_STAGES,
  computeContinuityScore,
  buildGovernanceContinuity,
  getGovernanceContinuity
};
