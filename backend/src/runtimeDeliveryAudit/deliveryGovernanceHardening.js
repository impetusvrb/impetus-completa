'use strict';

/**
 * Hardening controlado Z.15 — sem breaking change nos payloads legacy.
 */

function isModuleReinjectionBlocked(moduleId, deniedPublications = [], deniedModules = []) {
  const key = String(moduleId || '').toLowerCase();
  const pubs = (deniedPublications || []).map((d) => String(d).toLowerCase());
  const mods = (deniedModules || []).map((d) => String(d).toLowerCase());

  if (mods.includes(key)) return { blocked: true, reason: 'denied_module' };
  if (key.includes('safety') && pubs.some((p) => p.includes('safety'))) return { blocked: true, reason: 'denied_publication_safety' };
  if (key.includes('environment') && pubs.some((p) => p.includes('environment'))) {
    return { blocked: true, reason: 'denied_publication_environment' };
  }
  if (pubs.includes(key)) return { blocked: true, reason: 'denied_publication' };
  return { blocked: false };
}

function enforceSingleSourceOfTruth(sidebarGovernanceRuntime = {}, visibleModules = []) {
  if (sidebarGovernanceRuntime?.governance_applied !== true) {
    return {
      modules: visibleModules,
      single_source_enforced: false,
      source: 'visible_modules_legacy'
    };
  }
  const final = sidebarGovernanceRuntime.final_visible_modules || visibleModules;
  return {
    modules: Array.isArray(final) ? final.slice() : visibleModules,
    single_source_enforced: true,
    source: 'sidebar_governance_runtime.final_visible_modules'
  };
}

function filterContextualModulesHardened(contextualModules = [], sidebarGovernanceRuntime = {}) {
  if (sidebarGovernanceRuntime?.governance_applied !== true) {
    return { modules: contextualModules, filtered: false };
  }
  const denied = [
    ...(sidebarGovernanceRuntime.denied_publications || []),
    ...(sidebarGovernanceRuntime.removed_modules || []).map((r) => (typeof r === 'string' ? r : r.module))
  ];
  const kept = [];
  const blocked = [];
  for (const mod of contextualModules || []) {
    const id = mod.module_id || mod.menu_key || mod;
    const check = isModuleReinjectionBlocked(id, denied, denied);
    if (check.blocked) blocked.push({ module: id, reason: check.reason });
    else kept.push(mod);
  }
  return { modules: kept, blocked, filtered: blocked.length > 0 };
}

module.exports = {
  isModuleReinjectionBlocked,
  enforceSingleSourceOfTruth,
  filterContextualModulesHardened
};
