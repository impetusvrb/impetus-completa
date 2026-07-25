/**
 * OPM-002A — Padrão Reference Module WMS.
 * Inventário = módulo de referência funcional para toda a suíte operacional WMS.
 */
export const WMS_REFERENCE_MODULE_PHASE = 'OPM-002A';

/** Slots canónicos herdados por OPM-003+ */
export const WMS_REFERENCE_MODULE_SLOTS = Object.freeze([
  'dashboard',
  'metrics',
  'search',
  'filters',
  'grid',
  'timeline',
  'export',
  'details'
]);

/** Componentes de referência — certificados WMS-REF-001 (import: presentation/wms-reference-components) */
export const WMS_REFERENCE_MODULE_COMPONENTS = Object.freeze({
  dashboard: 'InventoryDashboard',
  metrics: 'InventoryMetrics',
  search: 'InventorySearch',
  filters: 'InventoryFilters',
  grid: 'InventoryGrid',
  timeline: 'InventoryTimeline',
  export: 'InventoryExport'
});

/** Módulos que herdarão o padrão */
export const WMS_REFERENCE_MODULE_SUCCESSORS = Object.freeze([
  { moduleId: 'receiving', phase: 'OPM-003', label: 'Receiving Operations' },
  { moduleId: 'picking', phase: 'OPM-004', label: 'Picking Operations & Order Fulfillment' },
  { moduleId: 'shipping', phase: 'OPM-005', label: 'Shipping Control & Outbound Logistics' },
  { moduleId: 'transfers', phase: 'OPM-006', label: 'Transfer Management & Internal Logistics' },
  { moduleId: 'warehouse_intelligence', phase: 'OPM-007', label: 'Warehouse Intelligence & Operational Optimization' },
  { moduleId: 'cognitive_logistics', phase: 'OPM-008', label: 'Cognitive Logistics & Decision Intelligence' }
]);

/** Eventos de observabilidade do padrão (prefixo INVENTORY_ → módulo específico em OPM-003+) */
export const WMS_REFERENCE_OBSERVABILITY_EVENTS = Object.freeze([
  'LOADED',
  'SEARCH',
  'FILTER',
  'GRID_SORT',
  'EXPORT',
  'TIMELINE',
  'VIEW_CHANGED'
]);

export const WMS_REFERENCE_MODULE_CONTRACT = Object.freeze({
  phase: WMS_REFERENCE_MODULE_PHASE,
  referenceModuleId: 'inventory',
  referenceComponentsPhase: 'WMS-REF-001',
  officialComponentsPath: 'presentation/wms-reference-components',
  architectureFreeze: true,
  consumesApis: ['WMS-003'],
  presentationLayer: ['EOX', 'OPM-001A IndustrialModuleLayout'],
  slots: WMS_REFERENCE_MODULE_SLOTS,
  components: WMS_REFERENCE_MODULE_COMPONENTS,
  successors: WMS_REFERENCE_MODULE_SUCCESSORS
});
