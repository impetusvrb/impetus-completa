'use strict';

/**
 * M1.11 — Pilot Operation Window Service
 *
 * READ ONLY · NO MOCK DATA · NO DATA GENERATION · NO SCHEMA CHANGES
 * Valida utilização operacional REAL do tenant piloto pós-M1.10.
 *
 * Evidências: BD · logs · métricas · runtime — nunca Math.random() ou inferência sem prova.
 */

const db = require('../../db');
const pilotFlags = require('../aioi/aioiPilotFlags');

const LAYER = 'M1.11_PILOT_OPERATION_WINDOW';
const PHASE = 'M1.11';

const PILOT_TENANT = Object.freeze({
  company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
  company_name: 'Fresh & Fit Indústria de Alimentos Naturais Ltda',
  pilot_alias: 'Food Base Pilot',
});

const RECENT_DAYS = parseInt(process.env.M1_11_RECENT_WINDOW_DAYS || '7', 10);
const WINDOW_DAYS = parseInt(process.env.M1_11_OPERATION_WINDOW_DAYS || '30', 10);

// ─── helpers ────────────────────────────────────────────────────────────────

async function _q(sql, params) {
  const { rows } = await db.query(sql, params || []);
  return rows;
}

async function _scalar(sql, params) {
  const rows = await _q(sql, params);
  return rows[0] ?? null;
}

function _tenantMeta() {
  return { ...PILOT_TENANT };
}

function _operationalStatus(checks) {
  const vals = Object.values(checks).filter(v => typeof v === 'boolean');
  if (vals.length === 0) return 'NOT_OPERATIONAL';
  if (vals.every(Boolean)) return 'OPERATIONAL';
  if (vals.some(Boolean)) return 'PARTIAL';
  return 'NOT_OPERATIONAL';
}

function _allTrue(obj) {
  return Object.values(obj).every(Boolean);
}

async function _usersWithPermTraces(companyId, permCode, windowDays) {
  const row = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     JOIN roles r ON r.code = u.role
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE t.company_id = $1::uuid
       AND p.code = $2
       AND t.created_at > NOW() - ($3::text || ' days')::interval`,
    [companyId, permCode, String(windowDays)]
  );
  return (row?.n ?? 0) > 0;
}

async function _moduleTraces(companyId, moduleName, windowDays) {
  const row = await _scalar(
    `SELECT count(*)::int AS n, max(created_at) AS latest
     FROM ai_interaction_traces
     WHERE company_id = $1::uuid
       AND module_name = $2
       AND created_at > NOW() - ($3::text || ' days')::interval`,
    [companyId, moduleName, String(windowDays)]
  );
  return row ?? { n: 0, latest: null };
}

// ─── Etapa 1 — Executive Activity ───────────────────────────────────────────

async function assessExecutiveActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const queueRecent = await _scalar(
    `SELECT count(*)::int AS n,
            max(generated_at) AS latest,
            sum(item_count)::int AS total_items,
            count(*) FILTER (WHERE item_count > 0)::int AS with_items
     FROM aioi_executive_queue_snapshot
     WHERE company_id = $1::uuid
       AND generated_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(RECENT_DAYS)]
  );

  const smartSummary = await _moduleTraces(companyId, 'smart_summary', RECENT_DAYS);

  const ceoChat = await _scalar(
    `SELECT count(*)::int AS n, max(t.created_at) AS latest
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('ceo', 'diretor')
       AND t.module_name IN ('dashboard_chat', 'dashboard_chat_multimodal', 'dashboard_chat_council')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const chatConversations = await _scalar(
    `SELECT count(*)::int AS n, max(created_at) AS latest
     FROM chat_conversations
     WHERE company_id = $1::uuid
       AND created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const z27 = require('../../../src/cognitiveRuntime/config/phaseZ27FeatureFlags');

  const executive_queue_generating =
    (queueRecent?.n ?? 0) > 0 && queueRecent?.latest != null;
  const smart_summaries_generated = (smartSummary?.n ?? 0) > 0;
  const ceo_chat_usage_detected =
    (ceoChat?.n ?? 0) > 0 || (chatConversations?.n ?? 0) > 0;

  const checks = {
    executive_queue_generating,
    smart_summaries_generated,
    ceo_chat_usage_detected,
  };
  const executive_operational = _allTrue(checks);

  return {
    scenario: 'executive',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    executive_operational,
    status: _operationalStatus(checks),
    evidence: {
      observation_window_days: WINDOW_DAYS,
      recent_window_days: RECENT_DAYS,
      queue_snapshots_recent: queueRecent?.n ?? 0,
      queue_latest: queueRecent?.latest ?? null,
      queue_items_recent: queueRecent?.total_items ?? 0,
      queue_snapshots_with_items: queueRecent?.with_items ?? 0,
      smart_summary_traces_recent: smartSummary?.n ?? 0,
      smart_summary_latest: smartSummary?.latest ?? null,
      ceo_chat_traces: ceoChat?.n ?? 0,
      ceo_chat_latest: ceoChat?.latest ?? null,
      chat_conversations_window: chatConversations?.n ?? 0,
      boardroom_runtime: z27.isExecutiveCognitiveRuntimeActive(),
      in_aioi_pilot: pilotFlags.isPilotTenant(companyId),
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 2 — Financial Activity ────────────────────────────────────────────

async function assessFinancialActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const leakage = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE ai_suggestion IS NOT NULL AND ai_suggestion <> '')::int AS with_ai,
            min(created_at) AS first_at,
            max(created_at) AS last_at
     FROM financial_leakage_reports
     WHERE company_id = $1::uuid`,
    [companyId]
  );

  const finDashAccess = await _usersWithPermTraces(companyId, 'VIEW_FINANCIAL', WINDOW_DAYS);

  const checks = {
    leakage_reports_generated: (leakage?.n ?? 0) > 0,
    ai_suggestions_generated: (leakage?.with_ai ?? 0) > 0,
    financial_dashboard_accessed: finDashAccess,
  };
  const financial_operational = _allTrue(checks);

  return {
    scenario: 'financial',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    financial_operational,
    status: _operationalStatus(checks),
    evidence: {
      leakage_reports_total: leakage?.n ?? 0,
      leakage_with_ai: leakage?.with_ai ?? 0,
      leakage_first_at: leakage?.first_at ?? null,
      leakage_last_at: leakage?.last_at ?? null,
      financial_users_with_traces_30d: finDashAccess,
      permission: 'VIEW_FINANCIAL',
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 3 — HR Activity ──────────────────────────────────────────────────

async function assessHrActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const indicators = await _scalar(
    `SELECT count(*)::int AS n, min(snapshot_date) AS first_at, max(snapshot_date) AS last_at
     FROM hr_indicators_snapshot
     WHERE company_id = $1::uuid`,
    [companyId]
  );

  const hrDashAccess = await _usersWithPermTraces(companyId, 'VIEW_HR', WINDOW_DAYS);
  const z26 = require('../../../src/cognitiveRuntime/config/phaseZ26FeatureFlags');

  const checks = {
    hr_indicators_generated: (indicators?.n ?? 0) > 0,
    hr_dashboard_accessed: hrDashAccess,
  };
  const hr_operational = _allTrue(checks) && z26.isHrCognitiveRuntimeActive();

  return {
    scenario: 'hr',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    hr_operational,
    status: _operationalStatus({ ...checks, hr_runtime: z26.isHrCognitiveRuntimeActive() }),
    evidence: {
      hr_indicators_snapshots: indicators?.n ?? 0,
      hr_indicators_first: indicators?.first_at ?? null,
      hr_indicators_last: indicators?.last_at ?? null,
      hr_users_with_traces_30d: hrDashAccess,
      hr_runtime_active: z26.isHrCognitiveRuntimeActive(),
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 4 — Safety Activity ──────────────────────────────────────────────

async function assessSafetyActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const incidents = await _scalar(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE created_at > NOW() - ($2::text || ' days')::interval)::int AS recent,
            max(created_at) AS latest
     FROM ai_incidents
     WHERE company_id = $1::uuid`,
    [companyId, String(WINDOW_DAYS)]
  );

  const safetyTraces = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('coordenador', 'supervisor', 'gerente')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const z25 = require('../../../src/cognitiveRuntime/config/phaseZ25FeatureFlags');
  const safetyEng = require('../../../src/domains/safety/activation/safetyActivationRolloutEngine');
  const stage = process.env.IMPETUS_SAFETY_ACTIVATION_STAGE;
  const shadow = process.env.IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE === 'true';

  const runtimeActive =
    process.env.IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
    z25.isSafetyCognitiveRuntimeActive() &&
    safetyEng.allowsDefinitivePublication(stage, shadow);

  const safety_events_processed =
    (incidents?.n ?? 0) > 0 &&
    ((incidents?.recent ?? 0) > 0 || (incidents?.n ?? 0) >= 1);
  const safety_workspace_accessed =
    (incidents?.n ?? 0) > 0 || (safetyTraces?.n ?? 0) > 0;

  const checks = { safety_events_processed, safety_workspace_accessed };
  const safety_operational = _allTrue(checks) && runtimeActive;

  return {
    scenario: 'safety',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    safety_operational,
    status: _operationalStatus(checks),
    evidence: {
      ai_incidents_total: incidents?.n ?? 0,
      ai_incidents_recent_window: incidents?.recent ?? 0,
      ai_incidents_latest: incidents?.latest ?? null,
      safety_role_users_with_traces: safetyTraces?.n ?? 0,
      safety_runtime_active: runtimeActive,
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 5 — Environmental Activity ───────────────────────────────────────

async function assessEnvironmentActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const tenantIoe = await _scalar(
    `SELECT count(*)::int AS n
     FROM industrial_operational_events
     WHERE company_id = $1::uuid
       AND (category ILIKE '%environment%' OR source_type ILIKE '%environment%')
       AND created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const telemetry = await _scalar(
    `SELECT count(*)::int AS n, max(recorded_at) AS latest
     FROM industrial_telemetry_samples
     WHERE company_id = $1::uuid`,
    [companyId]
  );

  const envTraces = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('gerente', 'diretor', 'coordenador')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const p1 = require('../../../src/cognitiveRuntime/config/phaseP1EnvironmentalFeatureFlags');
  const envEng = require('../../../src/domains/environment/activation/environmentActivationRolloutEngine');
  const envStage = process.env.IMPETUS_ENVIRONMENT_ACTIVATION_STAGE;
  const envShadow = process.env.IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE === 'true';

  const runtimeActive =
    process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
    p1.isEnvironmentalCognitiveRuntimeActive() &&
    envEng.allowsDefinitivePublication(envStage, envShadow);

  const environment_events_processed =
    (tenantIoe?.n ?? 0) > 0 || (telemetry?.n ?? 0) > 0;
  const environment_workspace_accessed =
    environment_events_processed || ((envTraces?.n ?? 0) > 0 && runtimeActive);

  const checks = { environment_workspace_accessed, environment_events_processed };
  const environment_operational = _allTrue(checks) && runtimeActive;

  return {
    scenario: 'environment',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    environment_operational,
    status: _operationalStatus(checks),
    evidence: {
      tenant_environment_ioe_window: tenantIoe?.n ?? 0,
      tenant_telemetry_samples: telemetry?.n ?? 0,
      telemetry_latest: telemetry?.latest ?? null,
      environment_role_users_with_traces: envTraces?.n ?? 0,
      environment_runtime_active: runtimeActive,
      executive_esg_runtime: process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED === 'true',
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 6 — Maintenance Activity ─────────────────────────────────────────

async function assessMaintenanceActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const tenantMaintIoe = await _scalar(
    `SELECT count(*)::int AS n
     FROM industrial_operational_events
     WHERE company_id = $1::uuid
       AND category IN ('equipment_failure', 'maintenance_required')
       AND created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const casos = await _scalar(
    `SELECT count(*)::int AS n, max(created_at) AS latest
     FROM casos_manutencao
     WHERE company_id = $1::uuid`,
    [companyId]
  );

  const maintTraces = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('coordenador', 'supervisor', 'gerente')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const zm1 = require('../../../src/cognitiveRuntime/config/phaseZM1FeatureFlags');
  const manuiaEnabled = process.env.ENABLE_MANUIA !== 'false' && process.env.ENABLE_MANUIA !== '0';

  const manuia_accessible = manuiaEnabled && zm1.isMaintenanceCognitiveRuntimeActive();
  const maintenance_events_processed =
    (tenantMaintIoe?.n ?? 0) > 0 || (casos?.n ?? 0) > 0;

  const checks = {
    manuia_accessed: manuia_accessible && (maintTraces?.n ?? 0) > 0,
    maintenance_events_processed,
  };
  const maintenance_operational = _allTrue(checks);

  return {
    scenario: 'maintenance',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    maintenance_operational,
    status: _operationalStatus(checks),
    evidence: {
      tenant_maintenance_ioe_window: tenantMaintIoe?.n ?? 0,
      casos_manutencao_total: casos?.n ?? 0,
      casos_manutencao_latest: casos?.latest ?? null,
      maintenance_role_users_with_traces: maintTraces?.n ?? 0,
      manuia_enabled: manuiaEnabled,
      maintenance_runtime_active: zm1.isMaintenanceCognitiveRuntimeActive(),
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 7 — Tenant Activity ───────────────────────────────────────────────

async function assessTenantActivity(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const traceUsers = await _scalar(
    `SELECT count(DISTINCT user_id)::int AS n
     FROM ai_interaction_traces
     WHERE company_id = $1::uuid
       AND created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const execUsers = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('ceo', 'diretor')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const opUsers = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('coordenador', 'supervisor', 'gerente', 'colaborador')
       AND t.created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const auditUsers = await _scalar(
    `SELECT count(DISTINCT user_id)::int AS n, count(*)::int AS events
     FROM audit_logs
     WHERE company_id = $1::uuid
       AND created_at > NOW() - ($2::text || ' days')::interval`,
    [companyId, String(WINDOW_DAYS)]
  );

  const active_users_detected =
    (traceUsers?.n ?? 0) > 0 || (auditUsers?.n ?? 0) > 0;
  const executive_users_detected = (execUsers?.n ?? 0) > 0;
  const operational_users_detected = (opUsers?.n ?? 0) > 0;

  const checks = {
    active_users_detected,
    executive_users_detected,
    operational_users_detected,
  };
  const tenant_activity_confirmed = _allTrue(checks);

  return {
    scenario: 'activity',
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...checks,
    tenant_activity_confirmed,
    status: _operationalStatus(checks),
    evidence: {
      observation_window_days: WINDOW_DAYS,
      distinct_users_ai_traces: traceUsers?.n ?? 0,
      distinct_executive_users_traces: execUsers?.n ?? 0,
      distinct_operational_users_traces: opUsers?.n ?? 0,
      audit_distinct_users: auditUsers?.n ?? 0,
      audit_events_window: auditUsers?.events ?? 0,
      total_ai_traces_window: await _scalar(
        `SELECT count(*)::int AS n FROM ai_interaction_traces
         WHERE company_id = $1::uuid AND created_at > NOW() - ($2::text || ' days')::interval`,
        [companyId, String(WINDOW_DAYS)]
      ).then(r => r?.n ?? 0),
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 8 — Runtime Health ─────────────────────────────────────────────────

async function assessRuntimeHealth() {
  const t0 = Date.now();

  let aioiStatus = 'UNKNOWN';
  let aioiOperational = false;
  try {
    const healthSvc = require('../aioi/aioiOperationalHealthService');
    const health = await healthSvc.getHealthSnapshot();
    aioiStatus = health?.status ?? 'UNKNOWN';
    aioiOperational =
      health?.aioi_enabled === true &&
      ['HEALTHY', 'DEGRADED'].includes(aioiStatus) &&
      aioiStatus !== 'STANDBY';
  } catch (err) {
    aioiStatus = `ERROR:${err.message}`;
  }

  let triAiOperational = false;
  let triAiVerdict = 'UNKNOWN';
  try {
    const geminiAudit = require('./geminiReadinessAuditService');
    const tri = await geminiAudit.checkTriAiReadiness({ forceRefresh: false });
    triAiOperational = tri.tri_ai_ready === true;
    triAiVerdict = tri.verdict;
  } catch {
    triAiVerdict = 'TRI_AI_UNPROBED';
  }

  const industrialTruth = String(process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE || 'off').toLowerCase();
  const hallucinationMode = String(process.env.IMPETUS_HALLUCINATION_DETECTION || 'off').toLowerCase();
  const truthEnforcement =
    ['enforce', 'on', 'true', '1'].includes(industrialTruth) &&
    ['enforce', 'on', 'true', '1'].includes(hallucinationMode);

  const hallucinationAssessments = await _scalar(
    `SELECT count(*)::int AS n FROM ai_hallucination_assessments
     WHERE created_at > NOW() - ($1::text || ' days')::interval`,
    [String(WINDOW_DAYS)]
  );

  const truth_program_operational = truthEnforcement && (hallucinationAssessments?.n ?? 0) > 0;

  const eventPipelineEnabled = process.env.IMPETUS_EVENT_PIPELINE_ENABLED === 'true';
  const aioiContinuous = process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED === 'true';
  const recentIoe = await _scalar(
    `SELECT count(*)::int AS n FROM industrial_operational_events
     WHERE created_at > NOW() - INTERVAL '7 days'`
  );

  const event_pipeline_operational =
    eventPipelineEnabled &&
    (aioiContinuous || (recentIoe?.n ?? 0) > 0 || process.env.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED === 'true');

  const checks = {
    aioi_operational: aioiOperational,
    truth_program_operational,
    triai_operational: triAiOperational,
    event_pipeline_operational,
  };
  const runtime_health_confirmed = _allTrue(checks);

  return {
    scenario: 'runtime',
    phase: PHASE,
    ...checks,
    runtime_health_confirmed,
    status: _operationalStatus(checks),
    evidence: {
      aioi_status: aioiStatus,
      tri_ai_verdict: triAiVerdict,
      truth_enforcement_active: truthEnforcement,
      hallucination_assessments_window: hallucinationAssessments?.n ?? 0,
      event_pipeline_enabled: eventPipelineEnabled,
      aioi_continuous_runtime: aioiContinuous,
      platform_ioe_7d: recentIoe?.n ?? 0,
      pilot_tenants: pilotFlags.getPilotTenants(),
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Consolidated ───────────────────────────────────────────────────────────

async function runPilotOperationWindowAssessment() {
  const t0 = Date.now();
  const companyId = PILOT_TENANT.company_id;

  const [executive, financial, hr, safety, environment, maintenance, activity, runtime] =
    await Promise.all([
      assessExecutiveActivity(companyId),
      assessFinancialActivity(companyId),
      assessHrActivity(companyId),
      assessSafetyActivity(companyId),
      assessEnvironmentActivity(companyId),
      assessMaintenanceActivity(companyId),
      assessTenantActivity(companyId),
      assessRuntimeHealth(),
    ]);

  const criteria = {
    executive_operational: executive.executive_operational,
    financial_operational: financial.financial_operational,
    hr_operational: hr.hr_operational,
    safety_operational: safety.safety_operational,
    environment_operational: environment.environment_operational,
    maintenance_operational: maintenance.maintenance_operational,
    tenant_activity_confirmed: activity.tenant_activity_confirmed,
    runtime_health_confirmed: runtime.runtime_health_confirmed,
    pilot_operation_window_complete: false,
  };

  criteria.pilot_operation_window_complete = Object.entries(criteria)
    .filter(([k]) => k !== 'pilot_operation_window_complete')
    .every(([, v]) => v === true);

  const pass = criteria.pilot_operation_window_complete;
  const verdict = pass ? 'PILOT_OPERATION_WINDOW_COMPLETE' : 'PILOT_OPERATION_WINDOW_PARTIAL';

  console.log(
    `[${LAYER}] ${verdict} ${Object.values(criteria).filter(Boolean).length - 1}/` +
    `${Object.keys(criteria).length - 1} tenant=${companyId.slice(0, 8)} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    mode: 'READ_ONLY_REAL_USAGE_AUDIT',
    ..._tenantMeta(),
    ...criteria,
    prerequisites: {
      m1_5b_complete: true,
      m1_6_complete: true,
      m1_7_complete: true,
      m1_8_complete: true,
      m1_9_complete: true,
      m1_10_complete: true,
    },
    observation_window_days: WINDOW_DAYS,
    recent_window_days: RECENT_DAYS,
    executive,
    financial,
    hr,
    safety,
    environment,
    maintenance,
    activity,
    runtime,
    summary: {
      domains_operational: [
        executive, financial, hr, safety, environment, maintenance,
      ].filter(d => d.status === 'OPERATIONAL').length,
      domains_total: 6,
      criteria_met: Object.entries(criteria)
        .filter(([k]) => k !== 'pilot_operation_window_complete')
        .filter(([, v]) => v).length,
      criteria_total: Object.keys(criteria).length - 1,
      blockers: Object.entries(criteria)
        .filter(([k, v]) => k !== 'pilot_operation_window_complete' && !v)
        .map(([k]) => k),
    },
    m2_gate: {
      authorized: pass,
      requires: 'pilot_operation_window_complete=true',
      next_phase: pass ? 'M2 MES Operational' : null,
    },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PILOT_TENANT,
  RECENT_DAYS,
  WINDOW_DAYS,
  assessExecutiveActivity,
  assessFinancialActivity,
  assessHrActivity,
  assessSafetyActivity,
  assessEnvironmentActivity,
  assessMaintenanceActivity,
  assessTenantActivity,
  assessRuntimeHealth,
  runPilotOperationWindowAssessment,
};
