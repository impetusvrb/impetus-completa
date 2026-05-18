'use strict';

const obs = require('./environmentTelemetryObservability');
const flags = require('./environmentTelemetryRuntimeFlags');

let _queueDepth = 0;

function getRealtimeIngestionSnapshot() {
  return {
    enabled: flags.isEnvironmentTelemetryRuntimeEnabled(),
    queue_depth: _queueDepth,
    edge_enabled: flags.isEnvironmentTelemetryEdgeRuntimeEnabled()
  };
}

function trackIngestionStart() {
  _queueDepth++;
  obs.record('environment_realtime_queue_size', _queueDepth, {});
}

function trackIngestionEnd() {
  _queueDepth = Math.max(0, _queueDepth - 1);
}

async function ingestRealtimeStream(companyId, userId, samples, ingestSingleFn) {
  const t0 = Date.now();
  if (!flags.isEnvironmentTelemetryRuntimeEnabled()) {
    return { ok: false, code: 'TELEMETRY_OFF' };
  }
  const arr = Array.isArray(samples) ? samples : [];
  const results = [];
  trackIngestionStart();
  try {
    for (const s of arr.slice(0, flags.getEnvironmentTelemetryBatchMax())) {
      const r = await ingestSingleFn(companyId, userId, s, { emit_sample_event: false });
      results.push(r);
    }
  } finally {
    trackIngestionEnd();
  }
  const ms = Date.now() - t0;
  obs.record('environment_realtime_ingestion_ms', ms, { n: String(results.length) });
  return { ok: true, results, duration_ms: ms };
}

module.exports = {
  getRealtimeIngestionSnapshot,
  ingestRealtimeStream
};
