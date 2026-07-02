'use strict';

/**
 * CERT-VOICE-02 — Observabilidade Executive Presentation Context
 */
let observability;
try {
  observability = require('../services/observabilityService');
} catch (_) {
  observability = null;
}

const METRICS = Object.freeze({
  enabled: 'presentation_context_enabled',
  disabled: 'presentation_context_disabled',
  usage: 'presentation_context_usage',
  profile_selected: 'presentation_profile_selected',
  sensitive_hidden: 'presentation_sensitive_data_hidden',
  boardroom_usage: 'presentation_boardroom_usage'
});

function inc(name, delta = 1) {
  try {
    observability?.incrementMetric?.(name, delta);
  } catch (_) {}
}

function logEvent(event, payload = {}) {
  try {
    observability?.logEvent?.('info', event, {
      _type: 'executive_presentation_context',
      ts: new Date().toISOString(),
      ...payload
    });
  } catch (_) {}
}

function recordPresentationEnabled(ctx = {}, channel = '') {
  inc(METRICS.enabled);
  inc(METRICS.profile_selected);
  logEvent('presentation_context_enabled', {
    presentation_level: ctx.presentation_level,
    audience: ctx.audience,
    channel
  });
}

function recordPresentationDisabled(channel = '') {
  inc(METRICS.disabled);
  logEvent('presentation_context_disabled', { channel });
}

function recordPresentationUsage(ctx = {}) {
  inc(METRICS.usage);
  if (ctx.presentation_level === 'board') inc(METRICS.boardroom_usage);
}

function recordSensitiveDataHidden() {
  inc(METRICS.sensitive_hidden);
}

module.exports = {
  METRICS,
  recordPresentationEnabled,
  recordPresentationDisabled,
  recordPresentationUsage,
  recordSensitiveDataHidden
};
