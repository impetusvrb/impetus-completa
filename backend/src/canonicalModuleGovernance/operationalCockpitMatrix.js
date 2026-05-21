'use strict';

const { normalizeModuleId } = require('./moduleAliasRegistry');

const COCKPIT_BY_DOMAIN = Object.freeze({
  quality: ['quality_intelligence', 'operational', 'dashboard'],
  hr: ['hr_intelligence', 'operational', 'dashboard'],
  safety: ['safety_intelligence', 'operational', 'dashboard'],
  environmental: ['environment_intelligence', 'operational', 'dashboard'],
  production: ['manuia', 'anomaly_detection', 'operational', 'dashboard'],
  executive: ['dashboard', 'operational', 'audit', 'esg']
});

function getPermittedCockpitModules(domainAxis) {
  const axis = String(domainAxis || '').toLowerCase();
  for (const [key, list] of Object.entries(COCKPIT_BY_DOMAIN)) {
    if (axis === key || axis.includes(key)) return list.map(normalizeModuleId);
  }
  return ['dashboard', 'settings'];
}

function isCockpitModulePermitted(moduleId, domainAxis) {
  const permitted = new Set(getPermittedCockpitModules(domainAxis));
  const key = normalizeModuleId(moduleId);
  if (permitted.has(key)) return { permitted: true };
  if (['dashboard', 'settings', 'proaction', 'ai', 'chat'].includes(key)) return { permitted: true };
  return { permitted: false, reason: 'cockpit_not_in_domain' };
}

module.exports = { COCKPIT_BY_DOMAIN, getPermittedCockpitModules, isCockpitModulePermitted };
