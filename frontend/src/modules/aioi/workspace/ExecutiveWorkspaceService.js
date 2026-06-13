/**
 * AIOI-P6.4 — Executive Workspace Service (UI EXPERIENCE ONLY · composição P6.3)
 *
 * Consolida metadados certificados via Deep Link Registry — sem HTTP, sem P5.x.
 */

import { EXECUTIVE_DEEP_LINKS } from '../deep-linking/ExecutiveDeepLinkRegistry.js';
import { CERTIFIED_EXECUTIVE_MODULE_IDS } from './ExecutiveWorkspaceModel.js';
import { buildExecutiveWorkspaceHealth } from './ExecutiveWorkspaceHealthService.js';

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
export function getExecutiveWorkspaceModel() {
  const deepLinksTotal = EXECUTIVE_DEEP_LINKS.length;
  const deepLinksReady = EXECUTIVE_DEEP_LINKS.filter((link) => link.available === true).length;

  const readyModuleSet = new Set(
    EXECUTIVE_DEEP_LINKS.filter((link) => link.available && link.module).map((link) => link.module)
  );

  const modulesTotal = CERTIFIED_EXECUTIVE_MODULE_IDS.length;
  const modulesReady = CERTIFIED_EXECUTIVE_MODULE_IDS.filter((id) => readyModuleSet.has(id)).length;

  const navigationReady = modulesReady === modulesTotal && deepLinksReady === deepLinksTotal;
  const governanceReady = navigationReady;

  return {
    modules_total: modulesTotal,
    modules_ready: modulesReady,
    deep_links_total: deepLinksTotal,
    deep_links_ready: deepLinksReady,
    navigation_ready: navigationReady,
    governance_ready: governanceReady
  };
}

/**
 * @returns {ReturnType<buildExecutiveWorkspaceHealth>}
 */
export function getExecutiveWorkspaceHealth() {
  return buildExecutiveWorkspaceHealth(getExecutiveWorkspaceModel());
}

export default getExecutiveWorkspaceModel;
