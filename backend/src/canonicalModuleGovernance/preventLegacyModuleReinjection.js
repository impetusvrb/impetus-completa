'use strict';

const { normalizeModuleId, PUBLICATION_DOMAINS } = require('./moduleAliasRegistry');
const { getCanonicalDenySet } = require('./canonicalModuleMatrix');
const { isModuleAllowedByDomain } = require('./domainModuleMatrix');

function preventLegacyModuleReinjection(items = [], ctx = {}) {
  const axis = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const deny = getCanonicalDenySet(axis);
  const source = ctx.source || 'unknown';
  const kept = [];
  const blocked = [];

  for (const item of items) {
    const moduleId = item.module_id || item.menu_key || item.id || item;
    const key = normalizeModuleId(moduleId);
    const domainCheck = isModuleAllowedByDomain(key, axis);

    if (deny.has(key) || !domainCheck.allowed) {
      blocked.push({
        item: moduleId,
        source,
        module_origin: item.module_origin || item._origin || source,
        governance_rule: domainCheck.reason || 'deny_list',
        hierarchy: ctx.hierarchy_tier,
        domain: axis
      });
      continue;
    }
    kept.push(typeof item === 'string' ? item : { ...item, module_id: key, _governance_allowed: true });
  }

  return {
    items: kept,
    blocked,
    reinjection_prevented: blocked.length > 0,
    denied_publications: _deniedPublicationsForDomain(axis)
  };
}

function _deniedPublicationsForDomain(axis) {
  const denied = [];
  const a = String(axis || '').toLowerCase();
  if (a.includes('qual') || a === 'quality') denied.push('safety', 'environment');
  if (a === 'hr' || a.includes('rh')) denied.push('safety', 'environment', 'quality');
  if (a.includes('safety') || a.includes('sst')) denied.push('environment', 'quality', 'hr');
  if (a.includes('environment') || a.includes('ambient')) denied.push('safety', 'quality', 'hr');
  if (a.includes('executive') || a === 'executive') denied.push('safety', 'quality', 'environment', 'logistics');
  return denied.map((d) => PUBLICATION_DOMAINS[d]).filter(Boolean).flat();
}

function filterContextualModules(contextualModules = [], ctx = {}) {
  return preventLegacyModuleReinjection(contextualModules, { ...ctx, source: 'contextual_modules' });
}

function filterVisibleModules(modules = [], ctx = {}) {
  const strings = modules.map((m) => (typeof m === 'string' ? m : m.module_id || m.menu_key));
  const result = preventLegacyModuleReinjection(strings, { ...ctx, source: 'visible_modules' });
  return result.items;
}

module.exports = {
  preventLegacyModuleReinjection,
  filterContextualModules,
  filterVisibleModules
};
