'use strict';

/**
 * WAVE 2 — observabilidade da pressão cognitiva (bridge low-overhead).
 */

const { isCognitivePressureObservabilityEnabled } = require('./observabilityFlags');
const slo = require('./sloSliRegistry');
const tenantMetrics = require('./tenantMetricsRegistry');

let _pressureService = null;

function _pressure() {
  if (_pressureService) return _pressureService;
  try {
    _pressureService = require('../services/enterprise/cognitivePressureService');
  } catch (_e) {
    _pressureService = null;
  }
  return _pressureService;
}

function sampleCognitivePressure(extraSignals = {}) {
  if (!isCognitivePressureObservabilityEnabled()) return null;

  const svc = _pressure();
  if (!svc || !svc.PRESSURE_ENABLED) return { enabled: false, reason: 'pressure_service_off' };

  let outboxDepth = 0;
  try {
    const outbox = require('../eventPipeline/outbox/industrialOutboxService');
    outboxDepth = outbox.getOutboxStats().memory_queue_depth || 0;
  } catch (_e) {}

  const signals = Object.assign(
    {
      queue_depth: outboxDepth,
      max_queue: 5000,
      heap_used_mb: process.memoryUsage().heapUsed / 1024 / 1024
    },
    extraSignals
  );

  const measurement = svc.sample(signals);
  if (!measurement) return null;

  for (const [dim, data] of Object.entries(measurement.dimensions || {})) {
    tenantMetrics.setGauge('impetus_cognitive_pressure', data.value, { dimension: dim });
  }
  tenantMetrics.setGauge('impetus_cognitive_pressure', measurement.overall_pressure, { dimension: 'overall' });
  slo.recordCognitivePressureSli(measurement.overall_pressure);

  return {
    overall_pressure: measurement.overall_pressure,
    alert_level: measurement.alert_level,
    dimensions: Object.keys(measurement.dimensions || {}),
    sampled_at: measurement.timestamp
  };
}

function getCognitivePressureHealth() {
  if (!isCognitivePressureObservabilityEnabled()) return { enabled: false };
  const svc = _pressure();
  if (!svc) return { enabled: true, loaded: false };
  return {
    enabled: true,
    loaded: true,
    health: svc.getHealth(),
    latest_sample: sampleCognitivePressure()
  };
}

module.exports = {
  sampleCognitivePressure,
  getCognitivePressureHealth
};
