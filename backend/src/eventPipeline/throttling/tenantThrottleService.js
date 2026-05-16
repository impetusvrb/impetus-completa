'use strict';

/**
 * Throttling por tenant (WAVE 1) — modo observe por defeito.
 * IMPETUS_EVENT_THROTTLE_PER_TENANT=false → só conta, não bloqueia.
 */

const { isEventThrottlePerTenant } = require('../industrialFlags');

const _windows = new Map(); // company_id -> { count, windowStartMs }
const WINDOW_MS = parseInt(process.env.IMPETUS_EVENT_THROTTLE_WINDOW_MS || '60000', 10) || 60000;
const DEFAULT_LIMIT = parseInt(process.env.IMPETUS_EVENT_THROTTLE_LIMIT_PER_MIN || '1200', 10) || 1200;

let _stats = { observed: 0, would_throttle: 0, throttled: 0 };

function _getWindow(companyId) {
  const key = String(companyId || 'unknown');
  const now = Date.now();
  let w = _windows.get(key);
  if (!w || now - w.windowStartMs >= WINDOW_MS) {
    w = { count: 0, windowStartMs: now };
    _windows.set(key, w);
  }
  return w;
}

/**
 * @param {string} companyId
 * @param {{ domain?: string, event_name?: string }} [ctx]
 * @returns {{ allowed: boolean, observe_only: boolean, count: number, limit: number }}
 */
function checkTenantThrottle(companyId, ctx = {}) {
  const w = _getWindow(companyId);
  w.count += 1;
  _stats.observed += 1;

  const limit = DEFAULT_LIMIT;
  const over = w.count > limit;
  const observeOnly = !isEventThrottlePerTenant();

  if (over) {
    _stats.would_throttle += 1;
    if (!observeOnly) {
      _stats.throttled += 1;
      try {
        console.warn(
          '[INDUSTRIAL_TENANT_THROTTLE]',
          JSON.stringify({
            event: 'INDUSTRIAL_TENANT_THROTTLE',
            company_id: companyId,
            domain: ctx.domain,
            event_name: ctx.event_name,
            count: w.count,
            limit
          })
        );
      } catch (_e) {}
      return { allowed: false, observe_only: false, count: w.count, limit };
    }
    return { allowed: true, observe_only: true, count: w.count, limit, would_throttle: true };
  }

  return { allowed: true, observe_only: observeOnly, count: w.count, limit };
}

function getThrottleStats() {
  return {
    ..._stats,
    throttle_enforced: isEventThrottlePerTenant(),
    active_windows: _windows.size,
    window_ms: WINDOW_MS,
    limit_per_window: DEFAULT_LIMIT
  };
}

function resetThrottleState() {
  _windows.clear();
  _stats = { observed: 0, would_throttle: 0, throttled: 0 };
}

module.exports = {
  checkTenantThrottle,
  getThrottleStats,
  resetThrottleState
};
