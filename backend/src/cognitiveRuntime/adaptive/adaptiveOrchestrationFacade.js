'use strict';

const flags = require('../config/phaseZ28FeatureFlags');
const { runAdaptiveCognitiveOrchestrator } = require('./orchestration/adaptiveCognitiveOrchestrator');

function applyAdaptiveOrchestration(user = {}, payload = {}, ctx = {}) {
  if (!flags.isAdaptiveOrchestrationEnabled() && !ctx.force_adaptive_orchestration) {
    return { payload, skipped: true, reason: 'adaptive_orchestration_off' };
  }

  const report = runAdaptiveCognitiveOrchestrator(user, payload, ctx);
  const enriched = { ...payload };

  if (flags.isAdaptiveOrchestrationShadow() && !ctx.force_adaptive_orchestration_apply) {
    enriched.adaptive_orchestration = report.adaptive_orchestration;
    enriched.adaptive_orchestration_shadow = report;
    return { payload: enriched, ok: true, shadow_only: true, adaptive_orchestration: report.adaptive_orchestration, report };
  }

  enriched.adaptive_orchestration = report.adaptive_orchestration;
  enriched.adaptive_orchestration_report = report;
  return { payload: enriched, ok: true, adaptive_orchestration: report.adaptive_orchestration, report };
}

function getAdaptiveOrchestrationStatus() {
  return {
    phase: 'Z.28',
    mode: flags.adaptiveOrchestrationMode(),
    cognitive_fatigue: flags.isCognitiveFatigueAnalysisEnabled(),
    adaptive_density: flags.isAdaptiveDensityRuntimeEnabled(),
    usefulness_orchestration: flags.isUsefulnessOrchestrationEnabled(),
    observability: flags.isOrchestrationObservabilityEnabled(),
    auto_mutation_allowed: flags.autoMutationAllowed
  };
}

module.exports = { applyAdaptiveOrchestration, getAdaptiveOrchestrationStatus };
