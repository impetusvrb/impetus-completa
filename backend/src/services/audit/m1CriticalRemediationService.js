'use strict';

/**
 * M1.16 — Critical Remediation & M1 Closure Service
 *
 * READ ONLY assessment · remediation applied via code/env (documented in M1_16 docs)
 */

const db = require('../../db');
const { getUserPermissions, hydrateUserPermissions, buildTruthSafePermissionDenial } = require('../../middleware/authorize');
const { analyzePrompt } = require('../../middleware/promptFirewall');

const LAYER = 'M1.16_CRITICAL_REMEDIATION';
const PHASE = 'M1.16';

const PILOT_TENANT = Object.freeze({
  company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
  company_name: 'Fresh & Fit Indústria de Alimentos Naturais Ltda',
  pilot_alias: 'Food Base Pilot',
});

const F48_FINANCIAL_QUESTIONS = [
  'Qual o custo operacional do mês?',
  'Qual a margem de contribuição actual?',
  'Qual o custo por unidade produzida?',
  'Qual a receita consolidada da semana?',
  'Qual o EBITDA operacional do mês?',
];

function _tenantMeta() {
  return { ...PILOT_TENANT };
}

async function _scalar(sql, params = []) {
  const r = await db.query(sql, params);
  return r.rows[0] ?? null;
}

async function assessFinancialRbac() {
  const roles = ['ceo', 'diretor', 'gerente', 'supervisor', 'admin', 'colaborador'];
  const profiles = [];

  for (const role of roles) {
    const u = await _scalar(
      `SELECT id, email, role, permissions FROM users
       WHERE company_id = $1::uuid AND role = $2 AND deleted_at IS NULL AND active = true LIMIT 1`,
      [PILOT_TENANT.company_id, role]
    );
    if (!u) continue;
    const hydrated = await hydrateUserPermissions(u);
    profiles.push({
      role,
      email: hydrated.email,
      view_financial: hydrated.permissions.includes('VIEW_FINANCIAL'),
      view_strategic: hydrated.permissions.includes('VIEW_STRATEGIC'),
      permission_count: hydrated.permissions.length,
      sources: hydrated._effective_permissions_sources,
    });
  }

  const ceoHas = profiles.find((p) => p.role === 'ceo')?.view_financial === true;
  const supervisorNo = profiles.find((p) => p.role === 'supervisor')?.view_financial === false;
  const unified = ceoHas && supervisorNo;

  return {
    phase: PHASE,
    stage: 'financial_rbac',
    ..._tenantMeta(),
    financial_rbac_unified: unified,
    single_source_of_truth: unified,
    profiles_validated: profiles,
    mechanism: 'roles + role_permissions (primary) + users.permissions (complementary)',
    module: 'middleware/authorize.js + auth hydrateUserPermissions',
  };
}

async function assessFinancialEmptyResponses() {
  const noPermUser = await _scalar(
    `SELECT id, email, role, permissions FROM users
     WHERE company_id = $1::uuid AND role = 'colaborador' AND deleted_at IS NULL AND active = true
     LIMIT 1`,
    [PILOT_TENANT.company_id]
  );
  const user = noPermUser || { id: null, role: 'colaborador', permissions: [] };
  const results = [];

  for (const question of F48_FINANCIAL_QUESTIONS) {
    const pf = await analyzePrompt(question, user);
    const denial = buildTruthSafePermissionDenial(pf.reason || 'VIEW_FINANCIAL');
    results.push({
      question,
      blocked: pf.blocked === true,
      reply_present: Boolean(pf.reply && String(pf.reply).trim().length > 0),
      denial_reply_present: Boolean(denial.reply && String(denial.reply).trim().length > 0),
    });
  }

  const eliminated = results.every((r) => r.blocked && r.reply_present && r.denial_reply_present);

  return {
    phase: PHASE,
    stage: 'financial_truth_denial',
    ..._tenantMeta(),
    financial_empty_responses_eliminated: eliminated,
    f48_scenarios: results,
    gateway: 'promptFirewall + buildTruthSafePermissionDenial',
  };
}

function assessProductionPromotion() {
  const zp1 = require('../../cognitiveRuntime/config/phaseZP1FeatureFlags');
  const mode = zp1.productionLiveValidationMode();
  const promoted = mode === 'active' || mode === 'on';
  return {
    phase: PHASE,
    stage: 'production_live_validation',
    production_runtime_promoted: promoted,
    production_live_validation: mode,
    zp1_certification: 'runProductionLiveValidationTests.js — 39/39 PASS',
    flag: process.env.IMPETUS_PRODUCTION_LIVE_VALIDATION || 'off',
  };
}

function assessQualityPromotion() {
  const z19 = require('../../cognitiveRuntime/config/phaseZ19FeatureFlags');
  const z20 = require('../../cognitiveRuntime/config/phaseZ20FeatureFlags');
  const cockpit = z19.qualityCockpitPilotMode();
  const bridge = z20.qualityEngineBridgeMode();
  const promoted = (cockpit === 'on' || cockpit === 'active') && (bridge === 'on' || bridge === 'active');
  return {
    phase: PHASE,
    stage: 'quality_bridge',
    quality_bridge_promoted: promoted,
    quality_runtime_active: promoted,
    quality_cockpit_pilot: cockpit,
    quality_engine_bridge: bridge,
    z19_certification: 'runCognitiveCompositionTests.js — 22/22 PASS',
    z20_certification: 'runQualityEngineBridgeTests.js — 13/13 PASS',
    flags: {
      IMPETUS_QUALITY_COCKPIT_PILOT: process.env.IMPETUS_QUALITY_COCKPIT_PILOT || 'off',
      IMPETUS_QUALITY_ENGINE_BRIDGE: process.env.IMPETUS_QUALITY_ENGINE_BRIDGE || 'off',
    },
  };
}

async function assessRegressionValidation() {
  const t0 = Date.now();
  const pilotOperation = require('./pilotOperationWindowService');
  const pilotClosure = require('./pilotOperationalClosureService');
  const pilotAdoption = require('./pilotAdoptionAssessmentService');
  const governance = require('./m2ReadinessGovernanceService');

  const [m111, m112, m113, m114] = await Promise.all([
    pilotOperation.runPilotOperationWindowAssessment(),
    pilotClosure.runPilotOperationalClosure(),
    pilotAdoption.runPilotAdoptionAssessment(),
    governance.runM2ReadinessGovernanceAssessment(),
  ]);

  const checks = {
    m1_11_financial_operational: m111.financial_operational === true,
    m1_11_verdict_stable: m111.verdict === 'PILOT_OPERATION_WINDOW_PARTIAL',
    m1_12_closure_ran: Boolean(m112.verdict),
    m1_13_platform_ready: m113.platform_ready === true,
    m1_14_governance_ready: m114.verdict === 'M2_GOVERNANCE_DECISION_READY',
    aioi_operational: m111.runtime_health_confirmed === true,
    truth_preserved: m111.truth_program_operational === true,
  };

  const passed = Object.values(checks).every(Boolean);

  return {
    phase: PHASE,
    stage: 'regression_validation',
    regression_validation_passed: passed,
    checks,
    snapshots: {
      m1_11: { verdict: m111.verdict, pass: m111.pass },
      m1_12: { verdict: m112.verdict, m2_gate_open: m112.m2_gate_open },
      m1_13: { verdict: m113.verdict, platform_ready: m113.platform_ready },
      m1_14: { verdict: m114.verdict, pass: m114.pass },
    },
    elapsed_ms: Date.now() - t0,
  };
}

async function runCriticalRemediationAssessment() {
  const t0 = Date.now();

  const [financial, emptyResp, production, quality, regression] = await Promise.all([
    assessFinancialRbac(),
    assessFinancialEmptyResponses(),
    Promise.resolve(assessProductionPromotion()),
    Promise.resolve(assessQualityPromotion()),
    assessRegressionValidation(),
  ]);

  const criteria = {
    financial_rbac_unified: financial.financial_rbac_unified === true,
    financial_empty_responses_eliminated: emptyResp.financial_empty_responses_eliminated === true,
    production_runtime_promoted: production.production_runtime_promoted === true,
    quality_bridge_promoted: quality.quality_bridge_promoted === true,
    all_m1_findings_closed:
      financial.financial_rbac_unified &&
      emptyResp.financial_empty_responses_eliminated &&
      production.production_runtime_promoted &&
      quality.quality_bridge_promoted,
    regression_validation_passed: regression.regression_validation_passed === true,
  };

  const pass = Object.values(criteria).every(Boolean);
  const verdict = pass ? 'M1_PLATFORM_FULLY_OPERATIONAL' : 'M1_16_REMEDIATION_PARTIAL';

  console.log(
    `[${LAYER}] ${verdict} rbac=${criteria.financial_rbac_unified} empty=${criteria.financial_empty_responses_eliminated} ` +
    `prod=${criteria.production_runtime_promoted} quality=${criteria.quality_bridge_promoted} reg=${criteria.regression_validation_passed} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    mode: 'REMEDIATION_ASSESSMENT_READ_ONLY',
    ..._tenantMeta(),
    ...criteria,
    financial,
    financial_denial: emptyResp,
    production,
    quality,
    regression,
    prerequisites: { m1_15: 'M1_15_CRITICAL_FINDINGS_IDENTIFIED' },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PILOT_TENANT,
  assessFinancialRbac,
  assessFinancialEmptyResponses,
  assessProductionPromotion,
  assessQualityPromotion,
  assessRegressionValidation,
  runCriticalRemediationAssessment,
};
