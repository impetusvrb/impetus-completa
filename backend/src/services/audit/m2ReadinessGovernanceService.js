'use strict';

/**
 * M1.14 — M2 Readiness Governance Assessment Service
 *
 * READ ONLY · NO WRITES · NO MOCK DATA
 * Avalia critérios de governança para evolução M2 — não runtime/onboarding.
 */

const pilotProvisioning = require('./foodBasePilotProvisioningService');
const pilotOperation = require('./pilotOperationWindowService');
const pilotClosure = require('./pilotOperationalClosureService');
const pilotAdoption = require('./pilotAdoptionAssessmentService');

const LAYER = 'M1.14_M2_GOVERNANCE';
const PHASE = 'M1.14';

const PILOT_TENANT = pilotAdoption.PILOT_TENANT;

function _tenantMeta() {
  return { ...PILOT_TENANT };
}

/** Carrega M1.10–M1.13 uma única vez por avaliação */
async function _loadPhaseResults(companyId = PILOT_TENANT.company_id) {
  const [m110, m111, m112, m113] = await Promise.all([
    pilotProvisioning.runFoodBasePilotProvisioning(),
    pilotOperation.runPilotOperationWindowAssessment(),
    pilotClosure.runPilotOperationalClosure(),
    pilotAdoption.runPilotAdoptionAssessment(),
  ]);

  const envRuntime =
    m113.domains?.domains?.environment?.runtime_available ??
    m112.environment?.runtime_active ??
    false;
  const maintRuntime =
    m113.domains?.domains?.maintenance?.runtime_available ??
    m112.maintenance?.manuia_runtime_active ??
    false;

  const consolidated = {
    platform_ready: m113.platform_ready === true,
    pilot_active: m110.food_base_pilot_active === true || m110.pass === true,
    tenant_activity_confirmed: m111.tenant_activity_confirmed === true,
    executive_operational: m111.executive_operational === true,
    financial_operational: m111.financial_operational === true,
    hr_operational: m111.hr_operational === true,
    safety_operational: m111.safety_operational === true,
    environment_runtime_operational: envRuntime,
    maintenance_runtime_operational: maintRuntime,
  };

  return { m110, m111, m112, m113, consolidated, companyId };
}

function _buildEvidenceReview(ctx) {
  const { m110, m111, m112, m113, consolidated, companyId } = ctx;
  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: companyId,
    consolidated,
    phase_snapshots: {
      m1_10: {
        verdict: m110.verdict,
        pass: m110.pass,
        food_base_pilot_active: m110.food_base_pilot_active,
      },
      m1_11: {
        verdict: m111.verdict,
        pass: m111.pass,
        pilot_operation_window_complete: m111.pilot_operation_window_complete,
        blockers: m111.summary?.blockers ?? [],
      },
      m1_12: {
        verdict: m112.verdict,
        pass: m112.pass,
        m2_gate_open: m112.m2_gate_open,
        environment_blocker: m112.environment_blocker,
        maintenance_blocker: m112.maintenance_blocker,
      },
      m1_13: {
        verdict: m113.verdict,
        pass: m113.pass,
        pilot_utilization_index: m113.utilization?.pilot_utilization_index,
        tenant_adoption_gap: m113.tenant_adoption_gap,
        platform_problem: m113.platform_problem,
        m2_technical_readiness: m113.m2_technical_readiness,
      },
    },
  };
}

function _buildRisks(ctx, evidence) {
  const { m113, consolidated: c } = ctx;
  const idx = m113.utilization?.pilot_utilization_index ?? 0;
  const adopted = m113.utilization?.adopted_domains ?? 0;

  let technical_risk = 'low';
  if (!m113.m2_technical_readiness) technical_risk = 'high';
  else if (!c.platform_ready) technical_risk = 'medium';

  let platform_risk = 'low';
  if (m113.platform_problem) platform_risk = 'high';
  else if (!c.platform_ready) platform_risk = 'medium';

  let adoption_risk = 'low';
  if (adopted <= 2) adoption_risk = 'high';
  else if (adopted < 6 || !m113.environment?.environment_adoption_confirmed) adoption_risk = 'medium';

  let business_risk = 'low';
  if (idx < 50) business_risk = 'high';
  else if (idx < 100 && m113.tenant_adoption_gap) business_risk = 'medium';

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: ctx.companyId,
    technical_risk,
    platform_risk,
    adoption_risk,
    business_risk,
    justification: {
      technical_risk: {
        level: technical_risk,
        evidence: {
          m2_technical_readiness: m113.m2_technical_readiness,
          platform_ready: c.platform_ready,
        },
      },
      platform_risk: {
        level: platform_risk,
        evidence: {
          platform_problem: m113.platform_problem,
          platform_ready: c.platform_ready,
          m1_11_operational_partial: !evidence.phase_snapshots.m1_11.pilot_operation_window_complete,
          note: 'M1.11 partial = adoption gap, not platform failure (M1.13)',
        },
      },
      adoption_risk: {
        level: adoption_risk,
        evidence: {
          adopted_domains: adopted,
          utilization_index: idx,
          environment_adopted: m113.environment?.environment_adoption_confirmed,
          maintenance_adopted: m113.maintenance?.maintenance_adoption_confirmed,
        },
      },
      business_risk: {
        level: business_risk,
        evidence: {
          pilot_utilization_index: idx,
          tenant_adoption_gap: m113.tenant_adoption_gap,
          executive_operational: c.executive_operational,
        },
      },
    },
  };
}

function assessM2Dependencies() {
  const dependencies = {
    environmental_events_required: false,
    environmental_telemetry_required: false,
    maintenance_work_orders_required: false,
    active_maintenance_module_required: false,
  };

  return {
    phase: PHASE,
    m2_phase: 'M2 MES Operational',
    m2_dependencies_satisfied: !Object.values(dependencies).some(Boolean),
    dependencies,
    architecture_evidence: {
      mes_bounded_context: 'industrial_mes',
      mes_catalog: 'backend/src/domains/mes/events/mesCatalog.js',
      mes_foundation: 'backend/src/domains/mes/services/mesFoundationService.js',
      mes_prerequisites: [
        'company_id tenant scope',
        'event backbone (optional emit)',
        'production lines / products (tenant data)',
      ],
      not_required_for_m2_foundation: [
        'industrial_telemetry_samples (environment)',
        'environmental_alert IOE',
        'casos_manutencao / MANUIA work orders',
        'environment_adoption_confirmed',
        'maintenance_adoption_confirmed',
      ],
      cross_domain_note:
        'Downtime MES pode categorizar maintenance — integração MANUIA é evolutiva, não gate M2 foundation',
    },
  };
}

function _buildRecommendation(ctx, evidence, risks, dependencies) {
  const { m113, consolidated: c } = ctx;
  const adoptionGap = m113.tenant_adoption_gap === true;
  const platformReady = c.platform_ready && m113.m2_technical_readiness;
  const depsOk = dependencies.m2_dependencies_satisfied;

  let recommendation;
  let reason;

  if (
    platformReady &&
    depsOk &&
    adoptionGap &&
    !m113.platform_problem &&
    risks.technical_risk === 'low'
  ) {
    recommendation = 'open_m2_gate';
    reason = 'platform_ready_adoption_can_continue_in_parallel';
  } else if (!platformReady || m113.platform_problem || risks.technical_risk === 'high') {
    recommendation = 'keep_gate_closed';
    reason = 'platform_or_technical_risk_elevated';
  } else if (!depsOk) {
    recommendation = 'keep_gate_closed';
    reason = 'm2_dependencies_not_satisfied';
  } else {
    recommendation = 'keep_gate_closed';
    reason = 'environment_and_maintenance_adoption_required';
  }

  return {
    phase: PHASE,
    ..._tenantMeta(),
    company_id: ctx.companyId,
    recommendation,
    reason,
    option_a: {
      recommendation: 'keep_gate_closed',
      reason: 'environment_and_maintenance_adoption_required',
      applies_when: recommendation === 'keep_gate_closed',
    },
    option_b: {
      recommendation: 'open_m2_gate',
      reason: 'platform_ready_adoption_can_continue_in_parallel',
      applies_when: recommendation === 'open_m2_gate',
    },
    operational_gate_status: {
      m1_11_complete: evidence.phase_snapshots.m1_11.pilot_operation_window_complete,
      m1_12_m2_gate_open: evidence.phase_snapshots.m1_12.m2_gate_open,
      governance_vs_operational:
        'Governança M1.14 pode recomendar M2 paralelo; gate operacional M1.11/M1.12 permanece independente',
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

async function reviewConsolidatedEvidence(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const ctx = await _loadPhaseResults(companyId);
  const review = _buildEvidenceReview(ctx);
  return { ...review, elapsed_ms: Date.now() - t0 };
}

async function assessAdoptionRisks(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const ctx = await _loadPhaseResults(companyId);
  const evidence = _buildEvidenceReview(ctx);
  const risks = _buildRisks(ctx, evidence);
  return { ...risks, elapsed_ms: Date.now() - t0 };
}

async function assessGovernanceRecommendation(companyId = PILOT_TENANT.company_id) {
  const t0 = Date.now();
  const ctx = await _loadPhaseResults(companyId);
  const evidence = _buildEvidenceReview(ctx);
  const risks = _buildRisks(ctx, evidence);
  const dependencies = assessM2Dependencies();
  const recommendation = _buildRecommendation(ctx, evidence, risks, dependencies);
  return { ...recommendation, elapsed_ms: Date.now() - t0 };
}

async function runM2ReadinessGovernanceAssessment() {
  const t0 = Date.now();
  const ctx = await _loadPhaseResults();
  const evidence = _buildEvidenceReview(ctx);
  const risks = _buildRisks(ctx, evidence);
  const dependencies = assessM2Dependencies();
  const recommendation = _buildRecommendation(ctx, evidence, risks, dependencies);
  const { m113 } = ctx;

  const adoption_gap_identified =
    m113.tenant_adoption_gap === true ||
    !m113.environment?.environment_adoption_confirmed ||
    !m113.maintenance?.maintenance_adoption_confirmed;

  const criteria = {
    platform_ready: ctx.consolidated.platform_ready,
    pilot_active: ctx.consolidated.pilot_active,
    adoption_gap_identified,
    governance_assessment_complete: true,
  };

  const pass =
    criteria.platform_ready &&
    m113.m2_technical_readiness === true &&
    !m113.platform_problem;

  const verdict = pass ? 'M2_GOVERNANCE_DECISION_READY' : 'M2_GOVERNANCE_ASSESSMENT_PARTIAL';

  console.log(
    `[${LAYER}] ${verdict} recommendation=${recommendation.recommendation} ` +
    `deps=${dependencies.m2_dependencies_satisfied} tenant=${ctx.companyId.slice(0, 8)} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    mode: 'READ_ONLY_GOVERNANCE_ASSESSMENT',
    ..._tenantMeta(),
    prerequisites: {
      m1_10_complete: true,
      m1_11_complete: true,
      m1_12_complete: true,
      m1_13_complete: true,
    },
    ...criteria,
    consolidated: ctx.consolidated,
    evidence_review: { ...evidence, elapsed_ms: Date.now() - t0 },
    risks,
    dependencies,
    recommendation,
    m2_gate_governance: {
      recommended_action: recommendation.recommendation,
      recommended_reason: recommendation.reason,
      open_m2_gate: recommendation.recommendation === 'open_m2_gate',
      keep_gate_closed: recommendation.recommendation === 'keep_gate_closed',
    },
    summary: {
      utilization_index: m113.utilization?.pilot_utilization_index,
      adoption_gap: adoption_gap_identified,
      m2_dependencies_satisfied: dependencies.m2_dependencies_satisfied,
      risk_profile: {
        technical: risks.technical_risk,
        platform: risks.platform_risk,
        adoption: risks.adoption_risk,
        business: risks.business_risk,
      },
    },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PILOT_TENANT,
  reviewConsolidatedEvidence,
  assessAdoptionRisks,
  assessM2Dependencies,
  assessGovernanceRecommendation,
  runM2ReadinessGovernanceAssessment,
};
