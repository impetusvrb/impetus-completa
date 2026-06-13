/**
 * AIOI-P6.1 — Executive Access Policy (SECURITY ONLY · READ ONLY)
 *
 * Regras institucionais de elegibilidade — sem RBAC operacional novo.
 */

export const EXECUTIVE_ACCESS_LEVELS = {
  EXECUTIVE_ACCESS: 'executive_access',
  RESTRICTED: 'restricted',
  BLOCKED: 'blocked'
};

export const EXECUTIVE_ELIGIBLE_ROLES = ['ceo', 'diretor', 'admin', 'internal_admin'];

export const EXECUTIVE_DENIAL_REASONS = {
  NOT_AUTHENTICATED: 'not_authenticated',
  MISSING_COMPANY_ID: 'missing_company_id',
  INVALID_TENANT: 'invalid_tenant',
  PORTAL_NOT_READY: 'portal_not_ready',
  COMPANY_INACTIVE: 'company_inactive',
  EXECUTIVE_CONTEXT_REQUIRED: 'executive_context_required',
  ROUTE_ACCESS_DENIED: 'route_access_denied'
};

/**
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function isExecutiveEligibleRole(role) {
  if (!role) return false;
  return EXECUTIVE_ELIGIBLE_ROLES.includes(String(role).toLowerCase());
}

/**
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isExecutiveCompanyActive(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.company_active === false) return false;
  const status = String(user.company_status || user.companyStatus || '').toLowerCase();
  if (status === 'inactive' || status === 'suspended' || status === 'blocked') return false;
  return true;
}

/**
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function hasValidExecutiveContext(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.is_tenant_admin === true) return true;
  return isExecutiveEligibleRole(user.role);
}

export default EXECUTIVE_ACCESS_LEVELS;
