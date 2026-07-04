'use strict';

/**
 * SEC-13 — Controlled Execution Engine.
 */

const flags = require('../config/securityControlledExecutionFlags');
const metrics = require('../metrics/controlledExecutionMetrics');
const registry = require('../registry/actionExecutorRegistry');
const approval = require('./approvalEnforcementService');
const safeExec = require('./safeExecutionService');
const rollbackExec = require('./rollbackExecutionService');
const journal = require('./executionJournalService');
const safetyScore = require('./executionSafetyScore');
const { collectExecutionContext } = require('../collectors/executionContextCollector');
const {
  createControlledExecutionDashboardDto,
  freezeDto
} = require('../dto/controlledExecutionDto');

function selectAutoActions(context) {
  const sec12Ready = context.sec12?.dashboard?.readiness?.readyForSec13;
  const threatElevated =
    context.sec11?.dashboard?.recommendedProfile &&
    context.sec11.dashboard.recommendedProfile !== 'NORMAL';

  const base = ['generate_snapshot', 'consolidated_report'];
  if (threatElevated || sec12Ready) {
    base.push(
      'increase_log_level',
      'amplified_evidence_collection',
      'trigger_correlation_sec02',
      'trigger_integrity_sec04',
      'open_internal_incident'
    );
  }
  return [...new Set(base)];
}

function evaluateExecution(opts = {}) {
  if (!flags.isSecurityControlledExecutionEnabled() && !opts.force) return null;

  const start = Date.now();
  metrics.increment('controlled_executions');

  const context = collectExecutionContext();
  const executedActions = [];
  const blockedActions = [];
  const pendingApprovals = [];

  const planActions = context.sec12?.dashboard?.planValidation?.actions || [];
  const blockedPlan = approval.enforceManualOnlyBlock(
    planActions.map((a) => ({ actionId: a.actionId, verdict: a.verdict }))
  );
  for (const b of blockedPlan.filter((x) => x.executionBlocked)) {
    blockedActions.push({ actionId: b.actionId, reason: b.reason, source: 'SEC-12_plan' });
  }

  if (context.sec11?.dashboard?.approvalStatus?.status === 'PENDING') {
    pendingApprovals.push({
      type: 'plan_approval',
      status: 'PENDING',
      planId: context.sec11.dashboard.protectionPlan?.planId
    });
  }

  const autoActionIds = selectAutoActions(context);
  let failures = 0;

  for (const actionId of autoActionIds) {
    const eligibility = approval.validateExecutionEligibility(actionId, {
      ...context,
      requirePlanApproval: false
    });

    if (!eligibility.eligible) {
      blockedActions.push({ actionId, ...eligibility });
      continue;
    }

    const record = safeExec.executeAction(actionId, context);
    if (!record.ok && !record.skipped) failures += 1;

    journal.append({
      type: 'EXECUTION',
      actionId,
      planId: context.sec11?.dashboard?.protectionPlan?.planId,
      validationScore: context.sec12?.dashboard?.execution_readiness_score,
      execution: record,
      operator: 'system'
    });

    executedActions.push(record);
  }

  const safety = safetyScore.computeExecutionSafetyScore({
    executions: executedActions,
    blocked: blockedActions,
    failures,
    rollbacksAvailable: executedActions.filter((e) => e.rollback).length
  });
  metrics.setSafetyScore(safety.execution_safety_score);

  const dashboard = createControlledExecutionDashboardDto({
    enabled: flags.isSecurityControlledExecutionEnabled(),
    auto_execution_level: flags.autoExecutionLevel(),
    manual_approval_required: flags.manualApprovalRequired(),
    executionStatus: executedActions.length > 0 ? 'COMPLETED' : 'IDLE',
    executedActions,
    pendingApprovals,
    blockedActions,
    rollbackAvailable: executedActions.some((e) => e.rollback && e.rollback.action !== 'none_required'),
    executionHistory: journal.getHistory(20),
    executionSafetyScore: safety.execution_safety_score,
    sec11_snapshot: context.sec11?.dashboard
      ? {
          recommendedProfile: context.sec11.dashboard.recommendedProfile,
          planId: context.sec11.dashboard.protectionPlan?.planId
        }
      : null,
    sec12_snapshot: context.sec12?.dashboard
      ? {
          readiness: context.sec12.dashboard.execution_readiness_score,
          sec13_eligible: context.sec12.dashboard.sec13_eligible
        }
      : null,
    auto_executable_catalog: registry.getAutoExecutableActions(),
    metrics: metrics.getSnapshot()
  });

  metrics.recordDuration(Date.now() - start);
  return freezeDto(dashboard);
}

function rollbackExecution(executionId) {
  const history = journal.getHistory(100);
  const entry = history.find((h) => h.execution?.executionId === executionId);
  if (!entry?.execution) return { ok: false, reason: 'execution_not_found' };
  const result = rollbackExec.executeRollback(entry.execution);
  journal.append({ type: 'ROLLBACK', executionId, result, operator: 'system' });
  return result;
}

module.exports = { evaluateExecution, rollbackExecution, selectAutoActions };
