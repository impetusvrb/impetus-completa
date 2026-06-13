'use strict';

/**
 * AIOI-P4.1 — Knowledge Autonomy Service (READ ONLY)
 *
 * Autonomia via composição P4.0 (getSovereigntyReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const autonomyMetrics = require('./aioiAutonomyMetrics');
const sovereigntyReadModel = require('./aioiSovereigntyReadModelService');

const AUTONOMY_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization', 'sovereignty'
]);

function computeKnowledgeAutonomyScore(srm) {
  const signals = autonomyMetrics._extractAutonomySignals(srm);
  const values = AUTONOMY_PILLARS.map(k => {
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
      case 'sovereignty':            return signals.sovereigntyScore;
      default:                       return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return autonomyMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildKnowledgeAutonomy(srm) {
  const autonomy_score = computeKnowledgeAutonomyScore(srm);
  return {
    autonomy_score,
    autonomy_status: autonomyMetrics.classifyKnowledgeAutonomy(autonomy_score)
  };
}

async function getKnowledgeAutonomy(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const srmRes = await sovereigntyReadModel.getSovereigntyReadModel(companyId);
    if (!srmRes.ok) {
      autonomyMetrics.recordError(companyId, 'getKnowledgeAutonomy', srmRes.error);
      return { ok: false, error: srmRes.error };
    }

    const knowledge_autonomy = buildKnowledgeAutonomy(srmRes.sovereignty_read_model);
    autonomyMetrics.recordKnowledgeAutonomyAnalyzed(companyId);
    return { ok: true, knowledge_autonomy };

  } catch (err) {
    autonomyMetrics.recordError(companyId, 'getKnowledgeAutonomy', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  AUTONOMY_PILLARS,
  computeKnowledgeAutonomyScore,
  buildKnowledgeAutonomy,
  getKnowledgeAutonomy
};
