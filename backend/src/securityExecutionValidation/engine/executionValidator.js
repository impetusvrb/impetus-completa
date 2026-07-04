'use strict';

/**
 * SEC-12 — Execution Validator.
 * Produz VALID | INVALID | HIGH_RISK | BLOCKED
 */

const flags = require('../config/securityExecutionValidationFlags');
const registry = require('../registry/protectionActionRegistry');
const rollbackValidator = require('./rollbackValidator');
const impactAnalyzer = require('./changeImpactAnalyzer');
const approvalValidator = require('./approvalWorkflowValidator');
const metrics = require('../metrics/executionValidationMetrics');

function validateAction(entry, context) {
  const { approvalStatus, sec11Dashboard } = context;
  const registryAction = entry.registryAction || registry.getActionById(entry.actionId || entry.action);

  if (!registryAction) {
    metrics.increment('blocked_actions');
    return {
      actionId: entry.actionId || entry.action,
      verdict: 'INVALID',
      reasons: ['unknown_action_not_in_registry']
    };
  }

  if (registryAction.blockedInPhase) {
    metrics.increment('blocked_actions');
    return {
      actionId: registryAction.id,
      verdict: 'BLOCKED',
      reasons: [registryAction.blockReason || 'blocked_in_sec12']
    };
  }

  if (!flags.dryRunOnly()) {
    metrics.increment('blocked_actions');
    return {
      actionId: registryAction.id,
      verdict: 'BLOCKED',
      reasons: ['SECURITY_DRY_RUN_ONLY must remain true in SEC-12']
    };
  }

  const rollback = rollbackValidator.validateRollback(registryAction);
  const impact = impactAnalyzer.analyzeImpact(entry, registryAction);
  const approval = approvalValidator.validateApproval(
    approvalStatus?.request,
    sec11Dashboard?.recommendedProfile
  );

  const reasons = [];
  let verdict = 'VALID';

  for (const pre of registryAction.preconditions || []) {
    if (pre.includes('dual approval') && !approval.valid) {
      reasons.push(`precondition_unmet:${pre}`);
    }
  }

  if (rollback.status === 'INVALID') {
    verdict = 'INVALID';
    reasons.push(...rollback.reasons);
  } else if (rollback.status === 'HIGH_RISK') {
    verdict = 'HIGH_RISK';
    reasons.push(...rollback.reasons);
  }

  if (impact.canDropImpetus) {
    verdict = verdict === 'VALID' ? 'HIGH_RISK' : verdict;
    reasons.push('potential_impetus_unavailability');
  }

  if (impact.maxImpact === 'CRITICAL') {
    verdict = 'BLOCKED';
    reasons.push('critical_infrastructure_impact');
    metrics.increment('blocked_actions');
  }

  if (!approval.valid && registryAction.riskLevel === 'HIGH') {
    verdict = verdict === 'VALID' ? 'HIGH_RISK' : verdict;
    reasons.push(`approval:${approval.reason}`);
  }

  if (verdict === 'VALID') metrics.increment('validated_actions');

  return {
    actionId: registryAction.id,
    label: registryAction.label,
    verdict,
    rollback,
    impact,
    approval,
    preconditions: registryAction.preconditions,
    estimatedDurationMinutes: registryAction.estimatedDurationMinutes,
    reasons: [...new Set(reasons)]
  };
}

function validateProtectionPlan(sec11Dashboard) {
  const plan = sec11Dashboard?.protectionPlan;
  if (!plan) {
    return { planValid: false, actions: [], summary: 'no_protection_plan' };
  }

  const surfaceActions = plan.surfacePlan?.actions || [];
  const antiScanner = plan.antiScannerRecommendations || [];
  const allRaw = [...surfaceActions, ...antiScanner];

  const entries = allRaw.map((a) => {
    const reg = registry.mapPlanActionToRegistry(a);
    return { ...a, actionId: reg?.id || a.action, registryAction: reg };
  });

  const context = {
    approvalStatus: sec11Dashboard.approvalStatus,
    sec11Dashboard
  };

  const validations = entries.map((e) => validateAction(e, context));
  const blocked = validations.filter((v) => v.verdict === 'BLOCKED' || v.verdict === 'INVALID').length;
  const planValid = blocked === 0 && validations.some((v) => v.verdict === 'VALID' || v.verdict === 'HIGH_RISK');

  return { planValid, actions: validations, totalActions: validations.length, blocked };
}

module.exports = { validateAction, validateProtectionPlan };
