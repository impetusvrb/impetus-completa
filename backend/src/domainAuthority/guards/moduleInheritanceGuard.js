'use strict';

const domainFlags = require('../config/domainFeatureFlags');
const ehs = require('../registry/ehsModuleInheritance');
const { logPhaseD } = require('../observability/phaseDLogger');

function isEnabled() {
  return domainFlags.isDomainInheritanceGovernanceEnabled();
}

function filterModulesWithInheritance(modules, axis, meta = {}) {
  if (!isEnabled()) return { modules: modules || [], blocked: [] };
  const input = Array.isArray(modules) ? modules : [];
  const allowed = [];
  const blocked = [];

  for (const mod of input) {
    const id = String(mod || '').toLowerCase();
    const entry = ehs.getInheritanceEntry(id);
    let ok = true;
    let reason = null;

    if (entry?.level === ehs.INHERITANCE.EXCLUSIVE && entry.owner_axis !== axis) {
      ok = false;
      reason = 'exclusive_other_domain';
    } else if (entry?.level === ehs.INHERITANCE.RESTRICTED && entry.owner_axis !== axis && !(entry.shared_with || []).includes(axis)) {
      ok = false;
      reason = 'restricted_domain';
    } else if (axis === 'safety' && (id === 'environment_intelligence' || /environment/.test(id))) {
      ok = false;
      reason = 'safety_environmental_conflict';
    }

    if (ok) {
      allowed.push(mod);
      if (entry?.level === ehs.INHERITANCE.SHARED) {
        logPhaseD('DOMAIN_SHARED_MODULE_ALLOWED', { axis, module: mod, user_id: meta.user_id });
      }
    } else {
      blocked.push({ module: mod, reason });
      logPhaseD('DOMAIN_EXCLUSIVE_MODULE_BLOCKED', { axis, module: mod, reason, user_id: meta.user_id });
      if (reason === 'safety_environmental_conflict') {
        logPhaseD('SAFETY_ENVIRONMENTAL_CONFLICT', { module: mod, user_id: meta.user_id });
      }
    }
  }

  if (blocked.length) {
    logPhaseD('DOMAIN_INHERITANCE_APPLIED', { axis, allowed: allowed.length, blocked: blocked.length });
  }

  return { modules: allowed, blocked };
}

function filterManifestIds(manifestIds, axis, meta = {}) {
  if (!isEnabled()) return { ids: manifestIds || [], blocked: [] };
  const input = Array.isArray(manifestIds) ? manifestIds : [];
  const allowed = [];
  const blocked = [];
  for (const id of input) {
    if (ehs.isManifestAllowedForAxis(id, axis)) allowed.push(id);
    else {
      blocked.push({ manifest_id: id, reason: 'manifest_inheritance_denied' });
      logPhaseD('SAFETY_ENVIRONMENTAL_CONFLICT', { manifest_id: id, axis, user_id: meta.user_id });
    }
  }
  return { ids: allowed, blocked };
}

module.exports = {
  isEnabled,
  filterModulesWithInheritance,
  filterManifestIds
};
