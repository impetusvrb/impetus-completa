'use strict';

/**
 * AIOI-P4.1 — Sovereignty Continuity Service (READ ONLY)
 *
 * Continuidade Trust → … → Sovereignty via getSovereigntyReadModel (P4.0).
 */

const { isValidUUID } = require('../../utils/security');
const autonomyMetrics = require('./aioiAutonomyMetrics');
const sovereigntyReadModel = require('./aioiSovereigntyReadModelService');

const CONTINUITY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty'
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
    default:                       return 0;
  }
}

function computeSovereigntyContinuityScore(srm) {
  const signals = autonomyMetrics._extractAutonomySignals(srm);
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
  return autonomyMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildSovereigntyContinuity(srm) {
  const continuity_score = computeSovereigntyContinuityScore(srm);
  return {
    continuity_score,
    continuity_status: autonomyMetrics.classifySovereigntyContinuity(continuity_score)
  };
}

async function getSovereigntyContinuity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const srmRes = await sovereigntyReadModel.getSovereigntyReadModel(companyId);
    if (!srmRes.ok) {
      autonomyMetrics.recordError(companyId, 'getSovereigntyContinuity', srmRes.error);
      return { ok: false, error: srmRes.error };
    }

    const sovereignty_continuity = buildSovereigntyContinuity(srmRes.sovereignty_read_model);
    autonomyMetrics.recordSovereigntyContinuityAnalyzed(companyId);
    return { ok: true, sovereignty_continuity };

  } catch (err) {
    autonomyMetrics.recordError(companyId, 'getSovereigntyContinuity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CONTINUITY_STAGES,
  computeSovereigntyContinuityScore,
  buildSovereigntyContinuity,
  getSovereigntyContinuity
};
