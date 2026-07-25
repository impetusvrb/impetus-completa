'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * WMS-001 — Repositório base CRUD (sem regras de negócio).
 */
function createWmsRepository(db, { table, pk = 'id', tenantColumn = 'company_id' }) {
  if (!table) throw new Error('table required');

  return {
    async create(companyId, data) {
      const id = data[pk] || uuidv4();
      const row = { ...data, [pk]: id, [tenantColumn]: companyId };
      const cols = Object.keys(row);
      const vals = cols.map((_, i) => `$${i + 1}`);
      const q = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`;
      const r = await db.query(q, cols.map((c) => row[c]));
      return r.rows[0];
    },

    async findById(companyId, id) {
      const r = await db.query(
        `SELECT * FROM ${table} WHERE ${tenantColumn} = $1 AND ${pk} = $2 LIMIT 1`,
        [companyId, id]
      );
      return r.rows[0] || null;
    },

    async update(companyId, id, patch) {
      const keys = Object.keys(patch).filter((k) => k !== pk && k !== tenantColumn);
      if (keys.length === 0) return this.findById(companyId, id);
      const sets = keys.map((k, i) => `${k} = $${i + 3}`);
      const q = `UPDATE ${table} SET ${sets.join(', ')}, updated_at = COALESCE(updated_at, now()) WHERE ${tenantColumn} = $1 AND ${pk} = $2 RETURNING *`;
      const r = await db.query(q, [companyId, id, ...keys.map((k) => patch[k])]);
      return r.rows[0] || null;
    },

    async delete(companyId, id) {
      const r = await db.query(
        `DELETE FROM ${table} WHERE ${tenantColumn} = $1 AND ${pk} = $2 RETURNING ${pk}`,
        [companyId, id]
      );
      return r.rowCount > 0;
    },

    async list(companyId, { limit = 50, offset = 0 } = {}) {
      const r = await db.query(
        `SELECT * FROM ${table} WHERE ${tenantColumn} = $1 ORDER BY ${pk} DESC LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
      );
      return r.rows;
    }
  };
}

module.exports = { createWmsRepository };
