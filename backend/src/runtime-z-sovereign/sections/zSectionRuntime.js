'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

let _visibility = null;

function _lazyVisibility() {
  if (_visibility) return _visibility;
  try {
    _visibility = require('../../services/dashboardVisibility');
  } catch (_) {
    _visibility = null;
  }
  return _visibility;
}

/**
 * zSectionRuntime — resolve sections / sidebar hierarchy. Internaliza
 * dashboardVisibility como sub-runtime. Fallback determinístico para
 * DEFAULT_SECTIONS quando o serviço base falha (anti blank-sidebar).
 */
async function resolveSections(user = {}, hierarchyLevel) {
  if (!flags.isSectionRuntimeEnabled()) {
    return { sections: [], runtime_skipped: true };
  }

  const visibility = _lazyVisibility();
  if (!visibility) {
    return {
      sections: [],
      runtime: 'runtime_z',
      source: 'visibility_service_missing'
    };
  }

  try {
    const sections = await visibility.getVisibilityForUser(
      hierarchyLevel ?? user?.hierarchy_level ?? 5,
      user?.company_id
    );
    return {
      sections,
      runtime: 'runtime_z',
      source: 'z_section_runtime',
      delegated_to: 'dashboardVisibility',
      auto_mutation: false
    };
  } catch (err) {
    return {
      sections: visibility.DEFAULT_SECTIONS || [],
      runtime: 'runtime_z',
      source: 'z_section_runtime_fallback',
      error: err?.message || String(err),
      fallback_used: true
    };
  }
}

module.exports = { resolveSections };
