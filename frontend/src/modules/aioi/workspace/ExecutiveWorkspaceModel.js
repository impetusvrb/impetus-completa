/**
 * AIOI-P6.4 — Executive Workspace Model (UI EXPERIENCE ONLY · READ ONLY)
 *
 * Modelo estrutural — sem lógica de negócio.
 */

export const EXECUTIVE_WORKSPACE_LEVELS = {
  ENTERPRISE_READY: 'enterprise_ready',
  MOSTLY_READY: 'mostly_ready',
  PARTIAL: 'partial',
  INCOMPLETE: 'incomplete'
};

export const CERTIFIED_EXECUTIVE_MODULE_IDS = [
  'executive_cockpit',
  'decision_visualization',
  'interface_intelligence',
  'executive_reports'
];

/**
 * @returns {{
 *   modules_total: number,
 *   modules_ready: number,
 *   deep_links_total: number,
 *   deep_links_ready: number,
 *   navigation_ready: boolean,
 *   governance_ready: boolean
 * }}
 */
export function createEmptyExecutiveWorkspaceModel() {
  return {
    modules_total: 0,
    modules_ready: 0,
    deep_links_total: 0,
    deep_links_ready: 0,
    navigation_ready: false,
    governance_ready: false
  };
}

export default EXECUTIVE_WORKSPACE_LEVELS;
