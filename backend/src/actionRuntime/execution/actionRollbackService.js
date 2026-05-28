'use strict';

const tracer = require('./actionExecutionTracer');
const policy = require('../governance/actionToolPolicyRegistry');

function _log(event, data) {
  try {
    console.info('[ACTION_ROLLBACK]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function rollbackExecution(traceId, companyId, userId) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT * FROM ai_action_execution_traces WHERE trace_id = $1 AND company_id = $2::uuid`,
    [traceId, companyId]
  );
  const row = r.rows[0];
  if (!row) return { ok: false, reason: 'trace_not_found' };
  if (row.rolled_back_at) return { ok: false, reason: 'already_rolled_back' };
  if (!row.rollback_available) return { ok: false, reason: 'rollback_not_supported' };
  if (row.status !== 'executed') return { ok: false, reason: 'not_executed', status: row.status };

  const toolName = row.tool_name;
  const result = row.execution_result || {};
  const p = policy.getToolPolicy(toolName);
  if (!p.rollback_supported) return { ok: false, reason: 'policy_no_rollback' };

  let rollbackResult = { ok: false };

  try {
    if (toolName === 'criar_tarefa' && result.task_id) {
      await db.query(
        `UPDATE tasks SET status = 'cancelled', updated_at = now()
         WHERE id = $1::uuid AND company_id = $2::uuid`,
        [result.task_id, companyId]
      );
      rollbackResult = { ok: true, action: 'task_cancelled', task_id: result.task_id };
    } else if (toolName === 'criar_lembrete' && result.reminder_id) {
      await db.query(
        `UPDATE tasks SET status = 'cancelled', updated_at = now()
         WHERE id = $1::uuid AND company_id = $2::uuid`,
        [result.reminder_id, companyId]
      );
      rollbackResult = { ok: true, action: 'reminder_cancelled', reminder_id: result.reminder_id };
    } else if (toolName === 'atualizar_status_tarefa' && result.task_id && result.previous_status) {
      await db.query(
        `UPDATE tasks SET status = $3, updated_at = now()
         WHERE id = $1::uuid AND company_id = $2::uuid`,
        [result.task_id, companyId, result.previous_status]
      );
      rollbackResult = { ok: true, action: 'status_reverted', task_id: result.task_id };
    } else {
      rollbackResult = { ok: false, reason: 'missing_rollback_metadata' };
    }
  } catch (err) {
    rollbackResult = { ok: false, error: err?.message };
  }

  if (rollbackResult.ok) {
    await tracer.updateTrace(traceId, companyId, {
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString(),
      rollback_result: rollbackResult
    });
    await db.query(
      `UPDATE ai_action_approval_queue SET status = 'rolled_back', updated_at = now()
       WHERE trace_id = $1 AND company_id = $2::uuid`,
      [traceId, companyId]
    );
  }

  _log('rollback', { trace_id: traceId, ...rollbackResult, user_id: userId });

  if (rollbackResult.ok) {
    try {
      const governanceEvents = require('../integration/governanceBackboneEvents');
      governanceEvents.publishGovernanceActionEvent('governance.action.rolled_back', {
        companyId,
        correlationId: traceId,
        payload: { tool_name: toolName, trace_id: traceId, ...rollbackResult }
      });
    } catch (_e) {}
  }

  return rollbackResult;
}

module.exports = { rollbackExecution };
