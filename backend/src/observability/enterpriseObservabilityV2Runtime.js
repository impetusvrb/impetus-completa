'use strict';

/**
 * WAVE 2 — runtime orquestrador de observabilidade enterprise.
 */

const flags = require('./observabilityFlags');
const correlationContext = require('./correlationContext');
const workflowTracing = require('./workflowTracingService');
const tenantMetrics = require('./tenantMetricsRegistry');
const slo = require('./sloSliRegistry');
const saturation = require('./saturationMonitor');
const eventLag = require('./eventLagMonitor');
const dlqMonitor = require('./dlqMonitor');
const workflowObs = require('./workflowObservability');
const cognitiveObs = require('./cognitivePressureObservability');
const otlp = require('./otlpExporter');
const alerts = require('./alertEvaluator');

let _tickTimer = null;
let _booted = false;

function bootstrap() {
  if (!flags.isObservabilityV2Enabled() || _booted) {
    return { booted: _booted, enabled: flags.isObservabilityV2Enabled() };
  }
  _booted = true;

  if (flags.isOtelExporterEnabled()) {
    otlp.startOtelExporterLoop();
  }

  const tickMs = parseInt(process.env.IMPETUS_OBSERVABILITY_TICK_MS || '60000', 10) || 60000;
  _tickTimer = setInterval(() => {
    collectPeriodicSnapshot().catch(() => {});
  }, Math.max(15000, tickMs));
  if (typeof _tickTimer.unref === 'function') _tickTimer.unref();

  try {
    console.info(
      '[OBSERVABILITY_V2_BOOT]',
      JSON.stringify({
        event: 'OBSERVABILITY_V2_BOOT',
        flags: getEnabledFlags()
      })
    );
  } catch (_e) {}

  return { booted: true, enabled: true };
}

function getEnabledFlags() {
  return {
    v2: flags.isObservabilityV2Enabled(),
    workflow_tracing: flags.isWorkflowTracingEnabled(),
    correlation: flags.isCorrelationPropagationEnabled(),
    otel: flags.isOtelExporterEnabled(),
    prometheus: flags.isPrometheusEndpointEnabled(),
    slo: flags.isSloMonitoringEnabled(),
    saturation: flags.isSaturationMonitoringEnabled(),
    event_lag: flags.isEventLagMonitoringEnabled(),
    dlq: flags.isDlqMonitoringEnabled(),
    cognitive_pressure: flags.isCognitivePressureObservabilityEnabled(),
    workflow_obs: flags.isWorkflowObservabilityEnabled()
  };
}

async function collectPeriodicSnapshot() {
  if (!flags.isObservabilityV2Enabled()) return null;

  const snap = {
    saturation: flags.isSaturationMonitoringEnabled() ? saturation.sampleSaturation() : null,
    dlq: flags.isDlqMonitoringEnabled() ? dlqMonitor.pollDlqStats() : null,
    event_lag: flags.isEventLagMonitoringEnabled() ? eventLag.getLagStats() : null,
    slos: flags.isSloMonitoringEnabled() ? slo.evaluateSlos() : null,
    cognitive_pressure: flags.isCognitivePressureObservabilityEnabled()
      ? cognitiveObs.sampleCognitivePressure()
      : null
  };

  alerts.evaluateAlerts(snap);

  if (flags.isOtelExporterEnabled()) {
    try {
      const obs = require('../services/operational/enterpriseObservabilityRuntime');
      if (obs && obs.getRecentTraces) {
        for (const t of obs.getRecentTraces(10)) {
          otlp.enqueueTrace({
            traceId: t.traceId,
            name: t.operation,
            startTime: Date.parse(t.startTime) || Date.now(),
            endTime: Date.now(),
            attributes: { duration_ms: t.duration }
          });
        }
      }
    } catch (_e) {}
  }

  return snap;
}

function getHealth() {
  return {
    enabled: flags.isObservabilityV2Enabled(),
    booted: _booted,
    flags: getEnabledFlags(),
    correlation: correlationContext.getContext(),
    metrics_registry: tenantMetrics.getRegistrySnapshot(),
    event_lag: eventLag.getLagStats(),
    saturation: saturation.getLastSaturation(),
    otel: otlp.getOtelExporterStats(),
    recent_alerts: alerts.getRecentAlerts(10),
    workflow_observability: workflowObs.getWorkflowObservabilitySnapshot(),
    cognitive_pressure: cognitiveObs.getCognitivePressureHealth()
  };
}

function recordHttpObservability(req, res, durationMs) {
  if (!flags.isObservabilityV2Enabled()) return;

  const companyId = req.user && req.user.company_id;
  tenantMetrics.recordHttpRequest(req.method, req.originalUrl || req.url, res.statusCode, durationMs, companyId);
  if (flags.isSloMonitoringEnabled()) {
    slo.recordHttpSli(res.statusCode, durationMs);
  }
}

function exportPrometheus() {
  return tenantMetrics.exportPrometheusText();
}

module.exports = {
  bootstrap,
  getHealth,
  getEnabledFlags,
  collectPeriodicSnapshot,
  recordHttpObservability,
  exportPrometheus,
  workflowTracing,
  correlationContext,
  eventLag,
  dlqMonitor
};
