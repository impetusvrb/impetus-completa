/**
 * OPM-006 — Integração inventário (movimentação interna transfer).
 * Invariante OPM-GOV-001: nunca receipt, pick ou issue.
 */
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import {
  trackTransferStarted,
  trackTransferCompleted,
  trackTransferDivergence
} from './transferObservability.js';
import { resolveInternalMovementType } from './transferListUtils.js';

const FORBIDDEN_MOVEMENT_TYPES = Object.freeze(['receipt', 'pick', 'issue']);

export async function postTransferInventoryMovements(order) {
  const meta = order.metadata || {};
  const internalType = resolveInternalMovementType(order);
  const lines = meta.transfer_lines || meta.lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty) {
    lines.push({
      item_id: meta.item_id,
      quantity: meta.qty,
      uom: meta.uom || 'un',
      lot_number: meta.lot_number
    });
  }

  for (const line of lines) {
    const qty = Number(line.quantity ?? line.qty) || 0;
    if (!line.item_id || qty <= 0) continue;

    const body = {
      warehouse_id: order.from_warehouse_id,
      item_id: line.item_id,
      movement_type: 'transfer',
      quantity: qty,
      uom: line.uom || 'un',
      lot_number: line.lot_number || null,
      from_address_id: line.from_address_id || meta.from_address_id || null,
      to_address_id: line.to_address_id || meta.to_address_id || null,
      reference_type: 'transfer',
      reference_id: order.id,
      metadata: {
        transfer_order: order.order_number,
        internal_movement_type: internalType,
        from_warehouse_id: order.from_warehouse_id,
        to_warehouse_id: order.to_warehouse_id,
        zone_from: meta.zone_from,
        zone_to: meta.zone_to,
        bin_from: meta.bin_from,
        bin_to: meta.bin_to,
        source: 'OPM-006',
        preserves_quantity: true,
        preserves_ownership: true
      }
    };

    if (FORBIDDEN_MOVEMENT_TYPES.includes(body.movement_type)) {
      throw new Error(`Movimento proibido: ${body.movement_type} — reservado fluxo certificado`);
    }

    const res = await wmsV1Api.createMovement(body);
    movements.push(res?.data || res);
  }

  return movements;
}

export async function startTransferExecution(order) {
  trackTransferStarted(order.id);
  if (order.metadata?.divergence) trackTransferDivergence(order.id);
  return order;
}

export async function completeTransferWithInventory(order) {
  const movements = await postTransferInventoryMovements(order);
  const res = await wmsV1Api.completeTransfer(order.id);
  trackTransferCompleted(order.id, movements.length);
  return { movements, order: res?.data || res, status: 'received' };
}
