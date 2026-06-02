'use strict';

const c2 = require('../../config/phaseC2FeatureFlags');
const { evaluateQualityControlledAuthority } = require('../qualityControlledAuthorityService');
const { analyzeQualityFrontendConvergence } = require('../qualityFrontendConvergenceAnalyzer');
const { analyzeQualityFallbackPressure } = require('../qualityFallbackPressureAnalyzer');
const { analyzeRuntimeFallbackReduction } = require('../runtimeFallbackReductionService');
const { buildOperationalContextRuntime, getOperationalTimeline } = require('../../context/operationalContextEngine');
const { buildCausalCorrelationRuntime } = require('../../context/causalCorrelationEngine');
const { buildOperationalMemoryRuntime } = require('../../context/operationalMemoryValidator');
const { validateInferences } = require('../../validation/inferenceTruthEngine');
const { buildInferenceValidationRuntime } = require('../../validation/inferenceReliabilityMetrics');
const { generateSyntheticOperationalEvents } = require('../../simulation/syntheticOperationalEventGenerator');
const { buildEventDensityRuntime } = require('../../simulation/operationalDensityAnalyzer');
const { emitC2, buildC2Metrics } = require('../observability/cognitiveConvergenceObservability');

function applyCognitiveConvergence(user = {}, payload = {}, ctx = {}) {
  if (!c2.isCognitiveConvergenceEnabled() && !ctx.force_cognitive_convergence) {
    return { payload, skipped: true, reason: 'cognitive_convergence_off' };
  }

  const authorityBase = payload.cognitive_authority_runtime || {};
  const dominance = ctx.authority_report?.dominance || {};
  const authorityResolved = ctx.authority_report?.authority || {};

  let qualityAuthority = evaluateQualityControlledAuthority(payload, {
    frontend_runtime_alignment: authorityBase.frontend_runtime_alignment,
    frontend_convergence_score: null
  });

  const frontendConvergence = analyzeQualityFrontendConvergence(payload, qualityAuthority);
  qualityAuthority = evaluateQualityControlledAuthority(payload, {
    frontend_convergence_score: frontendConvergence.frontend_convergence_score,
    frontend_runtime_alignment: frontendConvergence.frontend_convergence_score
  });

  const qualityPressure = analyzeQualityFallbackPressure(payload, qualityAuthority);
  const fallbackReduction = analyzeRuntimeFallbackReduction(
    payload,
    { ...authorityBase, fallback_dominance_ratio: qualityPressure.fallback_dominance_ratio },
    { channels: dominance.channels || payload.cognitive_authority_map?.channels, dominant_delivery_runtime: authorityBase.dominant_delivery_runtime },
    qualityPressure
  );

  let synthetic = { events: [] };
  const timelineBefore = getOperationalTimeline(user);
  if (
    c2.isEventDensityEngineEnabled() &&
    c2.syntheticEventsWhenSparse() &&
    timelineBefore.length < 5 &&
    (ctx.force_synthetic_events || payload.profile_code?.includes('quality'))
  ) {
    synthetic = generateSyntheticOperationalEvents(user, payload, { count: 10 });
    emitC2('EVENT_DENSITY', { tenant_id: user?.company_id, synthetic: synthetic.synthetic_count });
  }

  let syntheticEventsTagged = synthetic.events || [];
  try {
    const syntheticGuard = require('../../../services/syntheticVisibilityGuard');
    syntheticEventsTagged = syntheticGuard.tagIncomingSyntheticEvents(syntheticEventsTagged);
  } catch (_) {
    /* non-blocking */
  }

  const operationalContext = buildOperationalContextRuntime(user, payload, {
    ...ctx,
    synthetic_events: syntheticEventsTagged
  });

  const events = getOperationalTimeline(user);
  const causal = buildCausalCorrelationRuntime(events);
  const memory = buildOperationalMemoryRuntime(events, causal);

  const inferenceRaw = validateInferences(user, payload, ctx);
  const inferenceValidation = buildInferenceValidationRuntime(inferenceRaw);

  const eventDensity = buildEventDensityRuntime(
    { events },
    synthetic
  );

  const quality_authority_runtime = {
    ...qualityAuthority,
    frontend: frontendConvergence,
    fallback_pressure: qualityPressure
  };

  const cognitive_convergence_runtime = {
    phase: 'C2',
    quality_authority_mode: qualityAuthority.authority_mode,
    fallback_dominance_ratio: qualityPressure.fallback_dominance_ratio,
    runtime_z_effective_ratio: qualityPressure.runtime_z_effective_ratio,
    frontend_convergence_score: frontendConvergence.frontend_convergence_score,
    memory_quality_score: memory.memory_quality_score,
    causal_density: memory.causal_density,
    inference_truth_score: inferenceValidation.inference_truth_score,
    operational_event_density: eventDensity.operational_event_density,
    synthetic_memory_ratio: memory.synthetic_memory_ratio,
    runtime_authority_score: qualityAuthority.runtime_authority_score,
    verified_operational_memory_ratio: memory.verified_operational_memory_ratio,
    convergence_state: frontendConvergence.convergence_state,
    migration_readiness: fallbackReduction.migration_readiness,
    auto_remediation: false,
    auto_decisions: false,
    authoritative_global: false
  };

  const metrics = buildC2Metrics(cognitive_convergence_runtime);
  emitC2('CONVERGENCE_APPLIED', { tenant_id: user?.company_id, ...metrics });
  if (qualityAuthority.authority_mode === 'AUTHORITATIVE_CONTROLLED') {
    emitC2('QUALITY_AUTHORITY', { tenant_id: user?.company_id, score: qualityAuthority.runtime_authority_score });
  }
  emitC2('OPERATIONAL_MEMORY', { tenant_id: user?.company_id, quality: memory.memory_quality_score });
  emitC2('FALLBACK_REDUCTION', { tenant_id: user?.company_id, ratio: fallbackReduction.fallback_dominance_ratio });

  const enriched = {
    ...payload,
    cognitive_convergence_runtime,
    quality_authority_runtime,
    operational_context_runtime: operationalContext.skipped ? { skipped: true } : operationalContext,
    operational_memory_runtime: memory,
    inference_validation_runtime: inferenceValidation,
    event_density_runtime: eventDensity,
    fallback_reduction_runtime: fallbackReduction,
    cognitive_convergence_metrics: metrics
  };

  return {
    payload: enriched,
    cognitive_convergence_runtime,
    quality_authority_runtime,
    report: {
      qualityAuthority,
      frontendConvergence,
      qualityPressure,
      fallbackReduction,
      operationalContext,
      causal,
      memory,
      inferenceValidation,
      eventDensity
    }
  };
}

module.exports = { applyCognitiveConvergence };
