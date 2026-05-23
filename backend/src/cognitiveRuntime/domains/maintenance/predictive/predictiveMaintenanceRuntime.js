'use strict';

function runPredictiveMaintenanceRuntime(signals = {}, degradation = {}) {
  const op = signals.operational || {};
  const rising = degradation.trend === 'rising' || op.failure_recurrence === 'elevated';
  const failureRisk = rising ? 'medium' : op.maintenance_open > 5 ? 'medium' : op.maintenance_open > 0 ? 'low' : 'minimal';

  return {
    failure_risk: failureRisk,
    supervised_only: true,
    recommendation: rising
      ? 'Revisão supervisionada recomendada — degradação ou recorrência detectada'
      : op.maintenance_open > 0
        ? 'Monitorizar ordens abertas — sem acção automática'
        : null,
    auto_maintenance: false,
    auto_order: false,
    auto_shutdown: false,
    auto_action: false
  };
}

function runDegradationTrendRuntime(degradation = {}) {
  return {
    trend: degradation.trend ?? 'none',
    degradation_detected: degradation.degradation_detected ?? false,
    supervised_only: true,
    auto_action: false
  };
}

function runPredictiveFailureAdvisor(signals = {}, predictive = {}) {
  return {
    risk: predictive.failure_risk ?? 'unknown',
    advisory: predictive.recommendation ?? null,
    governance: 'supervised',
    auto_action: false
  };
}

function runMaintenancePredictionGovernance(predictive = {}) {
  return {
    predictive_supervised: true,
    auto_maintenance_blocked: true,
    auto_order_blocked: true,
    auto_shutdown_blocked: true,
    auto_action: false,
    failure_risk: predictive.failure_risk ?? 'unknown'
  };
}

module.exports = {
  runPredictiveMaintenanceRuntime,
  runDegradationTrendRuntime,
  runPredictiveFailureAdvisor,
  runMaintenancePredictionGovernance
};
