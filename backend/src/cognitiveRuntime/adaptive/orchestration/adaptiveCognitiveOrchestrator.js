'use strict';

const { analyzeCognitiveFatigue } = require('../fatigue/cognitiveFatigueAnalyzer');
const { detectAlertFatigue } = require('../fatigue/alertFatigueDetector');
const { analyzeContextualNoise } = require('../fatigue/contextualNoiseAnalyzer');
const { protectExecutiveAttention } = require('../fatigue/executiveAttentionProtection');
const { scoreAdaptiveUsefulness } = require('../usefulness/adaptiveUsefulnessScorer');
const { prioritizeRelevance } = require('../usefulness/relevancePrioritizer');
const { runOrchestrationDensityRuntime } = require('../density/orchestrationDensityRuntime');
const { balanceRuntimeAttention } = require('../density/runtimeAttentionBalancer');
const { runAdaptiveConvergence } = require('../convergence/adaptiveConvergenceRuntime');
const { balanceCrossDomainPriority } = require('../convergence/crossDomainPriorityBalancer');
const { orchestrateEnterpriseAlignment } = require('../convergence/enterpriseAlignmentOrchestrator');
const { balanceOrganizationalSignals } = require('../convergence/organizationalSignalBalancer');
const { analyzeAdaptivePressure } = require('../pressure/adaptivePressureAnalyzer');
const { resolveDynamicPriority } = require('./dynamicPriorityResolver');
const { computeAdaptiveSignalWeighting } = require('../weighting/adaptiveSignalWeighting');
const { balanceContextualComposition } = require('./contextualCompositionBalancer');
const { buildOrchestrationRecommendations } = require('../recommendation/orchestrationRecommendationEngine');
const { runSupervisedAdaptation } = require('../supervision/supervisedAdaptationRuntime');
const { verifyGovernanceSafeAdaptation } = require('../supervision/governanceSafeAdaptation');
const { analyzeOrchestrationPerformance } = require('../performance/orchestrationPerformanceRuntime');
const { runExecutiveAttentionOrchestration } = require('../executive/executiveAttentionRuntime');
const { coordinateOrchestrationRuntime } = require('./orchestrationRuntimeCoordinator');

function runAdaptiveCognitiveOrchestrator(user = {}, payload = {}, ctx = {}) {
  const t0 = Date.now();
  const fatigue = analyzeCognitiveFatigue(payload);
  const alertFatigue = detectAlertFatigue(payload);
  const noise = analyzeContextualNoise(payload);
  const execAttention = protectExecutiveAttention(payload);
  const usefulness = scoreAdaptiveUsefulness(payload);
  const relevance = prioritizeRelevance(usefulness);
  const density = runOrchestrationDensityRuntime(payload, fatigue);
  const attention = balanceRuntimeAttention(fatigue, usefulness);
  const convergence = runAdaptiveConvergence(payload);
  const crossPriority = balanceCrossDomainPriority(usefulness);
  const alignment = orchestrateEnterpriseAlignment(payload, convergence);
  const orgSignals = balanceOrganizationalSignals(usefulness);
  const pressure = analyzeAdaptivePressure(payload);
  const priority = resolveDynamicPriority(usefulness, fatigue);
  const weights = computeAdaptiveSignalWeighting(payload, usefulness);
  const composition = balanceContextualComposition(payload, weights);
  const recommendations = buildOrchestrationRecommendations({ fatigue, usefulness, density, pressure, convergence });
  const supervised = runSupervisedAdaptation(recommendations);
  const governanceSafe = verifyGovernanceSafeAdaptation(supervised);
  const executiveOrch = runExecutiveAttentionOrchestration(payload, fatigue, usefulness);
  const perf = analyzeOrchestrationPerformance({ total_ms: Date.now() - t0 });

  const adaptation_recommended =
    recommendations.recommendations?.length > 0 ||
    fatigue.fatigue_detected ||
    usefulness.low_usefulness ||
    !density.within_limits;

  const adaptive_orchestration = {
    phase: 'Z.28',
    adaptation_recommended,
    fatigue_detected: fatigue.fatigue_detected || alertFatigue.alert_fatigue,
    density_adjustment_suggested: density.density_adjustment_suggested || [],
    priority_shift_detected: [...(attention.priority_shift_detected || []), ...(priority.priority_shift_detected || [])],
    usefulness_score: usefulness.usefulness_score ?? 0.7,
    cross_domain_pressure: pressure.cross_domain_pressure ?? 0,
    runtime_safe: perf.runtime_safe !== false && governanceSafe.safe !== false,
    auto_mutation_applied: false,
    auto_remediation: false,
    supervised: true
  };

  return coordinateOrchestrationRuntime({
    adaptive_orchestration,
    fatigue_analysis: { fatigue, alertFatigue, noise, execAttention },
    usefulness_analysis: { usefulness, relevance },
    density_orchestration: density,
    convergence_orchestration: { convergence, crossPriority, alignment, orgSignals },
    pressure_analysis: pressure,
    weighting: weights,
    composition_balance: composition,
    recommendations: supervised,
    executive_orchestration: executiveOrch,
    governance: governanceSafe,
    performance: perf
  });
}

module.exports = { runAdaptiveCognitiveOrchestrator };
