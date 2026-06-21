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
  // Executive structural bypass: liderança executiva com cadastro estrutural
  // incompleto recebe o conjunto completo via `visible_modules` (engine
  // autoritária). A reconciliação de sidebar pode reduzir indevidamente esse
  // conjunto (ex.: remove `operational`, escondendo todo o bloco
  // industrial/operacional). Nesse caso o `visible_modules` de topo é a fonte
  // canónica — unimos com o runtime para não perder módulos por ele adicionados.
  if (dashboardMePayload?.module_access_governance?.executive_structural_bypass === true && legacy.length) {
    const runtimeFin = dashboardMePayload?.sidebar_governance_runtime?.final_visible_modules;
    if (Array.isArray(runtimeFin) && runtimeFin.length) {
      return [...new Set([...legacy, ...runtimeFin])];
    }
    return legacy;
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
