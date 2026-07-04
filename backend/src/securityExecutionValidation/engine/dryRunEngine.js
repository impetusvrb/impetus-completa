'use strict';

/**
 * SEC-12 — Dry Run Engine.
 * Simula execução — nunca executa.
 */

const metrics = require('../metrics/executionValidationMetrics');

function simulateAction(validationResult) {
  metrics.increment('dry_runs');

  const actionId = validationResult.actionId;
  const verdict = validationResult.verdict;

  if (verdict === 'BLOCKED' || verdict === 'INVALID') {
    return {
      actionId,
      dryRun: true,
      executed: false,
      skipped: true,
      reason: validationResult.reasons?.[0] || verdict,
      expected_changes: [],
      affected_services: [],
      estimated_duration_minutes: 0,
      estimated_risk: 'NONE',
      rollback_time_minutes: 0
    };
  }

  const impact = validationResult.impact || {};
  const affected = Object.entries(impact.impacts || {})
    .filter(([, level]) => level !== 'NONE')
    .map(([svc]) => svc);

  return {
    actionId,
    dryRun: true,
    executed: false,
    skipped: false,
    expected_changes: [
      { target: actionId, type: 'logical_plan_only', note: 'SEC-12 simulation — no runtime change' }
    ],
    affected_services: affected,
    estimated_duration_minutes: validationResult.estimatedDurationMinutes || 5,
    estimated_risk: validationResult.impact?.maxImpact || 'LOW',
    rollback_time_minutes: validationResult.rollback?.estimatedRollbackMinutes || 5,
    availability_impact: validationResult.impact?.canDropImpetus ? 'POSSIBLE_DEGRADATION' : 'MINIMAL'
  };
}

function runDryRun(validations) {
  return (validations || []).map(simulateAction);
}

module.exports = { simulateAction, runDryRun };
