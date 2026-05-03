/**
 * Quem pode ver o módulo "Saúde do Sistema" (menu + painel).
 * Ficheiro isolado — sem React nem api — para o Layout não depender do bundle pesado do painel.
 */

import { resolveMenuRole, isStrictAdminRole } from './roleUtils';

const HEALTH_ROLES = new Set(['internal_admin', 'admin', 'ceo', 'diretor', 'gerente', 'coordenador']);

/** Sinónimos / variantes de papel administrativo (BD, legado, PT). */
const ADMIN_EQUIV_ROLES = new Set([
  'administrator',
  'system_admin',
  'super_admin',
  'administrador',
  'administradora',
  'tenant_admin',
  'company_admin'
]);

export function decodeJwtPayload() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const t = localStorage.getItem('impetus_token');
    if (!t) return null;
    const parts = t.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const json = atob(b64 + pad);
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/** Quando `impetus_user` não tem `role` (só o JWT em login) — menu lateral usa isto para não cair em «colaborador». */
export function mergeUserRoleFromJwt(user) {
  if (!user || typeof user !== 'object') return user;
  if (user.role != null && String(user.role).trim() !== '') return user;
  const p = decodeJwtPayload();
  if (!p) return user;
  const r = p.role ?? p.user_role;
  if (r == null || String(r).trim() === '') return user;
  return { ...user, role: String(r).trim().toLowerCase() };
}

function normalizedRole(user) {
  let raw = user?.role ?? user?.user_role ?? user?.papel;
  if (raw == null || String(raw).trim() === '') {
    const p = decodeJwtPayload();
    if (p && (p.role != null || p.user_role != null)) raw = p.role ?? p.user_role;
  }
  if (raw == null) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizedProfile(user) {
  if (!user || user.dashboard_profile == null) return '';
  return String(user.dashboard_profile).trim().toLowerCase();
}

/**
 * Utilizadores que devem ver sempre o atalho «Saúde do Sistema» no sidebar,
 * mesmo quando resolveMenuRole ou visible_modules alteram o menu base.
 */
export function shouldPinSystemHealthNav(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.is_company_root === true) return true;
  const role = normalizedRole(user);
  const profile = normalizedProfile(user);
  if (profile === 'admin_system') return true;
  /** Papel «admin» explícito (inclui JWT quando localStorage.user não tem role). */
  return ['admin', 'internal_admin', 'tenant_admin', 'company_admin'].includes(role);
}

export function userCanAccessSystemHealth(user) {
  if (!user || typeof user !== 'object') return false;
  if (shouldPinSystemHealthNav(user)) return true;
  /** Conta raiz do tenant — mesmo tipo de visibilidade operacional que o menu admin. */
  if (user.is_company_root === true) return true;
  /** Legado: hierarquia topo mas `role` gravado como colaborador — comum em admins implícitos. */
  const hl = Number(user.hierarchy_level);
  if (user.company_id && Number.isFinite(hl) && hl <= 1) return true;
  if (isStrictAdminRole(user)) return true;
  const role = normalizedRole(user);
  const profile = normalizedProfile(user);
  if (profile === 'admin_system') return true;
  if (ADMIN_EQUIV_ROLES.has(role)) return true;
  if (HEALTH_ROLES.has(role)) return true;
  try {
    if (resolveMenuRole(user) === 'admin') return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function userCanAdvancedAudit(user) {
  if (!user || typeof user !== 'object') return false;
  const role = normalizedRole(user);
  const profile = normalizedProfile(user);
  if (
    user.is_company_root === true ||
    role === 'internal_admin' ||
    isStrictAdminRole(user) ||
    ADMIN_EQUIV_ROLES.has(role) ||
    profile === 'admin_system'
  ) {
    return true;
  }
  try {
    return resolveMenuRole(user) === 'admin';
  } catch {
    return false;
  }
}

/** Payload completo da API /unified-health (Nível 2 completo + Nível 3). */
export function userSeesFullHealthPayload(user) {
  if (!user || typeof user !== 'object') return false;
  const r = normalizedRole(user);
  const p = normalizedProfile(user);
  if (
    user.is_company_root === true ||
    r === 'internal_admin' ||
    isStrictAdminRole(user) ||
    ADMIN_EQUIV_ROLES.has(r) ||
    p === 'admin_system'
  ) {
    return true;
  }
  try {
    return resolveMenuRole(user) === 'admin';
  } catch {
    return false;
  }
}
