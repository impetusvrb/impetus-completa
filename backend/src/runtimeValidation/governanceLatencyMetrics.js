'use strict';

const THRESHOLDS_MS = {
  chat: 120,
  kpi: 45,
  summary: 80,
  dashboard: 60,
  trace: 25,
  audit: 15,
  sanitizer: 35
};

const _samples = [];

function recordLatency(channel, durationMs, meta = {}) {
  _samples.push({
    ts: Date.now(),
    channel,
    duration_ms: durationMs,
    ...meta
  });
  if (_samples.length > 500) _samples.shift();
}

function computeLatencyMetrics(ctx = {}) {
  const byChannel = {};
  for (const s of _samples) {
    if (!byChannel[s.channel]) byChannel[s.channel] = [];
    byChannel[s.channel].push(s.duration_ms);
  }

  const channels = {};
  let violations = 0;
  for (const [ch, values] of Object.entries(byChannel)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p95 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || avg;
    const threshold = THRESHOLDS_MS[ch] || 100;
    const within = p95 <= threshold;
    if (!within) violations++;
    channels[ch] = {
      avg_ms: Number(avg.toFixed(2)),
      p95_ms: Number(p95.toFixed(2)),
      threshold_ms: threshold,
      within_threshold: within,
      sample_count: values.length
    };
  }

  if (_samples.length === 0 && ctx.simulate) {
    return _simulatedMetrics();
  }

  return {
    channels,
    violation_count: violations,
    acceptable: violations === 0,
    thresholds: THRESHOLDS_MS
  };
}

function _simulatedMetrics() {
  const channels = {};
  for (const [ch, threshold] of Object.entries(THRESHOLDS_MS)) {
    const p95 = threshold * 0.6;
    channels[ch] = {
      avg_ms: p95 * 0.7,
      p95_ms: p95,
      threshold_ms: threshold,
      within_threshold: true,
      sample_count: 1,
      simulated: true
    };
  }
  return { channels, violation_count: 0, acceptable: true, thresholds: THRESHOLDS_MS, simulated: true };
}

function clearForTests() {
  _samples.length = 0;
}

module.exports = { THRESHOLDS_MS, recordLatency, computeLatencyMetrics, clearForTests };
