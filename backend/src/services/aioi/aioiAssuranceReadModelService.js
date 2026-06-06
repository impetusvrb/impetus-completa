'use strict';

/**
 * AIOI-P3.1 — Assurance Read Model Service (READ ONLY)
 *
 * Agregador da camada de assurance + read model P3.0.
 */

const { isValidUUID } = require('../../utils/security');
const expMetrics = require('./aioiExplainabilityMetrics');
const trustReadModel = require('./aioiTrustReadModelService');
const evidenceService = require('./aioiEvidenceAnalysisService');
const traceabilityService = require('./aioiDecisionTraceabilityService');
const explainabilityService = require('./aioiInsightExplainabilityService');
const assuranceService = require('./aioiIntelligenceAssuranceService');

async function getAssuranceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  expMetrics.recordAssuranceRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      trustRes,
      evidenceRes,
      traceRes,
      explainRes,
      assuranceRes
    ] = await Promise.all([
      trustReadModel.getTrustReadModel(companyId),
      evidenceService.getEvidenceAnalysis(companyId),
      traceabilityService.getDecisionTraceability(companyId),
      explainabilityService.getInsightExplainability(companyId),
      assuranceService.getIntelligenceAssurance(companyId)
    ]);

    const failures = [trustRes, evidenceRes, traceRes, explainRes, assuranceRes].filter(r => !r.ok);
    if (failures.length) {
      expMetrics.recordError(companyId, 'getAssuranceReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    expMetrics.recordAssuranceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      assurance_read_model: {
        trust_read_model:         trustRes.trust_read_model,
        evidence_analysis:        evidenceRes.evidence_analysis,
        decision_traceability:    traceRes.decision_traceability,
        insight_explainability:   explainRes.insight_explainability,
        intelligence_assurance:   assuranceRes.intelligence_assurance
      }
    };

  } catch (err) {
    expMetrics.recordError(companyId, 'getAssuranceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getAssuranceReadModel
};
