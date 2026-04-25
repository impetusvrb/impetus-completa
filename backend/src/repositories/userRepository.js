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

/**
 * Perfil completo do utilizador (mesma empresa). Uma junção simples a departments para o nome do departamento.
 * @param {string} company_id
 * @param {string} user_id
 * @returns {Promise<{
 *   id: string,
 *   name: string,
 *   email: string|null,
 *   role: string,
 *   job_title: string|null,
 *   department: string|null,
 *   status: 'active'|'inactive'
 * }|null>}
 */
async function findUserProfileById(company_id, user_id) {
  try {
    if (!company_id || !user_id) {
      return null;
    }
    const cid = String(company_id).trim();
    const uid = String(user_id).trim();
    if (!isValidUUID(cid) || !isValidUUID(uid)) {
      return null;
    }

    const r = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.job_title, u.department, u.active,
             d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
      WHERE u.id = $1::uuid AND u.company_id = $2::uuid AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [uid, cid]
    );
    const row = r.rows[0];
    if (!row) {
      return null;
    }
    const dept =
      row.department_name != null && String(row.department_name).trim() !== ''
        ? String(row.department_name).trim()
        : row.department != null && String(row.department).trim() !== ''
          ? String(row.department).trim()
          : null;
    return {
      id: row.id,
      name: row.name != null ? String(row.name) : '',
      email: row.email != null ? String(row.email) : null,
      role: row.role != null ? String(row.role) : '',
      job_title: row.job_title != null ? String(row.job_title) : null,
      department: dept,
      status: row.active === false ? 'inactive' : 'active'
    };
  } catch (e) {
    try {
      const cid = String(company_id).trim();
      const uid = String(user_id).trim();
      const r2 = await db.query(
        `
        SELECT id, name, email, role, job_title, department, active
        FROM users
        WHERE id = $1::uuid AND company_id = $2::uuid AND deleted_at IS NULL
        LIMIT 1
        `,
        [uid, cid]
      );
      const row = r2.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        name: row.name != null ? String(row.name) : '',
        email: row.email != null ? String(row.email) : null,
        role: row.role != null ? String(row.role) : '',
        job_title: row.job_title != null ? String(row.job_title) : null,
        department: row.department != null ? String(row.department) : null,
        status: row.active === false ? 'inactive' : 'active'
      };
    } catch {
      return null;
    }
  }
}

module.exports = {
  findUserByName,
  findUsersByCompany,
  findUserProfileById
};
