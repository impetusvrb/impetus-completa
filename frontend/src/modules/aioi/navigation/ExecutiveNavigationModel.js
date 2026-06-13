/**
 * AIOI-P6.2 — Executive Navigation Model (UI EXPERIENCE ONLY · metadados estruturais)
 *
 * Espelho READ ONLY das secções certificadas — sem importar P5.x directamente.
 */

export const EXECUTIVE_NAVIGATION_ROOT = {
  id: 'executive_portal',
  label: 'Executive Portal'
};

export const EXECUTIVE_NAVIGATION_MODULES = [
  {
    id: 'executive_cockpit',
    label: 'Executive Cockpit',
    phase: 'P5.4',
    ready: true
  },
  {
    id: 'decision_visualization',
    label: 'Decision Visualization',
    phase: 'P5.6',
    ready: true
  },
  {
    id: 'interface_intelligence',
    label: 'Interface Intelligence',
    phase: 'P5.7',
    ready: true
  },
  {
    id: 'executive_reports',
    label: 'Executive Reports',
    phase: 'P5.8',
    ready: true
  }
];

export const DEFAULT_EXECUTIVE_NAVIGATION_SECTION = 'executive_cockpit';

/**
 * @param {string} sectionId
 * @returns {object|null}
 */
export function getExecutiveNavigationModule(sectionId) {
  return EXECUTIVE_NAVIGATION_MODULES.find((mod) => mod.id === sectionId) || null;
}

/**
 * @param {string} sectionId
 * @returns {boolean}
 */
export function isValidExecutiveNavigationSection(sectionId) {
  return EXECUTIVE_NAVIGATION_MODULES.some((mod) => mod.id === sectionId);
}

/**
 * @returns {number}
 */
export function countReadyExecutiveNavigationModules() {
  return EXECUTIVE_NAVIGATION_MODULES.filter((mod) => mod.ready).length;
}

export default EXECUTIVE_NAVIGATION_MODULES;
