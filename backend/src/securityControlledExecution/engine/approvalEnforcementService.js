'use strict';

/**
 * SEC-13 — Approval Enforcement.
 * MANUAL_ONLY nunca executa sem aprovação válida.
 */

const flags = require('../config/securityControlledExecutionFlags');
const registry = require('../registry/actionExecutorRegistry');
const metrics = require('../metrics/controlledExecutionMetrics');

function validateExecutionEligibility(actionId, context) {
  if (registry.isManualOnly(actionId)) {
    metrics.increment('blocked_actions');
    const entry = registry.getManualOnlyEntry(actionId);
    return {
      eligible: false,
      blocked: true,
      reason: entry?.reason || 'manual_only',
      requiresApproval: true
    };
  }

  if (!registry.isAutoExecutable(actionId)) {
    metrics.increment('blocked_actions');
    return { eligible: false, blocked: true, reason: 'not_in_auto_registry' };
  }

  if (flags.autoExecutionLevel() !== 'LOW') {
    metrics.increment('blocked_actions');
    return { eligible: false, blocked: true, reason: 'auto_level_not_low' };
  }

  const sec12 = context.sec12?.dashboard;
  if (sec12 && sec12.dry_run_only === false) {
    metrics.increment('blocked_actions');
    return { eligible: false, blocked: true, reason: 'sec12_dry_run_disabled_unexpected' };
  }

  const approval = context.sec11?.dashboard?.approvalStatus;
  if (flags.manualApprovalRequired() && context.requirePlanApproval) {
    if (!approval?.request || approval.status === 'PENDING') {
      metrics.increment('blocked_actions');
      return {
        eligible: false,
        blocked: true,
        reason: 'plan_approval_pending',
        requiresApproval: true
      };
    }
    if (approval.request?.revoked) {
      metrics.increment('blocked_actions');
      return { eligible: false, blocked: true, reason: 'approval_revoked' };
    }
    const requestedAt = new Date(approval.request.requestedAt || 0).getTime();
    if (requestedAt && Date.now() - requestedAt > 4 * 3600000) {
      metrics.increment('blocked_actions');
      return { eligible: false, blocked: true, reason: 'approval_expired' };
    }
  }

  return { eligible: true, blocked: false, classification: 'AUTO_EXECUTABLE' };
}

function enforceManualOnlyBlock(planActions) {
  return (planActions || []).map((a) => {
    const id = a.actionId || a.action || a.id;
    if (registry.isManualOnly(id)) {
      metrics.increment('blocked_actions');
      return { ...a, executionBlocked: true, reason: registry.getManualOnlyEntry(id)?.reason };
    }
    return { ...a, executionBlocked: false };
  });
}

module.exports = { validateExecutionEligibility, enforceManualOnlyBlock };
