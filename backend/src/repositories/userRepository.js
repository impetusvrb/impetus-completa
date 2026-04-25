'use strict';

/**
 * Acesso a dados — utilizadores (multi-tenant por company_id).
 */
const db = require('../db');
const { isValidUUID } = require('../utils/security');

/**
 * @param {string} company_id — UUID da empresa (obrigatório; isolamento multi-tenant)
 * @param {string} name — fragmento do nome (LIKE %name%)
 * @returns {Promise<{ id: string, name: string, role: string }|null>}
 */
async function findUserByName(company_id, name) {
  try {
    if (!company_id) {
      return null;
    }
    const cid = String(company_id).trim();
    if (!cid || !isValidUUID(cid)) {
      return null;
    }
    const raw = name != null ? String(name).trim() : '';
    if (!raw) {
      return null;
    }

    const pattern = `%${raw}%`;

    const r = await db.query(
      `
      SELECT id, name, role
      FROM users
      WHERE company_id = $1
        AND LOWER(name) LIKE LOWER($2)
      LIMIT 1
      `,
      [cid, pattern]
    );

    const row = r.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      role: row.role
    };
  } catch {
    return null;
  }
}

const USERS_OVERVIEW_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_USERS_LIMIT, 10) || 200, 1),
  500
);

/**
 * Lista utilizadores ativos da empresa (visão operacional / IA).
 * @param {string} company_id
 * @returns {Promise<Array<{ id: string, name: string, role: string, email: string|null }>>}
 */
async function findUsersByCompany(company_id) {
  try {
    if (!company_id) {
      return [];
    }
    const cid = String(company_id).trim();
    if (!cid || !isValidUUID(cid)) {
      return [];
    }

    const r = await db.query(
      `
      SELECT id, name, role, email
      FROM users
      WHERE company_id = $1 AND active = true
      ORDER BY name ASC NULLS LAST
      LIMIT $2
      `,
      [cid, USERS_OVERVIEW_LIMIT]
    );

    return (r.rows || []).map((row) => ({
      id: row.id,
      name: row.name != null ? String(row.name) : '',
      role: row.role != null ? String(row.role) : '',
      email: row.email != null ? String(row.email) : null
    }));
  } catch {
    return [];
  }
}

module.exports = {
  findUserByName,
  findUsersByCompany
};
