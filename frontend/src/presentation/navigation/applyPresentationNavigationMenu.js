/**
 * UX-001A — Activacao unica do Presentation Navigation Registry no menu lateral.
 * Substitui publication engines legadas como origem de dominios.
 */
import { safeMergePresentationNavigationIntoMenu } from './mergePresentationNavigation.js';

/**
 * @param {object} params
 * @returns {object}
 */
export function buildPresentationMenuContext(params = {}) {
  return {
    user: params.user,
    visibleModules: params.visibleModules,
    modulesLoading: params.modulesLoading,
    suppressDomainSections: params.suppressDomainSections === true,
    qualityPublication: params.qualityPublication || null,
    safetyPublication: params.safetyPublication || null,
    environmentPublication: params.environmentPublication || null,
    dashboardMe: params.dashboardMe || null
  };
}

/**
 * Origem unificada de navegacao por dominio (LOGÍSTICA, SUPPLY, etc.).
 * @param {Array<object>} menuItems
 * @param {object} params
 */
export function applyPresentationNavigationMenu(menuItems, params = {}) {
  if (!Array.isArray(menuItems)) return menuItems;
  if (params.suppressDomainSections === true) return menuItems;
  return safeMergePresentationNavigationIntoMenu(menuItems, buildPresentationMenuContext(params));
}
