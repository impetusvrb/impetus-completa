'use strict';

/**
 * Domain Publication Approval Service — HITL obrigatório.
 *
 * Garante que nenhuma publicação definitiva em Safety/Environment ocorra
 * sem aprovação humana de engenheiro responsável.
 *
 * Integra com:
 *   - domainPolicyEvaluator (classificação)
 *   - industrialAuditStructure (audit imutável)
 *   - RBAC publication roles (viewer/operator/approver)
 *
 * Tabela: domain_publication_approvals
 */

const { v4: uuidv4 } = require('uuid');

const PUBLICATION_ROLES = Object.freeze({
  safety: {
    approvers: ['safety_engineer', 'manager_safety', 'coordinator_safety', 'director_industrial'],
    operators: ['supervisor_safety', 'technician_safety'],
    viewers: ['operator', 'colaborador']
  },
  environment: {
    approvers: ['environmental_engineer', 'manager_environment', 'coordinator_environment', 'director_industrial'],
    operators: ['supervisor_environment', 'technician_environment'],
    viewers: ['operator', 'colaborador']
  }
});

function _log(event, data) {
  try {
    console.info('[DOMAIN_PUB_APPROVAL]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_) {}
}

function _getDb() {
  return require('../../db');
}

function _getAudit() {
  return require('../industrialAuditStructure');
}

function resolveRoleClass(domain, userRole) {
  const roles = PUBLICATION_ROLES[domain];
  if (!roles) return 'viewer';
  const r = String(userRole || '').toLowerCase();
  if (roles.approvers.includes(r)) return 'approver';
  if (roles.operators.includes(r)) return 'operator';
  return 'viewer';
}

function canApprove(domain, userRole) {
  return resolveRoleClass(domain, userRole) === 'approver';
}

function canOperate(domain, userRole) {
  const cls = resolveRoleClass(domain, userRole);
  return cls === 'approver' || cls === 'operator';
}

/**
 * Submete pedido de publicação para aprovação humana.
 * @param {{ domain: string, action_type: string, company_id: string, requested_by_user_id: string, responsible_engineer_id?: string, policy_evaluation: object, context_payload?: object }} params
 */
async function submitForApproval(params) {
  const { domain, action_type, company_id, requested_by_user_id, responsible_engineer_id, policy_evaluation, context_payload } = params;

  if (!responsible_engineer_id) {
    _log('submission_rejected', { reason: 'no_responsible_engineer', domain, company_id });
    return { ok: false, reason: 'responsible_engineer_id_required' };
  }

  const id = uuidv4();
  const db = _getDb();

  try {
    await db.query(
      `INSERT INTO domain_publication_approvals
       (id, company_id, domain, action_type, requested_by_user_id, responsible_engineer_id,
        status, policy_evaluation, context_payload)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::uuid, 'pending', $7::jsonb, $8::jsonb)`,
      [id, company_id, domain, action_type, requested_by_user_id, responsible_engineer_id,
        JSON.stringify(policy_evaluation || {}), JSON.stringify(context_payload || {})]
    );
  } catch (err) {
    _log('submission_error', { error: err?.message, domain });
    return { ok: false, error: err?.message };
  }

  const audit = _getAudit();
  await audit.writeIndustrialAuditEvent({
    event_type: 'approval_requested',
    domain,
    actor_id: requested_by_user_id,
    actor_role: 'requester',
    company_id,
    traceability_id: id,
    payload: { action_type, responsible_engineer_id, policy_triggered: policy_evaluation?.policies_triggered?.length || 0 },
    severity: 'info'
  });

  _log('submitted', { approval_id: id, domain, action_type });
  return { ok: true, approval_id: id, status: 'pending' };
}

/**
 * Aprova uma publicação pendente. Exige papel approver + four-eyes (approver ≠ requester).
 */
async function approve(approvalId, companyId, approverUserId, approverRole) {
  if (!canApprove(null, approverRole)) {
    const domainGuess = await _getDomainFromApproval(approvalId, companyId);
    if (!canApprove(domainGuess, approverRole)) {
      _log('approve_denied', { reason: 'role_insufficient', role: approverRole });
      return { ok: false, reason: 'approver_role_required' };
    }
  }

  const db = _getDb();
  const existing = await db.query(
    'SELECT * FROM domain_publication_approvals WHERE id = $1::uuid AND company_id = $2::uuid',
    [approvalId, companyId]
  );
  const item = existing.rows[0];
  if (!item) return { ok: false, reason: 'not_found' };
  if (item.status !== 'pending') return { ok: false, reason: 'not_pending', status: item.status };

  if (item.requested_by_user_id === approverUserId) {
    _log('approve_denied', { reason: 'four_eyes_violation', approval_id: approvalId });
    return { ok: false, reason: 'four_eyes_violation', message: 'Aprovador não pode ser o mesmo que solicitou.' };
  }

  await db.query(
    `UPDATE domain_publication_approvals
     SET status = 'approved', approved_by_user_id = $3::uuid, approved_at = now(), updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId, approverUserId]
  );

  const audit = _getAudit();
  await audit.writeIndustrialAuditEvent({
    event_type: 'approval_granted',
    domain: item.domain,
    actor_id: approverUserId,
    actor_role: approverRole,
    company_id: companyId,
    traceability_id: approvalId,
    payload: { action_type: item.action_type, requester: item.requested_by_user_id },
    severity: 'info'
  });

  _log('approved', { approval_id: approvalId, approver: approverUserId, domain: item.domain });
  return { ok: true, approval_id: approvalId, status: 'approved', domain: item.domain };
}

/**
 * Rejeita uma publicação pendente.
 */
async function reject(approvalId, companyId, rejectorUserId, rejectorRole, reason) {
  const db = _getDb();
  const existing = await db.query(
    'SELECT * FROM domain_publication_approvals WHERE id = $1::uuid AND company_id = $2::uuid',
    [approvalId, companyId]
  );
  const item = existing.rows[0];
  if (!item) return { ok: false, reason: 'not_found' };
  if (item.status !== 'pending') return { ok: false, reason: 'not_pending' };

  await db.query(
    `UPDATE domain_publication_approvals
     SET status = 'rejected', rejected_by_user_id = $3::uuid, rejected_at = now(),
         rejection_reason = $4, updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [approvalId, companyId, rejectorUserId, reason ? String(reason).slice(0, 2000) : null]
  );

  const audit = _getAudit();
  await audit.writeIndustrialAuditEvent({
    event_type: 'approval_denied',
    domain: item.domain,
    actor_id: rejectorUserId,
    actor_role: rejectorRole,
    company_id: companyId,
    traceability_id: approvalId,
    payload: { action_type: item.action_type, reason: reason || null },
    severity: 'warn'
  });

  _log('rejected', { approval_id: approvalId, rejector: rejectorUserId });
  return { ok: true, approval_id: approvalId, status: 'rejected' };
}

async function listPending(companyId, domain, opts = {}) {
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  const db = _getDb();
  try {
    const r = await db.query(
      `SELECT * FROM domain_publication_approvals
       WHERE company_id = $1::uuid AND domain = $2 AND status = 'pending'
       ORDER BY created_at ASC LIMIT $3`,
      [companyId, domain, limit]
    );
    return { ok: true, items: r.rows, count: r.rows.length };
  } catch (err) {
    if (err.code === '42P01') return { ok: true, items: [], count: 0, table_missing: true };
    return { ok: false, error: err?.message };
  }
}

async function _getDomainFromApproval(approvalId, companyId) {
  try {
    const db = _getDb();
    const r = await db.query(
      'SELECT domain FROM domain_publication_approvals WHERE id = $1::uuid AND company_id = $2::uuid',
      [approvalId, companyId]
    );
    return r.rows[0]?.domain || null;
  } catch (_) { return null; }
}

module.exports = {
  submitForApproval,
  approve,
  reject,
  listPending,
  canApprove,
  canOperate,
  resolveRoleClass,
  PUBLICATION_ROLES
};
