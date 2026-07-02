/**
 * CERT-PULSE-04 FASE 11 — Métricas de calibração e confiabilidade.
 */
'use strict';

let observability;
try {
  observability = require('../../observabilityService');
} catch (_) {
  observability = null;
}

const METRICS = {
  confidence_average: 'pulse_confidence_average',
  false_positive_rate: 'pulse_false_positive_rate',
  false_negative_rate: 'pulse_false_negative_rate',
  data_coverage: 'pulse_data_coverage',
  signal_quality: 'pulse_signal_quality',
  human_validation_rate: 'pulse_human_validation_rate',
  confirmed_insights: 'pulse_confirmed_insights',
  rejected_insights: 'pulse_rejected_insights'
};

function inc(name, delta = 1) {
  try {
    observability?.incrementMetric?.(name, delta);
  } catch (_) {}
}

function setGauge(name, value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return;
  try {
    observability?.incrementMetric?.(name, Math.round(v * 100) / 100);
  } catch (_) {}
}

module.exports = {
  METRICS,
  recordConfidenceAverage: (avg) => setGauge(METRICS.confidence_average, avg * 100),
  recordDataCoverage: (pct) => setGauge(METRICS.data_coverage, pct),
  recordFalsePositiveCandidate: (n = 1) => inc(METRICS.false_positive_rate, n),
  recordFalseNegativeCandidate: (n = 1) => inc(METRICS.false_negative_rate, n),
  recordSignalQuality: (score) => setGauge(METRICS.signal_quality, score),
  recordHumanValidation: () => inc(METRICS.human_validation_rate),
  recordConfirmedInsight: () => inc(METRICS.confirmed_insights),
  recordRejectedInsight: () => inc(METRICS.rejected_insights)
};
