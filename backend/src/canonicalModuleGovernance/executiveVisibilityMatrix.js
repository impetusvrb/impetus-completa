'use strict';

const EXECUTIVE_VISIBLE = Object.freeze([
  'dashboard',
  'settings',
  'audit',
  'admin',
  'esg',
  'operational',
  'ai',
  'chat',
  'biblioteca',
  'proaction'
]);

const EXECUTIVE_HIDDEN = Object.freeze([
  'safety_intelligence',
  'quality_intelligence',
  'environment_intelligence',
  'manuia',
  'anomaly_detection',
  'hr_intelligence',
  'logistics_intelligence'
]);

function filterExecutiveVisibility(modules = [], ctx = {}) {
  const tier = ctx.hierarchy_tier;
  const level = ctx.hierarchy_level ?? 3;
  if (tier !== 'executive' && level > 2) {
    return { modules, executive_filter_applied: false };
  }
  const hidden = new Set(EXECUTIVE_HIDDEN);
  const kept = modules.filter((m) => !hidden.has(String(m).toLowerCase()));
  return {
    modules: kept,
    executive_filter_applied: true,
    removed: modules.filter((m) => hidden.has(String(m).toLowerCase()))
  };
}

module.exports = { EXECUTIVE_VISIBLE, EXECUTIVE_HIDDEN, filterExecutiveVisibility };
