'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

let _accessService = null;
let _moduleGov = null;

function _lazyAccess() {
  if (_accessService) return _accessService;
  try {
    _accessService = require('../../services/dashboardAccessService');
  } catch (_) {
    _accessService = null;
  }
  return _accessService;
}

function _lazyGovernance() {
  if (_moduleGov) return _moduleGov;
  try {
    _moduleGov = require('../../services/moduleAccessGovernanceEngine');
  } catch (_) {
    _moduleGov = null;
  }
  return _moduleGov;
}

/**
 * zModuleAuthorityRuntime — resolve módulos visíveis, permissões e
 * profundidade de IA, internalizando dashboardAccessService +
 * moduleAccessGovernanceEngine como sub-runtimes.
 *
 * Saída é tenant-isolated, audience-aware e governance-aware.
 */
async function resolveModuleAuthority(user = {}) {
  if (!flags.isModuleRuntimeEnabled()) {
    return { visible_modules: [], runtime_skipped: true };
  }

  const access = _lazyAccess();
  if (!access) {
    return { visible_modules: [], runtime: 'runtime_z', source: 'access_service_missing' };
  }

  let allowed = [];
  try {
    allowed = access.getAllowedModules(user) || [];
  } catch (_) {
    allowed = [];
  }

  let governance = null;
  let context = null;
  let visible = allowed;

  const gov = _lazyGovernance();
  if (gov && typeof gov.isEnabled === 'function' && gov.isEnabled()) {
    try {
      const out = await gov.resolveForUser(user, allowed);
      visible = out.visible_modules;
      governance = out.module_access_governance;
      context = out.module_access_context;
    } catch (_) {
      visible = allowed;
    }
  }

  let permissions = {};
  let depth = null;
  try {
    permissions = access.getEffectivePermissions(user) || {};
  } catch (_) {
    permissions = {};
  }
  try {
    depth = access.getIADataDepth(user);
  } catch (_) {
    depth = null;
  }

  return {
    visible_modules: visible,
    allowed_modules: allowed,
    effective_permissions: permissions,
    ia_data_depth: depth,
    module_access_governance: governance,
    module_access_context: context,
    runtime: 'runtime_z',
    source: 'z_module_authority_runtime',
    delegated_to: ['dashboardAccessService', 'moduleAccessGovernanceEngine'],
    auto_mutation: false
  };
}

module.exports = { resolveModuleAuthority };
