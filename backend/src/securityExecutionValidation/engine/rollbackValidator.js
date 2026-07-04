'use strict';

/**
 * SEC-12 — Rollback Validator.
 */

const metrics = require('../metrics/executionValidationMetrics');

function validateRollback(action) {
  if (!action) {
    return { valid: false, status: 'INVALID', reasons: ['action_not_found'] };
  }

  metrics.increment('rollback_validations');

  const reasons = [];
  let status = 'VALID';

  if (!action.rollbackDocumented) {
    reasons.push('rollback_not_documented');
    status = 'INVALID';
  }
  if (!action.rollbackTested) {
    reasons.push('rollback_not_tested_in_staging');
    if (status === 'VALID') status = 'HIGH_RISK';
  }
  if (!action.rollbackAutomatic && action.riskLevel === 'CRITICAL') {
    reasons.push('rollback_manual_required_for_critical');
    if (status === 'VALID') status = 'HIGH_RISK';
  }

  return {
    valid: status === 'VALID',
    status,
    rollbackDocumented: action.rollbackDocumented,
    rollbackTested: action.rollbackTested,
    rollbackAutomatic: action.rollbackAutomatic,
    estimatedRollbackMinutes: action.estimatedDurationMinutes || 5,
    reasons
  };
}

function validatePlanRollbacks(actions) {
  return (actions || []).map((a) => ({
    actionId: a.id || a.action,
    ...validateRollback(a.registryAction || a)
  }));
}

module.exports = { validateRollback, validatePlanRollbacks };
