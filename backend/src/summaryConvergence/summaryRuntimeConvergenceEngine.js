'use strict';

const flags = require('./config/phaseZ8FeatureFlags');
const { logPhaseZ8 } = require('./phaseZ8Logger');
const { alignSummaryWithKpis } = require('./summaryKpiAlignmentRuntime');
const { measureHierarchyNarrativeConvergence } = require('./hierarchyNarrativeConvergence');
const { measureFunctionalNarrativeConvergence } = require('./functionalNarrativeConvergence');
const { measureNarrativeContextualAgreement } = require('./narrativeContextualAgreement');

function computeNarrativeConvergenceScore(parts) {
  const scores = [
    parts.kpi_alignment?.alignment_score,
    parts.hierarchy?.converged ? 0.85 : 0.4,
    parts.functional?.targeting_precision,
    parts.agreement?.agreement_score
  ].filter((s) => s != null);
  if (!scores.length) return 0;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4));
}

function runSummaryRuntimeConvergenceEngine(summaryPayload = {}, user = {}, ctx = {}) {
  const kpis = ctx.kpis || [];
  const kpi_alignment = alignSummaryWithKpis(summaryPayload, kpis, ctx);
  const hierarchy = measureHierarchyNarrativeConvergence(user, summaryPayload, ctx);
  const functional = measureFunctionalNarrativeConvergence(summaryPayload, ctx);
  const agreement = measureNarrativeContextualAgreement(summaryPayload, ctx);
  const convergence_score = computeNarrativeConvergenceScore({ kpi_alignment, hierarchy, functional, agreement });
  const converged =
    convergence_score >= 0.65 &&
    kpi_alignment.coherent &&
    hierarchy.converged &&
    functional.converged &&
    agreement.coherent;

  if (flags.isSummaryConvergenceObservabilityEnabled()) {
    logPhaseZ8('SUMMARY_RUNTIME_CONVERGENCE_COMPUTED', {
      tenant_id: ctx.tenant_id,
      convergence_score,
      converged,
      shadow_only: !flags.isSummaryRuntimeConvergenceEnabled()
    });
  }

  return {
    convergence_score,
    converged,
    contextual_coherence: agreement.agreement_score,
    kpi_alignment,
    hierarchy,
    functional,
    agreement,
    recommendation_only: !flags.isSummaryRuntimeConvergenceEnabled(),
    enforcement_applied: false,
    narrative_fabricated: false
  };
}

module.exports = { runSummaryRuntimeConvergenceEngine, computeNarrativeConvergenceScore };
