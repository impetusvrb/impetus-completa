'use strict';

/**
 * AIOI-P3.7 — Intelligence Conformance Service (READ ONLY)
 *
 * Aderência aos pilares via composição P3.6 (getCertificationReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const confMetrics = require('./aioiConformanceMetrics');
const certificationReadModel = require('./aioiCertificationReadModelService');

const CONFORMANCE_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification'
]);

function computeConformanceScore(crm) {
  const signals = confMetrics._extractConformanceSignals(crm);
  const values = CONFORMANCE_PILLARS.map(k => {
    switch (k) {
      case 'trust':            return signals.trustScore;
      case 'assurance':          return signals.assuranceScore;
      case 'auditability':       return signals.auditabilityScore;
      case 'readiness':          return signals.readinessScore;
      case 'value_governance':   return signals.valueGovernanceScore;
      case 'sustainability':     return signals.sustainabilityScore;
      case 'certification':      return signals.certificationScore;
      default:                   return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return confMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildIntelligenceConformance(crm) {
  const conformance_score = computeConformanceScore(crm);
  return {
    conformance_score,
    conformance_status: confMetrics.classifyConformanceStatus(conformance_score)
  };
}

async function getIntelligenceConformance(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const certRes = await certificationReadModel.getCertificationReadModel(companyId);
    if (!certRes.ok) {
      confMetrics.recordError(companyId, 'getIntelligenceConformance', certRes.error);
      return { ok: false, error: certRes.error };
    }

    const intelligence_conformance = buildIntelligenceConformance(certRes.certification_read_model);
    confMetrics.recordConformanceAnalyzed(companyId);
    return { ok: true, intelligence_conformance };

  } catch (err) {
    confMetrics.recordError(companyId, 'getIntelligenceConformance', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  CONFORMANCE_PILLARS,
  computeConformanceScore,
  buildIntelligenceConformance,
  getIntelligenceConformance
};
