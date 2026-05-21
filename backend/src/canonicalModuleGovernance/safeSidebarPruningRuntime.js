'use strict';

const { UNIVERSAL_SHARED } = require('./canonicalModuleMatrix');
const { normalizeModuleId } = require('./moduleAliasRegistry');
const { isModuleAllowedByDomain } = require('./domainModuleMatrix');
const { isModuleDeniedByHierarchy } = require('./hierarchyModuleMatrix');
const { isModuleDeniedByAuthority } = require('./authorityModuleMatrix');
const { filterExecutiveVisibility } = require('./executiveVisibilityMatrix');

const NEVER_REMOVE = Object.freeze([
  'dashboard',
  'settings',
  'help',
  'notifications',
  'biblioteca',
  'ai',
  'chat'
]);

function minimumOperationalSidebar(domainAxis) {
  const base = ['dashboard', 'settings'];
  const axis = String(domainAxis || '').toLowerCase();
  if (axis.includes('qual')) base.push('quality_intelligence');
  else if (axis === 'hr' || axis.includes('rh')) base.push('hr_intelligence');
  else if (axis.includes('safety') || axis.includes('sst')) base.push('safety_intelligence');
  else if (axis.includes('environment') || axis.includes('ambient')) base.push('environment_intelligence');
  else base.push('operational');
  return [...new Set(base)];
}

function minimumExecutiveSidebar() {
  return ['dashboard', 'settings', 'operational', 'audit', 'esg'];
}

function applySafeSidebarPruning(modules = [], ctx = {}) {
  const before = [...modules];
  const axis = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const kept = [];
  const removed = [];
  const applied_rules = [];

  for (const mod of modules) {
    const key = normalizeModuleId(mod);
    if (NEVER_REMOVE.includes(key)) {
      kept.push(mod);
      continue;
    }
    const domain = isModuleAllowedByDomain(key, axis);
    const hierarchy = isModuleDeniedByHierarchy(key, ctx);
    const authority = isModuleDeniedByAuthority(key, ctx);

    if (!domain.allowed) {
      removed.push({ module: mod, reason: domain.reason, rule: 'domain_matrix' });
      applied_rules.push(`domain:${domain.reason}`);
      continue;
    }
    if (hierarchy.denied) {
      removed.push({ module: mod, reason: hierarchy.reason, rule: 'hierarchy_matrix' });
      applied_rules.push(`hierarchy:${hierarchy.reason}`);
      continue;
    }
    if (authority.denied) {
      removed.push({ module: mod, reason: authority.reason, rule: 'authority_matrix' });
      applied_rules.push(`authority:${authority.reason}`);
      continue;
    }
    kept.push(mod);
  }

  let visible = [...new Set(kept)];
  const execFilter = filterExecutiveVisibility(visible, ctx);
  if (execFilter.executive_filter_applied) {
    visible = execFilter.modules;
    for (const r of execFilter.removed || []) {
      removed.push({ module: r, reason: 'executive_visibility', rule: 'executive_matrix' });
    }
  }

  const min =
    ctx.hierarchy_tier === 'executive' || (ctx.hierarchy_level ?? 3) <= 2
      ? minimumExecutiveSidebar()
      : minimumOperationalSidebar(axis);

  for (const m of min) {
    if (!visible.includes(m)) visible.push(m);
  }

  const universal = new Set([...NEVER_REMOVE, ...UNIVERSAL_SHARED]);
  visible = visible.filter((m) => {
    const k = normalizeModuleId(m);
    return universal.has(k) || kept.some((x) => normalizeModuleId(x) === k);
  });

  if (visible.length < 2) {
    visible = min;
  }

  return {
    before,
    visible_modules: [...new Set(visible)],
    removed_modules: removed,
    preserved_modules: visible.filter((m) => before.includes(m)),
    applied_rules: [...new Set(applied_rules)],
    fallback_applied: visible.length !== kept.length,
    graceful_degradation: true,
    permanent_remove: false
  };
}

module.exports = {
  NEVER_REMOVE,
  minimumOperationalSidebar,
  minimumExecutiveSidebar,
  applySafeSidebarPruning
};
