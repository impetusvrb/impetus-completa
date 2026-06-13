/**
 * AIOI-P5.9 — Navigation Consistency Validator (READ ONLY · metadados estruturais)
 */

import { EXECUTIVE_PORTAL_SECTIONS } from './ExecutivePortalNavigation.js';

export const EXPECTED_PORTAL_SECTION_IDS = [
  'executive_cockpit',
  'decision_visualization',
  'interface_intelligence',
  'executive_reports'
];

/**
 * @returns {{ ok: boolean, issues: string[], activeSections: number, placeholderSections: number, navigableSections: string[] }}
 */
export function validatePortalNavigation() {
  const issues = [];
  const navigableSections = [];
  let activeSections = 0;
  let placeholderSections = 0;

  for (const expectedId of EXPECTED_PORTAL_SECTION_IDS) {
    const section = EXECUTIVE_PORTAL_SECTIONS.find((s) => s.id === expectedId);
    if (!section) {
      issues.push(`secção em falta: ${expectedId}`);
      continue;
    }
    if (!section.ready) {
      issues.push(`secção não activa: ${expectedId}`);
    } else {
      activeSections += 1;
      navigableSections.push(expectedId);
    }
    if (section.placeholder) {
      placeholderSections += 1;
      issues.push(`placeholder restante: ${expectedId}`);
    }
    if (!section.label) {
      issues.push(`label em falta: ${expectedId}`);
    }
  }

  if (EXECUTIVE_PORTAL_SECTIONS.length !== EXPECTED_PORTAL_SECTION_IDS.length) {
    issues.push('número de secções diverge do esperado');
  }

  return {
    ok: issues.length === 0,
    issues,
    activeSections,
    placeholderSections,
    navigableSections,
    totalSections: EXPECTED_PORTAL_SECTION_IDS.length
  };
}

/**
 * @returns {boolean}
 */
export function isPortalNavigationConsistent() {
  return validatePortalNavigation().ok;
}

export default validatePortalNavigation;
