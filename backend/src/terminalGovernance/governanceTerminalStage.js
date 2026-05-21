'use strict';

const { isTerminalGovernanceLocked, detectPostLockMutation } = require('./terminalGovernanceLock');
const { resolveFinalDelivery } = require('./finalDeliveryResolution');

function runGovernanceTerminalStage(payload = {}, ctx = {}) {
  const beforeModules = [...(payload.visible_modules || [])];
  const locked = isTerminalGovernanceLocked({
    ...ctx,
    sidebar_governance_runtime: payload.sidebar_governance_runtime,
    real_enforcement_active: ctx.real_enforcement_active
  });

  if (!locked) {
    return {
      applied: false,
      payload,
      governance_freeze_state: {
        governance_locked: false,
        reinjection_blocked: false,
        legacy_pipeline_disabled: false,
        terminal_resolution_applied: false,
        mutation_after_lock_detected: false
      }
    };
  }

  const resolution = resolveFinalDelivery(beforeModules, {
    ...ctx,
    sidebar_governance_runtime: payload.sidebar_governance_runtime,
    contextual_modules: payload.contextual_modules || payload.contextual_modules_governed
  });

  const out = { ...payload };
  out.visible_modules = resolution.final_visible_modules;
  out.contextual_modules = resolution.final_contextual_modules;
  out.contextual_modules_governed = resolution.final_contextual_modules;
  out.contextual_modules_mode = 'STRICT';

  const sgr = {
    ...(out.sidebar_governance_runtime || {}),
    governance_applied: true,
    final_governance_locked: true,
    source_of_truth: 'final_visible_modules',
    post_governance_mutation_allowed: false,
    final_visible_modules: resolution.final_visible_modules,
    denied_publications: out.sidebar_governance_runtime?.denied_publications || []
  };
  out.sidebar_governance_runtime = sgr;

  const mutation = detectPostLockMutation(
    resolution.final_visible_modules,
    out.visible_modules,
    true
  );

  const freeze = {
    governance_locked: true,
    reinjection_blocked: true,
    legacy_pipeline_disabled: true,
    terminal_resolution_applied: true,
    mutation_after_lock_detected: mutation.mutation_after_lock_detected
  };
  out.governance_freeze_state = freeze;

  return {
    applied: true,
    payload: out,
    terminal_resolution: resolution,
    governance_freeze_state: freeze,
    mutation_check: mutation
  };
}

module.exports = { runGovernanceTerminalStage };
