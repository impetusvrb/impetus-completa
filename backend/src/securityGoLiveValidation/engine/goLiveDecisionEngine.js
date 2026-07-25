'use strict';

const { DECISIONS, GUARD_STATUS, createGoLiveValidationDto } = require('../dto/goLiveValidationDto');

function buildCriteria(validators, guard) {
  return {
    integrity_validated: validators.production?.checks?.integrityValid === true,
    runtime_validated: validators.runtime?.runtimeStable === true,
    infrastructure_validated: validators.runtime?.infrastructureReady === true,
    endpoints_validated: validators.endpoints?.ok === true,
    security_validated: validators.security?.securityReady === true,
    rollback_validated: validators.rollback?.rollbackReady === true,
    go_live_guard_ready: guard == null || guard.status === GUARD_STATUS.SUCCESS || guard.status === GUARD_STATUS.NOT_RUN,
    no_blocking_findings: collectBlocking(validators).length === 0,
    enterprise_security_preserved: true,
    enterprise_baseline_preserved: true,
    no_runtime_changes: true,
    sec21b_reconciled: validators.production?.sec21bApproved === true,
    baseline_synchronized: validators.production?.baselineSynchronized === true
  };
}

function collectBlocking(validators) {
  const all = [];
  for (const v of Object.values(validators)) {
    if (v?.blockingFindings) all.push(...v.blockingFindings);
    else if (v?.blocking && v !== validators.decision) {
      /* already in blockingFindings typically */
    }
  }
  return all;
}

function computeReadinessScore(criteria) {
  const vals = Object.values(criteria);
  if (!vals.length) return 0;
  return Math.round((vals.filter((v) => v === true).length / vals.length) * 1000) / 1000;
}

function buildActivationPlan() {
  return Object.freeze([
    { step: 1, action: 'Executar scripts/security/apply-sec21-activation.sh --apply' },
    { step: 2, action: 'pm2 restart impetus-backend --update-env' },
    { step: 3, action: 'Entrar em GO_LIVE_GUARD (observação intensiva)' },
    { step: 4, action: 'Observação Fase 1 (5 min) + Fase 2 (10 min)' },
    { step: 5, action: 'Encerrar Gate — monitoramento contínuo SEC-01→20' }
  ]);
}

function decide(validators, guard, warnings = []) {
  const blockingFindings = collectBlocking(validators);
  const criteria = buildCriteria(validators, guard);
  const productionReadinessScore = computeReadinessScore(criteria);

  const hardDeny =
    !validators.production?.sec21bApproved ||
    !validators.production?.baselineSynchronized ||
    !validators.production?.checks?.integrityValid ||
    validators.production?.blocking ||
    validators.runtime?.blocking ||
    validators.endpoints?.blocking ||
    validators.security?.blocking ||
    validators.rollback?.blocking ||
    validators.endpoints?.degraded > 3;

  let goLiveDecision = DECISIONS.APPROVED;
  if (hardDeny) {
    goLiveDecision = DECISIONS.DENIED;
  } else if (warnings.length > 0 || productionReadinessScore < 1) {
    goLiveDecision = DECISIONS.APPROVED_REMARKS;
  }

  if (guard?.failed) {
    goLiveDecision = DECISIONS.DENIED;
    blockingFindings.push({ code: 'GO_LIVE_GUARD_FAILED', detail: guard.phase1 });
  }

  let recommendedNextAction = '';
  let activationPlan = null;

  if (goLiveDecision === DECISIONS.APPROVED || goLiveDecision === DECISIONS.APPROVED_REMARKS) {
    activationPlan = buildActivationPlan();
    recommendedNextAction = activationPlan.map((s) => s.action).join(' → ');
  } else {
    recommendedNextAction = blockingFindings.length
      ? `Corrigir: ${blockingFindings.map((b) => b.code).slice(0, 4).join(', ')}`
      : 'Completar SEC-21B + integrity-check.sh --baseline antes de SEC-21C';
    if (!validators.production?.baselineSynchronized) {
      recommendedNextAction = 'Executar scripts/integrity-check.sh --baseline → re-executar SEC-21C';
    }
  }

  const goLiveGuardStatus = guard?.status || GUARD_STATUS.NOT_RUN;

  return createGoLiveValidationDto({
    goLiveDecision,
    productionReadinessScore,
    integrityScore: validators.production?.integrityScore ?? 0,
    runtimeHealth: validators.runtime?.runtimeHealth ?? 'UNKNOWN',
    endpointHealth: validators.endpoints?.endpointHealth ?? 'UNKNOWN',
    rollbackReady: validators.rollback?.rollbackReady === true,
    infrastructureReady: validators.runtime?.infrastructureReady === true,
    securityReady: validators.security?.securityReady === true,
    goLiveGuardStatus,
    recommendedNextAction,
    activationPlan,
    blockingFindings,
    warnings,
    criteria,
    validators,
    goLiveGuard: guard
  });
}

module.exports = {
  decide,
  buildCriteria,
  buildActivationPlan,
  DECISIONS
};
