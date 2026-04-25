'use strict';

/**
 * Ordens de serviço (work_orders) — consultas leves, sem joins; multi-tenant por company_id.
 */
const db = require('../db');
const { isValidUUID } = require('../utils/security');

const DEFAULT_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_WORK_ORDERS_LIMIT, 10) || 25, 1),
  100
);

/**
 * @param {string} company_id
 * @param {number} [limit]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findOpenWorkOrders(company_id, limit = DEFAULT_LIMIT) {
  try {
    if (!company_id || !isValidUUID(String(company_id).trim())) {
      return [];
    }
    const cid = String(company_id).trim();
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIMIT, 1), 100);
    const r = await db.query(
      `
      SELECT id, title, status, priority, machine_name, sector, type, line_name, created_at, assigned_to
      FROM work_orders
      WHERE company_id = $1::uuid
        AND status IN ('open', 'in_progress', 'waiting_parts', 'waiting_support')
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 WHEN 'high' THEN 2
          WHEN 'normal' THEN 3 ELSE 4
        END,
        created_at DESC
      LIMIT $2
      `,
      [cid, lim]
    );
    return (r.rows || []).map((row) => mapRow(row, 'open'));
  } catch (e) {
    if (e && e.message && e.message.includes('does not exist')) {
      return [];
    }
    return [];
  }
}

/**
 * Ordens recentes (qualquer status) — janela simples.
 * @param {string} company_id
 * @param {number} [limit]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findRecentWorkOrders(company_id, limit = DEFAULT_LIMIT) {
  try {
    if (!company_id || !isValidUUID(String(company_id).trim())) {
      return [];
    }
    const cid = String(company_id).trim();
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIMIT, 1), 100);
    const r = await db.query(
      `
      SELECT id, title, status, priority, machine_name, sector, type, line_name, created_at, assigned_to
      FROM work_orders
      WHERE company_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [cid, lim]
    );
    return (r.rows || []).map((row) => mapRow(row, 'recent'));
  } catch (e) {
    if (e && e.message && e.message.includes('does not exist')) {
      return [];
    }
    return [];
  }
}

/**
 * @param {object} row
 * @param {'open'|'recent'} source
 */
function mapRow(row, source) {
  return {
    id: row.id,
    title: row.title != null ? String(row.title) : '',
    status: row.status != null ? String(row.status) : '',
    priority: row.priority != null ? String(row.priority) : null,
    machine_name: row.machine_name != null ? String(row.machine_name) : null,
    sector: row.sector != null ? String(row.sector) : null,
    type: row.type != null ? String(row.type) : null,
    line_name: row.line_name != null ? String(row.line_name) : null,
    created_at: row.created_at != null ? row.created_at : null,
    assigned_to: row.assigned_to != null ? row.assigned_to : null,
    _source: source
  };
}

module.exports = {
  findOpenWorkOrders,
  findRecentWorkOrders
};
