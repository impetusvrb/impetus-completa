'use strict';

/**
 * CERT-VOICE-01 — Observabilidade do Conversation Context Engine.
 */
let observability;
try {
  observability = require('../services/observabilityService');
} catch (_) {
  observability = null;
}

const METRICS = Object.freeze({
  context_detected: 'conversation_context_detected',
  profile_selected: 'conversation_profile_selected',
  context_switch: 'conversation_context_switch',
  executive_usage: 'executive_context_usage',
  technical_usage: 'technical_context_usage',
  operational_usage: 'operational_context_usage',
  meeting_usage: 'meeting_context_usage'
});

function inc(name, delta = 1) {
  try {
    observability?.incrementMetric?.(name, delta);
  } catch (_) {
    /* silencioso */
  }
}

function logEvent(event, payload = {}) {
  try {
    observability?.logEvent?.('info', event, {
      _type: 'conversation_context_engine',
      ts: new Date().toISOString(),
      ...payload
    });
  } catch (_) {
    /* silencioso */
  }
}

function recordContextResolved(resolution = {}, meta = {}) {
  inc(METRICS.context_detected);
  inc(METRICS.profile_selected);

  const ctx = resolution.context_type || 'default';
  if (ctx === 'executive') inc(METRICS.executive_usage);
  if (ctx === 'technical') inc(METRICS.technical_usage);
  if (ctx === 'operational') inc(METRICS.operational_usage);
  if (resolution.profile_id === 'meeting' || resolution.subcontext === 'meeting') {
    inc(METRICS.meeting_usage);
  }

  if (meta.previous_profile_id && meta.previous_profile_id !== resolution.profile_id) {
    inc(METRICS.context_switch);
  }

  logEvent('conversation_context_detected', {
    context_type: resolution.context_type,
    subcontext: resolution.subcontext,
    profile_id: resolution.profile_id,
    confidence: resolution.confidence,
    channel: meta.channel,
    switched: Boolean(meta.previous_profile_id && meta.previous_profile_id !== resolution.profile_id)
  });
}

module.exports = {
  METRICS,
  recordContextResolved
};
