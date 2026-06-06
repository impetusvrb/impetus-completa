'use strict';

/**
 * AIOI-P3.7 — Certification Continuity Service (READ ONLY)
 *
 * Continuidade Trust → Assurance → Auditability → Readiness → Value Governance
 * → Sustainability → Certification via getCertificationReadModel (P3.6).
 */

const { isValidUUID } = require('../../utils/security');
const confMetrics = require('./aioiConformanceMetrics');
const certificationReadModel = require('./aioiCertificationReadModelService');

const CONTINUITY_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification'
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
    default:                   return 0;
  }
}

function computeCertificationContinuityScore(crm) {
  const signals = confMetrics._extractConformanceSignals(crm);
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
  return confMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildCertificationContinuity(crm) {
  const continuity_score = computeCertificationContinuityScore(crm);
  return {
    continuity_score,
    continuity_status: confMetrics.classifyContinuityStatus(continuity_score)
  };
}

async function getCertificationContinuity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const certRes = await certificationReadModel.getCertificationReadModel(companyId);
    if (!certRes.ok) {
      confMetrics.recordError(companyId, 'getCertificationContinuity', certRes.error);
      return { ok: false, error: certRes.error };
    }

    const certification_continuity = buildCertificationContinuity(certRes.certification_read_model);
    confMetrics.recordCertificationContinuityAnalyzed(companyId);
    return { ok: true, certification_continuity };

  } catch (err) {
    confMetrics.recordError(companyId, 'getCertificationContinuity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CONTINUITY_STAGES,
  computeCertificationContinuityScore,
  buildCertificationContinuity,
  getCertificationContinuity
};
