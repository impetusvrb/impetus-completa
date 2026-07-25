/**
 * WMS-004 / WMS-007A — Registo de navegação operacional WMS.
 */
import { isWmsMenuVisible, getWmsFeatureFlagSnapshot } from '../config/wmsFeatureFlags.js';
import {
  WMS_OPERATIONAL_MODULES,
  WMS_LANDING_MODULE,
  WMS_LOGISTICS_BASE,
  WMS_LEGACY_WORKSPACE_BASE,
  getWmsSidebarModules,
  WMS_MODULE_PHASE
} from './wmsModuleRegistry.js';

/** Landing CC (Abrir Workspace) — path legacy preservado */
export const WMS_OPERATIONAL_BASE = WMS_LEGACY_WORKSPACE_BASE;

export { WMS_OPERATIONAL_MODULES, WMS_LANDING_MODULE, WMS_LOGISTICS_BASE, getWmsSidebarModules };

export const WMS_OPERATIONAL_NAV = Object.freeze({
  id: 'logistics_operational_wms',
  label: 'Logística Operacional',
  path: WMS_OPERATIONAL_BASE,
  menu_visible: false,
  phase: WMS_MODULE_PHASE,
  requires_flags: [
    'VITE_IMPETUS_LOGISTICS_ENABLED',
    'VITE_IMPETUS_LOGISTICS_MENU',
    'VITE_IMPETUS_LOGISTICS_WORKSPACE'
  ]
});

export const WMS_OPERATIONAL_ROUTES = Object.freeze([
  { path: WMS_OPERATIONAL_BASE, component: 'WmsLegacyWorkspaceRoutes', lazy: true, published: false },
  ...WMS_OPERATIONAL_MODULES.map((m) => ({
    path: m.standalonePath,
    component: m.pageComponent,
    lazy: true,
    published: false
  })),
  ...WMS_OPERATIONAL_MODULES.map((m) => ({
    path: m.legacyPath,
    component: 'WmsLegacyWorkspaceRoutes',
    redirect: m.standalonePath,
    lazy: true,
    published: false
  }))
]);

export function getWmsNavigationSnapshot() {
  const modules = getWmsSidebarModules();
  return Object.freeze({
    nav: WMS_OPERATIONAL_NAV,
    modules,
    landing: WMS_LANDING_MODULE,
    menu_visible: isWmsMenuVisible(),
    flags: getWmsFeatureFlagSnapshot(),
    api_phase: 'WMS-003',
    workspace_phase: WMS_MODULE_PHASE,
    standalone_base: WMS_LOGISTICS_BASE
  });
}

export { isWmsMenuVisible };
