'use strict';

let obs;
try {
  obs = require('../../../../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function record(metric, value, tags = {}) {
  try {
    obs.recordMetric(metric, value, { domain: 'environment', layer: 'cognitive', ...tags });
  } catch {
    /* noop */
  }
}

module.exports = { record };
