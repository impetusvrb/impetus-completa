'use strict';

const db = require('../../../../db');
const {
  ISHIKAWA_INVESTIGATION_STATUS,
  ISHIKAWA_WORKFLOW_STAGE,
  ISHIKAWA_INTEGRATION_REFS
} = require('../../../../domains/ishikawa/semantics/ishikawaCoreSemantics');
const { logIshikawaSignal } = require('./ishikawaSignalLoaderLogger');

const ISHIKAWA_DATASET_TABLES = Object.freeze([
  'ishikawa_root_cause_investigations',
  'ishikawa_investigation_team',
  'ishikawa_investigation_evidence',
  'ishikawa_fishbone_diagrams',
  'ishikawa_fishbone_categories',
  'ishikawa_fishbone_causes',
  'ishikawa_five_why_analyses',
  'ishikawa_five_why_steps',
  'ishikawa_corrective_actions',
  'ishikawa_preventive_actions',
  'ishikawa_verification_results',
  'ishikawa_investigation_approvals',
  'ishikawa_attached_documents',
  'ishikawa_investigation_history'
]);

const ROOT_CAUSE_REPOSITORY_STATUSES = Object.freeze([
  ISHIKAWA_INVESTIGATION_STATUS.ROOT_CAUSE_DEFINED,
  ISHIKAWA_INVESTIGATION_STATUS.ACTIONS_DEFINED,
  ISHIKAWA_INVESTIGATION_STATUS.UNDER_APPROVAL,
  ISHIKAWA_INVESTIGATION_STATUS.APPROVED,
  ISHIKAWA_INVESTIGATION_STATUS.CLOSED,
  ISHIKAWA_INVESTIGATION_STATUS.ARCHIVED
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

async function loadDatasetCounts(companyId) {
  const datasets = {};
  const batchSize = 4;
  for (let i = 0; i < ISHIKAWA_DATASET_TABLES.length; i += batchSize) {
    const batch = ISHIKAWA_DATASET_TABLES.slice(i, i + batchSize);
    const entries = await Promise.all(batch.map((t) => safeCount(t, companyId)));
    for (const d of entries) datasets[d.table] = d;
  }
  return datasets;
}

async function loadInvestigationObservations(companyId) {
  const emptyStatusCounts = Object.fromEntries(
    Object.values(ISHIKAWA_INVESTIGATION_STATUS).map((s) => [s, 0])
  );
  const emptyStageCounts = Object.fromEntries(
    Object.values(ISHIKAWA_WORKFLOW_STAGE).map((s) => [s, 0])
  );
  try {
    const integrationSelect = ISHIKAWA_INTEGRATION_REFS.map(
      (ref) => `COUNT(*) FILTER (WHERE ${ref} IS NOT NULL)::int AS ${ref}`
    ).join(',\n           ');

    const [totalR, statusR, stageR, integrationR, rootCauseR] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_root_cause_investigations WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT status, COUNT(*)::int AS c FROM ishikawa_root_cause_investigations WHERE company_id = $1 GROUP BY status`,
        [companyId]
      ),
      db.query(
        `SELECT workflow_stage, COUNT(*)::int AS c FROM ishikawa_root_cause_investigations WHERE company_id = $1 GROUP BY workflow_stage`,
        [companyId]
      ),
      db.query(
        `SELECT ${integrationSelect}
         FROM ishikawa_root_cause_investigations WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_root_cause_investigations
         WHERE company_id = $1 AND status = ANY($2::text[])`,
        [companyId, ROOT_CAUSE_REPOSITORY_STATUSES]
      )
    ]);

    const status_counts = { ...emptyStatusCounts };
    for (const row of statusR.rows) {
      status_counts[row.status] = row.c;
    }
    const workflow_stage_counts = { ...emptyStageCounts };
    for (const row of stageR.rows) {
      workflow_stage_counts[row.workflow_stage] = row.c;
    }

    return {
      available: true,
      total: totalR.rows[0]?.c ?? 0,
      status_counts,
      workflow_stage_counts,
      integration_refs: integrationR.rows[0] || {},
      root_cause_defined_count: rootCauseR.rows[0]?.c ?? 0
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return {
        available: false,
        total: 0,
        status_counts: emptyStatusCounts,
        workflow_stage_counts: emptyStageCounts,
        integration_refs: {},
        root_cause_defined_count: 0
      };
    }
    throw err;
  }
}

async function loadFishboneObservations(companyId) {
  try {
    const [diagramR, causeR, categoryR] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_fishbone_diagrams WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_fishbone_causes WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT category_key, COUNT(*)::int AS c
         FROM ishikawa_fishbone_categories WHERE company_id = $1 GROUP BY category_key`,
        [companyId]
      )
    ]);
    const category_counts = {};
    for (const row of categoryR.rows) {
      category_counts[row.category_key] = row.c;
    }
    return {
      available: true,
      diagrams: diagramR.rows[0]?.c ?? 0,
      causes: causeR.rows[0]?.c ?? 0,
      category_counts
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { available: false, diagrams: 0, causes: 0, category_counts: {} };
    }
    throw err;
  }
}

async function loadFiveWhyObservations(companyId) {
  try {
    const [analysisR, stepR] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_five_why_analyses WHERE company_id = $1`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM ishikawa_five_why_steps WHERE company_id = $1`,
        [companyId]
      )
    ]);
    return {
      available: true,
      analyses: analysisR.rows[0]?.c ?? 0,
      steps: stepR.rows[0]?.c ?? 0
    };
  } catch (err) {
    if (/does not exist|relation/.test(err?.message || '')) {
      return { available: false, analyses: 0, steps: 0 };
    }
    throw err;
  }
}

function buildSupportObservations(datasets) {
  const pick = (table) => ({
    count: datasets[table]?.count ?? 0,
    available: datasets[table]?.available === true
  });
  return {
    team: pick('ishikawa_investigation_team'),
    evidence: pick('ishikawa_investigation_evidence'),
    corrective_actions: pick('ishikawa_corrective_actions'),
    preventive_actions: pick('ishikawa_preventive_actions'),
    verification_results: pick('ishikawa_verification_results'),
    approvals: pick('ishikawa_investigation_approvals'),
    attached_documents: pick('ishikawa_attached_documents'),
    history: pick('ishikawa_investigation_history')
  };
}

function buildIntegrationAbsence(integrationRefs = {}) {
  const absent = {};
  for (const ref of ISHIKAWA_INTEGRATION_REFS) {
    absent[ref] = (integrationRefs[ref] ?? 0) === 0;
  }
  return absent;
}

/**
 * GF-017 — Carrega sinais observacionais do tenant Ishikawa (read-only).
 * Não decide workflow; apenas lê estado persistido no Core Domain (GF-016).
 */
async function loadIshikawaTenantSignals(user = {}, ctx = {}) {
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
    logIshikawaSignal('LOAD_START', { tenant_id: companyId });

    const datasets = await loadDatasetCounts(companyId);
    const data_sources = [];
    for (const d of Object.values(datasets)) {
      if (d.available && d.count > 0) data_sources.push(d.table);
    }

    const investigations = await loadInvestigationObservations(companyId);
    const fishbone = await loadFishboneObservations(companyId);
    const five_whys = await loadFiveWhyObservations(companyId);
    const support = buildSupportObservations(datasets);

    const coreAvailable = datasets.ishikawa_root_cause_investigations?.available === true;
    const hasRecords = data_sources.length > 0;
    const signal_readiness = !coreAvailable
      ? 'NO_DATASET'
      : !hasRecords
        ? 'NO_DATASET'
        : data_sources.length >= 4
          ? 'ready'
          : 'partial';

    logIshikawaSignal('LOAD_COMPLETE', {
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
      investigations,
      fishbone,
      five_whys,
      support,
      cross_domain: {
        integration_refs: investigations.integration_refs || {},
        integration_absent: buildIntegrationAbsence(investigations.integration_refs)
      },
      raw: {
        dataset_counts: Object.fromEntries(Object.entries(datasets).map(([k, v]) => [k, v.count]))
      },
      mock_signals: false
    };
  } catch (err) {
    logIshikawaSignal('LOAD_ERROR', { tenant_id: companyId, error: err?.message });
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

module.exports = {
  loadIshikawaTenantSignals,
  safeCount,
  ISHIKAWA_DATASET_TABLES
};
