'use strict';

const { isTerminalGovernanceLocked } = require('./terminalGovernanceLock');
const { isDeniedPublicationLocked } = require('./deniedPublicationTerminalLock');

function resolveTerminalGovernancePolicy(payload = {}, ctx = {}) {
  const locked = isTerminalGovernanceLocked({
    ...ctx,
    sidebar_governance_runtime: payload.sidebar_governance_runtime,
    final_governance_locked: payload.sidebar_governance_runtime?.final_governance_locked
  });

  return {
    terminal_active: locked,
    legacy_pipeline_disabled: locked,
    contextual_modules_mode: locked ? 'STRICT' : payload.contextual_modules_mode || 'enrich',
    post_governance_mutation_allowed: !locked,
    reinjection_policy: locked ? 'BLOCK_ALL' : 'AUDIT_ONLY',
    skip_injectors: locked
      ? [
          'buildHybridMenu',
          'safeMergeSafetyPublicationIntoMenu',
          'safeMergeEnvironmentPublicationIntoMenu',
          'safeMergeLogisticsPublicationIntoMenu',
          'contextual_enrich',
          'sidebarAugmentation',
          'cockpitModuleFallbacks',
          'precisionDelivery_fallback'
        ]
      : []
  };
}

function assertModuleNotReinjected(moduleId, payload = {}) {
  const sgr = payload.sidebar_governance_runtime || {};
  const check = isDeniedPublicationLocked(moduleId, {
    denied_publications: sgr.denied_publications,
    denied_modules: sgr.removed_modules
  });
  if (check.locked && sgr.final_governance_locked) {
    return { allowed: false, ...check };
  }
  return { allowed: true };
}

module.exports = { resolveTerminalGovernancePolicy, assertModuleNotReinjected };
