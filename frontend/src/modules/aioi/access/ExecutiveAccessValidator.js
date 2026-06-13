/**
 * AIOI-P6.1 — Executive Access Validator (SECURITY ONLY · delega P6.0)
 *
 * Não reimplementa PrivateRoute, SetupGuard ou Portal Readiness P5.9.
 */

import {
  EXECUTIVE_ACCESS_LEVELS,
  EXECUTIVE_DENIAL_REASONS,
  hasValidExecutiveContext,
  isExecutiveCompanyActive
} from './ExecutiveAccessPolicy.js';
import { evaluateExecutivePortalRouteGuard } from '../router/ExecutivePortalRouteGuard.js';

/**
 * @param {{ user?: object|null, authToken?: string|null, portalReadyChecker?: () => boolean }} context
 * @returns {{ ok: boolean, denialReason: string|null, governanceLevel: string }}
 */
export function validateExecutiveAccess(context = {}) {
  const user = context.user ?? null;
  const authToken = context.authToken ?? null;

  if (!authToken) {
    return {
      ok: false,
      denialReason: EXECUTIVE_DENIAL_REASONS.NOT_AUTHENTICATED,
      governanceLevel: EXECUTIVE_ACCESS_LEVELS.BLOCKED
    };
  }

  const routeGuard = evaluateExecutivePortalRouteGuard(user, {
    portalReadyChecker: context.portalReadyChecker
  });

  if (!routeGuard.ok) {
    const reasonMap = {
      missing_company_id: EXECUTIVE_DENIAL_REASONS.MISSING_COMPANY_ID,
      invalid_tenant: EXECUTIVE_DENIAL_REASONS.INVALID_TENANT,
      portal_not_ready: EXECUTIVE_DENIAL_REASONS.PORTAL_NOT_READY
    };
    return {
      ok: false,
      denialReason: reasonMap[routeGuard.reason] || EXECUTIVE_DENIAL_REASONS.ROUTE_ACCESS_DENIED,
      governanceLevel: EXECUTIVE_ACCESS_LEVELS.BLOCKED
    };
  }

  if (!isExecutiveCompanyActive(user)) {
    return {
      ok: false,
      denialReason: EXECUTIVE_DENIAL_REASONS.COMPANY_INACTIVE,
      governanceLevel: EXECUTIVE_ACCESS_LEVELS.BLOCKED
    };
  }

  if (!hasValidExecutiveContext(user)) {
    return {
      ok: false,
      denialReason: EXECUTIVE_DENIAL_REASONS.EXECUTIVE_CONTEXT_REQUIRED,
      governanceLevel: EXECUTIVE_ACCESS_LEVELS.RESTRICTED
    };
  }

  return {
    ok: true,
    denialReason: null,
    governanceLevel: EXECUTIVE_ACCESS_LEVELS.EXECUTIVE_ACCESS
  };
}

export default validateExecutiveAccess;
