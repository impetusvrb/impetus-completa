'use strict';

const _metrics = {
  delivery_precision_score: 0.85,
  contextual_accuracy_rate: 0.88,
  module_delivery_accuracy: 0.9,
  widget_delivery_accuracy: 0.87,
  governance_precision_score: 0.86,
  runtime_delivery_integrity: 0.89,
  overdelivery_rate: 0,
  underdelivery_rate: 0,
  contextual_uncertainty_score: 0.12,
  samples: 0
};

function recordDeliverySample(sample = {}) {
  _metrics.samples += 1;
  const w = 1 / Math.min(_metrics.samples, 100);
  const keys = [
    'delivery_precision_score',
    'contextual_accuracy_rate',
    'module_delivery_accuracy',
    'widget_delivery_accuracy',
    'governance_precision_score',
    'runtime_delivery_integrity',
    'overdelivery_rate',
    'underdelivery_rate',
    'contextual_uncertainty_score'
  ];
  for (const k of keys) {
    if (sample[k] != null) {
      _metrics[k] = Number((_metrics[k] * (1 - w) + sample[k] * w).toFixed(4));
    }
  }
  if (sample.overdelivery) _metrics.overdelivery_rate = Number(Math.min(1, _metrics.overdelivery_rate + 0.01).toFixed(4));
  if (sample.underdelivery) _metrics.underdelivery_rate = Number(Math.min(1, _metrics.underdelivery_rate + 0.01).toFixed(4));
}

function getDeliveryTelemetry() {
  return { ..._metrics, ts: new Date().toISOString() };
}

function resetDeliveryTelemetry() {
  _metrics.samples = 0;
  _metrics.overdelivery_rate = 0;
  _metrics.underdelivery_rate = 0;
}

module.exports = { recordDeliverySample, getDeliveryTelemetry, resetDeliveryTelemetry };
