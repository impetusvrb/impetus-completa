'use strict';

const flags = require('./config/phaseZ7FeatureFlags');
const { logPhaseZ7 } = require('./phaseZ7Logger');
const { measureHierarchyKpiConvergence } = require('./hierarchyKpiConvergence');
const { measureFunctionalKpiConvergence } = require('./functionalKpiConvergence');
const { assessExecutiveOperationalAlignment } = require('./executiveOperationalAlignment');
const { measureKpiContextualAgreement } = require('./kpiContextualAgreement');

function computeConvergenceScore(parts) {
  const w = { hierarchy: 0.25, functional: 0.25, alignment: 0.25, agreement: 0.25 };
  let sum = 0;
  let tot = 0;
  if (parts.hierarchy != null) {
    sum += (parts.hierarchy.hierarchy_accuracy ?? 0) * w.hierarchy;
    tot += w.hierarchy;
  }
  if (parts.functional != null) {
    sum += (parts.functional.targeting_precision ?? 0) * w.functional;
    tot += w.functional;
  }
  if (parts.alignment != null) {
    sum += (parts.alignment.aligned ? parts.alignment.balance_score : 0.4) * w.alignment;
    tot += w.alignment;
  }
  if (parts.agreement != null) {
    sum += (parts.agreement.agreement_score ?? 0) * w.agreement;
    tot += w.agreement;
  }
  return tot ? Number((sum / tot).toFixed(4)) : 0;
}

function runKpiRuntimeConvergenceEngine(kpis = [], user = {}, ctx = {}) {
  const hierarchy = measureHierarchyKpiConvergence(user, kpis, ctx);
  const functional = measureFunctionalKpiConvergence(user, kpis, ctx);
  const alignment = assessExecutiveOperationalAlignment(kpis, ctx);
  const agreement = measureKpiContextualAgreement(user, kpis, ctx);
  const convergence_score = computeConvergenceScore({ hierarchy, functional, alignment, agreement });
  const converged =
    convergence_score >= 0.72 &&
    hierarchy.converged &&
    functional.converged &&
    alignment.aligned &&
    agreement.coherent;

  if (flags.isKpiConvergenceObservabilityEnabled()) {
    logPhaseZ7('KPI_RUNTIME_CONVERGENCE_COMPUTED', {
      tenant_id: ctx.tenant_id,
      convergence_score,
      converged,
      shadow_only: !flags.isKpiRuntimeConvergenceEnabled()
    });
  }

  return {
    convergence_score,
    converged,
    contextual_coherence: agreement.agreement_score,
    hierarchy,
    functional,
    alignment,
    agreement,
    recommendation_only: !flags.isKpiRuntimeConvergenceEnabled()
  };
}

module.exports = { runKpiRuntimeConvergenceEngine, computeConvergenceScore };
