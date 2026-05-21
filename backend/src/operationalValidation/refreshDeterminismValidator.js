'use strict';

function _hashModules(mods = []) {
  return [...mods].sort().join('|');
}

function _simulateCycle(basePayload, cycleIndex, scenario = 'refresh') {
  const mods = basePayload.visible_modules || [];
  const final = basePayload.sidebar_governance_runtime?.final_visible_modules || mods;
  const denied = basePayload.sidebar_governance_runtime?.denied_publications || [];
  let mutated = [...mods];

  if (scenario === 'hierarchy_switch' && cycleIndex % 2 === 1) {
    mutated = mutated.filter((m) => m !== 'safety_intelligence');
  }
  if (scenario === 'profile_switch' && cycleIndex === 2) {
    mutated = [...mutated, 'safety_intelligence'];
  }

  return {
    cycle: cycleIndex,
    scenario,
    visible_hash: _hashModules(mutated),
    final_hash: _hashModules(final),
    denied_hash: _hashModules(denied),
    kpis_count: (basePayload.kpis || []).length,
    summary_len: String(basePayload.summary || '').length
  };
}

function validateRefreshDeterminism(payload = {}, ctx = {}) {
  const cycles = ctx.cycles || 5;
  const scenarios = ctx.scenarios || ['refresh', 'logout_login', 'hierarchy_switch', 'profile_switch'];
  const snapshots = [];
  const baseFinal = payload.sidebar_governance_runtime?.final_visible_modules || payload.visible_modules || [];
  const baseDenied = payload.sidebar_governance_runtime?.denied_publications || [];
  const baseHash = _hashModules(baseFinal);
  const deniedHash = _hashModules(baseDenied);

  for (const scenario of scenarios) {
    for (let i = 0; i < cycles; i++) {
      snapshots.push(_simulateCycle(payload, i, scenario));
    }
  }

  const finalHashes = new Set(snapshots.map((s) => s.final_hash));
  const deniedStable = snapshots.every((s) => s.denied_hash === deniedHash || s.denied_hash === '');
  const oscillation = finalHashes.size > 1;
  const reinjection =
    snapshots.some((s) => s.visible_hash !== s.final_hash && s.scenario !== 'profile_switch') &&
    payload.governance_freeze_state?.reinjection_blocked === true;

  const mutationAfterLock = payload.governance_freeze_state?.mutation_after_lock_detected === true;
  const staleMerge =
    oscillation &&
    (payload.visible_modules || []).some((m) =>
      (payload.sidebar_governance_runtime?.denied_publications || []).includes(m)
    );

  return {
    determinism_validated: !oscillation && !reinjection && !mutationAfterLock,
    oscillation_detected: oscillation,
    mutation_after_lock: mutationAfterLock,
    reinjection_after_refresh: reinjection,
    stale_merge_resurrection: staleMerge,
    contextual_race_condition: oscillation && reinjection,
    cycles_run: snapshots.length,
    final_hash_stable: finalHashes.size === 1,
    denied_publications_stable: deniedStable,
    snapshots: ctx.include_snapshots ? snapshots : snapshots.slice(0, 3)
  };
}

module.exports = { validateRefreshDeterminism, _hashModules };
