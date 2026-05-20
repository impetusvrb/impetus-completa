'use strict';

const { logFinalReview } = require('../finalReview/finalReviewLogger');
const { computeLatencyMetrics, recordLatency } = require('./governanceLatencyMetrics');

function validateLatency(ctx = {}) {
  const metrics = computeLatencyMetrics({ simulate: ctx.simulate !== false && !_hasSamples() });

  if (!metrics.acceptable) {
    logFinalReview('RUNTIME_DEGRADATION_DETECTED', {
      type: 'latency',
      violations: metrics.violation_count
    });
  }

  return {
    passed: metrics.acceptable,
    metrics,
    governance_latency_impact: metrics.acceptable ? 'acceptable' : 'elevated',
    auto_remediation: false
  };
}

function _hasSamples() {
  const m = computeLatencyMetrics();
  return Object.keys(m.channels).length > 0;
}

module.exports = { validateLatency, recordLatency };
