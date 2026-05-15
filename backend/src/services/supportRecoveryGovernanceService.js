/**
 * IMPETUS Fase 2 — Support Recovery Governance
 * Camada separada da governança interna do tenant; operações auditadas; sem bypass de auth tenant.
 */

'use strict';

const db = require('../db');
const tenantAdminService = require('./tenantAdminService');
const { logAdminAction } = require('./adminPortalLogService');

const FEATURE_ENV = 'IMPETUS_SUPPORT_RECOVERY_ENABLED';
const TTL_ENV = 'IMPETUS_SUPPORT_RECOVERY_EXECUTE_TTL_MINUTES';

function isFeatureEnabled() {
  return String(process.env[FEATURE_ENV] || 'true').toLowerCase() !== 'false';
}

function executeTtlMinutes() {
  const n = parseInt(process.env[TTL_ENV] || '60', 10);
  return Number.isFinite(n) && n > 0 && n <= 24 * 60 ? n : 60;
}

function logSupport(tag, payload) {
  try {
    console.log(tag, payload);
  } catch (_) {}
}

async function appendAuditEvent({ operationId, eventType, actorAdminId, payload, ip }) {
  await db.query(
    `INSERT INTO support_recovery_audit_events (operation_id, event_type, actor_admin_id, payload, ip_address)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [operationId, eventType, actorAdminId || null, JSON.stringify(payload || {}), ip || null]
  );
}

/**
 * Utilizadores com capacidade de gestão tenant (primary/recovery activos e user activo).
 */
async function listManageCapabilityUserIds(companyId) {
  const r = await db.query(
    `SELECT ta.user_id::text
     FROM tenant_admins ta
     INNER JOIN users u ON u.id = ta.user_id AND u.company_id = ta.company_id
     WHERE ta.company_id = $1
       AND ta.status = 'active'
       AND ta.admin_type IN ('primary', 'recovery')
       AND u.deleted_at IS NULL
       AND u.active = true`,
    [companyId]
  );
  return r.rows.map((row) => row.user_id);
}

/**
 * Tenant sem ninguém com primary/recovery operacional.
 */
async function isTenantGovernanceOrphan(companyId) {
  const ids = await listManageCapabilityUserIds(companyId);
  return ids.length === 0;
}

async function getGovernanceSnapshot(companyId) {
  const company = await db.query(
    `SELECT id, name, cnpj, email_responsavel, tenant_status, active
     FROM companies WHERE id = $1 LIMIT 1`,
    [companyId]
  );
  if (!company.rows.length) {
    return { ok: false, code: 'COMPANY_NOT_FOUND', error: 'Empresa não encontrada' };
  }
  let tenantAdmins = [];
  try {
    tenantAdmins = await tenantAdminService.listTenantAdmins(companyId);
  } catch (e) {
    tenantAdmins = [];
  }
  const orphan = await isTenantGovernanceOrphan(companyId);
  const founder = await db.query(
    `SELECT u.id::text, u.name, u.email, u.active
     FROM users u
     WHERE u.company_id = $1 AND COALESCE(u.is_company_root, false) = true AND u.deleted_at IS NULL
     LIMIT 5`,
    [companyId]
  );
  return {
    ok: true,
    company: company.rows[0],
    tenant_admins: tenantAdmins,
    is_orphan: orphan,
    founder_users: founder.rows
  };
}

async function createOperation({
  companyId,
  recoveryReason,
  ticketReference,
  ownershipNotes,
  forcedNonOrphan,
  requestedByAdminId,
  requestIp,
  userAgent
}) {
  if (!isFeatureEnabled()) {
    return { ok: false, code: 'FEATURE_DISABLED', error: 'Support recovery desactivado' };
  }
  const reason = String(recoveryReason || '').trim();
  const ticket = String(ticketReference || '').trim();
  if (reason.length < 10) {
    return { ok: false, code: 'INVALID_REASON', error: 'Motivo deve ter pelo menos 10 caracteres' };
  }
  if (ticket.length < 4) {
    return { ok: false, code: 'INVALID_TICKET', error: 'Referência de ticket obrigatória (mín. 4 caracteres)' };
  }

  const snap = await db.query(
    `SELECT json_agg(json_build_object(
      'id', ta.id, 'user_id', ta.user_id, 'admin_type', ta.admin_type, 'status', ta.status
    )) AS j
     FROM tenant_admins ta WHERE ta.company_id = $1 AND ta.status = 'active'`,
    [companyId]
  );
  const previousSnapshot = snap.rows[0]?.j || [];

  const orphan = await isTenantGovernanceOrphan(companyId);
  if (!orphan && !forcedNonOrphan) {
    logSupport('[SUPPORT_RECOVERY_NOT_ORPHAN_BLOCKED]', { company_id: companyId, blocked: true });
    return {
      ok: false,
      code: 'NOT_ORPHAN',
      error:
        'Tenant não está órfão (existe primary/recovery activo). Use confirmação explícita no portal (forçar) se for caso excepcional.'
    };
  }
  if (orphan) {
    logSupport('[TENANT_ORPHAN_DETECTED]', { company_id: companyId, action: 'support_recovery_init_allowed' });
  }

  const ins = await db.query(
    `INSERT INTO support_recovery_operations (
      company_id, status, recovery_reason, recovery_type, ticket_reference, ownership_notes,
      requested_by_admin_id, previous_tenant_admins_snapshot, forced_non_orphan, request_ip, user_agent_request
    ) VALUES ($1, 'pending_second_approval', $2, 'inject_recovery_admin', $3, $4, $5, $6::jsonb, $7, $8, $9)
    RETURNING id, created_at`,
    [
      companyId,
      reason,
      ticket,
      ownershipNotes || null,
      requestedByAdminId,
      JSON.stringify(previousSnapshot),
      !!forcedNonOrphan,
      requestIp || null,
      userAgent || null
    ]
  );
  const op = ins.rows[0];
  await appendAuditEvent({
    operationId: op.id,
    eventType: 'SUPPORT_RECOVERY_INIT',
    actorAdminId: requestedByAdminId,
    payload: { company_id: companyId, forced_non_orphan: !!forcedNonOrphan, is_orphan: orphan },
    ip: requestIp
  });
  logSupport('[SUPPORT_RECOVERY_INIT]', {
    operation_id: op.id,
    company_id: companyId,
    requested_by: requestedByAdminId,
    is_orphan: orphan
  });
  await logAdminAction({
    adminUserId: requestedByAdminId,
    acao: 'support_recovery_init',
    entidade: 'support_recovery_operation',
    entidadeId: op.id,
    detalhes: { company_id: companyId, ticket_reference: ticket },
    ip: requestIp
  });
  return { ok: true, operation: op };
}

async function approveOperation({ operationId, approverAdminId, approveIp, userAgent }) {
  if (!isFeatureEnabled()) {
    return { ok: false, code: 'FEATURE_DISABLED', error: 'Support recovery desactivado' };
  }

  // Enterprise Hardening Bloco 3 (C8):
  // Claim atómico — UPDATE com WHERE status='pending_second_approval' RETURNING.
  // Se rowCount===0, outra aprovação concorrente já ganhou OU o estado
  // mudou. Verificamos o SAME_ACTOR fora da TX implícita do statement,
  // o que é seguro porque o estado-alvo agora é único.

  // 1) Pré-check do dual approval (lê estado actual sem mutar).
  const peek = await db.query(
    `SELECT requested_by_admin_id, status FROM support_recovery_operations WHERE id = $1`,
    [operationId]
  );
  if (!peek.rows.length) {
    return { ok: false, code: 'NOT_FOUND', error: 'Operação não encontrada' };
  }
  const peekRow = peek.rows[0];
  if (peekRow.status !== 'pending_second_approval') {
    return { ok: false, code: 'INVALID_STATE', error: 'Operação não está pendente de segunda aprovação' };
  }
  if (String(peekRow.requested_by_admin_id) === String(approverAdminId)) {
    return {
      ok: false,
      code: 'SAME_ACTOR',
      error: 'A segunda aprovação deve ser feita por outro administrador Impetus (dual confirmation).'
    };
  }

  // 2) Claim atómico — apenas um caller consegue mover para 'approved'.
  const deadline = new Date(Date.now() + executeTtlMinutes() * 60 * 1000);
  const claim = await db.query(
    `UPDATE support_recovery_operations
        SET status = 'approved',
            approved_by_admin_id = $2,
            approved_at = now(),
            execute_deadline = $3,
            approve_ip = $4
      WHERE id = $1
        AND status = 'pending_second_approval'
        AND requested_by_admin_id <> $2
      RETURNING id, company_id`,
    [operationId, approverAdminId, deadline.toISOString(), approveIp || null]
  );

  if (!claim.rows.length) {
    // Race condition perdida: outro admin já aprovou OU SAME_ACTOR pego no DB.
    const reRead = await db.query(
      `SELECT status FROM support_recovery_operations WHERE id = $1`,
      [operationId]
    );
    const currentStatus = reRead.rows[0]?.status || 'unknown';
    return {
      ok: false,
      code: 'CLAIM_LOST',
      error: `Operação já em estado '${currentStatus}'. Outro administrador pode ter aprovado simultaneamente.`
    };
  }

  await appendAuditEvent({
    operationId,
    eventType: 'SUPPORT_RECOVERY_APPROVED',
    actorAdminId: approverAdminId,
    payload: { execute_deadline: deadline.toISOString() },
    ip: approveIp
  });
  logSupport('[SUPPORT_RECOVERY_APPROVED]', { operation_id: operationId, approved_by: approverAdminId });
  await logAdminAction({
    adminUserId: approverAdminId,
    acao: 'support_recovery_approved',
    entidade: 'support_recovery_operation',
    entidadeId: operationId,
    detalhes: { company_id: claim.rows[0].company_id },
    ip: approveIp
  });
  return { ok: true, execute_deadline: deadline.toISOString() };
}

async function denyOperation({ operationId, actorAdminId, denyIp, reason }) {
  const opR = await db.query(`SELECT * FROM support_recovery_operations WHERE id = $1`, [operationId]);
  if (!opR.rows.length) return { ok: false, code: 'NOT_FOUND', error: 'Operação não encontrada' };
  const op = opR.rows[0];
  if (!['pending_second_approval', 'approved'].includes(op.status)) {
    return { ok: false, code: 'INVALID_STATE', error: 'Operação já encerrada' };
  }
  await db.query(
    `UPDATE support_recovery_operations
     SET status = 'denied', denied_by_admin_id = $2, denied_at = now(), deny_ip = $3
     WHERE id = $1`,
    [operationId, actorAdminId, denyIp || null]
  );
  await appendAuditEvent({
    operationId,
    eventType: 'SUPPORT_RECOVERY_DENIED',
    actorAdminId,
    payload: { reason: reason || null },
    ip: denyIp
  });
  logSupport('[SUPPORT_RECOVERY_DENIED]', { operation_id: operationId, actor: actorAdminId });
  await logAdminAction({
    adminUserId: actorAdminId,
    acao: 'support_recovery_denied',
    entidade: 'support_recovery_operation',
    entidadeId: operationId,
    detalhes: { company_id: op.company_id, reason },
    ip: denyIp
  });
  return { ok: true };
}

async function invalidateSessionsForUsers(userIds) {
  if (!userIds || !userIds.length) return 0;
  const r = await db.query(`DELETE FROM sessions WHERE user_id = ANY($1::uuid[])`, [userIds]);
  return r.rowCount || 0;
}

async function executeOperation({
  operationId,
  targetUserId,
  adminType,
  executorAdminId,
  executeIp,
  userAgent
}) {
  if (!isFeatureEnabled()) {
    return { ok: false, code: 'FEATURE_DISABLED', error: 'Support recovery desactivado' };
  }
  if (!tenantAdminService.ADMIN_TYPES.includes(adminType)) {
    return { ok: false, code: 'INVALID_ADMIN_TYPE', error: 'Tipo admin inválido' };
  }

  // Enterprise Hardening Bloco 3 (C7):
  // Claim atómico — mover 'approved' → 'executing' garante execução única
  // mesmo com dois admins simultâneos. Não passamos para 'executed' aqui,
  // só após promote + invalidate concluírem (linha final do método).
  const claim = await db.query(
    `UPDATE support_recovery_operations
        SET status = 'executing',
            execute_ip = $2
      WHERE id = $1
        AND status = 'approved'
        AND execute_deadline > now()
      RETURNING *`,
    [operationId, executeIp || null]
  );
  if (!claim.rows.length) {
    // Verifica motivo: já executada, expirada, ou simplesmente perdida na corrida.
    const reRead = await db.query(
      `SELECT status, execute_deadline FROM support_recovery_operations WHERE id = $1`,
      [operationId]
    );
    if (!reRead.rows.length) return { ok: false, code: 'NOT_FOUND', error: 'Operação não encontrada' };
    const cur = reRead.rows[0];
    if (cur.status === 'executing' || cur.status === 'executed') {
      return { ok: false, code: 'CLAIM_LOST', error: 'Operação já em execução por outro administrador.' };
    }
    if (cur.execute_deadline && new Date(cur.execute_deadline).getTime() < Date.now()) {
      await db.query(`UPDATE support_recovery_operations SET status = 'expired' WHERE id = $1 AND status = 'approved'`, [operationId]);
      await appendAuditEvent({
        operationId,
        eventType: 'SUPPORT_RECOVERY_EXPIRED',
        actorAdminId: executorAdminId,
        payload: {},
        ip: executeIp
      });
      return { ok: false, code: 'EXPIRED', error: 'Prazo de execução expirado; crie nova operação.' };
    }
    return { ok: false, code: 'INVALID_STATE', error: `Operação em estado '${cur.status}', incompatível com execução.` };
  }
  const op = claim.rows[0];

  const u = await db.query(
    `SELECT id, company_id FROM users WHERE id = $1 AND deleted_at IS NULL AND active = true`,
    [targetUserId]
  );
  if (!u.rows.length || String(u.rows[0].company_id) !== String(op.company_id)) {
    // Rollback do claim: voltar a 'approved' (preservamos deadline original).
    await db.query(
      `UPDATE support_recovery_operations SET status = 'approved' WHERE id = $1 AND status = 'executing'`,
      [operationId]
    );
    return { ok: false, code: 'INVALID_TARGET', error: 'Utilizador alvo inválido ou fora do tenant' };
  }

  const beforeManagers = await listManageCapabilityUserIds(op.company_id);
  const toInvalidate = beforeManagers.filter((id) => String(id) !== String(targetUserId));

  const prom = await tenantAdminService.promoteOrSetAdminTypeSupport({
    companyId: op.company_id,
    targetUserId,
    adminType
  });
  if (!prom.ok) {
    // Rollback do claim para permitir nova tentativa após análise.
    await db.query(
      `UPDATE support_recovery_operations SET status = 'approved' WHERE id = $1 AND status = 'executing'`,
      [operationId]
    );
    await appendAuditEvent({
      operationId,
      eventType: 'SUPPORT_RECOVERY_EXECUTE_FAILED',
      actorAdminId: executorAdminId,
      payload: { error: prom.error, code: prom.code },
      ip: executeIp
    });
    return prom;
  }

  let nSess = 0;
  if (toInvalidate.length) {
    nSess = await invalidateSessionsForUsers(toInvalidate);
    logSupport('[SUPPORT_RECOVERY_SESSION_INVALIDATION]', {
      operation_id: operationId,
      user_ids: toInvalidate,
      deleted_sessions: nSess
    });
  }

  // Apenas finaliza se ainda estamos em 'executing' — guard contra mutações concorrentes.
  await db.query(
    `UPDATE support_recovery_operations
       SET status = 'executed', executed_at = now(), execute_ip = $2, target_user_id = $3,
           session_invalidation_user_ids = $4::uuid[],
           created_admin_snapshot = $5::jsonb
     WHERE id = $1 AND status = 'executing'`,
    [
      operationId,
      executeIp || null,
      targetUserId,
      toInvalidate,
      JSON.stringify({ admin_type: adminType, target_user_id: targetUserId })
    ]
  );

  await appendAuditEvent({
    operationId,
    eventType: 'SUPPORT_RECOVERY_COMPLETE',
    actorAdminId: executorAdminId,
    payload: {
      target_user_id: targetUserId,
      admin_type: adminType,
      sessions_invalidated: nSess,
      invalidated_user_ids: toInvalidate
    },
    ip: executeIp
  });
  logSupport('[SUPPORT_RECOVERY_COMPLETE]', {
    operation_id: operationId,
    company_id: op.company_id,
    target_user_id: targetUserId,
    admin_type: adminType
  });
  if (adminType === 'primary') {
    logSupport('[SUPPORT_RECOVERY_PROMOTE]', { operation_id: operationId, target_user_id: targetUserId });
  }
  await logAdminAction({
    adminUserId: executorAdminId,
    acao: 'support_recovery_executed',
    entidade: 'support_recovery_operation',
    entidadeId: operationId,
    detalhes: {
      company_id: op.company_id,
      target_user_id: targetUserId,
      admin_type: adminType,
      sessions_invalidated: nSess
    },
    ip: executeIp
  });

  try {
    const userIdentityCacheBus = require('./userIdentityCacheBus');
    await userIdentityCacheBus.invalidateUserIdentity({
      userId: targetUserId,
      companyId: op.company_id,
      reason: 'support_recovery_execute',
      fieldsChanged: ['tenant_admin']
    });
  } catch (e) {
    console.warn('[supportRecovery][cache]', e.message);
  }

  return { ok: true, sessions_invalidated: nSess };
}

async function listRecentOperations(companyId, limit = 20) {
  const r = await db.query(
    `SELECT id, company_id, status, recovery_reason, ticket_reference, created_at, approved_at, executed_at,
            requested_by_admin_id, approved_by_admin_id, execute_deadline, forced_non_orphan
     FROM support_recovery_operations
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [companyId, Math.min(100, Math.max(1, limit))]
  );
  return r.rows;
}

module.exports = {
  isFeatureEnabled,
  executeTtlMinutes,
  appendAuditEvent,
  getGovernanceSnapshot,
  isTenantGovernanceOrphan,
  listManageCapabilityUserIds,
  createOperation,
  approveOperation,
  denyOperation,
  executeOperation,
  listRecentOperations,
  invalidateSessionsForUsers
};
