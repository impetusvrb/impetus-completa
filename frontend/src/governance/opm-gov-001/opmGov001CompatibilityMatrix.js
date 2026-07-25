/**
 * OPM-GOV-001 — Compatibility Matrix (congelado).
 * Module → State Machine → Movement → Observability → Timeline
 */
export const OPM_GOV_001_COMPATIBILITY = Object.freeze({
  modules: Object.freeze([
    Object.freeze({
      moduleId: 'receiving',
      phase: 'OPM-003',
      contracts: Object.freeze(['Lifecycle', 'Receipt']),
      stateMachine: 'OPM_GOV_001_LIFECYCLE.receiving',
      movements: Object.freeze(['receipt']),
      observabilityPrefix: 'RECEIVING_',
      timelineBuilder: 'buildReceivingTimelineEvents',
      certified: true
    }),
    Object.freeze({
      moduleId: 'inventory',
      phase: 'OPM-002A',
      contracts: Object.freeze(['Lifecycle', 'Movements']),
      stateMachine: 'OPM_GOV_001_LIFECYCLE.inventory',
      movements: Object.freeze(['receipt', 'pick', 'issue']),
      observabilityPrefix: 'INVENTORY_',
      timelineBuilder: 'buildInventoryTimeline',
      certified: true
    }),
    Object.freeze({
      moduleId: 'picking',
      phase: 'OPM-004',
      contracts: Object.freeze(['Lifecycle', 'Pick']),
      stateMachine: 'OPM_GOV_001_LIFECYCLE.picking',
      movements: Object.freeze(['pick']),
      observabilityPrefix: 'PICKING_',
      timelineBuilder: 'buildPickingTimelineEvents',
      certified: true
    }),
    Object.freeze({
      moduleId: 'shipping',
      phase: 'OPM-005',
      contracts: Object.freeze(['Lifecycle', 'Issue']),
      stateMachine: 'OPM_GOV_001_LIFECYCLE.shipping',
      movements: Object.freeze(['issue']),
      observabilityPrefix: 'SHIPPING_',
      timelineBuilder: 'buildShippingTimelineEvents',
      certified: true
    })
  ]),
  chain: Object.freeze([
    Object.freeze({ step: 1, module: 'receiving', movement: 'receipt', handoff: 'handoff-receiving-inventory' }),
    Object.freeze({ step: 2, module: 'inventory', movement: null, handoff: 'handoff-inventory-picking' }),
    Object.freeze({ step: 3, module: 'picking', movement: 'pick', handoff: 'handoff-picking-shipping' }),
    Object.freeze({ step: 4, module: 'shipping', movement: 'issue', handoff: 'handoff-shipping-inventory' })
  ]),
  dimensions: Object.freeze(['StateMachine', 'Movement', 'Observability', 'Timeline'])
});

export function getCompatibilityForModule(moduleId) {
  return OPM_GOV_001_COMPATIBILITY.modules.find((m) => m.moduleId === moduleId) || null;
}

export function getCertifiedModuleIds() {
  return OPM_GOV_001_COMPATIBILITY.modules.filter((m) => m.certified).map((m) => m.moduleId);
}
