'use strict';

const flags = require('./config/phaseZ16FeatureFlags');
const { logPhaseZ16 } = require('./phaseZ16Logger');

function isTerminalGovernanceLocked(ctx = {}) {
  if (ctx.final_governance_locked === true) return true;
  if (ctx.governance_freeze_state?.governance_locked === true) return true;
  if (ctx.force_terminal_lock === true) return true;

  const sgr = ctx.sidebar_governance_runtime || {};
  if (sgr.final_governance_locked === true) return true;

  if (flags.isTerminalGovernanceEnabled() || flags.isTerminalSidebarLockEnabled()) {
    if (sgr.governance_applied === true || ctx.real_enforcement_active === true) return true;
  }

  if (flags.isTerminalReinjectionBlockEnabled() && sgr.governance_applied === true) return true;

  if (sgr.governance_applied === true) {
    if (flags.isTerminalGovernanceEnabled() || flags.isTerminalSidebarLockEnabled()) return true;
    if (ctx.real_enforcement_active === true && flags.isTerminalGovernanceObservabilityEnabled()) return true;
  }

  try {
    const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');
    const tenantId = ctx.tenant_id || ctx.canonical_identity?.tenant_id;
    if (tenantId && isRealEnforcementActiveForTenant(tenantId, ctx)) {
      if (flags.isTerminalGovernanceObservabilityEnabled() || flags.isTerminalGovernanceEnabled()) return true;
    }
  } catch {
    /* optional */
  }

  return false;
}

function applyTerminalLockState(modules = [], ctx = {}) {
  const frozen = Object.freeze([...modules]);
  return {
    final_visible_modules: frozen,
    final_governance_locked: true,
    source_of_truth: 'final_visible_modules',
    post_governance_mutation_allowed: false,
    governance_applied: true,
    lock_timestamp: new Date().toISOString(),
    tenant_id: ctx.tenant_id
  };
}

function detectPostLockMutation(before = [], after = [], locked = false) {
  if (!locked) return { mutation_after_lock_detected: false };
  const b = new Set(before);
  const added = after.filter((m) => !b.has(m));
  const removed = [...b].filter((m) => !after.includes(m));
  const detected = added.length > 0 || removed.length > 0;
  if (detected && flags.isTerminalGovernanceObservabilityEnabled()) {
    logPhaseZ16('POST_LOCK_MUTATION_DETECTED', { added, removed });
  }
  return {
    mutation_after_lock_detected: detected,
    added_after_lock: added,
    removed_after_lock: removed
  };
}

module.exports = {
  isTerminalGovernanceLocked,
  applyTerminalLockState,
  detectPostLockMutation
};
