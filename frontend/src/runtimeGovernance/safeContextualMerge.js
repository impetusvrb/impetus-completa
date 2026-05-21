/**
 * Phase Z.14/Z.16 — contextual_modules filtrados pelo servidor.
 */

import { isTerminalGovernanceLocked, getContextualModulesMode } from '../runtimeTerminalGovernance/terminalGovernanceGuard.js';

export function mergeContextualModulesSafely(legacyContextual, dashboardMePayload) {
  if (isTerminalGovernanceLocked(dashboardMePayload)) {
    const governed = dashboardMePayload?.contextual_modules_governed ?? dashboardMePayload?.contextual_modules;
    return Array.isArray(governed) ? governed : [];
  }
  const filtered = dashboardMePayload?.contextual_modules_governed;
  if (Array.isArray(filtered) && filtered.length >= 0) {
    return filtered;
  }
  const runtime = dashboardMePayload?.sidebar_governance_runtime;
  if (runtime?.contextual_modules_filtered && Array.isArray(legacyContextual)) {
    const denied = new Set(
      (runtime.removed_modules || []).map((m) => String(m).toLowerCase())
    );
    return legacyContextual.filter((mod) => {
      const id = String(mod?.module_id || mod?.menu_key || '').toLowerCase();
      return !denied.has(id);
    });
  }
  return legacyContextual;
}
