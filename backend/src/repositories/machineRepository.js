'use strict';

/**
 * Equipamentos / máquinas por empresa (multi-tenant). Falhas isoladas → [].
 */
const db = require('../db');
const { isValidUUID } = require('../utils/security');

const MACHINES_OVERVIEW_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_MACHINES_LIMIT, 10) || 300, 1),
  1000
);

/**
 * @param {string} company_id
 * @returns {Promise<Array<{ id: string, name: string, line_name: string|null, source: string }>>}
 */
async function findMachinesByCompany(company_id) {
  try {
    if (!company_id) {
      return [];
    }
    const cid = String(company_id).trim();
    if (!cid || !isValidUUID(cid)) {
      return [];
    }

    try {
      const r = await db.query(
        `
        SELECT machine_identifier::text AS id,
               COALESCE(machine_name, machine_identifier::text) AS name,
               line_name
        FROM machine_monitoring_config
        WHERE company_id = $1 AND enabled = true
        ORDER BY line_name NULLS LAST, machine_identifier
        LIMIT $2
        `,
        [cid, MACHINES_OVERVIEW_LIMIT]
      );
      if (r.rows?.length) {
        return r.rows.map((row) => ({
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name != null ? String(row.line_name) : null,
          source: 'machine_monitoring_config'
        }));
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* silencioso: outras fontes */
      }
    }

    try {
      const r = await db.query(
        `
        SELECT plm.id::text AS id,
               plm.name AS name,
               pl.name AS line_name
        FROM production_line_machines plm
        JOIN production_lines pl ON pl.id = plm.line_id
        WHERE pl.company_id = $1
        ORDER BY pl.name, plm.name
        LIMIT $2
        `,
        [cid, MACHINES_OVERVIEW_LIMIT]
      );
      if (r.rows?.length) {
        return r.rows.map((row) => ({
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name != null ? String(row.line_name) : null,
          source: 'production_line_machines'
        }));
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }

    try {
      const r = await db.query(
        `
        SELECT id::text AS id,
               name,
               NULL::text AS line_name
        FROM assets
        WHERE company_id = $1 AND active = true
        ORDER BY name
        LIMIT $2
        `,
        [cid, MACHINES_OVERVIEW_LIMIT]
      );
      if (r.rows?.length) {
        return r.rows.map((row) => ({
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name,
          source: 'assets'
        }));
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }

    return [];
  } catch {
    return [];
  }
}

module.exports = {
  findMachinesByCompany
};
