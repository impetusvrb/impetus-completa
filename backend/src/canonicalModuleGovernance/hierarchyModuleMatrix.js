'use strict';

const { normalizeModuleId } = require('./moduleAliasRegistry');

const HIERARCHY_RULES = Object.freeze({
  executive: {
    tier: 'executive',
    max_level: 2,
    deny_modules: [
      'safety_intelligence',
      'quality_intelligence',
      'environment_intelligence',
      'manuia',
      'anomaly_detection',
      'cockpit_operacional_bruto',
      'raw_operational_telemetry'
    ],
    allow_executive: ['audit', 'admin', 'esg', 'operational', 'dashboard']
  },
  management: {
    tier: 'management',
    level: 2,
    deny_modules: ['admin'],
    allow_extra: ['hr_intelligence', 'quality_intelligence', 'safety_intelligence', 'environment_intelligence']
  },
  coordination: {
    tier: 'coordination',
    level: 3,
    deny_modules: ['admin', 'audit', 'esg'],
    deny_executive_only: true
  },
  supervision: {
    tier: 'supervision',
    level: 4,
    deny_modules: ['admin', 'audit', 'esg']
  },
  operational: {
    tier: 'operational',
    level: 5,
    deny_modules: ['admin', 'audit', 'esg', 'executive_dashboard', 'strategic_kpis']
  }
});

function resolveHierarchyTier(hierarchyTier, hierarchyLevel) {
  if (hierarchyTier && HIERARCHY_RULES[hierarchyTier]) return HIERARCHY_RULES[hierarchyTier];
  const level = hierarchyLevel ?? 3;
  if (level <= 1) return HIERARCHY_RULES.executive;
  if (level === 2) return HIERARCHY_RULES.management;
  if (level === 3) return HIERARCHY_RULES.coordination;
  if (level === 4) return HIERARCHY_RULES.supervision;
  return HIERARCHY_RULES.operational;
}

function isModuleDeniedByHierarchy(moduleId, ctx = {}) {
  const tier = resolveHierarchyTier(ctx.hierarchy_tier, ctx.hierarchy_level);
  const key = normalizeModuleId(moduleId);
  if (tier.deny_modules?.includes(key)) {
    return { denied: true, reason: 'hierarchy_denied', tier: tier.tier };
  }
  if (tier.deny_executive_only && ['audit', 'admin', 'esg'].includes(key)) {
    return { denied: true, reason: 'executive_only_on_coordination', tier: tier.tier };
  }
  if (ctx.hierarchy_level <= 2 && ['manuia', 'anomaly_detection'].includes(key)) {
    return { denied: true, reason: 'executive_no_raw_operational', tier: tier.tier };
  }
  return { denied: false };
}

module.exports = { HIERARCHY_RULES, resolveHierarchyTier, isModuleDeniedByHierarchy };
