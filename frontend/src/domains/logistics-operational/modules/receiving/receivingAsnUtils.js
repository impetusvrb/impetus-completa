/**
 * OPM-003 — Utilitários ASN (cadastro via POST /receiving + metadata).
 */
import { trackReceivingAsnCreated, trackReceivingDockAssigned } from './receivingObservability.js';

export function buildAsnCreatePayload({
  warehouseId,
  orderNumber,
  asnNumber,
  supplierRef,
  supplierName,
  poNumber,
  dockId,
  expectedAt,
  qtyExpected,
  itemId,
  lines = []
}) {
  const metadata = {
    asn_number: asnNumber,
    asn_status: 'planned',
    supplier_name: supplierName || supplierRef,
    po_number: poNumber || null,
    dock_id: dockId || null,
    qty_expected: qtyExpected != null ? Number(qtyExpected) : null,
    item_id: itemId || null,
    expected_at: expectedAt || null,
    invoice_valid: null,
    asn_valid: null,
    po_valid: null,
    certificates_ok: null,
    inspection_status: 'pending',
    lines: lines.length ? lines : undefined,
    source: 'OPM-003'
  };

  return {
    warehouse_id: warehouseId,
    order_number: orderNumber,
    supplier_ref: supplierRef || supplierName || null,
    expected_at: expectedAt || null,
    metadata
  };
}

export async function createReceivingAsn(wmsV1Api, form) {
  const body = buildAsnCreatePayload(form);
  const res = await wmsV1Api.createReceiving(body);
  const order = res?.data || res;
  trackReceivingAsnCreated(order?.id);
  if (form.dockId) trackReceivingDockAssigned(form.dockId, order?.id);
  return order;
}

export function validateAsnForm(form) {
  const errors = [];
  if (!form.warehouseId) errors.push('Armazém obrigatório');
  if (!form.orderNumber?.trim()) errors.push('Número do documento obrigatório');
  if (!form.asnNumber?.trim()) errors.push('Número ASN obrigatório');
  return errors;
}
