'use strict';

/**
 * WMS-002 — Legacy Adapter: único ponto autorizado de acesso a warehouse_*.
 * Core Services NÃO importam este módulo — apenas OCL.
 */

const db = require('../../../db');
const { withMeta } = require('../compatibility/contracts/canonicalContracts');

const ADAPTER_ID = 'warehouseLegacyAdapter';

function mapMaterialToItem(row, balanceQty = null) {
  return withMeta(
    {
      id: row.id,
      item_code: row.code,
      item_name: row.name,
      uom: row.unit || 'un',
      lot_controlled: false,
      legacy_material_id: row.id,
      min_stock: row.min_stock != null ? Number(row.min_stock) : null,
      quantity: balanceQty != null ? Number(balanceQty) : null
    },
    'legacy',
    'hybrid'
  );
}

function mapLocationToWarehouseLocation(row) {
  return withMeta(
    {
      id: row.id,
      warehouse_id: null,
      location_code: row.warehouse_sector || row.id,
      location_type: 'zone',
      name: row.description || row.warehouse_sector,
      legacy_location_id: row.id
    },
    'legacy',
    'hybrid'
  );
}

async function listMaterials(companyId, { limit = 100 } = {}) {
  const r = await db.query(
    `SELECT m.*, COALESCE(b.quantity, 0) AS balance_qty
     FROM warehouse_materials m
     LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
     WHERE m.company_id = $1 AND m.active = true
     ORDER BY m.code
     LIMIT $2`,
    [companyId, limit]
  );
  return (r.rows || []).map((row) => mapMaterialToItem(row, row.balance_qty));
}

async function getMaterialByCode(companyId, itemCode) {
  const r = await db.query(
    `SELECT m.*, COALESCE(b.quantity, 0) AS balance_qty
     FROM warehouse_materials m
     LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
     WHERE m.company_id = $1 AND m.code = $2
     LIMIT 1`,
    [companyId, itemCode]
  );
  return r.rows[0] ? mapMaterialToItem(r.rows[0], r.rows[0].balance_qty) : null;
}

async function listLocations(companyId, { limit = 100 } = {}) {
  const r = await db.query(
    `SELECT * FROM warehouse_locations WHERE company_id = $1 AND active = true ORDER BY warehouse_sector LIMIT $2`,
    [companyId, limit]
  );
  return (r.rows || []).map(mapLocationToWarehouseLocation);
}

async function listLegacyBalances(companyId, { limit = 100 } = {}) {
  const r = await db.query(
    `SELECT b.*, m.code AS item_code, m.name AS item_name, m.unit
     FROM warehouse_balances b
     JOIN warehouse_materials m ON m.id = b.material_id AND m.company_id = b.company_id
     WHERE b.company_id = $1
     ORDER BY m.code
     LIMIT $2`,
    [companyId, limit]
  );
  return (r.rows || []).map((row) =>
    withMeta(
      {
        id: row.id,
        item_code: row.item_code,
        item_name: row.item_name,
        quantity: Number(row.quantity || 0),
        uom: row.unit || 'un',
        legacy_material_id: row.material_id
      },
      'legacy',
      'hybrid'
    )
  );
}

async function countLegacyMaterials(companyId) {
  const r = await db.query(
    `SELECT count(*)::int AS n FROM warehouse_materials WHERE company_id = $1 AND active = true`,
    [companyId]
  );
  return r.rows[0]?.n ?? 0;
}

module.exports = {
  ADAPTER_ID,
  listMaterials,
  getMaterialByCode,
  listLocations,
  listLegacyBalances,
  countLegacyMaterials,
  mapMaterialToItem,
  mapLocationToWarehouseLocation
};
