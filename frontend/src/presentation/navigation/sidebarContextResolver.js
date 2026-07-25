/**
 * NAV-001 — Contexto organizacional para construção da sidebar.
 */
import { resolveMenuRole } from '../../utils/roleUtils.js';
import {
  isLogisticsFunctionalContext,
  isSupplyFunctionalContext,
  isMarketingFunctionalContext,
  isProductionFunctionalContext,
  hasWmsRbacProfile
} from './allowedDomainRegistry.js';
import { isQualityPrimary, isEnvironmentalPrimary } from '../../utils/dashboardSurfaceCapabilities.js';
import { isHrDomainUser, isSafetyDomainUser } from '../../utils/structuralDomainAudience.js';

/**
 * @param {object|null} user
 */
export function resolveIdentityContext(user) {
  if (!user) {
    return Object.freeze({ role: 'colaborador', menuRole: 'colaborador', hierarchyLevel: 5 });
  }
  return Object.freeze({
    role: String(user.role || 'colaborador').toLowerCase(),
    menuRole: resolveMenuRole(user),
    hierarchyLevel: user.hierarchy_level ?? 5,
    profileCode: user.profile_code || user.dashboard_profile || null,
    wmsProfile: user.wms_profile || null
  });
}

/**
 * @param {object|null} user
 */
export function resolveOrganizationalContext(user) {
  if (!user) return Object.freeze({});
  return Object.freeze({
    functionalArea: user.functional_area || user.area || user.department || null,
    department: user.department || null,
    jobTitle: user.job_title || user.cargo || null,
    structuralPrimaryAxis: user.structural_profile?.eixo_primario || null,
    companyId: user.company_id || null
  });
}

/**
 * @param {object|null} user
 */
export function resolveFunctionalAreaSignals(user) {
  return Object.freeze({
    logistics: isLogisticsFunctionalContext(user),
    supply: isSupplyFunctionalContext(user),
    quality: isQualityPrimary(user),
    environment: isEnvironmentalPrimary(user),
    safety: isSafetyDomainUser(user),
    production: isProductionFunctionalContext(user),
    marketing: isMarketingFunctionalContext(user),
    hr: isHrDomainUser(user),
    wmsProfile: hasWmsRbacProfile(user)
  });
}

/**
 * Normaliza parâmetros do Layout / merge para resolução de domínio.
 * @param {object} params
 */
export function resolveSidebarNavigationContext(params = {}) {
  const user = params.user || null;
  return Object.freeze({
    user,
    visibleModules: Array.isArray(params.visibleModules) ? params.visibleModules : [],
    modulesLoading: params.modulesLoading === true,
    suppressDomainSections: params.suppressDomainSections === true,
    identity: resolveIdentityContext(user),
    organizational: resolveOrganizationalContext(user),
    functionalSignals: resolveFunctionalAreaSignals(user),
    qualityPublication: params.qualityPublication || null,
    safetyPublication: params.safetyPublication || null,
    environmentPublication: params.environmentPublication || null,
    dashboardMe: params.dashboardMe || null
  });
}
