/**
 * OPM-003 — Actualização de inventário após conclusão de recebimento.
 * Consome WMS-003 POST /inventory/movements.
 */
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { trackReceivingCompleted } from './receivingObservability.js';

export async function postReceivingInventoryMovements(order) {
  const meta = order.metadata || {};
  const lines = meta.lines || meta.receipt_lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_received) {
    lines.push({
      item_id: meta.item_id,
      quantity_received: meta.qty_received,
      uom: meta.uom || 'un',
      lot_number: meta.lot_number
    });
  }

  for (const line of lines) {
    if (!line.item_id || !line.quantity_received) continue;
    const body = {
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'receipt',
      quantity: Number(line.quantity_received),
      uom: line.uom || 'un',
      lot_number: line.lot_number || null,
      reference_type: 'receiving',
      reference_id: order.id,
      metadata: {
        receiving_order: order.order_number,
        asn: meta.asn_number,
        source: 'OPM-003'
      }
    };
    const res = await wmsV1Api.createMovement(body);
    movements.push(res?.data || res);
  }

  return movements;
}

export async function completeReceivingWithInventory(order) {
  const movements = await postReceivingInventoryMovements(order);
  await wmsV1Api.updateReceivingStatus(order.id, 'completed');
  trackReceivingCompleted(order.id, movements.length);
  return { movements, status: 'completed' };
}
