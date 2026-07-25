/**
 * FIN-READY-001 — WMS Financial Valuation readiness (GAP-FD-003).
 * Finance-owned adapter over WMS qty — does NOT alter WMS operational logic.
 * Does NOT implement inventory financial optimization product (2.3).
 */
import { FIN_READY_001_PHASE } from '../driver-model/driverRateModel.js';

export const VALUATION_METHODS = Object.freeze({
  AVERAGE_COST: 'average_cost',
  LOT_COST: 'lot_cost',
  STANDARD_COST: 'standard_cost',
  LAST_COST: 'last_cost'
});

export const WMS_VALUATION_CONTRACT = Object.freeze({
  id: 'finance.wms_valuation.v1',
  version: '1.0.0',
  phase: FIN_READY_001_PHASE,
  closesGap: 'GAP-FD-003',
  quantityOwner: 'wms_inventory',
  valuationOwner: 'finance_wms_valuation',
  mutatesWmsOperationalLogic: false,
  fields: Object.freeze([
    Object.freeze({ name: 'valuation_id', type: 'string', required: true }),
    Object.freeze({ name: 'item_id', type: 'string', required: true }),
    Object.freeze({ name: 'item_code', type: 'string', required: false }),
    Object.freeze({ name: 'warehouse_id', type: 'string', required: false }),
    Object.freeze({ name: 'lot_number', type: 'string', required: false }),
    Object.freeze({ name: 'quantity_ref', type: 'number', required: true, note: 'from WMS — not owned here' }),
    Object.freeze({ name: 'unit_cost', type: 'number', required: false }),
    Object.freeze({ name: 'average_cost', type: 'number', required: false }),
    Object.freeze({ name: 'lot_cost', type: 'number', required: false }),
    Object.freeze({ name: 'economic_value', type: 'number', required: false, note: 'qty × applicable unit cost when both present' }),
    Object.freeze({ name: 'currency', type: 'string', required: true, default: 'BRL' }),
    Object.freeze({ name: 'method', type: 'enum:VALUATION_METHODS', required: true }),
    Object.freeze({ name: 'metadata', type: 'object', required: false }),
    Object.freeze({ name: 'owner', type: 'string', required: true, default: 'finance_wms_valuation' })
  ]),
  forbidden: Object.freeze([
    'wms_stock_master_duplication',
    'inventory_financial_optimization_ui',
    'change_wms_movements',
    'smart_costing_calculation'
  ])
});

/**
 * Extract financial metadata from a WMS item/balance without mutating WMS.
 * Reads optional metadata keys if present; otherwise returns contract-ready nulls.
 */
export function extractValuationFromWmsRow(row = {}) {
  const item = row._item || row.item || row;
  const balance = row._balance || row.balance || {};
  const meta = {
    ...(item.metadata || {}),
    ...(balance.metadata || {}),
    ...(row.metadata || {})
  };
  const quantity = Number(row.quantity ?? balance.quantity ?? 0) || 0;
  const average_cost = numOrNull(meta.average_cost ?? meta.avg_cost ?? item.average_cost);
  const lot_cost = numOrNull(meta.lot_cost ?? balance.lot_cost);
  const unit_cost = numOrNull(meta.unit_cost ?? meta.standard_cost ?? item.unit_cost ?? average_cost ?? lot_cost);
  const method =
    lot_cost != null && (row.lot || balance.lot_number)
      ? VALUATION_METHODS.LOT_COST
      : average_cost != null
        ? VALUATION_METHODS.AVERAGE_COST
        : unit_cost != null
          ? VALUATION_METHODS.STANDARD_COST
          : VALUATION_METHODS.AVERAGE_COST;
  const applicable = method === VALUATION_METHODS.LOT_COST ? lot_cost : unit_cost ?? average_cost;
  const economic_value =
    applicable != null && quantity > 0 ? roundMoney(quantity * applicable) : null;

  return Object.freeze({
    valuation_id: `val:${row.item_id || item.id || row.id || 'unknown'}`,
    item_id: String(row.item_id || item.id || ''),
    item_code: row.item_code || item.item_code || item.code || null,
    warehouse_id: row.warehouse_id || balance.warehouse_id || null,
    lot_number: row.lot && row.lot !== '—' ? row.lot : balance.lot_number || meta.lot_number || null,
    quantity_ref: quantity,
    unit_cost,
    average_cost,
    lot_cost,
    economic_value,
    currency: meta.currency || 'BRL',
    method,
    metadata: Object.freeze({
      source: 'wms_inventory',
      adapter: 'finance.wms_valuation.v1',
      has_financial_meta: unit_cost != null || average_cost != null || lot_cost != null
    }),
    owner: 'finance_wms_valuation',
    status: 'contract_ready'
  });
}

/**
 * Project a list of WMS stock rows into valuation readiness records.
 */
export function projectWmsValuation(rows = []) {
  return rows.map((r) => extractValuationFromWmsRow(r));
}

/** Declarative availability — contract surface for consumers. */
export const WMS_VALUATION_CAPABILITY = Object.freeze({
  id: 'wms_financial_valuation',
  available: true,
  surfaces: Object.freeze([
    'economic_value',
    'average_cost',
    'lot_cost',
    'unit_cost',
    'financial_metadata'
  ]),
  integration: Object.freeze({
    consumes: 'wms_inventory quantities + optional item/balance metadata',
    publishes: 'finance.wms_valuation.v1 records',
    wmsOperationalUnchanged: true
  }),
  seedExample: Object.freeze(
    extractValuationFromWmsRow({
      id: 'seed-bal-1',
      item_id: 'item-demo-1',
      item_code: 'SKU-DEMO',
      quantity: 100,
      lot: 'Lote-01',
      warehouse_id: 'wh-1',
      metadata: {
        average_cost: 12.5,
        lot_cost: 12.8,
        currency: 'BRL'
      }
    })
  )
});

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

export function validateWmsValuation() {
  const issues = [];
  if (WMS_VALUATION_CONTRACT.mutatesWmsOperationalLogic !== false) {
    issues.push('must not mutate WMS operational logic');
  }
  if (WMS_VALUATION_CONTRACT.closesGap !== 'GAP-FD-003') {
    issues.push('must close GAP-FD-003');
  }
  if (WMS_VALUATION_CONTRACT.quantityOwner !== 'wms_inventory') {
    issues.push('quantity owner must remain wms_inventory');
  }
  if (WMS_VALUATION_CONTRACT.valuationOwner !== 'finance_wms_valuation') {
    issues.push('valuation owner must be finance adapter');
  }
  if (!WMS_VALUATION_CAPABILITY.available) issues.push('valuation capability must be available');
  const seed = WMS_VALUATION_CAPABILITY.seedExample;
  if (seed.economic_value == null || seed.average_cost == null) {
    issues.push('seed example must demonstrate economic valuation');
  }
  for (const s of ['economic_value', 'average_cost', 'lot_cost']) {
    if (!WMS_VALUATION_CAPABILITY.surfaces.includes(s)) issues.push(`missing surface ${s}`);
  }
  // Adapter must not invent qty ownership
  const projected = projectWmsValuation([
    { item_id: 'x', quantity: 10, metadata: { average_cost: 2 } }
  ]);
  if (projected[0].quantity_ref !== 10) issues.push('quantity_ref must come from WMS row');
  if (projected[0].economic_value !== 20) issues.push('economic_value projection failed');

  return {
    valid: issues.length === 0,
    issues,
    gapClosed: issues.length === 0,
    gapId: 'GAP-FD-003',
    available: WMS_VALUATION_CAPABILITY.available
  };
}
