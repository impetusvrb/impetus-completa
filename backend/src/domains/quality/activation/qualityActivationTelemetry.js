'use strict';

const obs = require('../../../services/operational/enterpriseObservabilityRuntime');
const metrics = require('./qualityActivationMetrics');

function record(name, value, labels = {}) {
  try {
    obs.recordMetric(name, value, labels);
  } catch {
    /* never throw */
  }
}

function noteShadowPublication() {
  record(metrics.QUALITY_PUBLICATION_SHADOW_TOTAL, 1, {});
}

function notePublicationFailure(reason) {
  record(metrics.QUALITY_PUBLICATION_FAILURES_TOTAL, 1, { reason: String(reason || 'unknown').slice(0, 32) });
}

function noteSafeCheckMs(ms) {
  record(metrics.QUALITY_ACTIVATION_SAFE_CHECK_MS, ms, {});
}

module.exports = {
  record,
  noteShadowPublication,
  notePublicationFailure,
  noteSafeCheckMs
};
