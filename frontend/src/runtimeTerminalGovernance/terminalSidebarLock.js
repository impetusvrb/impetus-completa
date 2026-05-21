/**
 * Phase Z.16 — menu lateral imutável após lock.
 */

import { isTerminalGovernanceLocked, getFinalVisibleModules } from './terminalGovernanceGuard.js';
import { filterMenuItemsByGovernance } from '../runtimeGovernance/sidebarLeakageProtection.js';

export function applyTerminalSidebarLock(menuItems, dashboardMe, baseMenuItems = []) {
  if (!isTerminalGovernanceLocked(dashboardMe)) {
    return { menuItems, locked: false };
  }
  const filtered = filterMenuItemsByGovernance(menuItems, dashboardMe);
  return {
    menuItems: filtered,
    locked: true,
    final_visible_modules: getFinalVisibleModules(dashboardMe),
    skipped: ['buildHybridMenu', 'safeMergeSafety', 'safeMergeEnvironment', 'safeMergeLogistics', 'publication_merge']
  };
}

export function buildMenuFromBaseOnly(baseMenuItems, dashboardMe, filterMenuFn) {
  if (!isTerminalGovernanceLocked(dashboardMe)) return null;
  const mods = getFinalVisibleModules(dashboardMe);
  return filterMenuFn(baseMenuItems, mods, { loading: false });
}
