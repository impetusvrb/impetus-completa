'use strict';

/**
 * WAVE 2 — saturação de recursos (heap, filas, pipeline).
 */

const { isSaturationMonitoringEnabled } = require('./observabilityFlags');
const tenantMetrics = require('./tenantMetricsRegistry');

let _lastSample = null;
let _history = [];

function sampleSaturation() {
  if (!isSaturationMonitoringEnabled()) return null;

  const mem = process.memoryUsage();
  const heapRatio = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;

  let outboxPending = 0;
  let dlqDepth = 0;
  let eventQueueDepth = 0;

  try {
    const outbox = require('../eventPipeline/outbox/industrialOutboxService');
    const stats = outbox.getOutboxStats();
    outboxPending = stats.memory_queue_depth || 0;
  } catch (_e) {}

  try {
    const dlq = require('../eventPipeline/dlq/industrialDlqService');
    dlqDepth = dlq.getDlqStats().memory_dlq_depth || 0;
  } catch (_e) {}

  try {
    const backbone = require('../services/cognitiveEventBackboneService');
    if (backbone && typeof backbone.getMetrics === 'function') {
      const m = backbone.getMetrics();
      eventQueueDepth = m && m.queue_depth != null ? m.queue_depth : 0;
    }
  } catch (_e) {}

  const scores = {
    heap: Math.min(1, heapRatio),
    outbox: Math.min(1, outboxPending / 5000),
    dlq: Math.min(1, dlqDepth / 500),
    cognitive_queue: Math.min(1, eventQueueDepth / 5000)
  };

  const overall = Math.max(scores.heap, scores.outbox, scores.dlq, scores.cognitive_queue);

  _lastSample = {
    timestamp: new Date().toISOString(),
    overall_score: Math.round(overall * 1000) / 1000,
    subsystems: scores,
    raw: {
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      outbox_pending: outboxPending,
      dlq_depth: dlqDepth,
      cognitive_queue_depth: eventQueueDepth
    }
  };

  _history.push(_lastSample);
  if (_history.length > 120) _history.shift();

  for (const [subsystem, score] of Object.entries(scores)) {
    tenantMetrics.setGauge('impetus_saturation_score', score, { subsystem });
  }
  tenantMetrics.setGauge('impetus_saturation_score', overall, { subsystem: 'overall' });

  return _lastSample;
}

function getLastSaturation() {
  return _lastSample;
}

function getSaturationHistory(limit = 30) {
  return _history.slice(-limit);
}

module.exports = {
  sampleSaturation,
  getLastSaturation,
  getSaturationHistory
};
