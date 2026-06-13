'use strict';

/**
 * AIOI-P4.0 — Knowledge Independence Service (READ ONLY)
 *
 * Independência via composição P3.9 (getInstitutionalizationReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const sovMetrics = require('./aioiSovereigntyMetrics');
const institutionalizationReadModel = require('./aioiInstitutionalizationReadModelService');

const INDEPENDENCE_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization'
]);

function computeKnowledgeIndependenceScore(irm) {
  const signals = sovMetrics._extractSovereigntySignals(irm);
  const values = INDEPENDENCE_PILLARS.map(k => {
    switch (k) {
      case 'trust':                return signals.trustScore;
      case 'assurance':              return signals.assuranceScore;
      case 'auditability':           return signals.auditabilityScore;
      case 'readiness':              return signals.readinessScore;
      case 'value_governance':       return signals.valueGovernanceScore;
      case 'sustainability':         return signals.sustainabilityScore;
      case 'certification':          return signals.certificationScore;
      case 'conformance':            return signals.conformanceScore;
      case 'governance_excellence':  return signals.governanceExcellenceScore;
      case 'institutionalization':   return signals.institutionalizationScore;
      default:                       return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return sovMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildKnowledgeIndependence(irm) {
  const independence_score = computeKnowledgeIndependenceScore(irm);
  return {
    independence_score,
    independence_status: sovMetrics.classifyKnowledgeIndependence(independence_score)
  };
}

async function getKnowledgeIndependence(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const irmRes = await institutionalizationReadModel.getInstitutionalizationReadModel(companyId);
    if (!irmRes.ok) {
      sovMetrics.recordError(companyId, 'getKnowledgeIndependence', irmRes.error);
      return { ok: false, error: irmRes.error };
    }

    const knowledge_independence = buildKnowledgeIndependence(irmRes.institutionalization_read_model);
    sovMetrics.recordKnowledgeIndependenceAnalyzed(companyId);
    return { ok: true, knowledge_independence };

  } catch (err) {
    sovMetrics.recordError(companyId, 'getKnowledgeIndependence', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  INDEPENDENCE_PILLARS,
  computeKnowledgeIndependenceScore,
  buildKnowledgeIndependence,
  getKnowledgeIndependence
};
