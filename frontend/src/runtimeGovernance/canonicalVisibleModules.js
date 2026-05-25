/**
 * Phase Z.14/Z.16 — visible_modules canónicos do servidor (sem alterar UX).
 */

import { isTerminalGovernanceLocked, getFinalVisibleModules } from '../runtimeTerminalGovernance/terminalGovernanceGuard.js';

export function readCanonicalVisibleModules(dashboardMePayload) {
  const legacy = Array.isArray(dashboardMePayload?.visible_modules)
    ? dashboardMePayload.visible_modules.slice()
    : [];
  if (isTerminalGovernanceLocked(dashboardMePayload)) {
    const fin = getFinalVisibleModules(dashboardMePayload);
    return fin.length ? fin : legacy;
  }
  const runtime = dashboardMePayload?.sidebar_governance_runtime;
  if (runtime?.governance_applied === true && Array.isArray(runtime.final_visible_modules)) {
    const fin = runtime.final_visible_modules.slice();
    return fin.length ? fin : legacy;
  }
  if (runtime?.final_visible_modules?.length) {
    return runtime.final_visible_modules.slice();
  }
  return legacy;
}

export function isSidebarGovernanceActive(payload) {
  return (
    payload?.sidebar_governance_runtime?.governance_applied === true ||
    isTerminalGovernanceLocked(payload)
  );
}

export function getDeniedPublicationDomains(payload) {
  const denied = payload?.sidebar_governance_runtime?.denied_publications;
  return Array.isArray(denied) ? denied : [];
}
