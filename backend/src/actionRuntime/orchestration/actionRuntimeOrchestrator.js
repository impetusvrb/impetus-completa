'use strict';

/**
 * Orquestrador Action Runtime — propose → HITL → execute → trace → rollback.
 */

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/actionRuntimeFlags');
const policy = require('../governance/actionToolPolicyRegistry');
const explain = require('../explainability/actionExplainabilityService');
const tracer = require('../execution/actionExecutionTracer');
const approvalQueue = require('../hitl/approvalQueueService');
const rollback = require('../execution/actionRollbackService');

function _normalizeResult(toolName, raw) {
  const r = raw && typeof raw === 'object' ? { ...raw } : { ok: false };
  if (toolName === 'criar_tarefa' && r.taskId) r.task_id = r.taskId;
  if (toolName === 'criar_lembrete' && r.taskId) r.reminder_id = r.taskId;
  return r;
}

async function _executeDirect(toolName, args, ctx) {
  const registry = require('../../services/operational/operationalToolRegistry');
  return registry.executeToolApproved(toolName, args, {
    ...ctx,
    _hitl_approved: true
  });
}

/**
 * Entrada principal — substitui executeTool no chat quando action runtime activo.
 */
async function executeToolCall(toolName, args, ctx = {}) {
  if (!flags.shouldUseActionRuntime(ctx.companyId)) {
    const registry = require('../../services/operational/operationalToolRegistry');
    return registry.executeTool(toolName, args, ctx);
  }

  if (!ctx.companyId) {
    return { ok: false, message: 'Contexto de empresa ausente.' };
  }

  const explanation = explain.buildExplanation(toolName, args, ctx);
  const p = policy.getToolPolicy(toolName);
  const needsApproval = policy.requiresApproval(toolName);
  const mode = flags.actionRuntimeMode();

  const traceRecord = await tracer.createTrace({
    company_id: ctx.companyId,
    tool_name: toolName,
    mode,
    status: 'proposed',
    requested_by_user_id: ctx.userId,
    tool_args: args,
    explainability: explanation,
    rollback_available: p.rollback_supported
  });

  if (flags.isShadowMode()) {
    await tracer.updateTrace(traceRecord.trace_id, ctx.companyId, {
      status: 'shadow_simulated',
      execution_result: { shadow: true, message: `[Shadow] ${toolName} não executado.` }
    });
    return {
      ok: true,
      shadow: true,
      status: 'shadow',
      trace_id: traceRecord.trace_id,
      message: `[Shadow] Ação "${toolName}" registada para auditoria. Nenhum efeito lateral.`,
      explainability: explanation.summary
    };
  }

  if (!needsApproval) {
    const t0 = Date.now();
    const result = await _executeDirect(toolName, args, ctx);
    const normalized = _normalizeResult(toolName, result);
    await tracer.updateTrace(traceRecord.trace_id, ctx.companyId, {
      status: normalized.ok ? 'executed' : 'failed',
      execution_result: normalized,
      duration_ms: Date.now() - t0
    });
    return {
      ...result,
      trace_id: traceRecord.trace_id,
      status: normalized.ok ? 'executed' : 'failed',
      auto_executed: true
    };
  }

  const enq = await approvalQueue.enqueueApproval({
    toolName,
    args,
    ctx,
    traceRecord,
    explanation
  });

  if (!enq.ok) {
    return { ok: false, message: enq.error || 'Falha ao enfileirar aprovação.' };
  }

  await tracer.updateTrace(traceRecord.trace_id, ctx.companyId, { status: 'pending_approval' });

  return {
    ok: true,
    status: 'pending_approval',
    approval_id: enq.approval_id,
    trace_id: enq.trace_id,
    message:
      `Ação "${toolName}" aguarda aprovação humana (risco ${p.risk}). ` +
      `ID: ${enq.approval_id}. Um supervisor deve aprovar em Centro de Aprovações IA.`,
    explainability: explanation.summary,
    requires_human_approval: true
  };
}

async function approveAndExecute(approvalId, companyId, approverUserId) {
  if (!flags.allowsRealExecution() && !flags.isAuditMode()) {
    return { ok: false, reason: 'mode_not_executable', mode: flags.actionRuntimeMode() };
  }

  const appr = await approvalQueue.approve(approvalId, companyId, approverUserId);
  if (!appr.ok) return appr;

  const item = appr.approval;
  const args = typeof item.tool_args === 'object' ? item.tool_args : JSON.parse(item.tool_args || '{}');
  const ctx = {
    companyId,
    userId: item.requested_by_user_id,
    conversationId: item.conversation_id,
    approverUserId
  };

  if (flags.isAuditMode()) {
    await tracer.updateTrace(item.trace_id, companyId, {
      status: 'audit_approved_not_executed',
      executed_by_user_id: approverUserId,
      execution_result: { audit_only: true, would_execute: { tool: item.tool_name, args } }
    });
    return {
      ok: true,
      status: 'audit_approved',
      trace_id: item.trace_id,
      message: '[Audit] Aprovação registada. Execução real bloqueada em modo audit.'
    };
  }

  const t0 = Date.now();
  let previousStatus = null;
  if (item.tool_name === 'atualizar_status_tarefa' && args.tarefa_id) {
    try {
      const db = require('../../db');
      const r = await db.query('SELECT status FROM tasks WHERE id = $1::uuid AND company_id = $2::uuid', [
        args.tarefa_id,
        companyId
      ]);
      previousStatus = r.rows[0]?.status || null;
    } catch (_e) {}
  }

  const result = await _executeDirect(item.tool_name, args, ctx);
  const normalized = _normalizeResult(item.tool_name, result);
  if (previousStatus) normalized.previous_status = previousStatus;

  await tracer.updateTrace(item.trace_id, companyId, {
    status: normalized.ok ? 'executed' : 'failed',
    executed_by_user_id: approverUserId,
    execution_result: normalized,
    duration_ms: Date.now() - t0
  });

  const governanceEvents = require('../integration/governanceBackboneEvents');
  governanceEvents.publishGovernanceActionEvent('governance.action.executed', {
    companyId,
    correlationId: item.trace_id,
    payload: { tool_name: item.tool_name, approval_id: approvalId, ok: normalized.ok }
  });

  return {
    ok: normalized.ok,
    status: normalized.ok ? 'executed' : 'failed',
    trace_id: item.trace_id,
    result: normalized,
    message: normalized.message || (normalized.ok ? 'Ação executada após aprovação.' : 'Falha na execução.')
  };
}

function getHealth() {
  const registry = require('../../services/operational/operationalToolRegistry');
  return {
    mode: flags.actionRuntimeMode(),
    enabled: flags.isActionRuntimeEnabled(),
    pilot_tenants: flags.pilotTenants(),
    legacy_tool_calling: flags.legacyToolCallingEnabled(),
    tool_registry_enabled: registry.isEnabled(),
    policies: policy.listPolicies()
  };
}

module.exports = {
  executeToolCall,
  approveAndExecute,
  getHealth,
  rollbackExecution: rollback.rollbackExecution
};
