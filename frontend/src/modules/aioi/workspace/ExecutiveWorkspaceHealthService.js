/**
 * AIOI-P6.4 — Executive Workspace Health Service (UI EXPERIENCE ONLY · READ ONLY)
 */

import { EXECUTIVE_WORKSPACE_LEVELS } from './ExecutiveWorkspaceModel.js';

/**
 * @param {number} modulesReady
 * @param {number} modulesTotal
 * @returns {string}
 */
export function classifyWorkspaceLevel(modulesReady, modulesTotal) {
  if (!modulesTotal || modulesTotal <= 0) {
    return EXECUTIVE_WORKSPACE_LEVELS.INCOMPLETE;
  }
  const ratio = (modulesReady / modulesTotal) * 100;
  if (ratio >= 100) return EXECUTIVE_WORKSPACE_LEVELS.ENTERPRISE_READY;
  if (ratio >= 75) return EXECUTIVE_WORKSPACE_LEVELS.MOSTLY_READY;
  if (ratio >= 50) return EXECUTIVE_WORKSPACE_LEVELS.PARTIAL;
  return EXECUTIVE_WORKSPACE_LEVELS.INCOMPLETE;
}

/**
 * @param {{
 *   modules_total: number,
 *   modules_ready: number,
 *   deep_links_total: number,
 *   deep_links_ready: number,
 *   navigation_ready: boolean,
 *   governance_ready: boolean
 * }} model
 * @returns {{
 *   workspace_ready: boolean,
 *   modules_ready: number,
 *   modules_total: number,
 *   deep_links_ready: number,
 *   navigation_ready: boolean,
 *   governance_ready: boolean,
 *   workspace_level: string
 * }}
 */
export function buildExecutiveWorkspaceHealth(model) {
  const workspaceLevel = classifyWorkspaceLevel(model.modules_ready, model.modules_total);
  const workspaceReady =
    workspaceLevel === EXECUTIVE_WORKSPACE_LEVELS.ENTERPRISE_READY &&
    model.deep_links_ready === model.deep_links_total &&
    model.navigation_ready === true &&
    model.governance_ready === true;

  return {
    workspace_ready: workspaceReady,
    modules_ready: model.modules_ready,
    modules_total: model.modules_total,
    deep_links_ready: model.deep_links_ready,
    navigation_ready: model.navigation_ready,
    governance_ready: model.governance_ready,
    workspace_level: workspaceLevel
  };
}

export default buildExecutiveWorkspaceHealth;
