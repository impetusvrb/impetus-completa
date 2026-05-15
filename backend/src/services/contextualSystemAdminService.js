'use strict';

/**
 * Administrador contextual (cargo "Administrador do Sistema" / Admin IMPETUS).
 * Capabilities transversais sem substituir RBAC legado — híbrido com rollback via env.
 *
 * Rollback: IMPETUS_CONTEXTUAL_SYSTEM_ADMIN=false
 */

const CAP_SYSTEM_ADMIN = 'system_administration';
const CAP_GOVERNANCE = 'governance_access';
const CAP_ORGANIZATIONAL = 'organizational_management';
const CAP_STRUCTURAL = 'structural_management';

const DEFAULT_CONTEXTUAL_ADMIN_CAPS = Object.freeze([
  CAP_SYSTEM_ADMIN,
  CAP_GOVERNANCE,
  CAP_ORGANIZATIONAL,
  CAP_STRUCTURAL
]);

function isContextualSystemAdminGateEnabled() {
  return String(process.env.IMPETUS_CONTEXTUAL_SYSTEM_ADMIN ?? 'true')
    .trim()
    .toLowerCase() !== 'false';
}

function _normTxt(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta cargo organizacional de administração sistémica (sem depender de users.role = diretor).
 */
function matchesSystemAdministratorCompanyRole(user) {
  if (!user) return false;
  const name = user.company_role_name;
  if (name != null && String(name).trim() !== '') {
    const n = _normTxt(name);
    if (n.includes('administrador') && (n.includes('sistema') || n.includes('system'))) return true;
    if (n.includes('admin') && n.includes('impetus')) return true;
    if (/\bimpetus\b/.test(n) && (n.includes('administrador') || n.includes('administracao'))) return true;
  }
  const extra = process.env.IMPETUS_SYSTEM_ADMIN_ROLE_SUBSTR;
  if (extra != null && String(extra).trim() !== '' && name != null) {
    const n = _normTxt(name);
    for (const part of String(extra).split(',')) {
      const p = _normTxt(part);
      if (p && n.includes(p)) return true;
    }
  }
  return false;
}

function resolveContextualAdminCapabilities(user) {
  if (!isContextualSystemAdminGateEnabled() || !user) return [];
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') {
    return [...DEFAULT_CONTEXTUAL_ADMIN_CAPS];
  }
  if (matchesSystemAdministratorCompanyRole(user)) {
    return [...DEFAULT_CONTEXTUAL_ADMIN_CAPS];
  }
  return [];
}

function enrichUserWithContextualCapabilities(user) {
  if (!user || typeof user !== 'object') return user;
  const fromResolver = resolveContextualAdminCapabilities(user);
  const existing = Array.isArray(user.contextual_capabilities) ? user.contextual_capabilities : [];
  const merged = [...new Set([...existing, ...fromResolver])];
  if (merged.length === existing.length && existing.length > 0) return user;
  return Object.assign({}, user, { contextual_capabilities: merged });
}

function userHasCapability(user, cap) {
  if (!user || !cap) return false;
  const list = user.contextual_capabilities;
  if (!Array.isArray(list)) return false;
  return list.includes(cap);
}

function userHasSystemAdministrationCapability(user) {
  return userHasCapability(user, CAP_SYSTEM_ADMIN);
}

/**
 * Bypass de requireHierarchy(1) — só para equivalência "diretoria organizacional" em rotas /api/admin/*.
 */
function userPassesDirectorLevelHierarchyGate(user, minLevel) {
  if (!isContextualSystemAdminGateEnabled() || !user) return false;
  if (minLevel !== 1) return false;
  return userHasSystemAdministrationCapability(user);
}

module.exports = {
  CAP_SYSTEM_ADMIN,
  CAP_GOVERNANCE,
  CAP_ORGANIZATIONAL,
  CAP_STRUCTURAL,
  DEFAULT_CONTEXTUAL_ADMIN_CAPS,
  isContextualSystemAdminGateEnabled,
  matchesSystemAdministratorCompanyRole,
  resolveContextualAdminCapabilities,
  enrichUserWithContextualCapabilities,
  userHasCapability,
  userHasSystemAdministrationCapability,
  userPassesDirectorLevelHierarchyGate
};
