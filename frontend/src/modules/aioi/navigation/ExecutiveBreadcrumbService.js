/**
 * AIOI-P6.2 — Executive Breadcrumb Service (UI EXPERIENCE ONLY · READ ONLY)
 */

import {
  EXECUTIVE_NAVIGATION_ROOT,
  getExecutiveNavigationModule,
  isValidExecutiveNavigationSection,
  DEFAULT_EXECUTIVE_NAVIGATION_SECTION
} from './ExecutiveNavigationModel.js';

/**
 * @param {string} [activeSectionId]
 * @returns {Array<{ id: string, label: string }>}
 */
export function buildExecutiveBreadcrumbTrail(activeSectionId) {
  const sectionId = isValidExecutiveNavigationSection(activeSectionId)
    ? activeSectionId
    : DEFAULT_EXECUTIVE_NAVIGATION_SECTION;

  const module = getExecutiveNavigationModule(sectionId);
  const trail = [{ id: EXECUTIVE_NAVIGATION_ROOT.id, label: EXECUTIVE_NAVIGATION_ROOT.label }];

  if (module) {
    trail.push({ id: module.id, label: module.label });
  }

  return trail;
}

/**
 * @param {string} [activeSectionId]
 * @returns {string}
 */
export function formatExecutiveBreadcrumbLabel(activeSectionId) {
  return buildExecutiveBreadcrumbTrail(activeSectionId)
    .map((crumb) => crumb.label)
    .join(' › ');
}

export default buildExecutiveBreadcrumbTrail;
