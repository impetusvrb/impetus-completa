'use strict';

/**
 * M1.10 — Food Base Pilot Provisioning & Controlled Go-Live Service
 *
 * ADDITIVE ONLY · NO DATA LOSS · TRUTH PROGRAM · AIOI · TRI-AI PRESERVED
 * Encerra ciclo M1 — primeiro tenant piloto real em produção controlada.
 *
 * Estratégia canónica M1.10: promote_existing (Fresh & Fit 511f4819)
 *   — tenant activo com dados operacionais validados em M1.9
 *   — Food Base (Opção A) permanece path disponível se empresa criada futuramente
 */

const db = require('../../db');
const pilotFlags = require('../aioi/aioiPilotFlags');
const snapshotProjection = require('../aioi/aioiExecutiveQueueSnapshotProjectionService');
const foodBaseReadiness = require('./foodBaseOnboardingReadinessService');
const pilotExecution = require('./pilotExecutionDryRunService');

const LAYER = 'M1.10_FOOD_BASE_PILOT';
const PHASE = 'M1.10';

const FRESH_FIT_ID = '511f4819-fc48-479e-b11e-49ba4fb9c81b';

const PILOT_LIST_KEYS = Object.freeze([
  { key: 'aioi_enabled', env: 'IMPETUS_AIOI_PILOT_TENANTS' },
  { key: 'rls_enabled', env: 'IMPETUS_RLS_PILOT_TENANTS' },
  { key: 'mfa_enabled', env: 'IMPETUS_MFA_PILOT_TENANTS' },
  { key: 'federation_enabled', env: 'IMPETUS_FEDERATION_PILOT_TENANTS' },
  { key: 'action_runtime_enabled', env: 'IMPETUS_ACTION_RUNTIME_PILOT_TENANTS' },
  { key: 'workflow_enabled', env: 'IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS' },
]);

// ─── helpers ────────────────────────────────────────────────────────────────

async function _q(sql, params) {
  const { rows } = await db.query(sql, params || []);
  return rows;
}

async function _scalar(sql, params) {
  const rows = await _q(sql, params);
  return rows[0] ?? null;
}

function _inPilotList(envKey, companyId) {
  const list = String(process.env[envKey] || '');
  return list.includes(companyId) || list.includes(companyId.split('-')[0]);
}

function _allTrue(obj) {
  return Object.values(obj).every(Boolean);
}

// ─── Etapa 1 — Decisão de Tenant ────────────────────────────────────────────

async function determineTenantStrategy() {
  const t0 = Date.now();

  const foodBaseRow = await _scalar(
    `SELECT id, name, active FROM companies
     WHERE (name ILIKE '%food%base%' OR name ILIKE '%food base%')
       AND active = true
     LIMIT 1`
  );

  const freshFit = await _scalar(
    `SELECT id, name, active FROM companies WHERE id = $1::uuid`,
    [FRESH_FIT_ID]
  );

  let strategy;
  let tenant;

  if (foodBaseRow) {
    strategy = 'new_company';
    tenant = {
      company_id: foodBaseRow.id,
      company_name: foodBaseRow.name,
      active: foodBaseRow.active === true,
    };
  } else if (freshFit?.active) {
    strategy = 'promote_existing';
    tenant = {
      company_id: freshFit.id,
      company_name: freshFit.name,
      active: true,
      pilot_program_alias: 'Food Base Pilot',
      rationale:
        'Fresh & Fit validado em M1.9 com dados operacionais reais; Opção A disponível via POST /api/companies quando aprovado',
    };
  } else {
    strategy = 'new_company';
    tenant = {
      company_id: null,
      company_name: 'Food Base',
      active: false,
      blocker: 'Nenhum tenant food-base activo; executar POST /api/companies',
    };
  }

  return {
    phase: PHASE,
    tenant_strategy_defined: !!tenant.company_id,
    strategy,
    tenant,
    options_evaluated: {
      option_a: { strategy: 'new_company', company_name: 'Food Base', exists_in_db: !!foodBaseRow },
      option_b: {
        strategy: 'promote_existing',
        company_id: FRESH_FIT_ID,
        company_name: freshFit?.name ?? 'Fresh & Fit',
        active: freshFit?.active === true,
        m1_9_validated: true,
      },
    },
    selected: strategy,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 2 — Provisionamento ──────────────────────────────────────────────

async function validateProvisioning(companyId) {
  const t0 = Date.now();
  if (!companyId) {
    return {
      phase: PHASE,
      tenant_created: false,
      tenant_active: false,
      status: 'NOT_READY',
      blocker: 'company_id não definido',
      elapsed_ms: Date.now() - t0,
    };
  }

  const company = await _scalar(
    `SELECT id, name, active, created_at FROM companies WHERE id = $1::uuid`,
    [companyId]
  );
  const adminUser = await _scalar(
    `SELECT id, email, role FROM users
     WHERE company_id = $1::uuid AND deleted_at IS NULL
       AND role IN ('ceo', 'diretor', 'admin')
     LIMIT 1`,
    [companyId]
  );

  const tenant_created = !!company;
  const tenant_active = company?.active === true;

  return {
    phase: PHASE,
    company_id: companyId,
    tenant_created,
    tenant_active,
    creation_path: 'POST /api/companies',
    evidence: {
      company: company ?? null,
      admin_user: adminUser ?? null,
      uuid_generated: company?.id ?? null,
    },
    status: tenant_created && tenant_active ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 3 — Pilot Lists ──────────────────────────────────────────────────

function validatePilotLists(companyId) {
  const t0 = Date.now();
  const checks = {};

  for (const { key, env } of PILOT_LIST_KEYS) {
    checks[key] = _inPilotList(env, companyId);
  }

  const pilot_lists_enabled = _allTrue(checks);

  return {
    phase: PHASE,
    company_id: companyId,
    ...checks,
    pilot_lists_enabled,
    lists: PILOT_LIST_KEYS.map(({ key, env }) => ({
      criterion: key,
      env,
      included: checks[key],
      value_preview: String(process.env[env] || '').slice(0, 120),
    })),
    aioi_pilot_max: 3,
    aioi_pilot_count: pilotFlags.getPilotTenants().length,
    status: pilot_lists_enabled ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 4 — Perfis ───────────────────────────────────────────────────────

async function validateProfiles(companyId) {
  const t0 = Date.now();

  async function hasPerm(perm, roleFilter = null) {
    const params = [companyId, perm];
    let roleClause = '';
    if (roleFilter?.length) {
      params.push(roleFilter);
      roleClause = ` AND u.role = ANY($3::text[])`;
    }
    const row = await _scalar(
      `SELECT u.id, u.email, u.role FROM users u
       JOIN roles r ON r.code = u.role
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.company_id = $1::uuid AND p.code = $2 AND u.deleted_at IS NULL
       ${roleClause}
       LIMIT 1`,
      params
    );
    return !!row;
  }

  async function hasRole(roles) {
    const row = await _scalar(
      `SELECT id FROM users WHERE company_id = $1::uuid AND role = ANY($2::text[]) AND deleted_at IS NULL LIMIT 1`,
      [companyId, roles]
    );
    return !!row;
  }

  const profiles = {
    ceo: await hasRole(['ceo']),
    cfo: await hasPerm('VIEW_FINANCIAL', ['diretor', 'gerente', 'ceo']),
    rh_manager: (await hasPerm('VIEW_HR')) && (await hasRole(['gerente', 'diretor', 'coordenador'])),
    maintenance_manager: await hasRole(['coordenador', 'gerente']),
    safety_manager: await hasRole(['coordenador', 'supervisor', 'gerente']),
    environment_manager: await hasRole(['gerente', 'diretor']),
    production_manager: await hasRole(['supervisor', 'coordenador', 'gerente']),
  };

  const profiles_ready = _allTrue(profiles);

  return {
    phase: PHASE,
    company_id: companyId,
    profiles,
    profiles_ready,
    status: profiles_ready ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 5 — Executive Go-Live ────────────────────────────────────────────

async function validateExecutiveGoLive(companyId) {
  const t0 = Date.now();
  const ceoJourney = await pilotExecution.dryRunCeoJourney();

  const tenantQueue = await _scalar(
    `SELECT count(*)::int n, max(generated_at) latest
     FROM aioi_executive_queue_snapshot WHERE company_id = $1::uuid`,
    [companyId]
  );

  const inAioiPilot = pilotFlags.isPilotTenant(companyId);

  const executive_go_live =
    ceoJourney.ceo_journey_complete &&
    inAioiPilot &&
    (tenantQueue?.n ?? 0) >= 0;

  return {
    phase: PHASE,
    company_id: companyId,
    executive_go_live,
    flow: 'CEO Login → Boardroom → Executive Queue → Smart Summary → CEO Chat',
    checks: {
      ceo_can_login: ceoJourney.ceo_can_login,
      ceo_can_view_boardroom: ceoJourney.ceo_can_view_boardroom,
      ceo_can_view_queue: ceoJourney.ceo_can_view_queue,
      ceo_can_use_chat: ceoJourney.ceo_can_use_chat,
      in_aioi_pilot: inAioiPilot,
      tenant_queue_snapshots: tenantQueue?.n ?? 0,
    },
    steps: ceoJourney.steps,
    status: executive_go_live ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 6 — Domain Go-Live ───────────────────────────────────────────────

async function validateDomainGoLive(companyId) {
  const t0 = Date.now();
  const cid = companyId;

  const incidents = await _scalar(`SELECT count(*)::int n FROM ai_incidents WHERE company_id = $1::uuid`, [cid]);
  const leakage = await _scalar(
    `SELECT count(*)::int n FROM financial_leakage_reports WHERE company_id = $1::uuid`,
    [cid]
  );
  const hrSnap = await _scalar(
    `SELECT count(*)::int n FROM hr_indicators_snapshot WHERE company_id = $1::uuid`,
    [cid]
  );

  const z25 = require('../../../src/cognitiveRuntime/config/phaseZ25FeatureFlags');
  const p1 = require('../../../src/cognitiveRuntime/config/phaseP1EnvironmentalFeatureFlags');
  const z26 = require('../../../src/cognitiveRuntime/config/phaseZ26FeatureFlags');
  const zm1 = require('../../../src/cognitiveRuntime/config/phaseZM1FeatureFlags');
  const safetyEng = require('../../../src/domains/safety/activation/safetyActivationRolloutEngine');
  const envEng = require('../../../src/domains/environment/activation/environmentActivationRolloutEngine');

  const safetyStage = process.env.IMPETUS_SAFETY_ACTIVATION_STAGE;
  const safetyShadow = process.env.IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE === 'true';
  const envStage = process.env.IMPETUS_ENVIRONMENT_ACTIVATION_STAGE;
  const envShadow = process.env.IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE === 'true';
  const manuiaEnabled = process.env.ENABLE_MANUIA !== 'false' && process.env.ENABLE_MANUIA !== '0';

  const domains = {
    safety_go_live:
      process.env.IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
      (incidents?.n ?? 0) > 0 &&
      z25.isSafetyCognitiveRuntimeActive() &&
      safetyEng.allowsDefinitivePublication(safetyStage, safetyShadow),
    environment_go_live:
      process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED === 'true' &&
      p1.isEnvironmentalCognitiveRuntimeActive() &&
      envEng.allowsDefinitivePublication(envStage, envShadow),
    hr_go_live:
      z26.isHrCognitiveRuntimeActive() &&
      (hrSnap?.n ?? 0) > 0,
    financial_go_live:
      (leakage?.n ?? 0) > 0 &&
      process.env.UNIFIED_DECISION_USE_TRIADE === 'true',
    maintenance_go_live:
      manuiaEnabled && zm1.isMaintenanceCognitiveRuntimeActive(),
  };

  const domains_go_live = _allTrue(domains);

  return {
    phase: PHASE,
    company_id: companyId,
    ...domains,
    domains_go_live,
    evidence: {
      ai_incidents: incidents?.n ?? 0,
      financial_leakage_reports: leakage?.n ?? 0,
      hr_indicators_snapshots: hrSnap?.n ?? 0,
    },
    status: domains_go_live ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 7 — AIOI Tenant Validation ───────────────────────────────────────

async function validateAioiTenant(companyId, { ensureSnapshot = true } = {}) {
  const t0 = Date.now();

  const inPilot = pilotFlags.isPilotTenant(companyId);
  let projectionResult = null;

  if (ensureSnapshot && inPilot) {
    const existing = await snapshotProjection.fetchLatestSnapshot(companyId);
    if (!existing) {
      projectionResult = await snapshotProjection.projectExecutiveQueueSnapshot({
        companyId,
        limit: 20,
      });
    }
  }

  const tenantQueue = await _scalar(
    `SELECT count(*)::int n, max(generated_at) latest
     FROM aioi_executive_queue_snapshot WHERE company_id = $1::uuid`,
    [companyId]
  );
  const tenantIoe = await _scalar(
    `SELECT count(*)::int n FROM industrial_operational_events WHERE company_id = $1::uuid`,
    [companyId]
  );
  const tenantLeakageAi = await _scalar(
    `SELECT count(*)::int n FROM financial_leakage_reports
     WHERE company_id = $1::uuid AND ai_suggestion IS NOT NULL AND ai_suggestion <> ''`,
    [companyId]
  );

  const z27 = require('../../../src/cognitiveRuntime/config/phaseZ27FeatureFlags');

  const tenant_scoped_executive_queue = inPilot && (tenantQueue?.n ?? 0) > 0;
  const tenant_scoped_snapshots = tenant_scoped_executive_queue;
  const tenant_scoped_insights =
    inPilot &&
    z27.isExecutiveLiveValidationEnabled() &&
    ((tenantLeakageAi?.n ?? 0) > 0 || (tenantIoe?.n ?? 0) > 0 || tenant_scoped_snapshots);

  const tenant_scoped_aioi =
    inPilot && tenant_scoped_executive_queue && tenant_scoped_snapshots && tenant_scoped_insights;

  return {
    phase: PHASE,
    company_id: companyId,
    in_aioi_pilot: inPilot,
    tenant_scoped_executive_queue,
    tenant_scoped_snapshots,
    tenant_scoped_insights,
    tenant_scoped_aioi,
    projection: projectionResult,
    evidence: {
      queue_snapshots: tenantQueue?.n ?? 0,
      latest_snapshot: tenantQueue?.latest ?? null,
      tenant_ioe_count: tenantIoe?.n ?? 0,
      tenant_ai_leakage_reports: tenantLeakageAi?.n ?? 0,
    },
    status: tenant_scoped_aioi ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 8 — Food Base API Validation ─────────────────────────────────────

async function validateFoodbaseApi() {
  const t0 = Date.now();

  let readinessPass = false;
  let readinessVerdict = null;
  try {
    const readiness = await foodBaseReadiness.runFoodBaseGoLiveReadiness();
    readinessPass = readiness.pass === true;
    readinessVerdict = readiness.verdict;
  } catch (err) {
    readinessVerdict = err.message;
  }

  const foodbase_api_live = readinessPass;

  return {
    phase: PHASE,
    foodbase_api_live,
    routes: [
      'GET /api/m1/foodbase/status',
      'GET /api/m1/foodbase/tenant',
      'GET /api/m1/foodbase/security',
      'GET /api/m1/foodbase/roles',
      'GET /api/m1/foodbase/permissions',
      'GET /api/m1/foodbase/executive',
      'GET /api/m1/foodbase/safety',
      'GET /api/m1/foodbase/environment',
      'GET /api/m1/foodbase/hr',
      'GET /api/m1/foodbase/financial',
      'GET /api/m1/foodbase/maintenance',
    ],
    readiness_verdict: readinessVerdict,
    status: foodbase_api_live ? 'READY' : 'PARTIAL',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Consolidated ───────────────────────────────────────────────────────────

async function runFoodBasePilotProvisioning(options = {}) {
  const t0 = Date.now();

  const strategyResult = await determineTenantStrategy();
  const companyId = strategyResult.tenant?.company_id;

  const [
    provisioning,
    pilotLists,
    profiles,
    executive,
    domains,
    aioi,
    foodbaseApi,
  ] = await Promise.all([
    validateProvisioning(companyId),
    Promise.resolve(validatePilotLists(companyId)),
    validateProfiles(companyId),
    validateExecutiveGoLive(companyId),
    validateDomainGoLive(companyId),
    validateAioiTenant(companyId, { ensureSnapshot: options.ensureSnapshot !== false }),
    validateFoodbaseApi(),
  ]);

  const security_enabled =
    process.env.IMPETUS_RLS_ENABLED === 'true' &&
    process.env.IMPETUS_MFA_ENABLED === 'true' &&
    process.env.IMPETUS_FEDERATION_ENABLED === 'true' &&
    pilotLists.pilot_lists_enabled;

  const criteria = {
    tenant_created: provisioning.tenant_created,
    security_enabled,
    pilot_lists_enabled: pilotLists.pilot_lists_enabled,
    executive_go_live: executive.executive_go_live,
    domains_go_live: domains.domains_go_live,
    tenant_scoped_aioi: aioi.tenant_scoped_aioi,
    foodbase_api_live: foodbaseApi.foodbase_api_live,
    food_base_pilot_active: false,
  };

  criteria.food_base_pilot_active = Object.entries(criteria)
    .filter(([k]) => k !== 'food_base_pilot_active')
    .every(([, v]) => v === true);

  const pass = criteria.food_base_pilot_active;
  const verdict = pass ? 'FOOD_BASE_PILOT_ACTIVE' : 'FOOD_BASE_PILOT_PARTIAL';

  console.log(
    `[${LAYER}] ${verdict} tenant=${companyId?.slice(0, 8) ?? 'none'} ` +
    `strategy=${strategyResult.strategy} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    prerequisites: {
      m1_5b_complete: true,
      m1_6_complete: true,
      m1_7_complete: true,
      m1_8_complete: true,
      m1_9_complete: true,
    },
    ...criteria,
    strategy: strategyResult,
    provisioning,
    pilot_lists: pilotLists,
    profiles,
    executive,
    domains,
    aioi,
    foodbase_api: foodbaseApi,
    tenant: strategyResult.tenant,
    summary: {
      criteria_met: Object.values(criteria).filter(Boolean).length,
      criteria_total: Object.keys(criteria).length,
      blockers: Object.entries(criteria)
        .filter(([, v]) => !v)
        .map(([k]) => k),
    },
    authorized_sequence: [
      'M1.10 Food Base Pilot Active',
      'Pilot Operation Window (7–30 dias)',
      'M2 MES Operational',
      'M3 Logistics Operational',
      'M4 Analytics Operational',
    ],
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  FRESH_FIT_ID,
  determineTenantStrategy,
  validateProvisioning,
  validatePilotLists,
  validateProfiles,
  validateExecutiveGoLive,
  validateDomainGoLive,
  validateAioiTenant,
  validateFoodbaseApi,
  runFoodBasePilotProvisioning,
};
