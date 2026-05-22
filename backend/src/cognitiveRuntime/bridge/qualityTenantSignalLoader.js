'use strict';

const db = require('../../db');
const hierarchicalFilter = require('../../services/hierarchicalFilter');

/**
 * Carrega sinais reais do tenant para engines quality (proxy NC via proposals).
 * Graceful degradation — nunca lança para o caller do dashboard.
 */
async function loadQualityTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return { ok: false, reason: 'missing_company_id', raw: {} };
  }

  try {
    const scope = ctx.hierarchy_scope || (await hierarchicalFilter.resolveHierarchyScope(user));
    const [openNc, totalProposals, sectorRows, weeklyRows, recentProposals] = await Promise.all([
      countOpenProposals(scope, companyId),
      countAllProposals(scope, companyId),
      loadNcBySector(scope, companyId),
      loadWeeklyProposalTrend(scope, companyId, 12),
      loadRecentProposalRecords(scope, companyId, 40)
    ]);

    const processValues = weeklyRows.map((r) => Number(r.total) || 0);
    const defectRates = deriveDefectRates(processValues);

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      operational: {
        open_nc: openNc,
        total_proposals: totalProposals,
        sector_breakdown: sectorRows
      },
      raw: {
        process_values: processValues,
        defect_rates: defectRates,
        spc_subgroup_means: processValues.slice(-8),
        recurrence_records: recentProposals,
        supplier_id: null,
        supplier_rows: [],
        usl: null,
        lsl: null,
        dimension_labels: sectorRows.map((s) => s.sector)
      },
      data_sources: ['proposals', 'communications_proxy']
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || 'signal_load_error',
      raw: { process_values: [], recurrence_records: [] }
    };
  }
}

async function countOpenProposals(scope, companyId) {
  return countProposals(scope, companyId, "COALESCE(p.status, '') NOT IN ('done','rejected','completed','closed')");
}

async function countAllProposals(scope, companyId) {
  return countProposals(scope, companyId, '1=1');
}

async function countProposals(scope, companyId, extraWhere) {
  if (!scope || !companyId) return 0;
  if (scope.isFullAccess) {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM proposals WHERE company_id = $1 AND ${extraWhere.replace(/p\./g, '')}`,
      [companyId]
    );
    return parseInt(r.rows[0]?.c || 0, 10);
  }
  const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
  const r = await db.query(
    `SELECT COUNT(*)::int AS c FROM proposals p WHERE ${filter.whereClause} AND ${extraWhere}`,
    filter.params
  );
  return parseInt(r.rows[0]?.c || 0, 10);
}

async function loadNcBySector(scope, companyId) {
  if (!scope || !companyId) return [];
  const baseSelect = `
    SELECT COALESCE(NULLIF(TRIM(p.department), ''), COALESCE(p.problem_category, 'geral')) AS sector,
           COUNT(*)::int AS count
    FROM proposals p
  `;
  try {
    if (scope.isFullAccess) {
      const r = await db.query(
        `${baseSelect} WHERE p.company_id = $1
         AND COALESCE(p.status, '') NOT IN ('done','rejected','completed','closed')
         GROUP BY 1 ORDER BY count DESC LIMIT 12`,
        [companyId]
      );
      return r.rows.map((row) => ({ sector: row.sector, count: row.count }));
    }
    const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
    const r = await db.query(
      `${baseSelect} WHERE ${filter.whereClause}
         AND COALESCE(p.status, '') NOT IN ('done','rejected','completed','closed')
         GROUP BY 1 ORDER BY count DESC LIMIT 12`,
      filter.params
    );
    return r.rows.map((row) => ({ sector: row.sector, count: row.count }));
  } catch {
    return [];
  }
}

async function loadWeeklyProposalTrend(scope, companyId, weeks = 12) {
  if (!scope || !companyId) return [];
  try {
    if (scope.isFullAccess) {
      const r = await db.query(
        `SELECT date_trunc('week', p.created_at) AS ts, COUNT(*)::int AS total
         FROM proposals p
         WHERE p.company_id = $1 AND p.created_at >= (current_date - ($2::int * 7))
         GROUP BY 1 ORDER BY 1`,
        [companyId, weeks]
      );
      return r.rows;
    }
    const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
    const idx = filter.params.length + 1;
    const r = await db.query(
      `SELECT date_trunc('week', p.created_at) AS ts, COUNT(*)::int AS total
       FROM proposals p
       WHERE ${filter.whereClause}
         AND p.created_at >= (current_date - ($${idx}::int * 7))
       GROUP BY 1 ORDER BY 1`,
      [...filter.params, weeks]
    );
    return r.rows;
  } catch {
    return [];
  }
}

async function loadRecentProposalRecords(scope, companyId, limit = 40) {
  if (!scope || !companyId) return [];
  try {
    let rows;
    if (scope.isFullAccess) {
      const r = await db.query(
        `SELECT id, COALESCE(department, problem_category, 'geral') AS entity_id,
                COALESCE(problem_category, 'nc') AS kind, created_at AS occurred_at
         FROM proposals
         WHERE company_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [companyId, limit]
      );
      rows = r.rows;
    } else {
      const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
      const r = await db.query(
        `SELECT p.id, COALESCE(p.department, p.problem_category, 'geral') AS entity_id,
                COALESCE(p.problem_category, 'nc') AS kind, p.created_at AS occurred_at
         FROM proposals p
         WHERE ${filter.whereClause}
         ORDER BY p.created_at DESC LIMIT $${filter.params.length + 1}`,
        [...filter.params, limit]
      );
      rows = r.rows;
    }
    return rows.map((row) => ({
      entity_type: 'proposal',
      entity_id: String(row.entity_id || row.id),
      kind: String(row.kind || 'nc'),
      occurred_at: row.occurred_at
    }));
  } catch {
    return [];
  }
}

function deriveDefectRates(processValues) {
  if (processValues.length < 2) return [];
  const max = Math.max(...processValues, 1);
  return processValues.map((v) => Math.min(1, v / max));
}

module.exports = {
  loadQualityTenantSignals
};
