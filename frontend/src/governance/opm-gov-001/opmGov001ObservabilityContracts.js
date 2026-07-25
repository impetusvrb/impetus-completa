/**
 * OPM-GOV-001 — Observability Baseline (congelado).
 * Catálogo oficial de eventos certificados OPM-E2E-001.
 */
export const OPM_GOV_001_OBSERVABILITY = Object.freeze({
  receiving: Object.freeze({
    moduleId: 'receiving',
    phase: 'OPM-003',
    prefix: 'RECEIVING_',
    producer: 'receivingObservability.js',
    consumer: 'wmsUiObservability · impetus:receiving CustomEvent',
    events: Object.freeze([
      { id: 'RECEIVING_LOADED', required: false, emitOn: 'module_mount', payload: ['module', 'phase'] },
      { id: 'RECEIVING_ASN_CREATED', required: false, emitOn: 'asn_create', payload: ['orderId'] },
      { id: 'RECEIVING_DOCK_ASSIGNED', required: false, emitOn: 'dock_assign', payload: ['dockId', 'orderId'] },
      { id: 'RECEIVING_INSPECTION_STARTED', required: false, emitOn: 'inspection_start', payload: ['orderId'] },
      { id: 'RECEIVING_DIVERGENCE', required: false, emitOn: 'divergence_detected', payload: ['orderId'] },
      { id: 'RECEIVING_COMPLETED', required: true, emitOn: 'receiving_complete', payload: ['orderId', 'movementCount'] },
      { id: 'RECEIVING_TIMELINE', required: false, emitOn: 'timeline_view', payload: ['periodDays'] },
      { id: 'RECEIVING_EXPORT', required: false, emitOn: 'export', payload: ['format', 'rowCount'] },
      { id: 'RECEIVING_FILTER', required: false, emitOn: 'filter', payload: ['filterId'] },
      { id: 'RECEIVING_SEARCH', required: false, emitOn: 'search', payload: ['queryLength'] }
    ])
  }),
  inventory: Object.freeze({
    moduleId: 'inventory',
    phase: 'OPM-002A',
    prefix: 'INVENTORY_',
    producer: 'inventoryObservability.js',
    consumer: 'wmsUiObservability · impetus:inventory CustomEvent',
    events: Object.freeze([
      { id: 'INVENTORY_LOADED', required: false, emitOn: 'module_mount', payload: ['module', 'phase'] },
      { id: 'INVENTORY_FILTER', required: false, emitOn: 'filter', payload: ['filterId'] },
      { id: 'INVENTORY_SEARCH', required: false, emitOn: 'search', payload: ['queryLength'] },
      { id: 'INVENTORY_GRID_SORT', required: false, emitOn: 'grid_sort', payload: ['sortKey', 'direction'] },
      { id: 'INVENTORY_EXPORT', required: false, emitOn: 'export', payload: ['format', 'rowCount'] },
      { id: 'INVENTORY_TIMELINE', required: false, emitOn: 'timeline_view', payload: ['periodDays'] },
      { id: 'INVENTORY_VIEW_CHANGED', required: false, emitOn: 'view_change', payload: ['viewId'] }
    ])
  }),
  picking: Object.freeze({
    moduleId: 'picking',
    phase: 'OPM-004',
    prefix: 'PICKING_',
    producer: 'pickingObservability.js',
    consumer: 'wmsUiObservability · impetus:picking CustomEvent',
    events: Object.freeze([
      { id: 'PICKING_LOADED', required: false, emitOn: 'module_mount', payload: ['module', 'phase'] },
      { id: 'PICKING_ORDER_ASSIGNED', required: false, emitOn: 'order_assign', payload: ['orderId', 'operatorId'] },
      { id: 'PICKING_STARTED', required: true, emitOn: 'picking_start', payload: ['orderId'] },
      { id: 'PICKING_PAUSED', required: false, emitOn: 'picking_pause', payload: ['orderId'] },
      { id: 'PICKING_COMPLETED', required: true, emitOn: 'picking_complete', payload: ['orderId', 'movementCount'] },
      { id: 'PICKING_DIVERGENCE', required: false, emitOn: 'divergence_detected', payload: ['orderId'] },
      { id: 'PICKING_ROUTE_VIEWED', required: false, emitOn: 'route_view', payload: ['orderId'] },
      { id: 'PICKING_EXPORT', required: false, emitOn: 'export', payload: ['format', 'rowCount'] },
      { id: 'PICKING_FILTER', required: false, emitOn: 'filter', payload: ['filterId'] },
      { id: 'PICKING_SEARCH', required: false, emitOn: 'search', payload: ['queryLength'] },
      { id: 'PICKING_TIMELINE', required: false, emitOn: 'timeline_view', payload: ['periodDays'] }
    ])
  }),
  shipping: Object.freeze({
    moduleId: 'shipping',
    phase: 'OPM-005',
    prefix: 'SHIPPING_',
    producer: 'shippingObservability.js',
    consumer: 'wmsUiObservability · impetus:shipping CustomEvent',
    events: Object.freeze([
      { id: 'SHIPPING_LOADED', required: false, emitOn: 'module_mount', payload: ['module', 'phase'] },
      { id: 'SHIPPING_ORDER_RECEIVED', required: false, emitOn: 'order_received', payload: ['orderId'] },
      { id: 'SHIPPING_LOADING_STARTED', required: true, emitOn: 'loading_start', payload: ['orderId'] },
      { id: 'SHIPPING_LOADING_COMPLETED', required: false, emitOn: 'loading_complete', payload: ['orderId'] },
      { id: 'SHIPPING_DISPATCHED', required: true, emitOn: 'dispatch', payload: ['orderId', 'movementCount'] },
      { id: 'SHIPPING_DIVERGENCE', required: false, emitOn: 'divergence_detected', payload: ['orderId'] },
      { id: 'SHIPPING_TIMELINE', required: false, emitOn: 'timeline_view', payload: ['periodDays'] },
      { id: 'SHIPPING_EXPORT', required: false, emitOn: 'export', payload: ['format', 'rowCount'] },
      { id: 'SHIPPING_FILTER', required: false, emitOn: 'filter', payload: ['filterId'] },
      { id: 'SHIPPING_SEARCH', required: false, emitOn: 'search', payload: ['queryLength'] }
    ])
  })
});

/** Cadeia E2E certificada — eventos obrigatórios no happy path */
export const OPM_GOV_001_E2E_REQUIRED_EVENTS = Object.freeze([
  'RECEIVING_COMPLETED',
  'PICKING_STARTED',
  'PICKING_COMPLETED',
  'SHIPPING_LOADING_STARTED',
  'SHIPPING_DISPATCHED'
]);

export function getObservabilityForModule(moduleId) {
  return OPM_GOV_001_OBSERVABILITY[moduleId] || null;
}

export function getAllObservabilityEventIds() {
  return Object.values(OPM_GOV_001_OBSERVABILITY).flatMap((d) => d.events.map((e) => e.id));
}

export function getRequiredOperationalEvents() {
  return Object.values(OPM_GOV_001_OBSERVABILITY)
    .flatMap((d) => d.events.filter((e) => e.required).map((e) => e.id));
}
