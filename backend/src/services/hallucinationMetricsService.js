'use strict';

/**
 * In-memory metrics for hallucination detection (observability / admin dashboards).
 * No external deps — bounded buffers for performance.
 */

const MAX_SAMPLES = 2000;

const _stats = {
  assessments_total: 0,
  low_confidence_total: 0,
  review_queue_total: 0,
  false_positives_total: 0,
  severity_counts: { INFO: 0, WARNING: 0, HIGH: 0, CRITICAL: 0 },
  by_module: {},
  confidence_samples: [],
  latency_ms_samples: [],
  last_assessment_at: null,
};

function recordAssessment(assessment) {
  if (!assessment) return;
  _stats.assessments_total++;
  _stats.last_assessment_at = new Date().toISOString();

  const sev = assessment.severity || 'INFO';
  if (_stats.severity_counts[sev] != null) _stats.severity_counts[sev]++;

  if (assessment.low_confidence_flag) _stats.low_confidence_total++;
  if (assessment.requires_human_review) _stats.review_queue_total++;

  const mod = assessment.module_name || 'unknown';
  _stats.by_module[mod] = (_stats.by_module[mod] || 0) + 1;

  _stats.confidence_samples.push(assessment.confidence_score);
  if (_stats.confidence_samples.length > MAX_SAMPLES) {
    _stats.confidence_samples.splice(0, _stats.confidence_samples.length - MAX_SAMPLES);
  }

  const ms = assessment.governance_metadata?.elapsed_ms;
  if (typeof ms === 'number') {
    _stats.latency_ms_samples.push(ms);
    if (_stats.latency_ms_samples.length > MAX_SAMPLES) {
      _stats.latency_ms_samples.splice(0, _stats.latency_ms_samples.length - MAX_SAMPLES);
    }
  }
}

function recordFalsePositive() {
  _stats.false_positives_total++;
}

function _avg(arr) {
  if (!arr.length) return null;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4));
}

function _p95(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function getMetrics() {
  const fpRate =
    _stats.assessments_total > 0
      ? Number((_stats.false_positives_total / _stats.assessments_total).toFixed(4))
      : 0;

  return {
    ..._stats,
    avg_confidence: _avg(_stats.confidence_samples),
    p95_latency_ms: _p95(_stats.latency_ms_samples),
    false_positive_rate: fpRate,
    drift_tracking: {
      note: 'Integrated via continuousValidationEngine + runtimeDriftDetectionEngine on trace hook',
      continuous_validation_enabled: process.env.IMPETUS_CONTINUOUS_VALIDATION_ENABLED !== 'false',
    },
  };
}

function resetMetrics() {
  _stats.assessments_total = 0;
  _stats.low_confidence_total = 0;
  _stats.review_queue_total = 0;
  _stats.false_positives_total = 0;
  _stats.severity_counts = { INFO: 0, WARNING: 0, HIGH: 0, CRITICAL: 0 };
  _stats.by_module = {};
  _stats.confidence_samples = [];
  _stats.latency_ms_samples = [];
  _stats.last_assessment_at = null;
}

module.exports = {
  recordAssessment,
  recordFalsePositive,
  getMetrics,
  resetMetrics,
};
