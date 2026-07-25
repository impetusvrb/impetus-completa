/**
 * OPM-E2E-001 — Builders puros de movimentação (espelham integrações OPM-003/004/005).
 */

export function buildReceiptMovements(order, tsFactory) {
  const meta = order.metadata || {};
  const lines = meta.lines || meta.receipt_lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_received) {
    lines.push({
      item_id: meta.item_id,
      quantity_received: meta.qty_received,
      uom: meta.uom || 'un'
    });
  }

  for (const line of lines) {
    if (!line.item_id || !line.quantity_received) continue;
    movements.push({
      id: `mov-rcv-${movements.length + 1}`,
      created_at: tsFactory(),
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'receipt',
      quantity: Number(line.quantity_received),
      uom: line.uom || 'un',
      reference_type: 'receiving',
      reference_id: order.id,
      metadata: { source: 'OPM-003', receiving_order: order.order_number }
    });
  }
  return movements;
}

export function buildPickMovements(order, tsFactory) {
  const meta = order.metadata || {};
  const lines = meta.pick_lines || meta.lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_picked) {
    lines.push({ item_id: meta.item_id, qty_picked: meta.qty_picked, uom: meta.uom || 'un' });
  }

  for (const line of lines) {
    const qty = Number(line.qty_picked ?? line.quantity) || 0;
    if (!line.item_id || qty <= 0) continue;
    movements.push({
      id: `mov-pck-${movements.length + 1}`,
      created_at: tsFactory(),
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'pick',
      quantity: qty,
      uom: line.uom || 'un',
      reference_type: 'picking',
      reference_id: order.id,
      metadata: { source: 'OPM-004', picking_order: order.order_number }
    });
  }
  return movements;
}

export function buildIssueMovements(order, tsFactory) {
  const meta = order.metadata || {};
  const lines = meta.ship_lines || meta.pick_lines || meta.lines || [];
  const movements = [];

  if (!lines.length && meta.item_id && meta.qty_shipped) {
    lines.push({ item_id: meta.item_id, qty_shipped: meta.qty_shipped, uom: meta.uom || 'un' });
  }

  for (const line of lines) {
    const qty = Number(line.qty_shipped ?? line.qty_picked ?? line.quantity) || 0;
    if (!line.item_id || qty <= 0) continue;
    movements.push({
      id: `mov-shp-${movements.length + 1}`,
      created_at: tsFactory(),
      warehouse_id: order.warehouse_id,
      item_id: line.item_id,
      movement_type: 'issue',
      quantity: qty,
      uom: line.uom || 'un',
      reference_type: 'shipping',
      reference_id: order.id,
      metadata: { source: 'OPM-005', shipping_order: order.order_number }
    });
  }
  return movements;
}
