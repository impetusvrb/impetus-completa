'use strict';

/**
 * AIOI-P3.6 — Certification Readiness Service (READ ONLY)
 *
 * Avalia prontidão para certificação via composição P3.5 (getSustainabilityReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const certMetrics = require('./aioiCertificationMetrics');
const sustainabilityReadModel = require('./aioiSustainabilityReadModelService');

const READINESS_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness', 'value_governance', 'sustainability'
]);

function computeCertificationReadinessScore(srm) {
  const signals = certMetrics._extractCertificationSignals(srm);
  const values = READINESS_PILLARS.map(k => {
    switch (k) {
      case 'trust':            return signals.trustScore;
      case 'assurance':          return signals.assuranceScore;
      case 'auditability':       return signals.auditabilityScore;
      case 'readiness':          return signals.readinessScore;
      case 'value_governance':   return signals.valueGovernanceScore;
      case 'sustainability':     return signals.sustainabilityScore;
      default:                   return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return certMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildCertificationReadiness(srm) {
  const certification_readiness_score = computeCertificationReadinessScore(srm);
  return {
    certification_readiness_score,
    certification_readiness_status: certMetrics.classifyCertificationReadiness(certification_readiness_score)
  };
}

async function getCertificationReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const susRes = await sustainabilityReadModel.getSustainabilityReadModel(companyId);
    if (!susRes.ok) {
      certMetrics.recordError(companyId, 'getCertificationReadiness', susRes.error);
      return { ok: false, error: susRes.error };
    }

    const certification_readiness = buildCertificationReadiness(susRes.sustainability_read_model);
    certMetrics.recordCertificationReadinessAnalyzed(companyId);
    return { ok: true, certification_readiness };

  } catch (err) {
    certMetrics.recordError(companyId, 'getCertificationReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  READINESS_PILLARS,
  computeCertificationReadinessScore,
  buildCertificationReadiness,
  getCertificationReadiness
};
