'use strict';

const _m = {
  contextual_delivery_stability: 0.88,
  hierarchy_integrity: 0.9,
  authority_integrity: 0.89,
  module_targeting_precision: 0.91,
  dashboard_targeting_precision: 0.9,
  KPI_targeting_precision: 0.88,
  summary_targeting_precision: 0.87,
  contextual_delivery_confidence: 0.89,
  samples: 0
};

function recordDeliveryStabilitySample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getDeliveryStabilityTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetDeliveryStabilityTelemetry() {
  _m.samples = 0;
}

module.exports = { recordDeliveryStabilitySample, getDeliveryStabilityTelemetry, resetDeliveryStabilityTelemetry };
