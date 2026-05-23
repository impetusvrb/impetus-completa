'use strict';

function runReliabilityIntelligenceRuntime(signals = {}) {
  const op = signals.operational || {};
  return {
    mtbf_hours: op.mtbf_hours_proxy ?? null,
    mttr_hours: op.mttr_hours_proxy ?? null,
    downtime_minutes: op.downtime_minutes ?? 0,
    availability_pct: op.availability_pct ?? null,
    failure_recurrence: op.failure_recurrence ?? 'none',
    computed_from_real_data: op.mtbf_hours_proxy != null || op.downtime_events > 0,
    auto_action: false
  };
}

function runMtbfMttrAnalyzer(signals = {}) {
  const rel = runReliabilityIntelligenceRuntime(signals);
  return {
    mtbf: rel.mtbf_hours,
    mttr: rel.mttr_hours,
    coherence: rel.mtbf_hours != null && rel.mttr_hours != null ? 'valid' : rel.mtbf_hours != null || rel.mttr_hours != null ? 'partial' : 'empty',
    auto_action: false
  };
}

function runDowntimeCorrelationEngine(signals = {}, crossDomain = {}) {
  const op = signals.operational || {};
  const productionDowntime = crossDomain.production_downtime_proxy ?? null;
  return {
    maintenance_downtime_minutes: op.downtime_minutes ?? 0,
    production_correlation_allowed: true,
    production_downtime_proxy: productionDowntime,
    correlation_valid: op.downtime_minutes != null,
    auto_action: false
  };
}

function runAssetCriticalityRuntime(signals = {}) {
  const op = signals.operational || {};
  const ratio = op.asset_count > 0 ? (op.critical_assets || 0) / op.asset_count : 0;
  return {
    critical_assets: op.critical_assets ?? 0,
    total_assets: op.asset_count ?? 0,
    criticality_ratio: Number(ratio.toFixed(3)),
    risk_level: ratio > 0.3 ? 'high' : ratio > 0.1 ? 'medium' : 'low',
    auto_action: false
  };
}

function runMaintenanceRiskGovernance(signals = {}, predictive = {}) {
  const critical = runAssetCriticalityRuntime(signals);
  const failureRisk = predictive.failure_risk ?? 'unknown';
  return {
    supervised_recommendations_only: true,
    failure_risk: failureRisk,
    criticality: critical.risk_level,
    auto_maintenance: false,
    auto_shutdown: false,
    auto_action: false
  };
}

module.exports = {
  runReliabilityIntelligenceRuntime,
  runMtbfMttrAnalyzer,
  runDowntimeCorrelationEngine,
  runAssetCriticalityRuntime,
  runMaintenanceRiskGovernance
};
