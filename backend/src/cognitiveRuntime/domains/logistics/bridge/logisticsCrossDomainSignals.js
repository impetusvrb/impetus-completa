'use strict';

const db = require('../../../../db');

/**
 * INC-040 — Bridges read-only para fontes cross-domain (Quality / MP / receipts).
 * Fail-closed; nunca inventa valores.
 */

async function loadQualityInspectionBridge(companyId) {
  const empty = {
    has_data: false,
    total_inspections: 0,
    distinct_lots: 0,
    inbound_inspections: 0,
    lot_numbers: [],
    source_table: 'quality_inspections'
  };
  if (!companyId) return empty;

  try {
    const [totalR, lotsR, inboundR] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS c FROM quality_inspections WHERE company_id = $1`, [companyId]),
      db.query(
        `SELECT COUNT(DISTINCT NULLIF(TRIM(lot_number), ''))::int AS c
         FROM quality_inspections WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM quality_inspections
         WHERE company_id = $1
           AND (
             inspection_type ILIKE '%receipt%'
             OR inspection_type ILIKE '%inbound%'
             OR inspection_type ILIKE '%receb%'
             OR lot_number IS NOT NULL
           )`,
        [companyId]
      )
    ]);
    const total = totalR.rows[0]?.c ?? 0;
    const distinctLots = lotsR.rows[0]?.c ?? 0;
    const inbound = inboundR.rows[0]?.c ?? 0;
    if (total === 0) return empty;

    let lotNumbers = [];
    try {
      const lnR = await db.query(
        `SELECT DISTINCT NULLIF(TRIM(lot_number), '') AS lot_number
         FROM quality_inspections
         WHERE company_id = $1 AND lot_number IS NOT NULL AND TRIM(lot_number) <> ''
         ORDER BY lot_number
         LIMIT 40`,
        [companyId]
      );
      lotNumbers = (lnR.rows || []).map((r) => r.lot_number).filter(Boolean);
    } catch (_) {
      lotNumbers = [];
    }

    return {
      has_data: true,
      total_inspections: total,
      distinct_lots: distinctLots,
      inbound_inspections: inbound > 0 ? inbound : total,
      lot_numbers: lotNumbers,
      source_table: 'quality_inspections'
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { ...empty, available: false, reason: 'NO_DATASET' };
    }
    return empty;
  }
}

async function loadRawMaterialInventoryBridge(companyId) {
  const empty = {
    has_data: false,
    total_lots: 0,
    active_lots: 0,
    blocked_lots: 0,
    materials_distinct: 0,
    source_table: 'raw_material_lots'
  };
  if (!companyId) return empty;

  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('released', 'active'))::int AS active,
              COUNT(*) FILTER (WHERE status IN ('blocked', 'quality_risk'))::int AS blocked,
              COUNT(DISTINCT NULLIF(TRIM(material_name), ''))::int AS materials
       FROM raw_material_lots
       WHERE company_id = $1`,
      [companyId]
    );
    const total = r.rows[0]?.total ?? 0;
    if (total === 0) return empty;
    return {
      has_data: true,
      total_lots: total,
      active_lots: r.rows[0]?.active ?? 0,
      blocked_lots: r.rows[0]?.blocked ?? 0,
      materials_distinct: r.rows[0]?.materials ?? 0,
      source_table: 'raw_material_lots'
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { ...empty, available: false, reason: 'NO_DATASET' };
    }
    return empty;
  }
}

/**
 * Paridade Quality Z.20 — fornecedores via métricas, lotes MP ou recebimentos.
 */
async function loadSupplierDeliveryBridge(companyId) {
  const empty = {
    has_data: false,
    suppliers_with_data: 0,
    delivery_signals: 0,
    source_tables: []
  };
  if (!companyId) return empty;

  const sourceTables = [];
  let deliverySignals = 0;

  try {
    const metricsR = await db.query(
      `SELECT COUNT(DISTINCT supplier_name)::int AS c
       FROM supplier_quality_metrics
       WHERE company_id = $1 AND supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''`,
      [companyId]
    );
    const metricsCount = metricsR.rows[0]?.c ?? 0;
    if (metricsCount > 0) {
      sourceTables.push('supplier_quality_metrics');
      deliverySignals += metricsCount;
    }
  } catch (_) {
    /* optional table */
  }

  try {
    const lotsR = await db.query(
      `SELECT COUNT(DISTINCT supplier_name)::int AS c
       FROM raw_material_lots
       WHERE company_id = $1 AND supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''`,
      [companyId]
    );
    const lotsSuppliers = lotsR.rows[0]?.c ?? 0;
    if (lotsSuppliers > 0) {
      sourceTables.push('raw_material_lots');
      deliverySignals = Math.max(deliverySignals, lotsSuppliers);
    }
  } catch (_) {
    /* optional */
  }

  try {
    const recR = await db.query(
      `SELECT COUNT(*)::int AS c
       FROM raw_material_receipts
       WHERE company_id = $1`,
      [companyId]
    );
    const receipts = recR.rows[0]?.c ?? 0;
    if (receipts > 0) {
      sourceTables.push('raw_material_receipts');
      deliverySignals += receipts;
    }
  } catch (_) {
    /* optional */
  }

  try {
    const whSupR = await db.query(
      `SELECT COUNT(*)::int AS c FROM warehouse_suppliers
       WHERE company_id = $1 AND active = true`,
      [companyId]
    );
    const whSup = whSupR.rows[0]?.c ?? 0;
    if (whSup > 0) {
      sourceTables.push('warehouse_suppliers');
      deliverySignals = Math.max(deliverySignals, whSup);
    }
  } catch (_) {
    /* optional */
  }

  if (deliverySignals === 0) return empty;

  return {
    has_data: true,
    suppliers_with_data: deliverySignals,
    delivery_signals: deliverySignals,
    source_tables: [...new Set(sourceTables)]
  };
}

module.exports = {
  loadQualityInspectionBridge,
  loadRawMaterialInventoryBridge,
  loadSupplierDeliveryBridge
};
