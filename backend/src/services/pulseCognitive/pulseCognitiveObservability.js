/**
 * CERT-PULSE-03 FASE 8 — Métricas Pulse Cognitivo no observabilityService.
 */
'use strict';

let observability;
try {
  observability = require('../observabilityService');
} catch (_) {
  observability = null;
}

const METRICS = {
  events_received: 'pulse_events_received',
  events_processed: 'pulse_events_processed',
  events_failed: 'pulse_events_failed',
  index_updates: 'pulse_index_updates',
  patterns_detected: 'pulse_patterns_detected',
  ai_inferences: 'pulse_ai_inferences',
  scheduler_runs: 'pulse_scheduler_runs',
  scheduler_failures: 'pulse_scheduler_failures'
};

function inc(name, delta = 1) {
  try {
    observability?.incrementMetric?.(name, delta);
  } catch (_) {
    /* silencioso */
  }
}

function recordDashboardLatency(ms) {
  const v = Number(ms);
  if (!Number.isFinite(v) || v < 0) return;
  try {
    observability?.incrementMetric?.('pulse_dashboard_latency_ms', Math.round(v));
  } catch (_) {}
}

module.exports = {
  METRICS,
  eventReceived: () => inc(METRICS.events_received),
  eventProcessed: () => inc(METRICS.events_processed),
  eventFailed: () => inc(METRICS.events_failed),
  indexUpdated: () => inc(METRICS.index_updates),
  patternDetected: (n = 1) => inc(METRICS.patterns_detected, n),
  aiInference: () => inc(METRICS.ai_inferences),
  schedulerRun: () => inc(METRICS.scheduler_runs),
  schedulerFailure: () => inc(METRICS.scheduler_failures),
  recordDashboardLatency
};
