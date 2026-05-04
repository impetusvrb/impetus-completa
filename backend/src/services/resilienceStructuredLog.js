'use strict';

/**
 * Logs JSON únicos para correlacionar resiliência em produção (trace_id / request_id via ALS quando disponível).
 */

function _alsCorrelators() {
  try {
    const als = require('./requestAsyncContext').asyncLocalStorage.getStore();
    if (!als) return {};
    return {
      trace_id: als.trace_id ?? als.traceId ?? null,
      request_id: als.request_id ?? als.requestId ?? null
    };
  } catch (_e) {
    return {};
  }
}

/**
 * @param {string} event — nome estável do evento (ex.: circuit_breaker_open, gpt_fallback_L3)
 * @param {Record<string, unknown>} [fields] — provider, tier, fallback_level, detail, …
 */
function resilienceLog(event, fields = {}) {
  const base = _alsCorrelators();
  const payload = {
    ts: new Date().toISOString(),
    trace_id: fields.trace_id !== undefined ? fields.trace_id : base.trace_id ?? null,
    request_id: fields.request_id !== undefined ? fields.request_id : base.request_id ?? null,
    ...fields,
    impetus_resilience_event: event
  };
  console.warn(JSON.stringify(payload));
}

module.exports = { resilienceLog };
