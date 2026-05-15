'use strict';

/**
 * Escopo exclusivo do portal administrativo do tenant (não operacional).
 * Separa governança / cadastro da inteligência contextual industrial (Motor B, Phase 6).
 */

const contextualSystemAdmin = require('./contextualSystemAdminService');

/** Universal modules que NÃO devem aplicar ao portal admin (evita Pulse, Centro de Previsão, etc.). */
const SUPPRESS_UNIVERSAL_FOR_ADMIN_PORTAL = new Set(['operational', 'manuia']);

const ADMIN_PORTAL_UNIVERSAL_MODULES = Object.freeze([
  'dashboard',
  'proaction',
  'biblioteca',
  'ai',
  'chat',
  'settings'
]);

function isAdministrativePortalOnlyUser(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return true;
  if (user.is_tenant_admin === true) return true;
  if (
    contextualSystemAdmin.isContextualSystemAdminGateEnabled() &&
    contextualSystemAdmin.userHasSystemAdministrationCapability(user)
  ) {
    return true;
  }
  return false;
}

function filterModulesForAdministrativePortal(moduleKeys) {
  const arr = Array.isArray(moduleKeys) ? moduleKeys : [];
  const removed = [];
  const out = [];
  for (const k of arr) {
    if (!k) continue;
    if (SUPPRESS_UNIVERSAL_FOR_ADMIN_PORTAL.has(k)) {
      removed.push(k);
      continue;
    }
    out.push(k);
  }
  return { filtered: out, removed };
}

module.exports = {
  isAdministrativePortalOnlyUser,
  ADMIN_PORTAL_UNIVERSAL_MODULES,
  SUPPRESS_UNIVERSAL_FOR_ADMIN_PORTAL,
  filterModulesForAdministrativePortal
};
