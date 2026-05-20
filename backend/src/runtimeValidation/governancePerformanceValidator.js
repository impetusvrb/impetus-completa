'use strict';

const { validateLatency } = require('./governanceLatencyValidator');
const { detectAnomalies } = require('./governanceRuntimeAnomalyDetector');

function validatePerformance(ctx = {}) {
  const latency = validateLatency(ctx);
  const anomalies = detectAnomalies(ctx);

  const overhead = {
    trace: latency.metrics.channels.trace?.within_threshold !== false,
    audit: latency.metrics.channels.audit?.within_threshold !== false,
    explainability: ctx.explainability_overhead_ms == null || ctx.explainability_overhead_ms < 30,
    sanitizer: latency.metrics.channels.sanitizer?.within_threshold !== false
  };

  const passed = latency.passed && anomalies.stable && Object.values(overhead).every(Boolean);

  return {
    passed,
    latency,
    anomalies,
    overhead,
    governance_performance_impact: passed ? 'acceptable' : 'review_required',
    auto_remediation: false
  };
}

module.exports = { validatePerformance };
