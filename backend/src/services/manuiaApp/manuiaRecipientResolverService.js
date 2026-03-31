/**
 * Roteamento de destinatários ManuIA — apenas utilizadores ativos do mesmo tenant.
 */
'use strict';

const db = require('../../db');

const MAINTENANCE_PROFILES = new Set([
  'technician_maintenance',
  'supervisor_maintenance',
  'coordinator_maintenance',
  'manager_maintenance'
]);

function maintenanceProfileWhereClause() {
  const list = [...MAINTENANCE_PROFILES].map((p) => `'${p}'`).join(', ');
  return `(u.dashboard_profile IN (${list}) OR LOWER(COALESCE(u.functional_area, '')) = 'maintenance')`;
}

/**
 * @param {string} companyId
 * @param {{ limit?: number, excludeUserIds?: string[] }} opts
 * @returns {Promise<string[]>}
 */
async function listMaintenanceUserIds(companyId, opts = {}) {
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 30, 1), 50);
  const exclude = Array.isArray(opts.excludeUserIds) ? opts.excludeUserIds.filter(Boolean) : [];

  if (exclude.length) {
    const r = await db.query(
      `SELECT u.id::text
       FROM users u
       WHERE u.company_id = $1
         AND u.active = true
         AND u.deleted_at IS NULL
         AND u.id != ALL($2::uuid[])
         AND ${maintenanceProfileWhereClause()}
       ORDER BY
         CASE u.dashboard_profile
           WHEN 'supervisor_maintenance' THEN 0
           WHEN 'coordinator_maintenance' THEN 1
           WHEN 'manager_maintenance' THEN 2
           ELSE 3
         END,
         u.name
       LIMIT $3`,
      [companyId, exclude, limit]
    );
    return (r.rows || []).map((x) => x.id);
  }

  const r2 = await db.query(
    `SELECT u.id::text
     FROM users u
     WHERE u.company_id = $1
       AND u.active = true
       AND u.deleted_at IS NULL
       AND ${maintenanceProfileWhereClause()}
     ORDER BY
       CASE u.dashboard_profile
         WHEN 'supervisor_maintenance' THEN 0
         WHEN 'coordinator_maintenance' THEN 1
         WHEN 'manager_maintenance' THEN 2
         ELSE 3
       END,
       u.name
     LIMIT $2`,
    [companyId, limit]
  );
  return (r2.rows || []).map((x) => x.id);
}

async function listSupervisorMaintenanceUserIds(companyId, opts = {}) {
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 15, 1), 30);
  const exclude = opts.excludeUserId || null;

  if (exclude) {
    const r = await db.query(
      `SELECT u.id::text
       FROM users u
       WHERE u.company_id = $1
         AND u.active = true
         AND u.deleted_at IS NULL
         AND u.id <> $3
         AND u.dashboard_profile IN (
           'supervisor_maintenance',
           'coordinator_maintenance',
           'manager_maintenance'
         )
       ORDER BY
         CASE u.dashboard_profile
           WHEN 'manager_maintenance' THEN 0
           WHEN 'coordinator_maintenance' THEN 1
           ELSE 2
         END
       LIMIT $2`,
      [companyId, limit, exclude]
    );
    return (r.rows || []).map((x) => x.id);
  }

  const r2 = await db.query(
    `SELECT u.id::text
     FROM users u
     WHERE u.company_id = $1
       AND u.active = true
       AND u.deleted_at IS NULL
       AND u.dashboard_profile IN (
         'supervisor_maintenance',
         'coordinator_maintenance',
         'manager_maintenance'
       )
     ORDER BY
       CASE u.dashboard_profile
         WHEN 'manager_maintenance' THEN 0
         WHEN 'coordinator_maintenance' THEN 1
         ELSE 2
       END
     LIMIT $2`,
    [companyId, limit]
  );
  return (r2.rows || []).map((x) => x.id);
}

module.exports = {
  listMaintenanceUserIds,
  listSupervisorMaintenanceUserIds,
  MAINTENANCE_PROFILES
};
