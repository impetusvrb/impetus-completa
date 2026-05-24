'use strict';

const flags = require('../config/sz4FeatureFlags');
const govFlags = require('../config/sz4GovernanceFlags');
const pipelineCore = require('../_core/sz4PipelineCore');
const store = require('../_core/sz4TenantStore');
const metrics = require('../observability/operationalNervousSystemMetrics');
const internalChat = require('../internal-chat/internalChatOperationalRuntime');

function resolveStage(tenantId) {
  return pipelineCore.resolveStageForTenant(tenantId);
}

function applyOperationalNervousSystem(user = {}, upstreamPayload = {}, ctx = {}) {
  if (!flags.isEnabled()) {
    return { skipped: true, reason: 'sz4_disabled' };
  }

  const tenantId = ctx?.tenant_id || user?.company_id || null;
  const stageInfo = resolveStage(tenantId);

  try {
    const workflows = store.listWorkflows(tenantId);
    const tasks = store.listTasks(tenantId);
    const reminders = store.listReminders(tenantId);
    const observability = metrics.snapshot(tenantId);

  const governance = evaluateGovernance({ stage: stageInfo.stage, tasks, workflows });

    return {
      payload: {
        runtime_z_operational_nervous_system: govFlags.enforceAssistiveOnly({
          stage: stageInfo.stage,
          tenant_promoted: stageInfo.tenant_promoted,
          auto_promotion: false,

          continuity: {
            active_workflows: workflows.filter((w) => w.closure_state !== 'closed').length,
            active_tasks: tasks.filter((t) => t.completion_state !== 'done').length,
            scheduled_reminders: reminders.filter((r) => r.status === 'scheduled').length,
            thread_aware: true
          },
          tasks: tasks.slice(-12),
          workflows: workflows.slice(-12),
          reminders: reminders.slice(-12),
          awareness: {
            recent_signals: observability.events.filter((e) =>
              ['SILENCE_DETECTED', 'DELAY_DETECTED', 'OPERATIONAL_RISK_INFERRED', 'EXECUTIVE_RELEVANCE_DETECTED'].includes(e.type)
            ).slice(-8)
          },
          observation: {
            selective: true,
            budget_per_hour: flags.observationBudgetPerHour(),
            throttle_ms: flags.cognitiveThrottleMs()
          },
          reintegration: {
            thread_aware: flags.isReintegrationEnabled(),
            assistive_only: true
          },
          voice_identity: {
            preparation_only: true,
            biometric_enforcement: false,
            active_authentication: false
          },
          governance,
          metrics: observability.scores,
          observability,
          upstream_sz2: upstreamPayload?.runtime_z_cognitive_os || null,
          upstream_sz3: upstreamPayload?.runtime_z_maturation || null,
          invariants: flags.invariants
        })
      }
    };
  } catch (err) {
    const resilience = require('../resilience/operationalRecoveryRuntime');
    return resilience.applyFallback({ tenantId, error: err?.message });
  }
}

function evaluateGovernance({ stage, tasks = [], workflows = [] }) {
  const checks = govFlags.assertNoAutonomousExecution({ stage });
  return {
    ...checks,
    assistive_only: true,
    approval_required: true,
    tenant_isolated: true,
    hierarchy_safe: true,
    tasks_prepared: tasks.filter((t) => t.prepared_only).length,
    workflows_open: workflows.filter((w) => w.closure_state !== 'closed').length,
    auto_execution: false,
    auto_escalation: false
  };
}

async function processMessage(input = {}) {
  if (input.sourceType === 'chat_interno' || input.conversationId) {
    return internalChat.processInternalChatMessage(input);
  }
  return pipelineCore.processOperationalSignal(input);
}

async function validateHumanAction(user = {}, body = {}) {
  const hitl = require('../config/sz4HitlPolicies');
  const envelope = hitl.buildHitlEnvelope(body.action || {}, user);
  metrics.emit('HUMAN_VALIDATION_REQUIRED', { tenant_id: user?.company_id, status: body.status || 'reviewed' });
  return {
    ok: true,
    validated: body.status === 'approved',
    envelope,
    assistive_only: true,
    auto_execution: false
  };
}

module.exports = {
  applyOperationalNervousSystem,
  resolveStage,
  processMessage,
  validateHumanAction,
  evaluateGovernance
};
