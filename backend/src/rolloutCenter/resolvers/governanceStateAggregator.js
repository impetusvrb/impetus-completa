'use strict';

/**
 * Agrega estados de governança por capacidade (read-only).
 */

const catalog = require('../catalog/capabilityCatalog');

function _safeHealth(loader) {
  try {
    return loader();
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

function aggregateGovernanceStates(companyId = null) {
  const items = catalog.listCapabilities().map((cap) => {
    const mode = String(process.env[cap.mode_flag] || 'off').trim().toLowerCase();
    const state = {
      capability_id: cap.id,
      governance_mode: mode,
      active: mode !== 'off',
      shadow: mode === 'shadow',
      audit: mode === 'audit',
      production_on: mode === 'on',
      runtime_stage: cap.runtime_stage
    };

    if (cap.id === 'action_runtime_hitl') {
      const h = _safeHealth(() => require('../../actionRuntime/orchestration/actionRuntimeOrchestrator').getHealth());
      state.runtime_health = h;
    } else if (cap.id === 'workflow_engine') {
      const h = _safeHealth(() => require('../../workflowEngine/orchestration/workflowOrchestrator').getHealth());
      state.runtime_health = h;
    } else if (cap.id === 'cognitive_registry_ssot') {
      const h = _safeHealth(() => require('../../cognitiveRegistry/consolidation/unifiedCognitiveRegistry').getHealth());
      state.runtime_health = h;
    } else if (cap.id === 'legacy_deprecation') {
      const h = _safeHealth(() => require('../../legacyDeprecation/governance/legacyCompatibilityRouter').getHealth());
      state.runtime_health = h;
    } else if (cap.id === 'runtime_unification_sz5') {
      const h = _safeHealth(() => require('../../runtimeUnification/facade/unifiedSz5RuntimeFacade').getHealth());
      state.runtime_health = h;
    }

    if (companyId && cap.pilot_env) {
      const pilots = String(process.env[cap.pilot_env] || '')
        .split(',')
        .map((s) => s.trim().toLowerCase());
      state.tenant_pilot = pilots.length === 0 || pilots.includes(String(companyId).toLowerCase());
    }

    return state;
  });

  return items;
}

module.exports = { aggregateGovernanceStates };
