'use strict';

const _temporal = new Map();
const STALE_MS = 5 * 60 * 1000;

function stabilizeTemporalContext(user, truthSnapshot, ctx = {}) {
  const key = `${user?.id}:${user?.company_id}:${ctx.functional_axis || 'general'}`;
  const now = Date.now();
  const prev = _temporal.get(key);

  let drift = false;
  let stale = false;
  if (prev) {
    if (prev.axis !== truthSnapshot?.canonical_axis) drift = true;
    if (now - prev.ts > STALE_MS) stale = true;
  }

  _temporal.set(key, { axis: truthSnapshot?.canonical_axis, ts: now });

  return {
    temporal_consistency: drift || stale ? 0.6 : 0.93,
    temporal_drift: drift,
    stale_context: stale,
    last_axis: prev?.axis,
    current_axis: truthSnapshot?.canonical_axis
  };
}

function clearTemporalContext() {
  _temporal.clear();
}

module.exports = { stabilizeTemporalContext, clearTemporalContext, STALE_MS };
