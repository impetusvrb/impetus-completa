'use strict';

/**
 * AIOI-P2.0 — Operational View Service (READ ONLY)
 *
 * Distribuições operacionais por prioridade, categoria e status.
 */

const { isValidUUID } = require('../../utils/security');
const execMetrics = require('./aioiExecutiveMetrics');

const IOE_TABLE = 'industrial_operational_events';

async function getPriorityDistribution(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', priorities: [] };
  }

  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT priority_band, COUNT(*) AS count
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
         GROUP BY priority_band
         ORDER BY count DESC`,
        [companyId]
      );
      return result.rows || [];
    });

    return {
      ok: true,
      priorities: rows.map(r => ({
        priority_band: r.priority_band,
        count: parseInt(r.count || '0', 10)
      }))
    };
  } catch (err) {
    execMetrics.recordError(companyId, 'getPriorityDistribution', err.message);
    return { ok: false, error: err.message, priorities: [] };
  }
}

async function getCategoryDistribution(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', categories: [] };
  }

  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT category, COUNT(*) AS count
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
         GROUP BY category
         ORDER BY count DESC`,
        [companyId]
      );
      return result.rows || [];
    });

    return {
      ok: true,
      categories: rows.map(r => ({
        category: r.category,
        count: parseInt(r.count || '0', 10)
      }))
    };
  } catch (err) {
    execMetrics.recordError(companyId, 'getCategoryDistribution', err.message);
    return { ok: false, error: err.message, categories: [] };
  }
}

async function getStatusDistribution(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', statuses: [] };
  }

  try {
    const rows = await execMetrics.withTenantReadClient(companyId, async (client) => {
      const result = await execMetrics.readQuery(client,
        `SELECT status, COUNT(*) AS count
         FROM ${IOE_TABLE}
         WHERE company_id = $1::uuid
         GROUP BY status
         ORDER BY count DESC`,
        [companyId]
      );
      return result.rows || [];
    });

    return {
      ok: true,
      statuses: rows.map(r => ({
        status: r.status,
        count: parseInt(r.count || '0', 10)
      }))
    };
  } catch (err) {
    execMetrics.recordError(companyId, 'getStatusDistribution', err.message);
    return { ok: false, error: err.message, statuses: [] };
  }
}

async function getOperationalView(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const [priorities, categories, statuses] = await Promise.all([
      getPriorityDistribution(companyId),
      getCategoryDistribution(companyId),
      getStatusDistribution(companyId)
    ]);

    if (!priorities.ok || !categories.ok || !statuses.ok) {
      return { ok: false, error: 'falha ao agregar distribuições' };
    }

    const view = {
      priorities: priorities.priorities,
      categories: categories.categories,
      statuses:   statuses.statuses
    };

    execMetrics.recordOperationalViewRequested(companyId, Date.now() - startMs);
    return { ok: true, operational_view: view };

  } catch (err) {
    execMetrics.recordError(companyId, 'getOperationalView', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getOperationalView,
  getPriorityDistribution,
  getCategoryDistribution,
  getStatusDistribution
};
