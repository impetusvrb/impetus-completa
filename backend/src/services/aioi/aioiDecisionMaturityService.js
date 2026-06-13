'use strict';

/**
 * AIOI-P8.5 — Decision Maturity Service
 *
 * Indicadores de maturidade de decisão executiva — READ ONLY.
 * Spec: backend/docs/AIOI_DECISION_MATURITY_SPECIFICATION.md
 */

const decisionIntelligence = require('./aioiDecisionIntelligenceService');
const decisionHistory = require('./aioiDecisionHistoryCatalogService');
const decisionEffectiveness = require('./aioiDecisionEffectivenessService');
const knowledgeMaturity = require('./aioiKnowledgeMaturityService');

const LAYER = 'AIOI_DECISION_MATURITY';

function _computeMaturityScore({ coverage, consistency, traceability, quality }) {
  const score = (coverage * 0.25) + (consistency * 0.25)
    + (traceability * 0.25) + (quality * 0.25);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Avalia maturidade de inteligência de decisão.
 * @returns {Promise<object>}
 */
async function getDecisionMaturity() {
  const [intelligence, history, effectiveness, knowledge] = await Promise.all([
    decisionIntelligence.aggregateDecisionIntelligence(),
    decisionHistory.getDecisionHistoryCatalog(),
    decisionEffectiveness.getDecisionEffectiveness(),
    knowledgeMaturity.getKnowledgeMaturity()
  ]);

  const hist = intelligence.operational_history;
  const decisionCoverage = hist.ioe_total > 0
    ? Math.round((hist.with_decision / hist.ioe_total) * 10000) / 100
    : (history.decision_types.length > 0 ? 50 : 0);

  const hasTypes = history.decision_types.length > 0;
  const hasOutcomes = history.decision_outcomes.length > 0;
  const hasWorkflow = history.workflow_outcomes.length > 0;
  const consistencyFactors = [hasTypes, hasOutcomes, hasWorkflow, !history.history_mutation];
  const decisionConsistency = Math.round(
    (consistencyFactors.filter(Boolean).length / consistencyFactors.length) * 10000
  ) / 100;

  const traceabilityScore = history.audit_trail_summary.telemetry_events >= 0
    && history.catalog_entry_count >= 0
    ? Math.min(100, Math.round((history.catalog_entry_count / 10) * 100))
    : 0;
  const decisionTraceability = traceabilityScore;

  const qualityFromEffectiveness = effectiveness.effectiveness_summary != null
    ? Math.min(100, effectiveness.success_rate + effectiveness.partial_success_rate * 0.5)
    : Math.min(100, knowledge.knowledge_quality);
  const decisionQuality = Math.round(qualityFromEffectiveness * 100) / 100;

  const maturityScore = _computeMaturityScore({
    coverage:     decisionCoverage,
    consistency:  decisionConsistency,
    traceability: decisionTraceability,
    quality:      decisionQuality
  });

  return {
    ok: true,
    layer: LAYER,
    decision_coverage:      decisionCoverage,
    decision_consistency:   decisionConsistency,
    decision_traceability:  decisionTraceability,
    decision_quality:       decisionQuality,
    decision_maturity_score: maturityScore,
    maturity_level: maturityScore >= 80 ? 'ADVANCED'
      : maturityScore >= 60 ? 'ESTABLISHED'
        : maturityScore >= 40 ? 'DEVELOPING'
          : 'INITIAL',
    knowledge_maturity_score: knowledge.knowledge_maturity_score,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getDecisionMaturity,
  LAYER
};
