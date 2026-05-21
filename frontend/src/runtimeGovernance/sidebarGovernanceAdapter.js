/**
 * Phase Z.14 — adaptador único para Layout / useVisibleModules.
 */

import { readCanonicalVisibleModules, isSidebarGovernanceActive } from './canonicalVisibleModules.js';
import { mergeContextualModulesSafely } from './safeContextualMerge.js';
import { filterMenuItemsByGovernance } from './sidebarLeakageProtection.js';
import { applyTerminalSidebarLock } from '../runtimeTerminalGovernance/terminalSidebarLock.js';
import { isTerminalGovernanceLocked, shouldSkipLegacyPipeline } from '../runtimeTerminalGovernance/terminalGovernanceGuard.js';
import { auditSidebarRender } from '../runtimeGovernanceAudit/sidebarRenderAudit.js';
import { auditGovernanceConflict } from '../runtimeGovernanceAudit/governanceConflictAudit.js';

/**
 * Aplica governança Z.14 ao contexto do menu sem mudar CSS/UX.
 * @param {object} params
 * @param {object} params.dashboardMe — payload /dashboard/me
 * @param {Array} params.menuItems — itens já montados
 * @param {Array} params.contextualModules — contextual_modules brutos
 */
export function applySidebarGovernanceAdapter({ dashboardMe, menuItems, contextualModules, baseMenuItems, filterMenu }) {
  const governedVisible = readCanonicalVisibleModules(dashboardMe);
  const governedContextual = mergeContextualModulesSafely(contextualModules, dashboardMe);

  if (shouldSkipLegacyPipeline(dashboardMe) && typeof filterMenu === 'function' && Array.isArray(baseMenuItems)) {
    const terminalOnly = filterMenu(baseMenuItems, governedVisible, {
      loading: false,
      _terminalVisibleModules: governedVisible
    });
    const locked = applyTerminalSidebarLock(terminalOnly, dashboardMe, baseMenuItems);
    return {
      visibleModules: governedVisible,
      contextualModules: governedContextual,
      menuItems: locked.menuItems,
      governanceActive: true,
      terminalLocked: true,
      runtime: dashboardMe?.sidebar_governance_runtime || null,
      skippedLegacyPipeline: locked.skipped
    };
  }

  let items = filterMenuItemsByGovernance(menuItems, dashboardMe);
  const terminalLocked = applyTerminalSidebarLock(items, dashboardMe);
  items = terminalLocked.menuItems;

  const renderAudit =
    typeof window !== 'undefined' && window.IMPETUS_FRONTEND_GOVERNANCE_AUDIT === true
      ? auditSidebarRender(items, dashboardMe)
      : null;
  const conflictAudit =
    typeof window !== 'undefined' && window.IMPETUS_FRONTEND_GOVERNANCE_AUDIT === true
      ? auditGovernanceConflict(dashboardMe, items)
      : null;

  return {
    visibleModules: governedVisible.length ? governedVisible : dashboardMe?.visible_modules,
    contextualModules: governedContextual,
    menuItems: items,
    governanceActive: isSidebarGovernanceActive(dashboardMe),
    terminalLocked: isTerminalGovernanceLocked(dashboardMe),
    runtime: dashboardMe?.sidebar_governance_runtime || null,
    frontend_render_audit: renderAudit,
    frontend_governance_conflict: conflictAudit
  };
}
