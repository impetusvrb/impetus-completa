'use strict';

/**
 * Métricas operacionais do ingress Gemini (custos / modos).
 */

let _calls = 0;
let _latencySumMs = 0;
/** @type {Record<string, number>} */
const _modeCounts = {
  passthrough: 0,
  light: 0,
  full: 0,
  disabled: 0,
  skipped: 0,
  other: 0
};

function recordIngress(mode, latencyMs) {
  const m = String(mode || 'other').toLowerCase();
  _calls += 1;
  _latencySumMs += Math.max(0, Number(latencyMs) || 0);
  if (_modeCounts[m] != null) _modeCounts[m] += 1;
  else _modeCounts.other += 1;
}

function getSnapshot() {
  const avg = _calls ? Math.round(_latencySumMs / _calls) : 0;
  return {
    gemini_calls_total: _calls,
    gemini_mode_distribution: { ..._modeCounts },
    avg_latency_gemini_ms: avg
  };
}

module.exports = {
  recordIngress,
  getSnapshot
};
