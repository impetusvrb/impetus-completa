/**
 * OPM-005 — Expedição: movimentação saída + dispatch WMS-003.
 */
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import {
  trackShippingLoadingStarted,
  trackShippingDispatched
} from './shippingObservability.js';

export async function postShippingInventoryMovements(order) {
  const meta = order.metadata || {};
  const lines = meta.ship_lines || meta.pick_lines || meta.lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_shipped) {
    lines.push({
      item_id: meta.item_id,
      qty_shipped: meta.qty_shipped,
      uom: meta.uom || 'un',
      lot_number: meta.lot_number
    });
  }

  for (const line of lines) {
    const qty = Number(line.qty_shipped ?? line.qty_picked ?? line.quantity) || 0;
    if (!line.item_id || qty <= 0) continue;
    const body = {
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'issue',
      quantity: qty,
      uom: line.uom || 'un',
      lot_number: line.lot_number || null,
      reference_type: 'shipping',
      reference_id: order.id,
      metadata: {
        shipping_order: order.order_number,
        picking_order: meta.picking_order_number,
        carrier: meta.carrier_name || order.carrier_ref,
        source: 'OPM-005'
      }
    };
    const res = await wmsV1Api.createMovement(body);
    movements.push(res?.data || res);
  }

  return movements;
}

export async function startShippingLoading(order) {
  trackShippingLoadingStarted(order.id);
  return order;
}

export async function dispatchShippingWithInventory(order) {
  const movements = await postShippingInventoryMovements(order);
  const res = await wmsV1Api.dispatchShipping(order.id);
  trackShippingDispatched(order.id, movements.length);
  return { movements, order: res?.data || res, status: 'shipped' };
}
