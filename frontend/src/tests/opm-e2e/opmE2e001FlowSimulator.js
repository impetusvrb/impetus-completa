/**
 * OPM-E2E-001 — Simulador de fluxo operacional (4 cenários certificados).
 */
import { buildReceivingTimelineEvents } from '../../domains/logistics-operational/modules/receiving/receivingRowUtils.js';
import { buildPickingTimelineEvents } from '../../domains/logistics-operational/modules/picking/pickingRowUtils.js';
import { buildShippingTimelineEvents } from '../../domains/logistics-operational/modules/shipping/shippingRowUtils.js';
import { buildInventoryTimeline } from '../../domains/logistics-operational/modules/inventory/inventoryTimelineUtils.js';
import { resetWmsUiObservabilityForTests } from '../../domains/logistics-operational/services/wmsUiObservability.js';
import { trackReceivingDivergence, trackReceivingCompleted } from '../../domains/logistics-operational/modules/receiving/receivingObservability.js';
import { trackPickingDivergence, trackPickingStarted, trackPickingCompleted } from '../../domains/logistics-operational/modules/picking/pickingObservability.js';
import {
  trackShippingDivergence,
  trackShippingLoadingStarted,
  trackShippingLoadingCompleted,
  trackShippingDispatched
} from '../../domains/logistics-operational/modules/shipping/shippingObservability.js';
import { trackInventoryTimeline } from '../../domains/logistics-operational/modules/inventory/inventoryObservability.js';
import {
  buildReceiptMovements,
  buildPickMovements,
  buildIssueMovements
} from './opmE2e001MovementBuilders.js';

export const E2E_FIXTURE = Object.freeze({
  warehouse_id: 'wh-e2e-001',
  item_id: 'item-e2e-001',
  qty: 100,
  uom: 'un',
  supplier: 'Fornecedor E2E'
});

function createTsFactory(base = Date.parse('2026-07-19T10:00:00Z')) {
  let offset = 0;
  return () => new Date(base + (offset += 60000)).toISOString();
}

function baseLine() {
  return {
    item_id: E2E_FIXTURE.item_id,
    uom: E2E_FIXTURE.uom,
    quantity_received: E2E_FIXTURE.qty,
    qty_picked: E2E_FIXTURE.qty,
    qty_shipped: E2E_FIXTURE.qty
  };
}

function finalizeFlow({ scenarioId, receiving, picking, shipping, movements, observabilityFn }) {
  resetWmsUiObservabilityForTests();
  observabilityFn();

  const receivingEvents = buildReceivingTimelineEvents([receiving.final]);
  const pickingEvents = buildPickingTimelineEvents([picking.final]);
  const shippingEvents = buildShippingTimelineEvents([shipping.final]);
  const inventoryEvents = buildInventoryTimeline({ movements, periodDays: null, limit: 50 });

  return {
    scenarioId,
    receiving,
    picking,
    shipping,
    movements,
    timelineEvents: {
      receiving: receivingEvents,
      picking: pickingEvents,
      shipping: shippingEvents,
      inventory: inventoryEvents
    }
  };
}

/** Cenário 1 — Happy Path */
export function simulateHappyPathFlow() {
  const ts = createTsFactory();
  const line = baseLine();

  const receiving = {
    initial: {
      id: 'rcv-e2e-1',
      order_number: 'ASN-E2E-001',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'open',
      created_at: ts(),
      metadata: {
        asn_number: 'ASN-E2E-001',
        supplier_name: E2E_FIXTURE.supplier,
        lines: [{ ...line }]
      }
    },
    final: null
  };
  receiving.final = {
    ...receiving.initial,
    status: 'completed',
    updated_at: ts(),
    metadata: {
      ...receiving.initial.metadata,
      asn_status: 'completed',
      stock_updated_at: ts()
    }
  };

  const receiptMovements = buildReceiptMovements(receiving.final, ts);

  const picking = {
    initial: {
      id: 'pck-e2e-1',
      order_number: 'PICK-E2E-001',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'assigned',
      created_at: ts(),
      metadata: { pick_lines: [{ ...line }], released_at: ts() }
    },
    final: null
  };
  picking.final = {
    ...picking.initial,
    status: 'completed',
    updated_at: ts(),
    metadata: {
      ...picking.initial.metadata,
      picking_started_at: ts(),
      picking_completed_at: ts()
    }
  };
  const pickMovements = buildPickMovements(picking.final, ts);

  const shipping = {
    initial: {
      id: 'shp-e2e-1',
      order_number: 'SHP-E2E-001',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'staged',
      created_at: ts(),
      metadata: {
        picking_order_id: picking.final.id,
        picking_order_number: picking.final.order_number,
        carrier_name: 'Transportadora E2E',
        ship_lines: [{ ...line }]
      }
    },
    final: null
  };
  shipping.final = {
    ...shipping.initial,
    status: 'shipped',
    updated_at: ts(),
    metadata: {
      ...shipping.initial.metadata,
      loading: true,
      loading_started_at: ts(),
      loading_completed_at: ts(),
      shipped_at: ts()
    }
  };
  const issueMovements = buildIssueMovements(shipping.final, ts);

  return finalizeFlow({
    scenarioId: 'happy-path',
    receiving,
    picking,
    shipping,
    movements: [...receiptMovements, ...pickMovements, ...issueMovements],
    observabilityFn: () => {
      trackReceivingCompleted(receiving.final.id, receiptMovements.length);
      trackPickingStarted(picking.final.id);
      trackPickingCompleted(picking.final.id, pickMovements.length);
      trackInventoryTimeline(30);
      trackShippingLoadingStarted(shipping.final.id);
      trackShippingLoadingCompleted(shipping.final.id);
      trackShippingDispatched(shipping.final.id, issueMovements.length);
    }
  });
}

/** Cenário 2 — Divergência no Recebimento → Quarentena → Liberação */
export function simulateReceivingDivergenceFlow() {
  const ts = createTsFactory(Date.parse('2026-07-19T11:00:00Z'));
  const line = baseLine();

  const receiving = {
    initial: {
      id: 'rcv-e2e-2',
      order_number: 'ASN-E2E-002',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'in_progress',
      created_at: ts(),
      metadata: {
        asn_number: 'ASN-E2E-002',
        inspection_started_at: ts(),
        divergence: true,
        divergence_at: ts(),
        quarantine: true,
        inspection_status: 'quarantine',
        lines: [{ ...line, quantity_received: E2E_FIXTURE.qty - 10 }]
      }
    },
    final: null
  };
  receiving.final = {
    ...receiving.initial,
    status: 'completed',
    updated_at: ts(),
    metadata: {
      ...receiving.initial.metadata,
      quarantine: false,
      quarantine_released: true,
      asn_status: 'completed',
      divergence_resolved: true,
      stock_updated_at: ts(),
      lines: [{ ...line, quantity_received: E2E_FIXTURE.qty - 10 }]
    }
  };

  const receiptMovements = buildReceiptMovements(receiving.final, ts);

  const picking = {
    initial: {
      id: 'pck-e2e-2',
      order_number: 'PICK-E2E-002',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'assigned',
      created_at: ts(),
      metadata: { pick_lines: [{ ...line, qty_picked: E2E_FIXTURE.qty - 10 }] }
    },
    final: null
  };
  picking.final = {
    ...picking.initial,
    status: 'completed',
    updated_at: ts(),
    metadata: { ...picking.initial.metadata, picking_started_at: ts(), picking_completed_at: ts() }
  };
  const pickMovements = buildPickMovements(picking.final, ts);

  const shipping = {
    initial: {
      id: 'shp-e2e-2',
      order_number: 'SHP-E2E-002',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'staged',
      created_at: ts(),
      metadata: {
        picking_order_id: picking.final.id,
        ship_lines: [{ ...line, qty_shipped: E2E_FIXTURE.qty - 10 }]
      }
    },
    final: null
  };
  shipping.final = {
    ...shipping.initial,
    status: 'shipped',
    updated_at: ts(),
    metadata: { ...shipping.initial.metadata, loading_started_at: ts(), shipped_at: ts() }
  };
  const issueMovements = buildIssueMovements(shipping.final, ts);

  return finalizeFlow({
    scenarioId: 'receiving-divergence',
    receiving,
    picking,
    shipping,
    movements: [...receiptMovements, ...pickMovements, ...issueMovements],
    observabilityFn: () => {
      trackReceivingDivergence(receiving.initial.id);
      trackReceivingCompleted(receiving.final.id, receiptMovements.length);
      trackPickingStarted(picking.final.id);
      trackPickingCompleted(picking.final.id, pickMovements.length);
      trackShippingDispatched(shipping.final.id, issueMovements.length);
    }
  });
}

/** Cenário 3 — Falta no Picking → Excepção → Reprocessamento */
export function simulatePickingShortageFlow() {
  const ts = createTsFactory(Date.parse('2026-07-19T12:00:00Z'));
  const line = baseLine();
  const partialQty = 60;

  const receiving = {
    initial: {
      id: 'rcv-e2e-3',
      order_number: 'ASN-E2E-003',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'completed',
      created_at: ts(),
      metadata: { lines: [{ ...line }] }
    },
    final: {
      id: 'rcv-e2e-3',
      order_number: 'ASN-E2E-003',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'completed',
      created_at: ts(),
      updated_at: ts(),
      metadata: { lines: [{ ...line }], asn_status: 'completed' }
    }
  };
  const receiptMovements = buildReceiptMovements(receiving.final, ts);

  const picking = {
    initial: {
      id: 'pck-e2e-3',
      order_number: 'PICK-E2E-003',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'picking',
      created_at: ts(),
      metadata: {
        pick_lines: [{ ...line }],
        picking_started_at: ts(),
        exception: true,
        stockout: true,
        stock_shortage: true
      }
    },
    final: null
  };
  picking.final = {
    ...picking.initial,
    status: 'completed',
    updated_at: ts(),
    metadata: {
      ...picking.initial.metadata,
      exception: false,
      reprocessed: true,
      pick_lines: [{ ...line, qty_picked: partialQty }],
      picking_completed_at: ts()
    }
  };
  const pickMovements = buildPickMovements(picking.final, ts);

  const shipping = {
    initial: {
      id: 'shp-e2e-3',
      order_number: 'SHP-E2E-003',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'open',
      created_at: ts(),
      metadata: { picking_order_id: picking.final.id, ship_lines: [{ ...line, qty_shipped: partialQty }] }
    },
    final: null
  };
  shipping.final = {
    ...shipping.initial,
    status: 'shipped',
    updated_at: ts(),
    metadata: { ...shipping.initial.metadata, loading_started_at: ts(), shipped_at: ts() }
  };
  const issueMovements = buildIssueMovements(shipping.final, ts);

  return finalizeFlow({
    scenarioId: 'picking-shortage',
    receiving,
    picking,
    shipping,
    movements: [...receiptMovements, ...pickMovements, ...issueMovements],
    observabilityFn: () => {
      trackReceivingCompleted(receiving.final.id, receiptMovements.length);
      trackPickingDivergence(picking.initial.id);
      trackPickingStarted(picking.initial.id);
      trackPickingCompleted(picking.final.id, pickMovements.length);
      trackShippingDispatched(shipping.final.id, issueMovements.length);
    }
  });
}

/** Cenário 4 — Divergência na Expedição → Correção → Dispatch */
export function simulateShippingDivergenceFlow() {
  const ts = createTsFactory(Date.parse('2026-07-19T13:00:00Z'));
  const line = baseLine();

  const receiving = {
    initial: {
      id: 'rcv-e2e-4',
      order_number: 'ASN-E2E-004',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'completed',
      created_at: ts(),
      metadata: { lines: [{ ...line }] }
    },
    final: {
      id: 'rcv-e2e-4',
      order_number: 'ASN-E2E-004',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'completed',
      created_at: ts(),
      updated_at: ts(),
      metadata: { lines: [{ ...line }], asn_status: 'completed' }
    }
  };
  const receiptMovements = buildReceiptMovements(receiving.final, ts);

  const picking = {
    initial: {
      id: 'pck-e2e-4',
      order_number: 'PICK-E2E-004',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'completed',
      created_at: ts(),
      metadata: { pick_lines: [{ ...line }], picking_completed_at: ts() }
    },
    final: null
  };
  picking.final = { ...picking.initial, updated_at: ts() };
  const pickMovements = buildPickMovements(picking.final, ts);

  const shipping = {
    initial: {
      id: 'shp-e2e-4',
      order_number: 'SHP-E2E-004',
      warehouse_id: E2E_FIXTURE.warehouse_id,
      status: 'staged',
      created_at: ts(),
      metadata: {
        picking_order_id: picking.final.id,
        inspecting: true,
        inspection_started_at: ts(),
        divergence: true,
        divergence_at: ts(),
        ship_lines: [{ ...line }]
      }
    },
    final: null
  };
  shipping.final = {
    ...shipping.initial,
    status: 'shipped',
    updated_at: ts(),
    metadata: {
      ...shipping.initial.metadata,
      divergence: false,
      divergence_resolved: true,
      inspecting: false,
      loading_started_at: ts(),
      loading_completed_at: ts(),
      shipped_at: ts()
    }
  };
  const issueMovements = buildIssueMovements(shipping.final, ts);

  return finalizeFlow({
    scenarioId: 'shipping-divergence',
    receiving,
    picking,
    shipping,
    movements: [...receiptMovements, ...pickMovements, ...issueMovements],
    observabilityFn: () => {
      trackReceivingCompleted(receiving.final.id, receiptMovements.length);
      trackPickingCompleted(picking.final.id, pickMovements.length);
      trackShippingDivergence(shipping.initial.id);
      trackShippingLoadingStarted(shipping.final.id);
      trackShippingLoadingCompleted(shipping.final.id);
      trackShippingDispatched(shipping.final.id, issueMovements.length);
    }
  });
}

export const E2E_SCENARIOS = Object.freeze([
  { id: 'happy-path', fn: simulateHappyPathFlow, expected: { receiving: 'completed', picking: 'completed', shipping: 'shipped' } },
  { id: 'receiving-divergence', fn: simulateReceivingDivergenceFlow, expected: { receiving: 'completed', picking: 'completed', shipping: 'shipped' } },
  { id: 'picking-shortage', fn: simulatePickingShortageFlow, expected: { receiving: 'completed', picking: 'completed', shipping: 'shipped' } },
  { id: 'shipping-divergence', fn: simulateShippingDivergenceFlow, expected: { receiving: 'completed', picking: 'completed', shipping: 'shipped' } }
]);
