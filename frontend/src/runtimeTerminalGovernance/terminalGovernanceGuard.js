/**
 * Phase Z.16 — guarda terminal governance (sem alterar UX).
 */

export function isTerminalGovernanceLocked(dashboardMe) {
  if (!dashboardMe) return false;
  if (dashboardMe.governance_freeze_state?.governance_locked === true) return true;
  const sgr = dashboardMe.sidebar_governance_runtime || {};
  return sgr.final_governance_locked === true;
}

export function getFinalVisibleModules(dashboardMe) {
  if (!dashboardMe) return [];
  const sgr = dashboardMe.sidebar_governance_runtime || {};
  if (isTerminalGovernanceLocked(dashboardMe) && Array.isArray(sgr.final_visible_modules)) {
    return sgr.final_visible_modules.slice();
  }
  return dashboardMe.visible_modules || [];
}

export function shouldSkipLegacyPipeline(dashboardMe) {
  return isTerminalGovernanceLocked(dashboardMe);
}

export function getContextualModulesMode(dashboardMe) {
  if (isTerminalGovernanceLocked(dashboardMe)) return 'STRICT';
  return dashboardMe?.contextual_modules_mode || dashboardMe?.contextual_modules_meta?.mode || 'enrich';
}
