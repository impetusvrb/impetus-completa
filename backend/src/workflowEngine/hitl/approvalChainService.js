'use strict';

const { v4: uuidv4 } = require('uuid');

function _log(event, data) {
  try {
    console.info('[WORKFLOW_APPROVAL_CHAIN]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function createApprovalStep({
  instanceId,
  companyId,
  stepIndex,
  nodeId,
  requiredHierarchy = 4,
  explainability = {}
}) {
  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_workflow_approval_chain
       (id, instance_id, company_id, step_index, node_id, required_hierarchy, status, explainability)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,'pending',$7::jsonb)`,
      [id, instanceId, companyId, stepIndex, nodeId, requiredHierarchy, JSON.stringify(explainability)]
    );
  } catch (err) {
    return { ok: false, error: err?.message };
  }
  _log('step_created', { approval_id: id, instance_id: instanceId });
  return { ok: true, approval_id: id };
}

async function listPending(companyId, limit = 50) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT a.*, i.process_key, i.correlation_id, i.current_state, i.context
     FROM industrial_workflow_approval_chain a
     JOIN industrial_workflow_instances i ON i.id = a.instance_id
     WHERE a.company_id = $1::uuid AND a.status = 'pending' AND i.status = 'running'
     ORDER BY a.created_at ASC LIMIT $2`,
    [companyId, Math.min(200, limit)]
  );
  return r.rows || [];
}

async function decide(approvalId, companyId, userId, decision, reason) {
  const db = require('../../db');
  const r = await db.query(
    `SELECT * FROM industrial_workflow_approval_chain WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId]
  );
  const row = r.rows[0];
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.status !== 'pending') return { ok: false, reason: 'not_pending', status: row.status };

  const status = decision === 'approve' ? 'approved' : 'rejected';
  await db.query(
    `UPDATE industrial_workflow_approval_chain
     SET status = $3, decided_by_user_id = $4::uuid, decided_at = now(),
         rejection_reason = $5, updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId, status, userId, reason || null]
  );

  _log('decided', { approval_id: approvalId, decision: status });
  return { ok: true, approval: row, decision: status };
}

module.exports = { createApprovalStep, listPending, decide };
