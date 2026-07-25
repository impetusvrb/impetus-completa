'use strict';

const db = require('../../../../db');
const { MSA_STUDY_STATUS } = require('../../../../domains/msa/semantics/msaCoreSemantics');
const { logMsaSignal } = require('./msaSignalLoaderLogger');

const MSA_DATASET_TABLES = Object.freeze([
  'msa_measurement_studies',
  'msa_gauges',
  'msa_instruments',
  'msa_operators',
  'msa_parts',
  'msa_measurement_samples',
  'msa_variable_grr_studies',
  'msa_attribute_agreement_studies',
  'msa_bias_studies',
  'msa_linearity_studies',
  'msa_stability_studies',
  'msa_calibration_references',
  'msa_study_approvals',
  'msa_attached_documents',
  'msa_study_history',
  'msa_study_operators',
  'msa_study_parts'
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

async function loadStudyObservations(companyId) {
  const emptyStatusCounts = Object.fromEntries(
    Object.values(MSA_STUDY_STATUS).map((s) => [s, 0])
  );
  try {
    const [totalR, statusR, stageR, integrationR, typeR] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS c FROM msa_measurement_studies WHERE company_id = $1`, [companyId]),
      db.query(
        `SELECT status, COUNT(*)::int AS c FROM msa_measurement_studies WHERE company_id = $1 GROUP BY status`,
        [companyId]
      ),
      db.query(
        `SELECT workflow_stage, COUNT(*)::int AS c FROM msa_measurement_studies WHERE company_id = $1 GROUP BY workflow_stage`,
        [companyId]
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE quality_inspection_id IS NOT NULL)::int AS quality_inspection_refs,
           COUNT(*) FILTER (WHERE ppap_submission_id IS NOT NULL)::int AS ppap_submission_refs,
           COUNT(*) FILTER (WHERE ppap_capability_study_id IS NOT NULL)::int AS ppap_capability_refs,
           COUNT(*) FILTER (WHERE supplier_ref IS NOT NULL)::int AS supplier_refs,
           COUNT(*) FILTER (WHERE spc_chart_ref IS NOT NULL)::int AS spc_chart_refs,
           COUNT(*) FILTER (WHERE capability_study_ref IS NOT NULL)::int AS capability_study_refs
         FROM msa_measurement_studies WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM msa_variable_grr_studies WHERE company_id = $1) AS variable_grr,
           (SELECT COUNT(*)::int FROM msa_attribute_agreement_studies WHERE company_id = $1) AS attribute_agreement,
           (SELECT COUNT(*)::int FROM msa_bias_studies WHERE company_id = $1) AS bias,
           (SELECT COUNT(*)::int FROM msa_linearity_studies WHERE company_id = $1) AS linearity,
           (SELECT COUNT(*)::int FROM msa_stability_studies WHERE company_id = $1) AS stability`,
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
      integration_refs: integrationR.rows[0] || {},
      study_type_counts: typeR.rows[0] || {}
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return {
        available: false,
        total: 0,
        status_counts: emptyStatusCounts,
        workflow_stage_counts: {},
        integration_refs: {},
        study_type_counts: {}
      };
    }
    throw err;
  }
}

async function loadDatasetCounts(companyId) {
  const datasets = {};
  const batchSize = 4;
  for (let i = 0; i < MSA_DATASET_TABLES.length; i += batchSize) {
    const batch = MSA_DATASET_TABLES.slice(i, i + batchSize);
    const entries = await Promise.all(batch.map((t) => safeCount(t, companyId)));
    for (const d of entries) datasets[d.table] = d;
  }
  return datasets;
}

function buildStudyTypeObservations(datasets) {
  const pick = (table) => ({
    count: datasets[table]?.count ?? 0,
    available: datasets[table]?.available === true
  });
  return {
    variable_grr: pick('msa_variable_grr_studies'),
    attribute_agreement: pick('msa_attribute_agreement_studies'),
    bias: pick('msa_bias_studies'),
    linearity: pick('msa_linearity_studies'),
    stability: pick('msa_stability_studies')
  };
}

function buildSupportObservations(datasets) {
  const pick = (table) => ({
    count: datasets[table]?.count ?? 0,
    available: datasets[table]?.available === true
  });
  return {
    gauges: pick('msa_gauges'),
    instruments: pick('msa_instruments'),
    operators: pick('msa_operators'),
    parts: pick('msa_parts'),
    samples: pick('msa_measurement_samples'),
    calibration_references: pick('msa_calibration_references'),
    study_approvals: pick('msa_study_approvals'),
    attached_documents: pick('msa_attached_documents'),
    study_history: pick('msa_study_history')
  };
}

/**
 * GF-010 — Carrega sinais observacionais do tenant MSA.
 * Não decide workflow; apenas lê estado persistido no Core Domain (GF-009).
 */
async function loadMsaTenantSignals(user = {}, ctx = {}) {
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
    logMsaSignal('LOAD_START', { tenant_id: companyId });

    const datasets = await loadDatasetCounts(companyId);
    const data_sources = [];
    for (const d of Object.values(datasets)) {
      if (d.available && d.count > 0) data_sources.push(d.table);
    }

    const studies = await loadStudyObservations(companyId);
    const study_types = buildStudyTypeObservations(datasets);
    const support = buildSupportObservations(datasets);

    const coreAvailable = datasets.msa_measurement_studies?.available === true;
    const hasRecords = data_sources.length > 0;
    const signal_readiness = !coreAvailable
      ? 'NO_DATASET'
      : !hasRecords
        ? 'NO_DATASET'
        : data_sources.length >= 4
          ? 'ready'
          : 'partial';

    logMsaSignal('LOAD_COMPLETE', {
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
      studies,
      study_types,
      support,
      cross_domain: {
        integration_refs: studies.integration_refs || {}
      },
      raw: {
        dataset_counts: Object.fromEntries(Object.entries(datasets).map(([k, v]) => [k, v.count]))
      },
      mock_signals: false
    };
  } catch (err) {
    logMsaSignal('LOAD_ERROR', { tenant_id: companyId, error: err?.message });
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

module.exports = { loadMsaTenantSignals, safeCount, MSA_DATASET_TABLES };
