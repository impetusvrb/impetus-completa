'use strict';

/**
 * SEC-21A — Decisão final Go-Live (4 estados).
 */

const { DECISIONS, createGoLiveGateDto } = require('../dto/goLiveGateDto');

function buildCriteria(validators, warnings) {
  return {
    integrity_above_threshold: validators.integrity?.aboveThreshold === true && !validators.integrity?.blocking,
    baseline_synchronized: validators.baseline?.ok === true,
    all_modules_online: validators.modules?.ok === true,
    all_endpoints_healthy: validators.endpoints?.ok === true,
    runtime_stable: validators.runtime?.runtimeStable === true,
    pm2_healthy: validators.infrastructure?.pm2Healthy !== false,
    nginx_healthy: validators.infrastructure?.nginxHealthy !== false,
    database_healthy: validators.infrastructure?.databaseHealthy !== false,
    tls_valid: validators.infrastructure?.tlsValid !== false,
    rollback_available: validators.security?.rollbackAvailable === true,
    security_ready: validators.security?.securityReady === true,
    operational_ready: validators.security?.sec21Evidence === true,
    documentation_present: true,
    evidence_present: validators.security?.sec20Present === true,
    no_critical_nc: (validators.security?.criticalNCs || []).length === 0,
    no_pending_rollback: true
  };
}

function computeOverallScore(criteria) {
  const vals = Object.values(criteria);
  if (!vals.length) return 0;
  return Math.round((vals.filter((v) => v === true).length / vals.length) * 1000) / 1000;
}

function decide(validators, warnings, observation) {
  const criteria = buildCriteria(validators, warnings);
  const overallScore = computeOverallScore(criteria);
  const blockingIssues = [...warnings.blockingWarnings];

  const hardBlock =
    !validators.integrity?.aboveThreshold ||
    validators.integrity?.drift?.blocking ||
    validators.infrastructure?.blocking ||
    validators.modules?.blocking ||
    validators.endpoints?.blocking && validators.endpoints?.failures?.some((f) =>
      ['SEC-01', 'SEC-04', 'SEC-07', 'SEC-21'].includes(f.phase)
    ) ||
    !validators.security?.rollbackAvailable ||
    (validators.security?.criticalNCs || []).length > 0 ||
    validators.baseline?.blocking;

  let goLiveDecision = DECISIONS.APPROVED;
  let overallStatus = 'READY';

  if (hardBlock) {
    if (
      validators.integrity?.drift?.classification === 'Critical Drift' ||
      !validators.security?.rollbackAvailable ||
      validators.baseline?.blocking
    ) {
      goLiveDecision = DECISIONS.DENIED;
      overallStatus = 'NOT_READY';
    } else {
      goLiveDecision = DECISIONS.BLOCKED;
      overallStatus = 'BLOCKED';
    }
  } else if (warnings.acceptableWarnings.length > 0 || overallScore < 1) {
    goLiveDecision = DECISIONS.APPROVED_REMARKS;
    overallStatus = 'READY_WITH_REMARKS';
  }

  if (observation?.phase1?.failed) {
    goLiveDecision = DECISIONS.BLOCKED;
    overallStatus = 'OBSERVATION_FAILED';
    blockingIssues.push({ code: 'POST_ACTIVATION_OBSERVATION_FAILED', detail: observation.phase1 });
  }

  let nextRecommendedAction = 'Executar apply-sec21-activation.sh --apply && pm2 restart impetus-backend --update-env';
  if (goLiveDecision === DECISIONS.BLOCKED || goLiveDecision === DECISIONS.DENIED) {
    nextRecommendedAction = blockingIssues.length
      ? `Corrigir: ${blockingIssues.map((b) => b.code || b.message).slice(0, 3).join(', ')}`
      : 'Corrigir integridade/baseline antes do Go-Live';
    if (!validators.integrity?.aboveThreshold) {
      nextRecommendedAction =
        'Executar scripts/integrity-check.sh --baseline; restaurar ficheiros críticos; score >= 0.95';
    }
  }

  const dto = createGoLiveGateDto({
    overallStatus,
    goLiveDecision,
    overallScore,
    integrityScore: validators.integrity?.integrityScore ?? 0,
    baselineStatus: validators.baseline?.ok ? 'SYNCHRONIZED' : 'DIVERGED',
    runtimeStatus: validators.runtime?.runtimeStable ? 'STABLE' : 'UNSTABLE',
    securityStatus: validators.security?.securityReady ? 'READY' : 'NOT_READY',
    operationalStatus: validators.security?.sec21Evidence ? 'SEC21_COMPLETE' : 'SEC21_PENDING',
    warnings: warnings.acceptableWarnings,
    blockingIssues,
    approvedModules: validators.modules?.approvedModules || [],
    failedModules: (validators.modules?.failedModules || []).map((m) => m.phase),
    nextRecommendedAction,
    approvalTimestamp:
      goLiveDecision === DECISIONS.APPROVED || goLiveDecision === DECISIONS.APPROVED_REMARKS
        ? new Date().toISOString()
        : null,
    observation,
    criteria,
    validators
  });

  return dto;
}

module.exports = { decide, buildCriteria, computeOverallScore, DECISIONS };
