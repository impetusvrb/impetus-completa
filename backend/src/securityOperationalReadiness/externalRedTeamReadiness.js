'use strict';

/**
 * APPSEC-02A — External Red Team Readiness
 */

const READINESS_DECISION = Object.freeze({
  NOT_READY: 'NOT_READY',
  READY_WITH_REMARKS: 'READY_WITH_REMARKS',
  READY_FOR_EXTERNAL_RED_TEAM: 'READY_FOR_EXTERNAL_RED_TEAM'
});

/**
 * @param {object} bundle — output from operationalReadinessOrchestrator
 */
function evaluateExternalRedTeamReadiness(bundle) {
  const secret = bundle.secret_cleanup || {};
  const runtime = bundle.runtime_config || {};
  const deps = bundle.dependency_plan || {};
  const appsec02 = bundle.appsec02_validation || {};
  const confidence = bundle.confidence_level || {};
  const restart = bundle.restart_validation || {};

  const operationalReadiness = computeScore([
    { ok: secret.summary?.unsafe === 0, weight: 30, fail: 'UNSAFE env backups presentes' },
    { ok: secret.cleanup_plan?.steps?.length === 0 || secret.all_inventoried, weight: 20, fail: 'Inventário incompleto' },
    { ok: runtime.passed, weight: 25, fail: 'Config runtime CRITICAL/HIGH' },
    { ok: restart.pre_restart?.ready !== false, weight: 15, fail: 'Runtime snapshot pré-restart degradado' },
    { ok: true, weight: 10, fail: null }
  ]);

  const securityReadiness = computeScore([
    { ok: appsec02.decision !== 'APPSEC_FAILED', weight: 40, fail: 'APPSEC-02 FAILED' },
    { ok: (appsec02.regressions || []).length === 0, weight: 30, fail: 'Regressões APPSEC' },
    { ok: (appsec02.scores?.p0_p1_summary?.failed || 0) === 0, weight: 30, fail: 'P0/P1 failed' }
  ]);

  const applicationReadiness = computeScore([
    { ok: deps.plan_complete, weight: 30, fail: 'Plano deps incompleto' },
    { ok: (confidence.aggregate?.average_confidence_percent || 0) >= 70, weight: 40, fail: 'Confiança média < 70%' },
    { ok: (confidence.aggregate?.below_medium_count || 0) <= 3, weight: 30, fail: 'Muitos findings baixa confiança' }
  ]);

  const residualRisk = bundle.residual_risk_level || appsec02.scores?.residual_risk || 'medium';

  const overall = Math.round(
    operationalReadiness.score * 0.35 +
    securityReadiness.score * 0.4 +
    applicationReadiness.score * 0.25
  );

  const remarks = [
    ...operationalReadiness.remarks,
    ...securityReadiness.remarks,
    ...applicationReadiness.remarks
  ].filter(Boolean);

  let decision = READINESS_DECISION.NOT_READY;
  if (overall >= 85 && operationalReadiness.score >= 75 && securityReadiness.score >= 90) {
    decision = READINESS_DECISION.READY_FOR_EXTERNAL_RED_TEAM;
  } else if (overall >= 65 && securityReadiness.score >= 80) {
    decision = READINESS_DECISION.READY_WITH_REMARKS;
  }

  // Blockers
  if (runtime.summary?.critical > 0) decision = READINESS_DECISION.NOT_READY;
  if (appsec02.decision === 'APPSEC_FAILED') decision = READINESS_DECISION.NOT_READY;
  if (secret.summary?.unsafe > 0 && !bundle.unsafe_acknowledged) {
    if (decision === READINESS_DECISION.READY_FOR_EXTERNAL_RED_TEAM) {
      decision = READINESS_DECISION.READY_WITH_REMARKS;
    }
    remarks.push('Artefactos UNSAFE .env ainda presentes — rotação de segredos recomendada antes de Red Team externo');
  }

  return {
    schema_version: 'external_redteam_readiness_v1',
    generated_at: new Date().toISOString(),
    decision,
    overall_readiness_percent: overall,
    dimensions: {
      operational_readiness: operationalReadiness,
      security_readiness: securityReadiness,
      application_readiness: applicationReadiness,
      residual_risk: residualRisk
    },
    remarks,
    next_step: decision === READINESS_DECISION.READY_FOR_EXTERNAL_RED_TEAM
      ? 'Contratar/executar Red Team independente com roteiro 04/07/2026 ampliado'
      : 'Completar acções operacionais APPSEC_02A_SECRET_CLEANUP e runtime config'
  };
}

function computeScore(checks) {
  let score = 0;
  let max = 0;
  const remarks = [];
  for (const c of checks) {
    max += c.weight;
    if (c.ok) score += c.weight;
    else if (c.fail) remarks.push(c.fail);
  }
  return {
    score: max ? Math.round((score / max) * 100) : 0,
    remarks
  };
}

module.exports = {
  READINESS_DECISION,
  evaluateExternalRedTeamReadiness
};
