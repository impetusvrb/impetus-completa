'use strict';

/**
 * M1.12 — Environmental & Maintenance Operational Closure Service
 *
 * READ ONLY · NO MOCK DATA · NO SCHEMA CHANGES · NO DATA GENERATION
 * Fecha blockers M1.11 (environment + maintenance) com evidências tenant-scoped reais.
 */

const db = require('../../db');
const pilotOperation = require('./pilotOperationWindowService');

const LAYER = 'M1.12_PILOT_OPERATIONAL_CLOSURE';
const PHASE = 'M1.12';

const PILOT_TENANT = pilotOperation.PILOT_TENANT;
const WINDOW_7 = 7;
const WINDOW_30 = 30;

// ─── helpers ────────────────────────────────────────────────────────────────

async function _scalar(sql, params) {
  const { rows } = await db.query(sql, params || []);
  return rows[0] ?? null;
}

function _tenantMeta() {
  return { ...PILOT_TENANT };
}

function _allTrue(obj) {
  return Object.values(obj).every(Boolean);
}

async function _countInWindow(companyId, table, dateColumn, extraWhere, days) {
  const where = extraWhere ? ` AND (${extraWhere})` : '';
  return _scalar(
    `SELECT count(*)::int AS n,
            min(${dateColumn}) AS first_at,
            max(${dateColumn}) AS latest
     FROM ${table}
     WHERE company_id = $1::uuid${where}
       AND ${dateColumn} > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(days)]
  );
}

async function _countAllTime(companyId, table, dateColumn, extraWhere) {
  const where = extraWhere ? ` AND (${extraWhere})` : '';
  return _scalar(
    `SELECT count(*)::int AS n,
            min(${dateColumn}) AS first_at,
            max(${dateColumn}) AS latest
     FROM ${table}
     WHERE company_id = $1::uuid${where}`,
    [companyId]
  );
}

function _observationBundle(w7, w30, allTime) {
  return {
    last_7_days: {
      events_found: w7?.n ?? 0,
      first_event: w7?.first_at ?? null,
      last_event: w7?.latest ?? null,
      frequency_per_day: w7?.n ? Number((w7.n / WINDOW_7).toFixed(2)) : 0,
    },
    last_30_days: {
      events_found: w30?.n ?? 0,
      first_event: w30?.first_at ?? null,
      last_event: w30?.latest ?? null,
      frequency_per_day: w30?.n ? Number((w30.n / WINDOW_30).toFixed(2)) : 0,
    },
    all_time: {
      events_found: allTime?.n ?? 0,
      first_event: allTime?.first_at ?? null,
      last_event: allTime?.latest ?? null,
    },
  };
}

function _hasTenantEvidence(observation) {
  return (observation.all_time.events_found ?? 0) > 0;
}

// ─── Etapa 1 — Environmental Operational Validation ─────────────────────────

async function assessEnvironmentClosure(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const sources = {};

  // industrial_telemetry_samples
  sources.telemetry = {
    w7: await _countInWindow(companyId, 'industrial_telemetry_samples', 'recorded_at', null, WINDOW_7),
    w30: await _countInWindow(companyId, 'industrial_telemetry_samples', 'recorded_at', null, WINDOW_30),
    all: await _countAllTime(companyId, 'industrial_telemetry_samples', 'recorded_at', null),
  };

  // environmental IOE
  const ioeEnvFilter =
    "category ILIKE '%environment%' OR category = 'environmental_alert' OR source_type ILIKE '%environment%'";
  sources.environmental_ioe = {
    w7: await _countInWindow(companyId, 'industrial_operational_events', 'created_at', ioeEnvFilter, WINDOW_7),
    w30: await _countInWindow(companyId, 'industrial_operational_events', 'created_at', ioeEnvFilter, WINDOW_30),
    all: await _countAllTime(companyId, 'industrial_operational_events', 'created_at', ioeEnvFilter),
  };

  // industrial_audit_events (environment domain — metadata/event_type if present)
  let auditEnv = { w7: { n: 0 }, w30: { n: 0 }, all: { n: 0 } };
  try {
    const auditFilter = "domain = 'environment' OR event_type ILIKE '%environment%'";
    auditEnv = {
      w7: await _countInWindow(companyId, 'industrial_audit_events', 'recorded_at', auditFilter, WINDOW_7),
      w30: await _countInWindow(companyId, 'industrial_audit_events', 'recorded_at', auditFilter, WINDOW_30),
      all: await _countAllTime(companyId, 'industrial_audit_events', 'recorded_at', auditFilter),
    };
  } catch (_) {
    auditEnv = { w7: { n: 0 }, w30: { n: 0 }, all: { n: 0 }, note: 'industrial_audit_events query failed' };
  }

  // ESG / environment AI traces (module name)
  const esgTraces = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS n7,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS n30,
            max(created_at) AS latest
     FROM ai_interaction_traces
     WHERE company_id = $1::uuid
       AND (module_name ILIKE '%environment%' OR module_name ILIKE '%esg%')`,
    [companyId]
  );

  // audit_logs workspace usage (real access logs only)
  const envAudit = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS n7,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS n30,
            max(created_at) AS latest
     FROM audit_logs
     WHERE company_id = $1::uuid
       AND (
         description ILIKE '%environment%'
         OR description ILIKE '%esg%'
         OR action ILIKE '%environment%'
       )`,
    [companyId]
  );

  const p1 = require('../../../src/cognitiveRuntime/config/phaseP1EnvironmentalFeatureFlags');
  const envEng = require('../../../src/domains/environment/activation/environmentActivationRolloutEngine');
  const envStage = process.env.IMPETUS_ENVIRONMENT_ACTIVATION_STAGE;
  const envShadow = process.env.IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE === 'true';
  const runtimeActive =
    process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
    p1.isEnvironmentalCognitiveRuntimeActive() &&
    envEng.allowsDefinitivePublication(envStage, envShadow);

  const totalEvents =
    (sources.telemetry.all?.n ?? 0) +
    (sources.environmental_ioe.all?.n ?? 0) +
    (auditEnv.all?.n ?? 0);

  const environment_events_processed = totalEvents > 0;
  const environment_workspace_accessed =
    environment_events_processed ||
    (esgTraces?.n ?? 0) > 0 ||
    (envAudit?.n ?? 0) > 0;

  const environment_operational =
    environment_workspace_accessed &&
    environment_events_processed &&
    runtimeActive;

  const observation = {
    telemetry: _observationBundle(sources.telemetry.w7, sources.telemetry.w30, sources.telemetry.all),
    environmental_ioe: _observationBundle(
      sources.environmental_ioe.w7,
      sources.environmental_ioe.w30,
      sources.environmental_ioe.all
    ),
    industrial_audit_environment: _observationBundle(auditEnv.w7, auditEnv.w30, auditEnv.all),
    esg_ai_traces: {
      all_time: esgTraces?.n ?? 0,
      last_7_days: esgTraces?.n7 ?? 0,
      last_30_days: esgTraces?.n30 ?? 0,
      latest: esgTraces?.latest ?? null,
    },
    workspace_audit_logs: {
      all_time: envAudit?.n ?? 0,
      last_7_days: envAudit?.n7 ?? 0,
      last_30_days: envAudit?.n30 ?? 0,
      latest: envAudit?.latest ?? null,
    },
  };

  return {
    scenario: 'environment',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    environment_workspace_accessed,
    environment_events_processed,
    environment_operational,
    blocker: environment_operational ? null : 'no_tenant_environment_events',
    status: environment_operational ? 'OPERATIONAL' : 'NOT_OPERATIONAL',
    runtime_active: runtimeActive,
    observation,
    evidence: {
      tenant_scoped_event_total: totalEvents,
      sources_checked: [
        'industrial_telemetry_samples',
        'industrial_operational_events (environment/*)',
        'industrial_audit_events (environment/*)',
        'ai_interaction_traces (environment/esg modules)',
        'audit_logs (environment/esg)',
      ],
      executive_esg_runtime: process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED === 'true',
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 2 — Maintenance Operational Validation ───────────────────────────

async function assessMaintenanceClosure(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const maintIoeFilter = "category IN ('equipment_failure', 'maintenance_required')";

  const sources = {
    maintenance_ioe: {
      w7: await _countInWindow(companyId, 'industrial_operational_events', 'created_at', maintIoeFilter, WINDOW_7),
      w30: await _countInWindow(companyId, 'industrial_operational_events', 'created_at', maintIoeFilter, WINDOW_30),
      all: await _countAllTime(companyId, 'industrial_operational_events', 'created_at', maintIoeFilter),
    },
    casos_manutencao: {
      w7: await _countInWindow(companyId, 'casos_manutencao', 'created_at', null, WINDOW_7),
      w30: await _countInWindow(companyId, 'casos_manutencao', 'created_at', null, WINDOW_30),
      all: await _countAllTime(companyId, 'casos_manutencao', 'created_at', null),
    },
  };

  let preventives = { w7: { n: 0 }, w30: { n: 0 }, all: { n: 0 } };
  try {
    preventives = {
      w7: await _countInWindow(companyId, 'maintenance_preventives', 'created_at', null, WINDOW_7),
      w30: await _countInWindow(companyId, 'maintenance_preventives', 'created_at', null, WINDOW_30),
      all: await _countAllTime(companyId, 'maintenance_preventives', 'created_at', null),
    };
  } catch (_) {
    preventives = { w7: { n: 0 }, w30: { n: 0 }, all: { n: 0 } };
  }

  const manuiaTraces = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS n7,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS n30,
            max(created_at) AS latest
     FROM ai_interaction_traces
     WHERE company_id = $1::uuid
       AND (module_name ILIKE '%manu%' OR module_name ILIKE '%maintenance%')`,
    [companyId]
  );

  let actionTraces = { n: 0, n7: 0, n30: 0, latest: null };
  try {
    actionTraces = await _scalar(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS n7,
              count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS n30,
              max(created_at) AS latest
       FROM ai_action_execution_traces
       WHERE company_id = $1::uuid
         AND (action_type ILIKE '%maintenance%' OR action_type ILIKE '%manuia%')`,
      [companyId]
    );
  } catch (_) { /* table may lack columns */ }

  const maintAudit = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS n7,
            max(created_at) AS latest
     FROM audit_logs
     WHERE company_id = $1::uuid
       AND (
         description ILIKE '%manuia%'
         OR description ILIKE '%manutenc%'
         OR action ILIKE '%maintenance%'
       )`,
    [companyId]
  );

  const zm1 = require('../../../src/cognitiveRuntime/config/phaseZM1FeatureFlags');
  const manuiaEnabled = process.env.ENABLE_MANUIA !== 'false' && process.env.ENABLE_MANUIA !== '0';
  const manuiaRuntime = manuiaEnabled && zm1.isMaintenanceCognitiveRuntimeActive();

  const totalMaintEvents =
    (sources.maintenance_ioe.all?.n ?? 0) +
    (sources.casos_manutencao.all?.n ?? 0) +
    (preventives.all?.n ?? 0);

  const maintenance_events_processed = totalMaintEvents > 0;
  const manuia_accessed =
    manuiaRuntime &&
    ((manuiaTraces?.n ?? 0) > 0 || (maintAudit?.n ?? 0) > 0 || maintenance_events_processed);

  const maintenance_operational =
    manuia_accessed && maintenance_events_processed;

  const observation = {
    maintenance_ioe: _observationBundle(
      sources.maintenance_ioe.w7,
      sources.maintenance_ioe.w30,
      sources.maintenance_ioe.all
    ),
    casos_manutencao: _observationBundle(
      sources.casos_manutencao.w7,
      sources.casos_manutencao.w30,
      sources.casos_manutencao.all
    ),
    maintenance_preventives: _observationBundle(preventives.w7, preventives.w30, preventives.all),
    manuia_ai_traces: {
      all_time: manuiaTraces?.n ?? 0,
      last_7_days: manuiaTraces?.n7 ?? 0,
      last_30_days: manuiaTraces?.n30 ?? 0,
      latest: manuiaTraces?.latest ?? null,
    },
    maintenance_action_traces: {
      all_time: actionTraces?.n ?? 0,
      last_7_days: actionTraces?.n7 ?? 0,
      last_30_days: actionTraces?.n30 ?? 0,
      latest: actionTraces?.latest ?? null,
    },
    workspace_audit_logs: {
      all_time: maintAudit?.n ?? 0,
      last_7_days: maintAudit?.n7 ?? 0,
      latest: maintAudit?.latest ?? null,
    },
  };

  return {
    scenario: 'maintenance',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    manuia_accessed,
    maintenance_events_processed,
    maintenance_operational,
    blocker: maintenance_operational ? null : 'no_tenant_maintenance_events',
    status: maintenance_operational ? 'OPERATIONAL' : 'NOT_OPERATIONAL',
    manuia_runtime_active: manuiaRuntime,
    observation,
    evidence: {
      tenant_scoped_event_total: totalMaintEvents,
      sources_checked: [
        'industrial_operational_events (equipment_failure/maintenance_required)',
        'casos_manutencao',
        'maintenance_preventives',
        'ai_interaction_traces (manuia/maintenance modules)',
        'ai_action_execution_traces (maintenance actions)',
        'audit_logs (manuia/manutencao)',
      ],
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 4 — M2 Gate Recalculation ────────────────────────────────────────

async function recalculateM2Gate(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const [environment, maintenance, operationWindow] = await Promise.all([
    assessEnvironmentClosure(companyId),
    assessMaintenanceClosure(companyId),
    pilotOperation.runPilotOperationWindowAssessment(),
  ]);

  const gateCriteria = {
    executive_operational: operationWindow.executive_operational,
    financial_operational: operationWindow.financial_operational,
    hr_operational: operationWindow.hr_operational,
    safety_operational: operationWindow.safety_operational,
    environment_operational: environment.environment_operational,
    maintenance_operational: maintenance.maintenance_operational,
    tenant_activity_confirmed: operationWindow.tenant_activity_confirmed,
    runtime_health_confirmed: operationWindow.runtime_health_confirmed,
  };

  const pilot_operation_window_complete = _allTrue(gateCriteria);
  const m2_gate_open = pilot_operation_window_complete;

  const blockers = Object.entries(gateCriteria)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (!environment.environment_operational) blockers.push('no_tenant_environment_events');
  if (!maintenance.maintenance_operational) blockers.push('no_tenant_maintenance_events');

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...gateCriteria,
    pilot_operation_window_complete,
    m2_gate_open,
    m2_gate: {
      open: m2_gate_open,
      closed: !m2_gate_open,
      authorized_next_phase: m2_gate_open ? 'M2 MES Operational' : null,
    },
    blockers: [...new Set(blockers)],
    environment_closure: environment,
    maintenance_closure: maintenance,
    m1_11_baseline: {
      verdict: operationWindow.verdict,
      environment_operational_m1_11: operationWindow.environment_operational,
      maintenance_operational_m1_11: operationWindow.maintenance_operational,
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Consolidated ───────────────────────────────────────────────────────────

async function runPilotOperationalClosure() {
  const t0 = Date.now();
  const companyId = PILOT_TENANT.company_id;

  const gate = await recalculateM2Gate(companyId);
  const environment = gate.environment_closure;
  const maintenance = gate.maintenance_closure;

  const blockersClosed =
    environment.environment_operational && maintenance.maintenance_operational;
  const pass = gate.pilot_operation_window_complete === true;
  const verdict = pass
    ? 'PILOT_OPERATION_WINDOW_CLOSED'
    : 'PILOT_OPERATION_BLOCKERS_REMAIN';

  console.log(
    `[${LAYER}] ${verdict} env=${environment.environment_operational} ` +
    `maint=${maintenance.maintenance_operational} m2_gate=${gate.m2_gate_open} ` +
    `tenant=${companyId.slice(0, 8)} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    mode: 'READ_ONLY_TENANT_SCOPED_CLOSURE',
    ..._tenantMeta(),
    prerequisites: {
      m1_10_complete: true,
      m1_11_complete: true,
      pilot_active: true,
    },
    environment_operational: environment.environment_operational,
    maintenance_operational: maintenance.maintenance_operational,
    environment_blocker: environment.blocker,
    maintenance_blocker: maintenance.blocker,
    blockers_closed: blockersClosed,
    pilot_operation_window_complete: gate.pilot_operation_window_complete,
    m2_gate_open: gate.m2_gate_open,
    environment,
    maintenance,
    gate,
    summary: {
      observation_windows: { last_7_days: true, last_30_days: true },
      blockers_remaining: gate.blockers,
      criteria_met: [
        gate.executive_operational,
        gate.financial_operational,
        gate.hr_operational,
        gate.safety_operational,
        gate.environment_operational,
        gate.maintenance_operational,
        gate.tenant_activity_confirmed,
        gate.runtime_health_confirmed,
      ].filter(Boolean).length,
      criteria_total: 8,
    },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PILOT_TENANT,
  assessEnvironmentClosure,
  assessMaintenanceClosure,
  recalculateM2Gate,
  runPilotOperationalClosure,
};
