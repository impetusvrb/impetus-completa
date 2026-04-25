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

const MACHINE_ID_LOOKUP_MAX = 96;

/**
 * Identificador seguro para lookup (UUID ou etiqueta operacional; só caracteres seguros em tags).
 * @param {string} id
 * @returns {boolean}
 */
function isAllowedMachineIdToken(id) {
  if (id == null || typeof id !== 'string') return false;
  const t = id.trim();
  if (!t || t.length > MACHINE_ID_LOOKUP_MAX) return false;
  if (isValidUUID(t)) return true;
  return /^[A-Za-z0-9._-]+$/.test(t);
}

/**
 * Uma máquina por id ou nome (tentativas estilo findMachinesByCompany, ordem alinhada).
 * @param {string} company_id
 * @param {string} machine_id — UUID, identificador em monitoramento ou referência a nome
 * @returns {Promise<{ id: string, name: string, line_name: string|null, source: string }|null>}
 */
async function findMachineById(company_id, machine_id) {
  try {
    if (!company_id || !machine_id) {
      return null;
    }
    const cid = String(company_id).trim();
    const mid = String(machine_id).trim();
    if (!isValidUUID(cid) || !isAllowedMachineIdToken(mid)) {
      return null;
    }

    const tryFromMonitoring = async () => {
      const r = await db.query(
        `
        SELECT machine_identifier::text AS id,
               COALESCE(machine_name, machine_identifier::text) AS name,
               line_name
        FROM machine_monitoring_config
        WHERE company_id = $1::uuid AND enabled = true
          AND (
            machine_identifier::text = $2
            OR LOWER(TRIM(COALESCE(machine_name, ''))) = LOWER($2)
          )
        LIMIT 1
        `,
        [cid, mid]
      );
      const row = r.rows && r.rows[0];
      if (row) {
        return {
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name != null ? String(row.line_name) : null,
          source: 'machine_monitoring_config'
        };
      }
      return null;
    };

    const tryFromPlm = async () => {
      if (!isValidUUID(mid)) {
        return null;
      }
      const r = await db.query(
        `
        SELECT plm.id::text AS id,
               plm.name AS name,
               pl.name AS line_name
        FROM production_line_machines plm
        JOIN production_lines pl ON pl.id = plm.line_id
        WHERE pl.company_id = $1::uuid AND plm.id = $2::uuid
        LIMIT 1
        `,
        [cid, mid]
      );
      const row = r.rows && r.rows[0];
      if (row) {
        return {
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name != null ? String(row.line_name) : null,
          source: 'production_line_machines'
        };
      }
      return null;
    };

    const tryFromPlmByName = async () => {
      const r = await db.query(
        `
        SELECT plm.id::text AS id,
               plm.name AS name,
               pl.name AS line_name
        FROM production_line_machines plm
        JOIN production_lines pl ON pl.id = plm.line_id
        WHERE pl.company_id = $1::uuid
          AND LOWER(TRIM(plm.name)) = LOWER($2)
        LIMIT 1
        `,
        [cid, mid]
      );
      const row = r.rows && r.rows[0];
      if (row) {
        return {
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: row.line_name != null ? String(row.line_name) : null,
          source: 'production_line_machines'
        };
      }
      return null;
    };

    const tryFromAssets = async () => {
      if (isValidUUID(mid)) {
        const r = await db.query(
          `
          SELECT id::text AS id, name, NULL::text AS line_name
          FROM assets
          WHERE company_id = $1::uuid AND id = $2::uuid AND active = true
          LIMIT 1
          `,
          [cid, mid]
        );
        const row = r.rows && r.rows[0];
        if (row) {
          return {
            id: String(row.id),
            name: String(row.name || row.id),
            line_name: null,
            source: 'assets'
          };
        }
      }
      const r = await db.query(
        `
        SELECT id::text AS id, name, NULL::text AS line_name
        FROM assets
        WHERE company_id = $1::uuid AND active = true
          AND LOWER(TRIM(name)) = LOWER($2)
        LIMIT 1
        `,
        [cid, mid]
      );
      const row = r.rows && r.rows[0];
      if (row) {
        return {
          id: String(row.id),
          name: String(row.name || row.id),
          line_name: null,
          source: 'assets'
        };
      }
      return null;
    };

    let found = null;
    try {
      found = await tryFromMonitoring();
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }
    if (found) return found;

    try {
      found = await tryFromPlm();
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }
    if (found) return found;

    try {
      found = await tryFromPlmByName();
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }
    if (found) return found;

    try {
      found = await tryFromAssets();
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        /* */
      }
    }
    return found;
  } catch {
    return null;
  }
}

module.exports = {
  findMachinesByCompany,
  findMachineById,
  isAllowedMachineIdToken
};
