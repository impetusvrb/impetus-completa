/**
 * GF-027 — Registo de navegação / workspace Supply (menu protegido por flags).
 */

import { isSupplyMenuVisible, isSupplyWorkspaceEnabled } from '../config/supplyFeatureFlags.js';

export const SUPPLY_NAV = Object.freeze({
  id: 'supply_native',
  label: 'Supply / Suprimentos',
  path: '/app/supply/workspace',
  menu_visible: false,
  phase: 'GF-027',
  runtime_id: 'supply_native',
  requires_flags: [
    'VITE_IMPETUS_SUPPLY_ENABLED',
    'VITE_IMPETUS_SUPPLY_MENU',
    'VITE_IMPETUS_SUPPLY_MENU_VISIBLE'
  ]
});

export const SUPPLY_ROUTES = Object.freeze([
  {
    path: '/app/supply/workspace',
    component: 'SupplyWorkspacePage',
    lazy: true,
    published: false
  }
]);

export const SUPPLY_COMMAND_CENTER = Object.freeze({
  runtime_id: 'supply_native',
  payload_key: 'supply_cognitive_runtime',
  centers_key: 'supply_cognitive_centers',
  loader_key: 'supply_signal_loader',
  phase: 'GF-027',
  registered: true
});

export function getSupplyNavigationSnapshot() {
  return Object.freeze({
    nav: SUPPLY_NAV,
    routes: SUPPLY_ROUTES,
    command_center: SUPPLY_COMMAND_CENTER,
    menu_visible: isSupplyMenuVisible(),
    workspace_enabled: isSupplyWorkspaceEnabled()
  });
}

export { isSupplyMenuVisible, isSupplyWorkspaceEnabled };
