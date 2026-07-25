'use strict';

const db = require('../../../../db');
const { PPAP_SUBMISSION_STATUS } = require('../../../../domains/ppap/semantics/ppapCoreSemantics');
const { logPpapSignal } = require('./ppapSignalLoaderLogger');

const PPAP_DATASET_TABLES = Object.freeze([
  'ppap_submissions',
  'ppap_psw_records',
  'ppap_dimensional_results',
  'ppap_material_certifications',
  'ppap_capability_studies',
  'ppap_appearance_approvals',
  'ppap_performance_tests',
  'ppap_engineering_changes',
  'ppap_approval_history',
  'ppap_attached_documents',
  'ppap_parts',
  'ppap_suppliers',
  'ppap_customers'
]);

async function safeCount(table, companyId, extraWhere = '') {
  try {
    const where = extraWhere ? `company_id = $1 AND ${extraWhere}` : 'company_id = $1';
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${table} WHERE ${where}`, [companyId]);
    return { available: true, table, count: r.rows[0]?.c ?? 0 };
  } catch (err) {
    const msg = err?.message || '';
    if (/does not exist|relation/.test(msg)) {
      return { available: false, table, count: 0, reason: 'NO_DATASET' };
    }
    return { available: false, table, count: 0, reason: 'QUERY_ERROR', error: msg };
  }
}

async function loadSubmissionObservations(companyId) {
  const emptyStatusCounts = Object.fromEntries(
    Object.values(PPAP_SUBMISSION_STATUS).map((s) => [s, 0])
  );
  try {
    const [totalR, statusR, stageR, integrationR] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS c FROM ppap_submissions WHERE company_id = $1`, [companyId]),
      db.query(
        `SELECT status, COUNT(*)::int AS c FROM ppap_submissions WHERE company_id = $1 GROUP BY status`,
        [companyId]
      ),
      db.query(
        `SELECT workflow_stage, COUNT(*)::int AS c FROM ppap_submissions WHERE company_id = $1 GROUP BY workflow_stage`,
        [companyId]
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE quality_inspection_id IS NOT NULL)::int AS quality_inspection_refs,
           COUNT(*) FILTER (WHERE raw_material_lot_id IS NOT NULL)::int AS raw_material_lot_refs,
           COUNT(*) FILTER (WHERE raw_material_receipt_id IS NOT NULL)::int AS raw_material_receipt_refs,
           COUNT(*) FILTER (WHERE supplier_scorecard_ref IS NOT NULL)::int AS supplier_scorecard_refs,
           COUNT(*) FILTER (WHERE customer_id IS NOT NULL)::int AS with_customer
         FROM ppap_submissions WHERE company_id = $1`,
        [companyId]
      )
    ]);
    const status_counts = { ...emptyStatusCounts };
    for (const row of statusR.rows) {
      status_counts[row.status] = row.c;
    }
    const workflow_stage_counts = {};
    for (const row of stageR.rows) {
      workflow_stage_counts[row.workflow_stage] = row.c;
    }
    return {
      available: true,
      total: totalR.rows[0]?.c ?? 0,
      status_counts,
      workflow_stage_counts,
      integration_refs: integrationR.rows[0] || {}
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { available: false, total: 0, status_counts: emptyStatusCounts, workflow_stage_counts: {}, integration_refs: {} };
    }
    throw err;
  }
}

async function loadPswObservations(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE approved = true)::int AS approved_rows,
              COUNT(*) FILTER (WHERE customer_approval_required = true)::int AS customer_approval_required
       FROM ppap_psw_records WHERE company_id = $1`,
      [companyId]
    );
    return { available: true, ...(r.rows[0] || { total: 0, approved_rows: 0, customer_approval_required: 0 }) };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { available: false, total: 0, approved_rows: 0, customer_approval_required: 0 };
    }
    throw err;
  }
}

async function loadDatasetCounts(companyId) {
  const datasets = {};
  const batchSize = 4;
  for (let i = 0; i < PPAP_DATASET_TABLES.length; i += batchSize) {
    const batch = PPAP_DATASET_TABLES.slice(i, i + batchSize);
    const entries = await Promise.all(batch.map((t) => safeCount(t, companyId)));
    for (const d of entries) datasets[d.table] = d;
  }
  return datasets;
}

function buildElementObservations(datasets) {
  const pick = (table) => ({
    count: datasets[table]?.count ?? 0,
    available: datasets[table]?.available === true
  });
  return {
    dimensional: pick('ppap_dimensional_results'),
    material_certification: pick('ppap_material_certifications'),
    capability: pick('ppap_capability_studies'),
    appearance: pick('ppap_appearance_approvals'),
    performance: pick('ppap_performance_tests'),
    engineering_change: pick('ppap_engineering_changes'),
    documents: pick('ppap_attached_documents'),
    approval_history: pick('ppap_approval_history')
  };
}

/**
 * GF-003 — Carrega sinais observacionais do tenant PPAP.
 * Não decide workflow; apenas lê estado persistido no Core Domain.
 */
async function loadPpapTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return {
      ok: false,
      inactive: true,
      foundation_only: false,
      reason: 'missing_company_id',
      signal_readiness: 'NO_DATASET',
      data_sources: [],
      datasets: {},
      raw: {},
      mock_signals: false
    };
  }

  try {
    logPpapSignal('LOAD_START', { tenant_id: companyId });

    const datasets = await loadDatasetCounts(companyId);
    const data_sources = [];
    for (const d of Object.values(datasets)) {
      if (d.available && d.count > 0) data_sources.push(d.table);
    }

    const [submissions, psw] = await Promise.all([
      loadSubmissionObservations(companyId),
      loadPswObservations(companyId)
    ]);
    const elements = buildElementObservations(datasets);
    const parts = { count: datasets.ppap_parts?.count ?? 0, available: datasets.ppap_parts?.available === true };
    const suppliers = {
      count: datasets.ppap_suppliers?.count ?? 0,
      available: datasets.ppap_suppliers?.available === true
    };
    const customers = {
      count: datasets.ppap_customers?.count ?? 0,
      available: datasets.ppap_customers?.available === true
    };

    const coreAvailable = datasets.ppap_submissions?.available === true;
    const hasRecords = data_sources.length > 0;
    const signal_readiness = !coreAvailable
      ? 'NO_DATASET'
      : !hasRecords
        ? 'NO_DATASET'
        : data_sources.length >= 4
          ? 'ready'
          : 'partial';

    logPpapSignal('LOAD_COMPLETE', {
      tenant_id: companyId,
      signal_readiness,
      data_sources: data_sources.length
    });

    return {
      ok: coreAvailable,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      inactive: true,
      foundation_only: false,
      signal_readiness,
      signal_degradation: signal_readiness === 'NO_DATASET' ? 'no_tenant_data' : 'none',
      data_sources,
      datasets,
      submissions,
      psw,
      elements,
      parts,
      suppliers,
      customers,
      cross_domain: {
        integration_refs: submissions.integration_refs || {}
      },
      raw: {
        dataset_counts: Object.fromEntries(Object.entries(datasets).map(([k, v]) => [k, v.count]))
      },
      mock_signals: false
    };
  } catch (err) {
    logPpapSignal('LOAD_ERROR', { tenant_id: companyId, error: err?.message });
    return {
      ok: false,
      inactive: true,
      reason: 'signal_load_error',
      signal_readiness: 'NO_DATASET',
      error_message: err?.message,
      data_sources: [],
      datasets: {},
      raw: {},
      mock_signals: false
    };
  }
}

module.exports = { loadPpapTenantSignals, safeCount, PPAP_DATASET_TABLES };
