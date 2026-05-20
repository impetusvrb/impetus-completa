'use strict';

const _syncState = new Map();

function syncKey(user, ctx = {}) {
  return `${user?.id || 'anon'}:${user?.company_id || 't0'}:${ctx.functional_axis || user?.functional_axis || 'general'}`;
}

function synchronizeRuntimeTruth(user, truthSources = {}, ctx = {}) {
  const key = syncKey(user, ctx);
  const axes = [
    truthSources.runtime_truth_state?.authority?.contextual_truth?.functional_axis,
    truthSources.cognitive_convergence?.runtime_truth_state?.authority?.contextual_truth?.functional_axis,
    truthSources.contextual_delivery?.targeting?.domain?.domain,
    ctx.functional_axis || user?.functional_axis,
    user?.functional_area
  ].filter(Boolean);

  const canonical = axes[0] || 'general';
  const unique = [...new Set(axes.map((a) => String(a).toLowerCase()))];
  const conflict = unique.length > 1;

  const synced = {
    canonical_axis: canonical,
    sources_checked: unique,
    conflict,
    synchronized_at: new Date().toISOString(),
    runtime_truth_integrity: conflict ? 0.55 : 0.94
  };

  _syncState.set(key, synced);
  return synced;
}

function getSynchronizedTruth(user, ctx = {}) {
  return _syncState.get(syncKey(user, ctx)) || null;
}

function clearSynchronizedTruth() {
  _syncState.clear();
}

module.exports = { synchronizeRuntimeTruth, getSynchronizedTruth, clearSynchronizedTruth, syncKey };
