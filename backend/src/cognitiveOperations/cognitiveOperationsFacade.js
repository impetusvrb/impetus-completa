'use strict';

const phaseN = require('./config/phaseNFeatureFlags');
const { runEnterpriseOperations } = require('./enterpriseCognitiveOperationsEngine');
const { computeCognitiveRuntimeHealth } = require('./cognitiveHealthMonitor');
const { monitorConvergenceHealth } = require('./convergenceHealthMonitor');
const { monitorContextualIntegrity } = require('./contextualIntegrityMonitor');
const { detectCognitiveEntropy } = require('./cognitiveEntropyDetector');
const { trackEntropy } = require('./runtimeEntropyTracker');
const { assessCognitiveStability } = require('./cognitiveStabilityEngine');
const { resolveSemanticStability } = require('./semanticStabilityResolver');
const { resolveOperationalConfidence } = require('./operationalConfidenceResolver');
const { observeGovernance } = require('./selfObservingGovernance');
const { resolveOperationalAnomalies } = require('./operationalAnomalyResolver');
const { resolveContextualCalibration } = require('./contextualCalibrationResolver');
const { reflectOperationalGovernance } = require('./governanceOperationalReflection');
const { recordOperationalSample, getEnterpriseOperationalTelemetry } = require('./enterpriseOperationalTelemetry');
const { updateOperationalState } = require('./cognitiveOperationalState');
const { trackDecision } = require('./runtimeConsistencyTracker');

function isOperationsLayerActive() {
  return (
    phaseN.isEnterpriseOperationsObservabilityEnabled() ||
    phaseN.isEnterpriseCognitiveOperationsEnabled() ||
    phaseN.isRuntimeEntropyDetectionEnabled() ||
    phaseN.isDynamicConfidenceEngineEnabled() ||
    phaseN.isCognitiveStabilityEngineEnabled() ||
    phaseN.isGovernanceCalibrationEnabled()
  );
}

function buildSignalsFromContext(ctx = {}) {
  const convergence = ctx.cognitive_convergence || {};
  const precision = ctx.precision_delivery || {};
  const semantic = ctx.semantic_alignment || {};

  const convergenceHealth = monitorConvergenceHealth(convergence);
  const contextualIntegrity = monitorContextualIntegrity({
    contextual_unification_score: convergence.runtime_truth_state?.contextual_unification_score,
    drift_detected: convergence.drift?.drift_detected
  });

  return {
    convergence_health: convergenceHealth.convergence_health,
    truth_integrity: convergenceHealth.runtime_truth_integrity,
    contextual_integrity: contextualIntegrity.contextual_integrity,
    governance_operational_health: convergence.consistency?.cognitive_consistency_score ?? 0.84,
    cognitive_consistency_score: convergence.cognitive_consistency_score ?? 0.9,
    cognitive_fragmentation_rate: convergence.fragmentation?.cognitive_fragmentation_rate ?? 0.1,
    drift_detected: convergence.drift?.drift_detected,
    fallback_rate: precision.shadow_comparison ? 0.1 : 0.05,
    leakage_count: semantic.leakage?.length ?? 0,
    divergence_count: precision.validation?.issues?.length ?? 0,
    active_layers: [
      semantic,
      precision,
      convergence
    ].filter((x) => x && Object.keys(x).length).length,
    axis: convergence.runtime_truth_state?.authority?.contextual_truth?.functional_axis
  };
}

function enrichWithEnterpriseOperations(user, legacyResponse, ctx = {}) {
  if (!isOperationsLayerActive() && !ctx.force) {
    return { response: legacyResponse, operations: null };
  }

  const signals = buildSignalsFromContext(ctx);
  const operations = runEnterpriseOperations(user, {
    ...ctx,
    semantic_alignment: ctx.semantic_alignment,
    precision_delivery: ctx.precision_delivery,
    cognitive_convergence: ctx.cognitive_convergence,
    cognitive_operational_pressure: signals.active_layers / 5
  });

  const health = computeCognitiveRuntimeHealth(signals);
  const entropy = detectCognitiveEntropy(signals);
  trackEntropy(entropy);
  const stability = assessCognitiveStability(signals);
  const semanticStability = resolveSemanticStability(ctx.cognitive_convergence || {});
  const confidence = resolveOperationalConfidence({
    ...signals,
    entropy: entropy.runtime_entropy_score,
    runtime_stability: stability.runtime_stability
  });
  const governanceObserve = observeGovernance({
    ...signals,
    entropy: entropy.runtime_entropy_score
  });
  const anomalies = resolveOperationalAnomalies({
    drift: ctx.cognitive_convergence?.drift,
    entropy,
    fallback_rate: signals.fallback_rate,
    leakage_count: signals.leakage_count,
    divergence_count: signals.divergence_count
  });
  const calibration = resolveContextualCalibration({
    entropy,
    stability,
    drift: ctx.cognitive_convergence?.drift,
    pressure: signals.active_layers / 5
  });
  const reflection = reflectOperationalGovernance(getEnterpriseOperationalTelemetry());

  if (ctx.cognitive_convergence?.runtime_truth_state) {
    trackDecision(`axis:${signals.axis}`);
  }

  const pressure = Number((signals.active_layers * 0.12 + entropy.runtime_entropy_score * 0.4).toFixed(4));
  updateOperationalState({ last_health: health, pressure });

  recordOperationalSample({
    governance_operational_maturity: health.cognitive_runtime_health,
    runtime_entropy_score: entropy.runtime_entropy_score,
    convergence_operational_health: signals.convergence_health,
    contextual_stability_rate: semanticStability.semantic_stability,
    runtime_resilience: stability.runtime_stability,
    cognitive_operational_pressure: pressure,
    governance_effectiveness_score: governanceObserve.self_evaluation.governance_effectiveness_score,
    operational_trustworthiness: confidence.operational_confidence
  });

  const operations_block = {
    phase: 'N',
    shadow_only: !phaseN.isEnterpriseCognitiveOperationsEnabled(),
    observability: phaseN.isEnterpriseOperationsObservabilityEnabled(),
    flags: {
      enterprise_operations: phaseN.isEnterpriseCognitiveOperationsEnabled(),
      entropy_detection: phaseN.isRuntimeEntropyDetectionEnabled(),
      dynamic_confidence: phaseN.isDynamicConfidenceEngineEnabled(),
      stability_engine: phaseN.isCognitiveStabilityEngineEnabled(),
      governance_calibration: phaseN.isGovernanceCalibrationEnabled()
    },
    health,
    entropy,
    stability: { ...stability, semantic: semanticStability },
    confidence,
    governance_self_observation: governanceObserve,
    anomalies,
    calibration,
    reflection,
    supervision: operations.supervision,
    operational_state: operations.operational_state,
    telemetry_snapshot: getEnterpriseOperationalTelemetry(),
    auto_correct: false,
    auto_calibrate: false
  };

  return { response: legacyResponse, operations: operations_block };
}

function getOperationsReport() {
  return {
    telemetry: getEnterpriseOperationalTelemetry(),
    flags: {
      IMPETUS_ENTERPRISE_COGNITIVE_OPERATIONS: phaseN.isEnterpriseCognitiveOperationsEnabled(),
      IMPETUS_RUNTIME_ENTROPY_DETECTION: phaseN.isRuntimeEntropyDetectionEnabled(),
      IMPETUS_DYNAMIC_CONFIDENCE_ENGINE: phaseN.isDynamicConfidenceEngineEnabled(),
      IMPETUS_COGNITIVE_STABILITY_ENGINE: phaseN.isCognitiveStabilityEngineEnabled(),
      IMPETUS_GOVERNANCE_CALIBRATION: phaseN.isGovernanceCalibrationEnabled(),
      IMPETUS_ENTERPRISE_OPERATIONS_OBSERVABILITY: phaseN.isEnterpriseOperationsObservabilityEnabled()
    },
    shadow_first: true,
    enforcement_default: false
  };
}

module.exports = {
  isOperationsLayerActive,
  enrichWithEnterpriseOperations,
  getOperationsReport,
  buildSignalsFromContext,
  runEnterpriseOperations
};
