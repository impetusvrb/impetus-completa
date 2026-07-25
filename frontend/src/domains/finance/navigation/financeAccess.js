/**
 * FIN-EVOLVE-001 — Política de acesso ao domínio Finance (VIEW_FINANCIAL + perfis).
 * Fonte de verdade partilhada por App.jsx e Layout.jsx.
 */
import { isFinanceDashboardLayout, userHasSystemAdministrationCapability } from '../../../utils/roleUtils.js';

export const FINANCE_DOMAIN_BASE = '/app/finance';

export const FINANCE_DOMAIN_PATHS = Object.freeze([
  FINANCE_DOMAIN_BASE,
  `${FINANCE_DOMAIN_BASE}/costs`,
  `${FINANCE_DOMAIN_BASE}/leakage`,
  `${FINANCE_DOMAIN_BASE}/billing`
]);

function _hasViewFinancialPermission(user) {
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  return perms.some((p) => String(p).toUpperCase() === 'VIEW_FINANCIAL');
}

function _isFinanceLeadershipRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'diretor' || r === 'gerente' || r === 'coordenador' || r === 'ceo' || r === 'admin';
}

/**
 * Acesso ao domínio Finance — alinhado FIN-AUD VIEW_FINANCIAL + finance_management.
 * Inclui Diretor Financeiro (profile finance_management / contexto funcional / VIEW_FINANCIAL).
 */
export function canAccessFinanceDomain(user) {
  try {
    const u = user && typeof user === 'object' ? user : {};
    const role = String(u.role || '').toLowerCase();
    if (role === 'ceo') return true;
    if (userHasSystemAdministrationCapability(u)) return true;
    if (isFinanceDashboardLayout(u)) return true;
    if (_hasViewFinancialPermission(u)) return true;
    if (role.includes('financ')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Menu Finance — domínio Finance OU módulos financeiros liberados pelo backend.
 * Após FIN-EVOLVE-001A, financial_intelligence + liderança também libera o hub
 * (evita falso negativo quando o profile ainda não veio no token).
 */
export function canAccessFinanceDomainMenu(user, visibleModules = []) {
  if (canAccessFinanceDomain(user)) return true;
  const set = visibleModules instanceof Set ? visibleModules : new Set(visibleModules || []);
  const hasFinanceModule =
    set.has('financial_intelligence') ||
    set.has('cost_center') ||
    set.has('losses_map');
  if (!hasFinanceModule) return false;
  const role = String(user?.role || '').toLowerCase();
  return _isFinanceLeadershipRole(role) || _hasViewFinancialPermission(user);
}

export function canAccessFinanceBilling(user) {
  if (!canAccessFinanceDomain(user)) return false;
  const role = String(user?.role || '').toLowerCase();
  return role === 'ceo' || userHasSystemAdministrationCapability(user) || role === 'admin' || role === 'diretor';
}
