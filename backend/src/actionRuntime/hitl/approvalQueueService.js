'use strict';

const { v4: uuidv4 } = require('uuid');
const tracer = require('../execution/actionExecutionTracer');
const explain = require('../explainability/actionExplainabilityService');
const policy = require('../governance/actionToolPolicyRegistry');

function _log(event, data) {
  try {
    console.info('[ACTION_APPROVAL_QUEUE]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function enqueueApproval({ toolName, args, ctx, traceRecord, explanation }) {
  const id = uuidv4();
  const p = policy.getToolPolicy(toolName);
  const row = {
    id,
    company_id: ctx.companyId,
    requested_by_user_id: ctx.userId || null,
    conversation_id: ctx.conversationId || null,
    trace_id: traceRecord.trace_id,
    tool_name: toolName,
    risk_level: p.risk,
    tool_args: args,
    status: 'pending',
    explainability: explanation,
    approval_required: true,
    execution_trace_id: traceRecord.id,
    metadata: { mode: traceRecord.mode, category: p.category }
  };

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO ai_action_approval_queue
       (id, company_id, requested_by_user_id, conversation_id, trace_id, tool_name,
        risk_level, tool_args, status, explainability, approval_required, execution_trace_id, metadata)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11,$12::uuid,$13::jsonb)`,
      [
        row.id,
        row.company_id,
        row.requested_by_user_id,
        row.conversation_id,
        row.trace_id,
        row.tool_name,
        row.risk_level,
        JSON.stringify(row.tool_args),
        row.status,
        JSON.stringify(row.explainability),
        row.approval_required,
        row.execution_trace_id,
        JSON.stringify(row.metadata)
      ]
    );
  } catch (err) {
    _log('enqueue_err', { error: err?.message, tool: toolName });
    return { ok: false, error: err?.message };
  }

  _log('enqueued', { approval_id: id, tool: toolName, trace_id: row.trace_id });
  return { ok: true, approval_id: id, status: 'pending_approval', trace_id: row.trace_id };
}

async function listPending(companyId, opts = {}) {
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT * FROM ai_action_approval_queue
       WHERE company_id = $1::uuid AND status = 'pending'
       ORDER BY created_at ASC
       LIMIT $2`,
      [companyId, limit]
    );
    return { items: r.rows || [], count: (r.rows || []).length };
  } catch (err) {
    if (err.code === '42P01') return { items: [], count: 0, table_missing: true };
    throw err;
  }
}

async function getById(approvalId, companyId) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT * FROM ai_action_approval_queue WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId]
  );
  return r.rows[0] || null;
}

async function approve(approvalId, companyId, approverUserId) {
  const item = await getById(approvalId, companyId);
  if (!item) return { ok: false, reason: 'not_found' };
  if (item.status !== 'pending') return { ok: false, reason: 'not_pending', status: item.status };

  const db = require('../../db');
  await db.query(
    `UPDATE ai_action_approval_queue
     SET status = 'approved', approved_by_user_id = $3::uuid, approved_at = now(), updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId, approverUserId]
  );

  _log('approved', { approval_id: approvalId, approver: approverUserId });
  return { ok: true, approval: item };
}

async function reject(approvalId, companyId, rejectorUserId, reason) {
  const item = await getById(approvalId, companyId);
  if (!item) return { ok: false, reason: 'not_found' };
  if (item.status !== 'pending') return { ok: false, reason: 'not_pending' };

  const db = require('../../db');
  await db.query(
    `UPDATE ai_action_approval_queue
     SET status = 'rejected', rejected_by_user_id = $3::uuid, rejected_at = now(),
         rejection_reason = $4, updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId, rejectorUserId, reason ? String(reason).slice(0, 1000) : null]
  );

  await tracer.updateTrace(item.trace_id, companyId, {
    status: 'rejected',
    error_message: reason || 'rejected_by_human'
  });

  _log('rejected', { approval_id: approvalId, rejector: rejectorUserId });

  try {
    const governanceEvents = require('../integration/governanceBackboneEvents');
    governanceEvents.publishGovernanceActionEvent('governance.action.rejected', {
      companyId,
      correlationId: item.trace_id,
      payload: { tool_name: item.tool_name, approval_id: approvalId, reason: reason || null }
    });
  } catch (_e) {}

  return { ok: true };
}

module.exports = {
  enqueueApproval,
  listPending,
  getById,
  approve,
  reject
};
