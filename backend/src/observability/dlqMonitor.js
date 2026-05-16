'use strict';

/**
 * WAVE 2 — monitorização da DLQ industrial.
 */

const { isDlqMonitoringEnabled } = require('./observabilityFlags');
const slo = require('./sloSliRegistry');
const tenantMetrics = require('./tenantMetricsRegistry');

let _lastDepth = 0;
let _ingressWindow = [];

function pollDlqStats() {
  if (!isDlqMonitoringEnabled()) return null;

  let depth = 0;
  let moved = 0;
  const byDomain = {};

  try {
    const dlq = require('../eventPipeline/dlq/industrialDlqService');
    const stats = dlq.getDlqStats();
    depth = stats.memory_dlq_depth || 0;
    moved = stats.moved || 0;
    const items = dlq.listMemoryDlq(200);
    for (const item of items) {
      const d = item.domain || item.envelope?.domain || 'unknown';
      byDomain[d] = (byDomain[d] || 0) + 1;
    }
  } catch (_e) {}

  const delta = Math.max(0, depth - _lastDepth);
  _lastDepth = depth;
  _ingressWindow.push({ ts: Date.now(), delta });
  if (_ingressWindow.length > 120) _ingressWindow.shift();

  const ingressPerMin = _ingressWindow.reduce((s, w) => s + w.delta, 0) / Math.max(1, _ingressWindow.length / 60);

  tenantMetrics.setGauge('impetus_dlq_depth', depth);
  slo.recordDlqSli(ingressPerMin);

  for (const [domain, count] of Object.entries(byDomain)) {
    tenantMetrics.setGauge('impetus_dlq_depth', count, { domain });
  }

  if (delta > 0) {
    tenantMetrics.incrementCounter('impetus_dlq_ingress_total', delta);
  }

  return {
    depth,
    delta,
    ingress_per_min: Math.round(ingressPerMin * 100) / 100,
    by_domain: byDomain,
    total_moved: moved,
    polled_at: new Date().toISOString()
  };
}

module.exports = {
  pollDlqStats
};
