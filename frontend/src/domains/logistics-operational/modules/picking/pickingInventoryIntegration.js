/**
 * OPM-004 — Integração inventário ao concluir picking (reserva + movimentação).
 * Consome WMS-003 POST /inventory/movements + POST /picking/:id/complete.
 */
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { trackPickingCompleted, trackPickingStarted } from './pickingObservability.js';

export async function postPickingInventoryMovements(order) {
  const meta = order.metadata || {};
  const lines = meta.pick_lines || meta.lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_picked) {
    lines.push({
      item_id: meta.item_id,
      qty_picked: meta.qty_picked,
      uom: meta.uom || 'un',
      lot_number: meta.lot_number
    });
  }

  for (const line of lines) {
    const qty = Number(line.qty_picked ?? line.quantity) || 0;
    if (!line.item_id || qty <= 0) continue;
    const body = {
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'pick',
      quantity: qty,
      uom: line.uom || 'un',
      lot_number: line.lot_number || null,
      from_address_id: line.from_address_id || null,
      reference_type: 'picking',
      reference_id: order.id,
      metadata: {
        picking_order: order.order_number,
        wave_id: meta.wave_id,
        operator: meta.operator_name || meta.operator,
        reserved: true,
        source: 'OPM-004'
      }
    };
    const res = await wmsV1Api.createMovement(body);
    movements.push(res?.data || res);
  }

  return movements;
}

export async function startPickingOrder(order) {
  const res = await wmsV1Api.executePicking(order.id);
  trackPickingStarted(order.id);
  return res?.data || res;
}

export async function completePickingWithInventory(order) {
  const movements = await postPickingInventoryMovements(order);
  const res = await wmsV1Api.completePicking(order.id);
  trackPickingCompleted(order.id, movements.length);
  return { movements, order: res?.data || res, status: 'completed' };
}
