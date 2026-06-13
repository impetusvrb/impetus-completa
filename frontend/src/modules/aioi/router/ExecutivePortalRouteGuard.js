/**
 * AIOI-P6.0 — Executive Portal Route Guard (READ ONLY · tenant + prontidão P5.9)
 */

import { isExecutivePortalReady } from '../executive-portal/ExecutivePortalReadinessService.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * @param {object|null|undefined} user
 * @returns {{ companyId: string|null, tenantLabel: string }}
 */
export function resolveExecutivePortalTenant(user) {
  if (!user || typeof user !== 'object') {
    return { companyId: null, tenantLabel: '—' };
  }
  const companyId = user.company_id || user.companyId || null;
  const tenantLabel =
    user.company_name || user.tenant_label || user.companyName || user.tenantLabel || '—';
  return { companyId: companyId ? String(companyId) : null, tenantLabel: String(tenantLabel) };
}

/**
 * @param {string|null|undefined} companyId
 * @returns {boolean}
 */
export function isValidExecutivePortalTenant(companyId) {
  if (!companyId) return false;
  return UUID_RE.test(String(companyId));
}

/**
 * @param {{ companyId?: string|null, portalReady?: boolean, portalReadyChecker?: () => boolean }} [context]
 * @returns {{ ok: boolean, reason: string|null, companyId: string|null }}
 */
export function validateExecutivePortalRouteAccess(context = {}) {
  const companyId = context.companyId ? String(context.companyId) : null;

  if (!companyId) {
    return { ok: false, reason: 'missing_company_id', companyId: null };
  }

  if (!isValidExecutivePortalTenant(companyId)) {
    return { ok: false, reason: 'invalid_tenant', companyId };
  }

  const checker = context.portalReadyChecker || isExecutivePortalReady;
  const portalReady =
    typeof context.portalReady === 'boolean' ? context.portalReady : checker();

  if (!portalReady) {
    return { ok: false, reason: 'portal_not_ready', companyId };
  }

  return { ok: true, reason: null, companyId };
}

/**
 * @param {object|null|undefined} user
 * @param {{ portalReadyChecker?: () => boolean }} [options]
 */
export function evaluateExecutivePortalRouteGuard(user, options = {}) {
  const { companyId, tenantLabel } = resolveExecutivePortalTenant(user);
  const access = validateExecutivePortalRouteAccess({
    companyId,
    portalReadyChecker: options.portalReadyChecker
  });
  return { ...access, tenantLabel };
}

export default validateExecutivePortalRouteAccess;
