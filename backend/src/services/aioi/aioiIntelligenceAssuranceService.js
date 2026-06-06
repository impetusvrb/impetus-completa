'use strict';

/**
 * AIOI-P3.1 — Intelligence Assurance Service (READ ONLY)
 *
 * Score composto: evidence + traceability + explainability + trust.
 */

const { isValidUUID } = require('../../utils/security');
const expMetrics = require('./aioiExplainabilityMetrics');
const evidenceService = require('./aioiEvidenceAnalysisService');
const traceabilityService = require('./aioiDecisionTraceabilityService');
const explainabilityService = require('./aioiInsightExplainabilityService');
const trustService = require('./aioiIntelligenceTrustService');

const ASSURANCE_WEIGHTS = Object.freeze({
  evidence:        0.25,
  traceability:    0.25,
  explainability:  0.25,
  trust:           0.25
});

function computeAssuranceScore({ evidenceScore, traceabilityScore, explainabilityScore, trustScore }) {
  const raw =
    (evidenceScore ?? 50) * ASSURANCE_WEIGHTS.evidence +
    (traceabilityScore ?? 50) * ASSURANCE_WEIGHTS.traceability +
    (explainabilityScore ?? 50) * ASSURANCE_WEIGHTS.explainability +
    (trustScore ?? 50) * ASSURANCE_WEIGHTS.trust;
  return expMetrics.clampScore(raw);
}

function buildIntelligenceAssurance(signals) {
  const assurance_score = computeAssuranceScore(signals);
  return {
    assurance_score,
    assurance_level: expMetrics.classifyAssuranceLevel(assurance_score)
  };
}

async function getIntelligenceAssurance(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [evidenceRes, traceRes, explainRes, trustRes] = await Promise.all([
      evidenceService.getEvidenceAnalysis(companyId),
      traceabilityService.getDecisionTraceability(companyId),
      explainabilityService.getInsightExplainability(companyId),
      trustService.getIntelligenceTrust(companyId)
    ]);

    const failures = [evidenceRes, traceRes, explainRes, trustRes].filter(r => !r.ok);
    if (failures.length) {
      expMetrics.recordError(companyId, 'getIntelligenceAssurance', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const explainabilityScore = explainabilityService.computeExplainabilityScore(
      explainRes.insight_explainability
    );

    const intelligence_assurance = buildIntelligenceAssurance({
      evidenceScore:       evidenceRes.evidence_analysis.evidence_score,
      traceabilityScore:   traceRes.decision_traceability.traceability_score,
      explainabilityScore,
      trustScore:          trustRes.intelligence_trust.trust_score
    });

    expMetrics.recordAssuranceAnalyzed(companyId);
    return { ok: true, intelligence_assurance };

  } catch (err) {
    expMetrics.recordError(companyId, 'getIntelligenceAssurance', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ASSURANCE_WEIGHTS,
  computeAssuranceScore,
  buildIntelligenceAssurance,
  getIntelligenceAssurance
};
