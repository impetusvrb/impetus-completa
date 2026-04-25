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

module.exports = {
  findRecentEvents
};
