/**
 * WMS-007A — Registo modular standalone (sem workspace container).
 */
import { filterNavByRbac } from '../config/wmsRbacNavigation.js';

export const WMS_MODULE_PHASE = 'WMS-007A';
export const WMS_LOGISTICS_BASE = '/app/logistics';
export const WMS_LEGACY_WORKSPACE_BASE = '/app/logistics-operational/workspace';

/** Landing CC — não aparece na sidebar */
export const WMS_LANDING_MODULE = Object.freeze({
  id: 'dashboard',
  label: 'Dashboard Operacional',
  path: '',
  standalonePath: WMS_LEGACY_WORKSPACE_BASE,
  legacyPath: WMS_LEGACY_WORKSPACE_BASE,
  segment: 'dashboard',
  component: 'WmsOperationalDashboardPage',
  sidebar: false,
  landing: true
});

export const WMS_OPERATIONAL_MODULES = Object.freeze([
  {
    id: 'warehouses',
    label: 'Armazéns',
    path: '/warehouses',
    standalonePath: `${WMS_LOGISTICS_BASE}/warehouses`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/warehouses`,
    segment: 'warehouses',
    component: 'WarehouseModulePage',
    pageComponent: 'WarehouseModulePage',
    api: 'listWarehouses',
    description: 'Gestão operacional de armazéns · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'inventory',
    label: 'Inventário',
    path: '/inventory',
    standalonePath: `${WMS_LOGISTICS_BASE}/inventory`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/inventory`,
    segment: 'inventory',
    component: 'InventoryModulePage',
    pageComponent: 'InventoryModulePage',
    api: 'listItems',
    description: 'Posição e itens de inventário · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'receiving',
    label: 'Recebimento',
    path: '/receiving',
    standalonePath: `${WMS_LOGISTICS_BASE}/receiving`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/receiving`,
    segment: 'receiving',
    component: 'ReceivingModulePage',
    pageComponent: 'ReceivingModulePage',
    api: 'listReceiving',
    description: 'Porta de entrada operacional · inbound logistics · ASN · docas · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'picking',
    label: 'Picking',
    path: '/picking',
    standalonePath: `${WMS_LOGISTICS_BASE}/picking`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/picking`,
    segment: 'picking',
    component: 'PickingModulePage',
    pageComponent: 'PickingModulePage',
    api: 'listPicking',
    description: 'Picking Operations & Order Fulfillment · separação · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'shipping',
    label: 'Expedição',
    path: '/shipping',
    standalonePath: `${WMS_LOGISTICS_BASE}/shipping`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/shipping`,
    segment: 'shipping',
    component: 'ShippingModulePage',
    pageComponent: 'ShippingModulePage',
    api: 'listShipping',
    description: 'Shipping Control & Outbound Logistics · expedição · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'transfers',
    label: 'Transferências',
    path: '/transfers',
    standalonePath: `${WMS_LOGISTICS_BASE}/transfers`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/transfers`,
    segment: 'transfers',
    component: 'TransferModulePage',
    pageComponent: 'TransferModulePage',
    api: 'listTransfers',
    description: 'Transfer Management & Internal Logistics · camada transversal · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'warehouse_intelligence',
    label: 'Inteligência Operacional',
    path: '/warehouse-intelligence',
    standalonePath: `${WMS_LOGISTICS_BASE}/warehouse-intelligence`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/warehouse-intelligence`,
    segment: 'warehouse-intelligence',
    component: 'WarehouseIntelligenceModulePage',
    pageComponent: 'WarehouseIntelligenceModulePage',
    api: 'listWarehouses',
    description: 'Warehouse Intelligence & Operational Optimization · analítica read-only · WMS-003 v1',
    sidebar: true
  },
  {
    id: 'cognitive_logistics',
    label: 'Logística Cognitiva',
    path: '/cognitive-logistics',
    standalonePath: `${WMS_LOGISTICS_BASE}/cognitive-logistics`,
    legacyPath: `${WMS_LEGACY_WORKSPACE_BASE}/cognitive-logistics`,
    segment: 'cognitive-logistics',
    component: 'CognitiveLogisticsModulePage',
    pageComponent: 'CognitiveLogisticsModulePage',
    api: 'listWarehouses',
    description: 'Cognitive Logistics & Decision Intelligence · camada cognitiva · OPM-008',
    sidebar: true
  }
]);

export function getWmsSidebarModules(userCtx = null) {
  const items = WMS_OPERATIONAL_MODULES.filter((m) => m.sidebar);
  if (userCtx) return filterNavByRbac(items);
  return filterNavByRbac([...items]);
}

export function getWmsModuleBySegment(segment) {
  return WMS_OPERATIONAL_MODULES.find((m) => m.segment === segment) || null;
}

export function listWmsStandalonePaths() {
  return WMS_OPERATIONAL_MODULES.map((m) => m.standalonePath);
}

export function listWmsLegacyModulePaths() {
  return WMS_OPERATIONAL_MODULES.map((m) => m.legacyPath);
}
