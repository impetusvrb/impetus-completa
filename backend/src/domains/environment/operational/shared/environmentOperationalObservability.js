'use strict';

let obs;
try {
  obs = require('../../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function recordEnvironmentOperationalMetric(name, value, tags = {}) {
  try {
    obs.recordMetric(name, value, { domain: 'environment', ...tags });
  } catch {
    /* noop */
  }
}

function withTiming(metricName, fn, tags = {}) {
  const t0 = Date.now();
  const result = fn();
  recordEnvironmentOperationalMetric(metricName, Date.now() - t0, tags);
  return result;
}

async function withTimingAsync(metricName, fn, tags = {}) {
  const t0 = Date.now();
  const result = await fn();
  recordEnvironmentOperationalMetric(metricName, Date.now() - t0, tags);
  return result;
}

module.exports = {
  recordEnvironmentOperationalMetric,
  withTiming,
  withTimingAsync
};
