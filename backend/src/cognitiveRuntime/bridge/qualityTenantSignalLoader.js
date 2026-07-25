'use strict';

const db = require('../../db');
const hierarchicalFilter = require('../../services/hierarchicalFilter');

const WEEKS_LOOKBACK = 14;
const RECURRENCE_LIMIT = 40;
const SUPPLIER_LOT_LIMIT = 40;

/**
 * Carrega sinais reais do tenant para engines quality.
 * Fontes: quality_inspections, supplier_quality_metrics, raw_material_lots,
 * raw_material_receipts, quality_indicators_snapshot, proposals (proxy NC).
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

    const [
      openNcProposals,
      totalProposals,
      sectorRowsProposals,
      weeklyProposals,
      recentProposals,
      inspectionBundle,
      supplierBundle,
      snapshotBundle
    ] = await Promise.all([
      countOpenProposals(scope, companyId),
      countAllProposals(scope, companyId),
      loadNcBySector(scope, companyId),
      loadWeeklyProposalTrend(scope, companyId, WEEKS_LOOKBACK),
      loadRecentProposalRecords(scope, companyId, RECURRENCE_LIMIT),
      loadInspectionSignalBundle(companyId, WEEKS_LOOKBACK),
      loadSupplierSignalBundle(companyId),
      loadIndicatorSnapshotSeries(companyId, WEEKS_LOOKBACK * 7)
    ]);

    const openNc = Math.max(openNcProposals, inspectionBundle.open_nc || 0);
    const totalTracked = Math.max(totalProposals, inspectionBundle.total_inspections || 0);
    const sectorRows = mergeSectorBreakdown(sectorRowsProposals, inspectionBundle.sector_breakdown);

    const processValues = buildProcessValuesSeries(
      inspectionBundle.weekly_series,
      weeklyProposals,
      snapshotBundle.weekly_series
    );
    const defectRates =
      inspectionBundle.defect_rates.length >= 4
        ? inspectionBundle.defect_rates
        : deriveDefectRates(processValues);

    const recurrenceRecords = mergeRecurrenceRecords(
      inspectionBundle.recurrence_records,
      recentProposals
    );

    const dataSources = ['proposals', 'communications_proxy'];
    if (inspectionBundle.has_data) dataSources.push('quality_inspections');
    if (supplierBundle.has_data) {
      if (supplierBundle.source_tables.includes('supplier_quality_metrics')) {
        dataSources.push('supplier_quality_metrics');
      }
      if (supplierBundle.source_tables.includes('raw_material_lots')) {
        dataSources.push('raw_material_lots');
      }
      if (supplierBundle.source_tables.includes('raw_material_receipts')) {
        dataSources.push('raw_material_receipts');
      }
    }
    if (snapshotBundle.has_data) dataSources.push('quality_indicators_snapshot');

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      operational: {
        open_nc: openNc,
        total_proposals: totalTracked,
        sector_breakdown: sectorRows,
        inspections_non_conforming: inspectionBundle.open_nc || 0
      },
      raw: {
        process_values: processValues,
        defect_rates: defectRates,
        spc_subgroup_means: processValues.slice(-8),
        recurrence_records: recurrenceRecords,
        supplier_id: supplierBundle.supplier_id,
        supplier_rows: supplierBundle.supplier_rows,
        usl: null,
        lsl: null,
        dimension_labels: sectorRows.map((s) => s.sector)
      },
      data_sources: [...new Set(dataSources)]
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || 'signal_load_error',
      raw: { process_values: [], recurrence_records: [], supplier_rows: [] }
    };
  }
}

async function loadInspectionSignalBundle(companyId, weeks = WEEKS_LOOKBACK) {
  const empty = {
    has_data: false,
    open_nc: 0,
    total_inspections: 0,
    weekly_series: [],
    sector_breakdown: [],
    recurrence_records: [],
    defect_rates: []
  };
  if (!companyId) return empty;

  try {
    const [openNcR, weeklyR, sectorR, recentR, totalR, dailyRateR] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS c FROM quality_inspections
         WHERE company_id = $1 AND result = 'non_conforming'
           AND COALESCE(TRIM(corrective_action), '') = ''`,
        [companyId]
      ),
      db.query(
        `WITH weeks AS (
           SELECT date_trunc('week', d)::date AS week_start
           FROM generate_series(
             date_trunc('week', current_date - ($2::int * 7)),
             date_trunc('week', current_date),
             '7 days'::interval
           ) AS d
         )
         SELECT w.week_start AS ts,
                COALESCE(COUNT(qi.id), 0)::int AS total,
                COALESCE(SUM(qi.defects_count), 0)::int AS defects
         FROM weeks w
         LEFT JOIN quality_inspections qi
           ON qi.company_id = $1
          AND date_trunc('week', qi.inspection_date) = w.week_start
         GROUP BY w.week_start
         ORDER BY w.week_start`,
        [companyId, weeks]
      ),
      db.query(
        `SELECT COALESCE(NULLIF(TRIM(machine_used), ''), NULLIF(TRIM(lot_number), ''), 'geral') AS sector,
                COUNT(*)::int AS count
         FROM quality_inspections
         WHERE company_id = $1 AND result = 'non_conforming'
         GROUP BY 1
         ORDER BY count DESC
         LIMIT 12`,
        [companyId]
      ),
      db.query(
        `SELECT id,
                COALESCE(NULLIF(TRIM(machine_used), ''), NULLIF(TRIM(lot_number), ''), 'geral') AS entity_id,
                COALESCE(NULLIF(TRIM(defects_description), ''), result, 'nc') AS kind,
                COALESCE(inspection_date, created_at::date) AS occurred_at
         FROM quality_inspections
         WHERE company_id = $1 AND result = 'non_conforming'
         ORDER BY inspection_date DESC, created_at DESC
         LIMIT $2`,
        [companyId, RECURRENCE_LIMIT]
      ),
      db.query(`SELECT COUNT(*)::int AS c FROM quality_inspections WHERE company_id = $1`, [companyId]),
      db.query(
        `SELECT inspection_date,
                CASE WHEN COUNT(*) > 0
                  THEN SUM(defects_count)::float / COUNT(*)
                  ELSE 0 END AS rate
         FROM quality_inspections
         WHERE company_id = $1
           AND inspection_date >= (current_date - ($2::int * 7))
         GROUP BY inspection_date
         ORDER BY inspection_date`,
        [companyId, weeks * 7]
      )
    ]);

    const totalInspections = parseInt(totalR.rows[0]?.c || 0, 10);
    const openNc = parseInt(openNcR.rows[0]?.c || 0, 10);

    return {
      has_data: totalInspections > 0,
      open_nc: openNc,
      total_inspections: totalInspections,
      weekly_series: (weeklyR.rows || []).map((row) => ({
        ts: row.ts,
        total: row.total,
        defects: row.defects,
        value: row.defects > 0 ? row.defects : row.total
      })),
      sector_breakdown: (sectorR.rows || []).map((row) => ({
        sector: row.sector,
        count: row.count
      })),
      recurrence_records: (recentR.rows || []).map((row) => ({
        entity_type: 'inspection',
        entity_id: String(row.entity_id || row.id),
        kind: String(row.kind || 'nc'),
        occurred_at: row.occurred_at
      })),
      defect_rates: (dailyRateR.rows || []).map((row) => Number(row.rate) || 0)
    };
  } catch {
    return empty;
  }
}

async function loadSupplierSignalBundle(companyId) {
  const empty = {
    has_data: false,
    supplier_id: null,
    supplier_rows: [],
    source_tables: []
  };
  if (!companyId) return empty;

  try {
    const topSupplierR = await db.query(
      `SELECT supplier_name FROM supplier_quality_metrics
       WHERE company_id = $1 AND supplier_name IS NOT NULL
       ORDER BY quality_rank ASC NULLS LAST, impact_score DESC
       LIMIT 1`,
      [companyId]
    );
    let supplierName = topSupplierR.rows[0]?.supplier_name || null;
    const sourceTables = [];
    let supplierRows = [];

    const lotsParams = [companyId];
    let lotsSql = `
      SELECT lot_code, supplier_name, defect_count, inspection_fail_count, status, created_at
      FROM raw_material_lots
      WHERE company_id = $1 AND supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''
    `;
    if (supplierName) {
      lotsParams.push(supplierName);
      lotsSql += ` AND supplier_name = $2`;
    }
    lotsSql += ` ORDER BY created_at ASC LIMIT $${lotsParams.length + 1}`;
    lotsParams.push(SUPPLIER_LOT_LIMIT);

    const lotsR = await db.query(lotsSql, lotsParams);
    if ((lotsR.rows || []).length > 0) {
      sourceTables.push('raw_material_lots');
      if (!supplierName) supplierName = lotsR.rows[0].supplier_name;
      supplierRows = lotsR.rows.map((row) => lotRowToSupplierMetric(row));
    }

    if (supplierRows.length < 2) {
      const receiptsR = await db.query(
        `SELECT supplier_name, receipt_date, inspection_result, quantity
         FROM raw_material_receipts
         WHERE company_id = $1 AND supplier_name IS NOT NULL AND TRIM(supplier_name) <> ''
         ORDER BY receipt_date ASC
         LIMIT $2`,
        [companyId, SUPPLIER_LOT_LIMIT]
      );
      if ((receiptsR.rows || []).length > 0) {
        sourceTables.push('raw_material_receipts');
        if (!supplierName) supplierName = receiptsR.rows[0].supplier_name;
        const receiptRows = receiptsR.rows
          .filter((row) => !supplierName || row.supplier_name === supplierName)
          .map((row) => receiptRowToSupplierMetric(row));
        if (receiptRows.length > supplierRows.length) {
          supplierRows = receiptRows;
        }
      }
    }

    return {
      has_data: supplierRows.length > 0,
      supplier_id: supplierName,
      supplier_rows: supplierRows,
      source_tables: [...new Set(sourceTables)]
    };
  } catch {
    return empty;
  }
}

function lotRowToSupplierMetric(row) {
  const defects = parseInt(row.defect_count || row.inspection_fail_count || 0, 10);
  const rejected = ['blocked', 'quality_risk'].includes(String(row.status || '').toLowerCase()) ? 1 : 0;
  return {
    inspected: Math.max(50, defects + 10),
    defects,
    lots: 1,
    rejected_lots: rejected
  };
}

function receiptRowToSupplierMetric(row) {
  const qty = Math.max(1, parseInt(row.quantity || 100, 10));
  const rejected = String(row.inspection_result || '').toLowerCase() === 'rejected' ? 1 : 0;
  return {
    inspected: qty,
    defects: rejected ? Math.max(1, Math.round(qty * 0.01)) : 0,
    lots: 1,
    rejected_lots: rejected
  };
}

async function loadIndicatorSnapshotSeries(companyId, days = 90) {
  const empty = { has_data: false, weekly_series: [] };
  if (!companyId) return empty;

  try {
    const r = await db.query(
      `SELECT snapshot_date, defect_index, rework_index, conformity_rate
       FROM quality_indicators_snapshot
       WHERE company_id = $1 AND snapshot_date >= (current_date - $2::int)
       ORDER BY snapshot_date ASC`,
      [companyId, days]
    );
    const rows = r.rows || [];
    if (!rows.length) return empty;

    const bucket = new Map();
    for (const row of rows) {
      const weekTs = new Date(row.snapshot_date);
      weekTs.setHours(0, 0, 0, 0);
      weekTs.setDate(weekTs.getDate() - weekTs.getDay());
      const key = weekTs.getTime();
      const value = Number(row.defect_index) || Number(row.rework_index) || 0;
      bucket.set(key, (bucket.get(key) || 0) + value);
    }

    return {
      has_data: true,
      weekly_series: [...bucket.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ts, value]) => ({ ts: new Date(ts), value }))
    };
  } catch {
    return empty;
  }
}

function buildProcessValuesSeries(inspectionWeekly = [], proposalWeekly = [], snapshotWeekly = []) {
  const bucket = new Map();

  for (const row of inspectionWeekly) {
    const key = row.ts ? new Date(row.ts).getTime() : 0;
    const val = Number(row.value ?? row.defects ?? row.total) || 0;
    bucket.set(key, val);
  }

  for (const row of proposalWeekly) {
    const key = row.ts ? new Date(row.ts).getTime() : 0;
    if (!bucket.has(key)) {
      bucket.set(key, Number(row.total) || 0);
    }
  }

  for (const row of snapshotWeekly) {
    const key = row.ts ? new Date(row.ts).getTime() : 0;
    if (!bucket.has(key)) {
      bucket.set(key, Number(row.value) || 0);
    }
  }

  return [...bucket.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

function mergeSectorBreakdown(proposalSectors = [], inspectionSectors = []) {
  const map = new Map();
  for (const row of proposalSectors) {
    const key = String(row.sector || 'geral');
    map.set(key, (map.get(key) || 0) + (Number(row.count) || 0));
  }
  for (const row of inspectionSectors) {
    const key = String(row.sector || 'geral');
    map.set(key, (map.get(key) || 0) + (Number(row.count) || 0));
  }
  return [...map.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function mergeRecurrenceRecords(inspectionRecords = [], proposalRecords = []) {
  const combined = [...inspectionRecords, ...proposalRecords];
  combined.sort((a, b) => {
    const ta = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
    const tb = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
    return tb - ta;
  });
  return combined.slice(0, RECURRENCE_LIMIT);
}

async function countOpenProposals(scope, companyId) {
  return countProposals(
    scope,
    companyId,
    "COALESCE(p.status, '') NOT IN ('done','rejected','completed','closed')"
  );
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
  loadQualityTenantSignals,
  buildProcessValuesSeries,
  mergeSectorBreakdown,
  mergeRecurrenceRecords
};
