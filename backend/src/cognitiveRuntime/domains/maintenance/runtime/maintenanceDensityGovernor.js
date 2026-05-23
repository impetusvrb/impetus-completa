'use strict';

const zm1 = require('../../../config/phaseZM1FeatureFlags');

function runMaintenanceDensityGovernor(centers = [], widgets = [], alerts = []) {
  const maxCenters = zm1.maxCenters();
  const maxWidgets = zm1.maxWidgets();
  const maxAlerts = zm1.maxCriticalAlerts();

  const trimmedCenters = centers.slice(0, maxCenters);
  const trimmedWidgets = widgets.slice(0, maxWidgets);
  const trimmedAlerts = alerts.slice(0, maxAlerts);

  return {
    centers: trimmedCenters,
    widgets: trimmedWidgets,
    alerts: trimmedAlerts,
    overload_detected:
      centers.length > maxCenters || widgets.length > maxWidgets || alerts.length > maxAlerts,
    limits: { maxCenters, maxWidgets, maxAlerts },
    auto_action: false
  };
}

function runPredictiveNoiseReducer(alerts = []) {
  const critical = alerts.filter((a) => a.severity === 'critical' || a.level === 'critical');
  return {
    alerts: critical.slice(0, zm1.maxCriticalAlerts()),
    noise_reduced: alerts.length > critical.length,
    auto_action: false
  };
}

function runTelemetryPressureAnalyzer(telemetry = {}) {
  return {
    pressure: telemetry.degraded ? 'elevated' : telemetry.unavailable ? 'high' : 'normal',
    graceful_fallback: telemetry.unavailable || telemetry.degraded,
    auto_action: false
  };
}

function runMaintenanceAttentionProtection(density = {}) {
  return {
    protected: density.overload_detected === true,
    centers_capped: density.limits?.maxCenters ?? 6,
    auto_action: false
  };
}

module.exports = {
  runMaintenanceDensityGovernor,
  runPredictiveNoiseReducer,
  runTelemetryPressureAnalyzer,
  runMaintenanceAttentionProtection
};
