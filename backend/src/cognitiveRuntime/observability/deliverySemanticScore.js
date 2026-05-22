'use strict';

/**
 * Score semântico 0–10 — alinhado à auditoria cognitive-cockpit-domain-specialization.
 */
function computeDeliverySemanticScore(inspection = {}, genericity = {}, compositionGap = {}) {
  const dimensions = {
    semantic_alignment: scoreAlignment(inspection, compositionGap),
    operational_usefulness: scoreUsefulness(compositionGap, genericity),
    domain_coherence: scoreCoherence(inspection, genericity),
    contextual_relevance: scoreRelevance(inspection),
    executive_leakage: scoreNoLeakage(inspection),
    industrial_genericity: scoreLowGenericity(genericity),
    cognitive_signal_strength: scoreCognitiveSignal(compositionGap)
  };

  const values = Object.values(dimensions);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    dimensions,
    average_score: Math.round(average * 10) / 10,
    scale: '0-10',
    interpretation:
      average >= 7
        ? 'semantic_delivery_strong'
        : average >= 4
          ? 'semantic_delivery_partial'
          : 'semantic_delivery_generic'
  };
}

function scoreAlignment(inspection, gap) {
  const coverage = gap.semantic_coverage_ratio ?? 0;
  const missing = (gap.missing_semantic_categories || []).length;
  if (coverage >= 0.7 && missing <= 1) return 9;
  if (coverage >= 0.4) return 6;
  if (missing <= 4) return 4;
  return 2;
}

function scoreUsefulness(gap, genericity) {
  if (genericity.is_semantically_generic) return 2;
  if ((gap.missing_semantic_categories || []).length <= 2) return 8;
  return 5;
}

function scoreCoherence(inspection, genericity) {
  if (inspection.domain_isolation_ok === false) return 2;
  if (genericity.genericity_ratio < 0.3) return 9;
  if (genericity.genericity_ratio < 0.6) return 5;
  return 3;
}

function scoreRelevance(inspection) {
  return inspection.profile_domain_match ? 8 : 4;
}

function scoreNoLeakage(inspection) {
  const leaks = (inspection.cross_domain_signals || []).length;
  if (leaks === 0) return 10;
  if (leaks <= 2) return 6;
  return 2;
}

function scoreLowGenericity(genericity) {
  const r = genericity.genericity_ratio ?? 0;
  if (r < 0.2) return 9;
  if (r < 0.5) return 6;
  return 2;
}

function scoreCognitiveSignal(gap) {
  const recommended = gap.missing_semantic_categories?.length ?? 8;
  if (recommended <= 2) return 8;
  if (recommended <= 5) return 4;
  return 1;
}

module.exports = {
  computeDeliverySemanticScore
};
