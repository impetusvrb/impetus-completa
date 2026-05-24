'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

let _identityResolver = null;
function _lazyIdentity() {
  if (_identityResolver) return _identityResolver;
  try {
    _identityResolver = require('../../dashboardEngineV2/identity/identityResolver');
  } catch (_) {
    _identityResolver = { buildContextualIdentity: () => null };
  }
  return _identityResolver;
}

/**
 * zIdentityRuntime — absorve identityResolver (V2) como sub-runtime soberano
 * sem duplicar lógica. Quando V2 estiver fisicamente arquivado (fase futura),
 * basta substituir o lazy require por implementação nativa.
 */
function resolveIdentity(user = {}) {
  if (!flags.isIdentityRuntimeEnabled()) {
    return { identity: null, source: 'identity_runtime_off' };
  }

  const resolver = _lazyIdentity();
  try {
    const identity = resolver.buildContextualIdentity
      ? resolver.buildContextualIdentity(user)
      : null;
    return {
      identity,
      source: 'z_identity_runtime',
      delegated_to: 'engine_v2_identity_resolver',
      runtime: 'runtime_z',
      auto_mutation: false
    };
  } catch (err) {
    return {
      identity: null,
      source: 'z_identity_runtime_error',
      error: err?.message || String(err),
      runtime: 'runtime_z'
    };
  }
}

module.exports = { resolveIdentity };
