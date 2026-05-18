'use strict';

let obs;
try {
  obs = require('../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function record(metric, value, tags = {}) {
  try {
    obs.recordMetric(metric, value, { domain: 'environment', layer: 'telemetry', ...tags });
  } catch {
    /* noop */
  }
}

function withTiming(metric, fn, tags = {}) {
  const t0 = Date.now();
  const result = fn();
  record(metric, Date.now() - t0, tags);
  return result;
}

async function withTimingAsync(metric, fn, tags = {}) {
  const t0 = Date.now();
  const result = await fn();
  record(metric, Date.now() - t0, tags);
  return result;
}

module.exports = { record, withTiming, withTimingAsync };
