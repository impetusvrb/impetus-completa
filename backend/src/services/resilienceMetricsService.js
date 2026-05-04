'use strict';

/**
 * Métricas operacionais de resiliência (taxas, tempos de estado, triggers).
 * Evita require circular com systemRuntimeState (lazy).
 */

let _requestTotal = 0;
let _heavyDegradedPass = 0;
let _blockedResponses = 0;

/** @type {Record<string, number>} */
const _limitedTriggerCounts = {};

/** tempo acumulado (ms) por estado desde arranque do processo */
const _stateMs = { HEALTHY: 0, LIMITED: 0, DEGRADED: 0 };
let _lastStateTick = Date.now();

function _accumulateStateTime() {
  const now = Date.now();
  const dt = Math.max(0, now - _lastStateTick);
  _lastStateTick = now;
  try {
    const systemRuntimeState = require('./systemRuntimeState');
    const st = systemRuntimeState.system_state.status;
    if (_stateMs[st] != null) _stateMs[st] += dt;
  } catch (_e) {
    /* ignore */
  }
}

setInterval(() => {
  try {
    _accumulateStateTime();
  } catch (_e) {
    /* ignore */
  }
}, 5000).unref?.();

function recordApiRequest() {
  _requestTotal += 1;
}

function recordHeavyDegradedPass() {
  _heavyDegradedPass += 1;
}

function recordBlockedResponse() {
  _blockedResponses += 1;
}

/**
 * @param {string} reasonPrefix — ex.: AI_LATENCY, WATCHDOG
 */
function recordLimitedTrigger(reasonPrefix) {
  const key = String(reasonPrefix || 'UNKNOWN').split(':')[0].slice(0, 48);
  _limitedTriggerCounts[key] = (_limitedTriggerCounts[key] || 0) + 1;
}

function getDominantLimitedTrigger() {
  let best = null;
  let n = 0;
  for (const [k, v] of Object.entries(_limitedTriggerCounts)) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best ? { trigger: best, count: n } : null;
}

/** @type {{ reason: string, at: number }[]} */
const _fallbackEvents = [];
const FALLBACK_CAP = 200;

function recordFallbackUsage(reason) {
  _fallbackEvents.push({
    reason: String(reason || '').slice(0, 80),
    at: Date.now()
  });
  if (_fallbackEvents.length > FALLBACK_CAP) _fallbackEvents.splice(0, _fallbackEvents.length - FALLBACK_CAP);
}

function _fallbackRateRecentWindowMs() {
  const win = Math.max(60000, parseInt(process.env.IMPETUS_METRICS_FALLBACK_WINDOW_MS || '', 10) || 3600000);
  const cutoff = Date.now() - win;
  let n = 0;
  for (const e of _fallbackEvents) {
    if (e.at >= cutoff) n += 1;
  }
  return { window_ms: win, count: n };
}

function _tierFromReason(reason) {
  const r = String(reason || '');
  if (/cb_skip|min_pipeline|L3|minimal|soft_single|gpt_cb|pipeline_L3/i.test(r)) return 'L3';
  if (/L2|alt_model|claude_L2/i.test(r)) return 'L2';
  if (/L1|retry/i.test(r)) return 'L1';
  return 'other';
}

function getFallbackTierBreakdown() {
  const fb = _fallbackRateRecentWindowMs();
  const cutoff = Date.now() - fb.window_ms;
  const tiers = { L1: 0, L2: 0, L3: 0, other: 0 };
  for (const e of _fallbackEvents) {
    if (e.at < cutoff) continue;
    const t = _tierFromReason(e.reason);
    if (tiers[t] != null) tiers[t] += 1;
    else tiers.other += 1;
  }
  return { window_ms: fb.window_ms, tiers, events_in_window: fb.count };
}

function getPublicSnapshot() {
  _accumulateStateTime();
  const total = Math.max(1, _requestTotal);
  const fb = _fallbackRateRecentWindowMs();
  const dominant = getDominantLimitedTrigger();
  const sumStates = _stateMs.HEALTHY + _stateMs.LIMITED + _stateMs.DEGRADED || 1;
  return {
    requests_observed: _requestTotal,
    heavy_degraded_passthrough: _heavyDegradedPass,
    heavy_degraded_passthrough_pct: Math.round((_heavyDegradedPass / total) * 10000) / 100,
    blocked_or_hard_fail_responses: _blockedResponses,
    blocked_pct: Math.round((_blockedResponses / total) * 10000) / 100,
    time_in_state_ms: { ..._stateMs },
    time_in_state_pct: {
      HEALTHY: Math.round((_stateMs.HEALTHY / sumStates) * 10000) / 100,
      LIMITED: Math.round((_stateMs.LIMITED / sumStates) * 10000) / 100,
      DEGRADED: Math.round((_stateMs.DEGRADED / sumStates) * 10000) / 100
    },
    dominant_limited_trigger: dominant,
    limited_trigger_histogram: { ..._limitedTriggerCounts },
    fallback_usage_window: fb,
    fallback_total_recorded: _fallbackEvents.length,
    fallback_tier_breakdown: getFallbackTierBreakdown()
  };
}

module.exports = {
  recordApiRequest,
  recordHeavyDegradedPass,
  recordBlockedResponse,
  recordLimitedTrigger,
  recordFallbackUsage,
  getPublicSnapshot,
  getFallbackTierBreakdown
};
