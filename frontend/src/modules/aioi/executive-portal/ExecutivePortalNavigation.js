/**
 * AIOI-P5.5 — Navegação local do Portal Executivo (READ ONLY · sem rotas globais)
 */

export const EXECUTIVE_PORTAL_SECTIONS = [
  {
    id: 'executive_cockpit',
    label: 'Executive Cockpit',
    ready: true
  },
  {
    id: 'decision_visualization',
    label: 'Decision Visualization',
    ready: true
  },
  {
    id: 'interface_intelligence',
    label: 'Interface Intelligence',
    ready: true
  },
  {
    id: 'executive_reports',
    label: 'Executive Reports',
    ready: true
  }
];

export const DEFAULT_EXECUTIVE_PORTAL_SECTION = 'executive_cockpit';

/**
 * @param {string} sectionId
 */
export function getExecutivePortalSection(sectionId) {
  return EXECUTIVE_PORTAL_SECTIONS.find((section) => section.id === sectionId) || null;
}

/**
 * @param {string} sectionId
 */
export function isValidExecutivePortalSection(sectionId) {
  return EXECUTIVE_PORTAL_SECTIONS.some((section) => section.id === sectionId);
}

/**
 * @param {string} sectionId
 */
export function isExecutivePortalPlaceholder(sectionId) {
  const section = getExecutivePortalSection(sectionId);
  return Boolean(section?.placeholder);
}

export default EXECUTIVE_PORTAL_SECTIONS;
