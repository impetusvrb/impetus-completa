'use strict';

/**
 * Produtos (company_products) e eventos de lote ligados ao produto (raw_material_*).
 * Falhas de esquema → null / [].
 */
const db = require('../db');
const { isValidUUID, sanitizeSearchTerm } = require('../utils/security');

const PRODUCT_NAME_MAX = 200;
const PRODUCT_EVENTS_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_PRODUCT_EVENTS_LIMIT, 10) || 80, 1),
  200
);

/**
 * @param {unknown} v
 * @returns {string}
 */
function normalizeProductToken(v) {
  if (v == null) return '';
  return sanitizeSearchTerm(String(v), PRODUCT_NAME_MAX);
}

/**
 * @param {string} company_id
 * @param {string} productToken — nome ou código (limpo)
 * @returns {Promise<object|null>} linha mínima do produto ou null
 */
async function findProductByName(company_id, productToken) {
  try {
    const cid = String(company_id).trim();
    const token = normalizeProductToken(productToken);
    if (!isValidUUID(cid) || !token) {
      return null;
    }

    let r = await db.query(
      `
      SELECT id, name, code, category, description, active, line_id, process_id
      FROM company_products
      WHERE company_id = $1::uuid AND active = true
        AND (
          LOWER(TRIM(name)) = LOWER($2)
          OR (code IS NOT NULL AND LOWER(TRIM(code)) = LOWER($2))
        )
      LIMIT 1
      `,
      [cid, token]
    );
    if (r.rows && r.rows[0]) {
      return formatProductRow(r.rows[0]);
    }

    const like = `%${token}%`;
    r = await db.query(
      `
      SELECT id, name, code, category, description, active, line_id, process_id
      FROM company_products
      WHERE company_id = $1::uuid AND active = true
        AND (name ILIKE $2 OR (code IS NOT NULL AND code ILIKE $2))
      ORDER BY name
      LIMIT 1
      `,
      [cid, like]
    );
    if (r.rows && r.rows[0]) {
      return formatProductRow(r.rows[0]);
    }
    return null;
  } catch (e) {
    if (e && e.message && e.message.includes('does not exist')) {
      return null;
    }
    return null;
  }
}

function formatProductRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name != null ? String(row.name) : '',
    code: row.code != null ? String(row.code) : null,
    category: row.category != null ? String(row.category) : null,
    description: row.description != null ? String(row.description) : null,
    line_id: row.line_id != null ? String(row.line_id) : null,
    process_id: row.process_id != null ? String(row.process_id) : null,
    active: row.active === true
  };
}

/**
 * Eventos de lote associados ao produto (lotes com product_id).
 * @param {string} company_id
 * @param {string} productId — UUID do company_products
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findProductEvents(company_id, productId) {
  const out = [];
  const cid = String(company_id).trim();
  const pid = String(productId).trim();
  if (!isValidUUID(cid) || !isValidUUID(pid)) {
    return [];
  }
  try {
    const r = await db.query(
      `
      SELECT
        e.id,
        e.event_type,
        e.previous_status,
        e.new_status,
        e.description,
        e.ai_analysis,
        e.created_at,
        l.lot_code,
        l.status AS lot_status,
        l.status_reason AS lot_status_reason
      FROM raw_material_lot_events e
      INNER JOIN raw_material_lots l ON l.id = e.lot_id AND l.company_id = e.company_id
      WHERE e.company_id = $1::uuid
        AND l.product_id = $2::uuid
      ORDER BY e.created_at DESC
      LIMIT $3
      `,
      [cid, pid, PRODUCT_EVENTS_LIMIT]
    );
    for (const row of r.rows || []) {
      out.push({
        id: String(row.id),
        event_type: row.event_type,
        previous_status: row.previous_status,
        new_status: row.new_status,
        description: row.description,
        ai_analysis: row.ai_analysis,
        created_at: row.created_at,
        lot_code: row.lot_code,
        lot_status: row.lot_status,
        lot_status_reason: row.lot_status_reason,
        source: 'raw_material_lot_events'
      });
    }
  } catch (e) {
    if (!e.message?.includes('does not exist')) {
      /* tabela ausente */
    }
  }
  return out;
}

/**
 * Lotes vinculados ao produto (agregação de status / motivo de bloqueio).
 * @param {string} company_id
 * @param {string} productId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findLotsByProductId(company_id, productId) {
  const cid = String(company_id).trim();
  const pid = String(productId).trim();
  if (!isValidUUID(cid) || !isValidUUID(pid)) {
    return [];
  }
  try {
    const r = await db.query(
      `
      SELECT id, lot_code, material_name, status, status_reason, risk_score, updated_at, blocked_at
      FROM raw_material_lots
      WHERE company_id = $1::uuid AND product_id = $2::uuid
      ORDER BY updated_at DESC
      LIMIT 40
      `,
      [cid, pid]
    );
    return (r.rows || []).map((row) => ({
      id: String(row.id),
      lot_code: row.lot_code,
      material_name: row.material_name,
      status: row.status,
      status_reason: row.status_reason,
      risk_score: row.risk_score,
      updated_at: row.updated_at,
      blocked_at: row.blocked_at
    }));
  } catch (e) {
    if (!e.message?.includes('does not exist')) {
      /* */
    }
    return [];
  }
}

module.exports = {
  findProductByName,
  findProductEvents,
  findLotsByProductId,
  normalizeProductToken
};
