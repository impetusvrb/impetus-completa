'use strict';

const { logBootstrap } = require('./bootstrapLogger');

/**
 * Avalia se KPI soft activation é segura — NUNCA activa automaticamente.
 */
function evaluateSoftKpiActivation(ctx = {}) {
  let shadow = {};
  let stability = {};
  let readiness = {};

  try {
    shadow = require('../runtimeValidation/shadowRuntimeValidator').validateShadowRuntime(ctx);
  } catch {
    shadow = { passed: false };
  }

  try {
    stability = require('../productionRollout/governanceStabilizationMonitor').computeStabilizationMetrics({
      force: ctx.force
    });
  } catch {
    stability = { stable: false };
  }

  try {
    readiness = require('../finalReview/governanceReadinessFinalizer').finalizeReadiness({ force: true });
  } catch {
    readiness = { leakage_risk: 'high' };
  }

  const metrics = {
    runtime_stable: stability.stable !== false && stability.stabilization_score >= 0.85,
    divergence_low: shadow.passed === true && (shadow.runtime_shadow_alignment ?? 0) >= 0.9,
    leakage_low: readiness.leakage_risk === 'low',
    overblocking_low: readiness.overblocking_risk === 'low'
  };

  const safe =
    metrics.runtime_stable &&
    metrics.divergence_low &&
    metrics.leakage_low &&
    metrics.overblocking_low;

  const recommendation = safe
    ? {
        action: 'soft_kpi_activation_candidate',
        env_hint: 'IMPETUS_KPI_GOVERNANCE=on OR POST /api/internal/governance/production/promote/kpi',
        auto_execute: false,
        observe_days: 7
      }
    : {
        action: 'hold_kpi_activation',
        reason: 'metrics_not_ready',
        auto_execute: false
      };

  if (safe) {
    logBootstrap('PRODUCTION_ACTIVATION_VALIDATED', { channel: 'kpi', mode: 'soft_candidate' });
  }

  return {
    safe,
    metrics,
    readiness,
    shadow_summary: {
      alignment: shadow.runtime_shadow_alignment,
      passed: shadow.passed
    },
    recommendation,
    hard_enforcement: false
  };
}

module.exports = { evaluateSoftKpiActivation };
