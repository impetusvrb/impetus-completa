'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

let _composer = null;
function _lazyComposer() {
  if (_composer) return _composer;
  try {
    _composer = require('../../services/dashboardComposerService');
  } catch (_) {
    _composer = null;
  }
  return _composer;
}

/**
 * Internaliza a personalização (Motor A) como sub-runtime.
 */
async function resolvePersonalization(user = {}) {
  if (!flags.isContextRuntimeEnabled()) {
    return { personalization: null, runtime_skipped: true };
  }

  const composer = _lazyComposer();
  if (!composer || typeof composer.buildDashboardPayload !== 'function') {
    return { personalization: null, runtime: 'runtime_z', source: 'composer_missing' };
  }

  try {
    const payload = await composer.buildDashboardPayload(user);
    return {
      personalization: payload || null,
      runtime: 'runtime_z',
      source: 'z_context_personalization_runtime',
      delegated_to: 'dashboardComposerService',
      auto_mutation: false
    };
  } catch (err) {
    return {
      personalization: null,
      runtime: 'runtime_z',
      source: 'z_context_personalization_runtime_error',
      error: err?.message || String(err)
    };
  }
}

module.exports = { resolvePersonalization };
