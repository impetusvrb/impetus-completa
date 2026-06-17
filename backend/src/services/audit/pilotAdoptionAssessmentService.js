'use strict';

/**
 * M1.13 — Pilot Adoption & Domain Utilization Assessment Service
 *
 * READ ONLY · NO WRITES · NO MOCK DATA
 * Determina se blockers M1.11/M1.12 são platform_problem vs tenant_adoption_gap.
 */

const db = require('../../db');
const pilotOperation = require('./pilotOperationWindowService');
const pilotClosure = require('./pilotOperationalClosureService');

const LAYER = 'M1.13_PILOT_ADOPTION';
const PHASE = 'M1.13';

const PILOT_TENANT = pilotOperation.PILOT_TENANT;
const WINDOW_DAYS = pilotOperation.WINDOW_DAYS;

// ─── helpers ────────────────────────────────────────────────────────────────

async function _scalar(sql, params) {
  const { rows } = await db.query(sql, params || []);
  return rows[0] ?? null;
}

function _tenantMeta() {
  return { ...PILOT_TENANT };
}

async function _roleUsersWithTraces(companyId, roles, windowDays) {
  const row = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role = ANY($2::text[])
       AND t.created_at > NOW() - ($3::text || ' days')::interval`,
    [companyId, roles, String(windowDays)]
  );
  return (row?.n ?? 0) > 0;
}

function _domainAdopted(adoption) {
  return (
    adoption.runtime_available &&
    adoption.workspace_accessed &&
    adoption.real_events_generated &&
    adoption.active_users_detected
  );
}

// ─── Etapa 1 — Domain Adoption Analysis ─────────────────────────────────────

async function _executiveRuntime() {
  const z27 = require('../../../src/cognitiveRuntime/config/phaseZ27FeatureFlags');
  return (
    z27.isExecutiveCognitiveRuntimeActive() &&
    process.env.UNIFIED_DECISION_ENGINE === 'true'
  );
}

async function _financialRuntime() {
  return process.env.UNIFIED_DECISION_USE_TRIADE === 'true';
}

async function _hrRuntime() {
  const z26 = require('../../../src/cognitiveRuntime/config/phaseZ26FeatureFlags');
  return z26.isHrCognitiveRuntimeActive();
}

async function _safetyRuntime() {
  const z25 = require('../../../src/cognitiveRuntime/config/phaseZ25FeatureFlags');
  const eng = require('../../../src/domains/safety/activation/safetyActivationRolloutEngine');
  return (
    process.env.IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
    z25.isSafetyCognitiveRuntimeActive() &&
    eng.allowsDefinitivePublication(
      process.env.IMPETUS_SAFETY_ACTIVATION_STAGE,
      process.env.IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE === 'true'
    )
  );
}

async function _environmentRuntime() {
  const p1 = require('../../../src/cognitiveRuntime/config/phaseP1EnvironmentalFeatureFlags');
  const eng = require('../../../src/domains/environment/activation/environmentActivationRolloutEngine');
  return (
    process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
    p1.isEnvironmentalCognitiveRuntimeActive() &&
    eng.allowsDefinitivePublication(
      process.env.IMPETUS_ENVIRONMENT_ACTIVATION_STAGE,
      process.env.IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE === 'true'
    )
  );
}

async function _maintenanceRuntime() {
  const zm1 = require('../../../src/cognitiveRuntime/config/phaseZM1FeatureFlags');
  return (
    process.env.ENABLE_MANUIA !== 'false' &&
    process.env.ENABLE_MANUIA !== '0' &&
    zm1.isMaintenanceCognitiveRuntimeActive()
  );
}

async function assessDomainAdoption(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const execAct = await pilotOperation.assessExecutiveActivity(companyId);
  const finAct = await pilotOperation.assessFinancialActivity(companyId);
  const hrAct = await pilotOperation.assessHrActivity(companyId);
  const safetyAct = await pilotOperation.assessSafetyActivity(companyId);
  const envClose = await pilotClosure.assessEnvironmentClosure(companyId);
  const maintClose = await pilotClosure.assessMaintenanceClosure(companyId);

  const execUsers = await _roleUsersWithTraces(companyId, ['ceo', 'diretor'], WINDOW_DAYS);

  const executive = {
    runtime_available: await _executiveRuntime(),
    workspace_accessed:
      execAct.smart_summaries_generated || execAct.ceo_chat_usage_detected,
    real_events_generated: execAct.executive_queue_generating,
    active_users_detected: execUsers,
  };

  const financial = {
    runtime_available: await _financialRuntime(),
    workspace_accessed: finAct.financial_dashboard_accessed,
    real_events_generated: finAct.leakage_reports_generated,
    active_users_detected: finAct.financial_dashboard_accessed,
  };

  const hr = {
    runtime_available: await _hrRuntime(),
    workspace_accessed: hrAct.hr_dashboard_accessed,
    real_events_generated: hrAct.hr_indicators_generated,
    active_users_detected: hrAct.hr_dashboard_accessed,
  };

  const safety = {
    runtime_available: await _safetyRuntime(),
    workspace_accessed: safetyAct.safety_workspace_accessed,
    real_events_generated: safetyAct.safety_events_processed,
    active_users_detected: await _roleUsersWithTraces(
      companyId,
      ['coordenador', 'supervisor', 'gerente'],
      WINDOW_DAYS
    ),
  };

  const environment = {
    runtime_available: envClose.runtime_active,
    workspace_accessed: envClose.environment_workspace_accessed,
    real_events_generated: envClose.environment_events_processed,
    active_users_detected:
      (envClose.observation?.esg_ai_traces?.all_time ?? 0) > 0 ||
      (envClose.observation?.workspace_audit_logs?.all_time ?? 0) > 0 ||
      await _roleUsersWithTraces(companyId, ['gerente', 'diretor', 'coordenador'], WINDOW_DAYS),
  };

  const maintenance = {
    runtime_available: maintClose.manuia_runtime_active,
    workspace_accessed: maintClose.manuia_accessed,
    real_events_generated: maintClose.maintenance_events_processed,
    active_users_detected:
      (maintClose.observation?.manuia_ai_traces?.all_time ?? 0) > 0 ||
      (maintClose.observation?.workspace_audit_logs?.all_time ?? 0) > 0 ||
      await _roleUsersWithTraces(companyId, ['coordenador', 'supervisor', 'gerente'], WINDOW_DAYS),
  };

  const domains = {
    executive: { ...executive, adopted: _domainAdopted(executive) },
    financial: { ...financial, adopted: _domainAdopted(financial) },
    hr: { ...hr, adopted: _domainAdopted(hr) },
    safety: { ...safety, adopted: _domainAdopted(safety) },
    environment: { ...environment, adopted: _domainAdopted(environment) },
    maintenance: { ...maintenance, adopted: _domainAdopted(maintenance) },
  };

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    domains,
    observation_window_days: WINDOW_DAYS,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 2 — Environment Adoption ─────────────────────────────────────────

async function assessEnvironmentAdoption(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const env = await pilotClosure.assessEnvironmentClosure(companyId);

  const esgUsers = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('gerente', 'diretor', 'coordenador')
       AND (
         t.module_name ILIKE '%environment%'
         OR t.module_name ILIKE '%esg%'
       )`,
    [companyId]
  );

  const environment_runtime_available = env.runtime_active;
  const environment_users_detected =
    (esgUsers?.n ?? 0) > 0 ||
    (env.observation?.workspace_audit_logs?.all_time ?? 0) > 0 ||
    (env.observation?.esg_ai_traces?.all_time ?? 0) > 0;
  const environment_events_detected = env.environment_events_processed;

  const environment_adoption_confirmed =
    environment_runtime_available &&
    environment_users_detected &&
    environment_events_detected;

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    environment_runtime_available,
    environment_users_detected,
    environment_events_detected,
    environment_adoption_confirmed,
    reason: environment_adoption_confirmed
      ? null
      : 'tenant_not_using_environment_module',
    evidence: env.observation,
    runtime_active: env.runtime_active,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 3 — Maintenance Adoption ─────────────────────────────────────────

async function assessMaintenanceAdoption(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const maint = await pilotClosure.assessMaintenanceClosure(companyId);

  const manuiaUsers = await _scalar(
    `SELECT count(DISTINCT t.user_id)::int AS n
     FROM ai_interaction_traces t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE t.company_id = $1::uuid
       AND u.role IN ('coordenador', 'supervisor', 'gerente')
       AND (
         t.module_name ILIKE '%manu%'
         OR t.module_name ILIKE '%maintenance%'
       )`,
    [companyId]
  );

  const maintenance_runtime_available = maint.manuia_runtime_active;
  const maintenance_users_detected =
    (manuiaUsers?.n ?? 0) > 0 ||
    (maint.observation?.workspace_audit_logs?.all_time ?? 0) > 0 ||
    (maint.observation?.manuia_ai_traces?.all_time ?? 0) > 0;
  const maintenance_events_detected = maint.maintenance_events_processed;

  const maintenance_adoption_confirmed =
    maintenance_runtime_available &&
    maintenance_users_detected &&
    maintenance_events_detected;

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    maintenance_runtime_available,
    maintenance_users_detected,
    maintenance_events_detected,
    maintenance_adoption_confirmed,
    reason: maintenance_adoption_confirmed
      ? null
      : 'tenant_not_using_maintenance_module',
    evidence: maint.observation,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 4 — Pilot Utilization Index ──────────────────────────────────────

async function assessPilotUtilization(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const adoption = await assessDomainAdoption(companyId);

  const executive_usage = adoption.domains.executive.adopted;
  const financial_usage = adoption.domains.financial.adopted;
  const hr_usage = adoption.domains.hr.adopted;
  const safety_usage = adoption.domains.safety.adopted;
  const environment_usage = adoption.domains.environment.adopted;
  const maintenance_usage = adoption.domains.maintenance.adopted;

  const usageFlags = {
    executive_usage,
    financial_usage,
    hr_usage,
    safety_usage,
    environment_usage,
    maintenance_usage,
  };

  const adopted_domains = Object.values(usageFlags).filter(Boolean).length;
  const available_domains = 6;
  const pilot_utilization_index = Number(
    ((adopted_domains / available_domains) * 100).toFixed(2)
  );

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    ...usageFlags,
    adopted_domains,
    available_domains,
    pilot_utilization_index,
    domains_detail: adoption.domains,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 5 — M2 Readiness Recommendation ──────────────────────────────────

async function assessM2Recommendation(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();

  const [domains, envAdopt, maintAdopt, runtime] = await Promise.all([
    assessDomainAdoption(companyId),
    assessEnvironmentAdoption(companyId),
    assessMaintenanceAdoption(companyId),
    pilotOperation.assessRuntimeHealth(),
  ]);

  const allRuntimesAvailable = [
    domains.domains.executive.runtime_available,
    domains.domains.financial.runtime_available,
    domains.domains.hr.runtime_available,
    domains.domains.safety.runtime_available,
    domains.domains.environment.runtime_available,
    domains.domains.maintenance.runtime_available,
  ].every(Boolean);

  const platformHealthy = runtime.runtime_health_confirmed;
  const blocked_by_platform = !allRuntimesAvailable || !platformHealthy;
  const blocked_by_adoption =
    !blocked_by_platform &&
    (!envAdopt.environment_adoption_confirmed ||
      !maintAdopt.maintenance_adoption_confirmed);

  const platform_problem = blocked_by_platform;
  const tenant_adoption_gap = blocked_by_adoption;

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    platform_problem,
    tenant_adoption_gap,
    blocked_by_platform,
    blocked_by_adoption,
    all_runtimes_available: allRuntimesAvailable,
    diagnosis: platform_problem
      ? 'platform_problem'
      : tenant_adoption_gap
        ? 'tenant_adoption_gap'
        : 'pilot_fully_adopted',
    evidence: {
      all_domain_runtimes_available: allRuntimesAvailable,
      runtime_health_confirmed: platformHealthy,
      environment_adoption: envAdopt.environment_adoption_confirmed,
      maintenance_adoption: maintAdopt.maintenance_adoption_confirmed,
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Consolidated ───────────────────────────────────────────────────────────

async function runPilotAdoptionAssessment() {
  const t0 = Date.now();
  const companyId = PILOT_TENANT.company_id;

  const [domains, environment, maintenance, utilization, recommendation] =
    await Promise.all([
      assessDomainAdoption(companyId),
      assessEnvironmentAdoption(companyId),
      assessMaintenanceAdoption(companyId),
      assessPilotUtilization(companyId),
      assessM2Recommendation(companyId),
    ]);

  const allRuntimesOk = recommendation.all_runtimes_available;
  const pilot_adoption_partial = utilization.adopted_domains < utilization.available_domains;
  const m2_technical_readiness = allRuntimesOk && recommendation.evidence.runtime_health_confirmed;

  const verdict = recommendation.blocked_by_platform
    ? 'PLATFORM_NOT_READY'
    : pilot_adoption_partial
      ? 'PLATFORM_READY_ADOPTION_PENDING'
      : 'PILOT_FULLY_ADOPTED';

  const finalPass = verdict === 'PLATFORM_READY_ADOPTION_PENDING' || verdict === 'PILOT_FULLY_ADOPTED';

  console.log(
    `[${LAYER}] ${verdict} index=${utilization.pilot_utilization_index}% ` +
    `diagnosis=${recommendation.diagnosis} tenant=${companyId.slice(0, 8)} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass: finalPass,
    verdict,
    mode: 'READ_ONLY_ADOPTION_ASSESSMENT',
    ..._tenantMeta(),
    prerequisites: {
      m1_10_complete: true,
      m1_11_complete: true,
      m1_12_complete: true,
      pilot_active: true,
    },
    platform_ready: allRuntimesOk,
    pilot_adoption_partial,
    m2_technical_readiness,
    platform_problem: recommendation.platform_problem,
    tenant_adoption_gap: recommendation.tenant_adoption_gap,
    diagnosis: {
      platform_problem: recommendation.platform_problem,
      tenant_adoption_gap: recommendation.tenant_adoption_gap,
    },
    domains,
    environment,
    maintenance,
    utilization,
    recommendation,
    summary: {
      adopted_domains: utilization.adopted_domains,
      available_domains: utilization.available_domains,
      pilot_utilization_index: utilization.pilot_utilization_index,
      blocked_by_platform: recommendation.blocked_by_platform,
      blocked_by_adoption: recommendation.blocked_by_adoption,
      m2_gate_note: recommendation.blocked_by_adoption
        ? 'M2 tecnicamente viável; aguarda adopção tenant Ambiental + Manutenção'
        : recommendation.blocked_by_platform
          ? 'M2 bloqueado por problema de plataforma'
          : 'M2 pode avançar — adopção completa',
    },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PILOT_TENANT,
  assessDomainAdoption,
  assessEnvironmentAdoption,
  assessMaintenanceAdoption,
  assessPilotUtilization,
  assessM2Recommendation,
  runPilotAdoptionAssessment,
};
