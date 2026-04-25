'use strict';

/**
 * Eventos operacionais recentes por empresa (multi-tenant). Falhas isoladas → [].
 */
const db = require('../db');
const { isValidUUID } = require('../utils/security');

const EVENTS_OVERVIEW_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_EVENTS_LIMIT, 10) || 40, 1),
  200
);

/**
 * @param {string} company_id
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findRecentEvents(company_id) {
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
        SELECT event_type,
               machine_name,
               machine_code,
               part_code,
               severity,
               created_at
        FROM operational_events
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [cid, EVENTS_OVERVIEW_LIMIT]
      );
      if (r.rows?.length) {
        return (r.rows || []).map((row) => ({
          event_type: row.event_type,
          machine_name: row.machine_name,
          machine_code: row.machine_code,
          part_code: row.part_code,
          severity: row.severity,
          created_at: row.created_at,
          source: 'operational_events'
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
        SELECT event_type,
               machine_identifier,
               machine_name,
               severity,
               description,
               created_at
        FROM machine_detected_events
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [cid, EVENTS_OVERVIEW_LIMIT]
      );
      return (r.rows || []).map((row) => ({
        event_type: row.event_type,
        machine_identifier: row.machine_identifier,
        machine_name: row.machine_name,
        severity: row.severity,
        description: row.description,
        created_at: row.created_at,
        source: 'machine_detected_events'
      }));
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

const EVENTS_BY_MACHINE_LIMIT = Math.min(
  Math.max(parseInt(process.env.DATA_RETRIEVAL_MACHINE_EVENTS_LIMIT, 10) || 100, 1),
  300
);

/**
 * Eventos associados a uma máquina (por identificador, código ou nome), mesmas fontes que findRecentEvents.
 * @param {string} company_id
 * @param {string} machine_id — referência (UUID ou etiqueta) usada no filtro
 * @param {string|null|undefined} machineName — nome resolvido do equipamento (match adicional)
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function findEventsByMachine(company_id, machine_id, machineName) {
  const out = [];
  const cid = company_id && String(company_id).trim();
  const mid = machine_id != null ? String(machine_id).trim() : '';
  if (!cid || !isValidUUID(cid) || !mid) {
    return [];
  }
  const mname =
    machineName != null && String(machineName).trim() !== '' ? String(machineName).trim() : null;
  const limit = EVENTS_BY_MACHINE_LIMIT;

  try {
    const r = await db.query(
      `
      SELECT event_type,
             machine_name,
             machine_code,
             part_code,
             severity,
             created_at
      FROM operational_events
      WHERE company_id = $1::uuid
        AND (
          machine_code = $2
          OR machine_name = $2
          OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(machine_name, ''))) = LOWER(TRIM($3::text)))
        )
      ORDER BY created_at DESC
      LIMIT $4
      `,
      [cid, mid, mname, limit]
    );
    for (const row of r.rows || []) {
      out.push({
        event_type: row.event_type,
        machine_name: row.machine_name,
        machine_code: row.machine_code,
        part_code: row.part_code,
        severity: row.severity,
        created_at: row.created_at,
        source: 'operational_events'
      });
    }
  } catch (e) {
    if (!e.message?.includes('does not exist')) {
      /* */
    }
  }

  try {
    const r = await db.query(
      `
      SELECT event_type,
             machine_identifier,
             machine_name,
             severity,
             description,
             created_at
      FROM machine_detected_events
      WHERE company_id = $1::uuid
        AND (
          machine_identifier::text = $2
          OR machine_name = $2
          OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(machine_name, ''))) = LOWER(TRIM($3::text)))
        )
      ORDER BY created_at DESC
      LIMIT $4
      `,
      [cid, mid, mname, limit]
    );
    for (const row of r.rows || []) {
      out.push({
        event_type: row.event_type,
        machine_identifier: row.machine_identifier,
        machine_name: row.machine_name,
        severity: row.severity,
        description: row.description,
        created_at: row.created_at,
        source: 'machine_detected_events'
      });
    }
  } catch (e) {
    if (!e.message?.includes('does not exist')) {
      /* */
    }
  }

  out.sort((a, b) => {
    const ta = a && a.created_at != null ? new Date(a.created_at).getTime() : 0;
    const tb = b && b.created_at != null ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  return out.slice(0, limit);
}

module.exports = {
  findRecentEvents,
  findEventsByMachine
};
